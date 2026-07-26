"use client";

import { useState, useEffect, useMemo } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Container,
  Grid,
  Paper,
  Title,
  Text,
  Group,
  Button,
  Select,
  NumberInput,
  TextInput,
  Badge,
  ActionIcon,
  Modal,
  Tabs,
  Progress,
  Table,
  Card,
  Stack,
  Switch,
  Tooltip,
  Menu,
  ThemeIcon,
  Box,
  Divider,
  Notification,
  SegmentedControl,
  Radio,
  Checkbox,
  Autocomplete,
} from "@mantine/core";
import {
  IconWallet,
  IconPlus,
  IconTrash,
  IconCheck,
  IconX,
  IconUserPlus,
  IconLogout,
  IconArrowsExchange,
  IconTrendingUp,
  IconTrendingDown,
  IconPigMoney,
  IconCreditCard,
  IconReceipt,
  IconCalendar,
  IconFilter,
  IconSearch,
  IconShare,
  IconUsers,
  IconAlertCircle,
  IconSparkles,
  IconEdit,
  IconChevronUp,
  IconChevronDown,
  IconSelector,
} from "@tabler/icons-react";
import {
  getDashboardData,
  addRevenue,
  deleteRevenue,
  addRecurringExpense,
  deleteRecurringExpense,
  addInstallment,
  deleteInstallment,
  saveBudgetEnvelope,
  deleteBudgetEnvelope,
  addTransaction,
  deleteTransaction,
  togglePaymentProcessed,
  createWallet,
  deleteWallet,
  getWalletMembers,
  getAvailableUsersToInvite,
  inviteUserToWallet,
  removeUserFromWallet,
  setExpenseOverride,
  removeExpenseOverride,
  updateRevenueGlobal,
  updateRecurringExpenseGlobal,
  updateInstallmentGlobal,
  setDeficitOverride,
  removeDeficitOverride,
  createWalletTransfer,
  deleteWalletTransfer,
  PermissionLevel,
} from "@/lib/actions/finance";

interface WalletItem {
  id: string;
  name: string;
  currency: string;
  isPersonal?: boolean;
  role: PermissionLevel;
  isOwner: boolean;
}

interface DashboardClientProps {
  initialWallets: WalletItem[];
  initialWalletId: string;
  user: any;
}

const MONTH_NAMES = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

const MONTH_OPTIONS = MONTH_NAMES.map((m, idx) => ({
  label: m,
  value: (idx + 1).toString(),
}));

const getMonthLabel = (m: number) => {
  return MONTH_NAMES[m - 1] || "Janvier";
};

const parseAmount = (val: number | string | null | undefined): number => {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  const normalized = String(val).replace(",", ".").trim();
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
};

const PRESET_COLORS = [
  { label: "Teal", value: "teal" },
  { label: "Bleu", value: "blue" },
  { label: "Violet", value: "violet" },
  { label: "Rose", value: "pink" },
  { label: "Orange", value: "orange" },
  { label: "Vert", value: "green" },
  { label: "Rouge", value: "red" },
  { label: "Gris", value: "gray" },
];

function CategorySelect({
  label = "Catégorie",
  placeholder = "Sélectionner ou saisir une catégorie...",
  value,
  onChange,
  existingCategories = [],
}: {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
  existingCategories?: string[];
}) {
  const [searchValue, setSearchValue] = useState("");
  const [createdOptions, setCreatedOptions] = useState<string[]>([]);

  const formattedData = useMemo(() => {
    const combined = Array.from(new Set([...(existingCategories || []), ...createdOptions, value].filter(Boolean)));
    const opts = combined.map((cat) => ({ value: cat, label: cat }));

    const trimmed = searchValue.trim();
    if (trimmed && !combined.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      opts.unshift({ value: trimmed, label: `+ Créer "${trimmed}"` });
    }
    return opts;
  }, [existingCategories, createdOptions, value, searchValue]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      const trimmed = searchValue.trim();
      if (trimmed) {
        e.preventDefault();
        e.stopPropagation();
        const existing = (existingCategories || []).find(
          (c) => c.toLowerCase() === trimmed.toLowerCase()
        );
        const targetVal = existing || trimmed;

        if (!createdOptions.includes(targetVal)) {
          setCreatedOptions((prev) => [...prev, targetVal]);
        }
        onChange(targetVal);
        setSearchValue("");
      }
    }
  };

  return (
    <Select
      label={label}
      placeholder={placeholder}
      data={formattedData}
      searchable
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      onKeyDown={handleKeyDown}
      value={value}
      onChange={(val) => {
        if (val) {
          if (!createdOptions.includes(val)) {
            setCreatedOptions((prev) => [...prev, val]);
          }
          onChange(val);
          setSearchValue("");
        }
      }}
      maxDropdownHeight={300}
      nothingFoundMessage="Tapez le nom d'une catégorie et appuyez sur Entrée pour la créer"
    />
  );
}

export default function DashboardClient({ initialWallets, initialWalletId, user }: DashboardClientProps) {
  const router = useRouter();
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());

  const [wallets, setWallets] = useState<WalletItem[]>(initialWallets);
  const [activeWalletId, setActiveWalletId] = useState<string>(initialWalletId);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [recSortField, setRecSortField] = useState<"title" | "category" | "dayOfMonth" | "amount">("dayOfMonth");
  const [recSortOrder, setRecSortOrder] = useState<"asc" | "desc">("asc");

  const handleRecSort = (field: "title" | "category" | "dayOfMonth" | "amount") => {
    if (recSortField === field) {
      setRecSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setRecSortField(field);
      setRecSortOrder("asc");
    }
  };

  const sortedRecurring = useMemo(() => {
    if (!data?.recurring) return [];
    return [...data.recurring].sort((a: any, b: any) => {
      let aVal = a[recSortField];
      let bVal = b[recSortField];

      if (recSortField === "title" || recSortField === "category") {
        aVal = (aVal || "").toLowerCase();
        bVal = (bVal || "").toLowerCase();
        return recSortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      aVal = Number(aVal) || 0;
      bVal = Number(bVal) || 0;
      return recSortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [data?.recurring, recSortField, recSortOrder]);

  const getCategoryColor = (category?: string) => {
    if (!category) return "gray";
    const env = data?.envelopes?.find((e: any) => e.category.toLowerCase() === category.toLowerCase());
    return env?.color || "indigo";
  };

  // Modals
  const [revenueModal, setRevenueModal] = useState(false);
  const [recurringModal, setRecurringModal] = useState(false);
  const [installmentModal, setInstallmentModal] = useState(false);
  const [envelopeModal, setEnvelopeModal] = useState(false);
  const [transactionModal, setTransactionModal] = useState(false);
  const [createWalletModal, setCreateWalletModal] = useState(false);
  const [shareWalletModal, setShareWalletModal] = useState(false);
  const [confirmDeleteWalletModal, setConfirmDeleteWalletModal] = useState(false);
  const [editOverrideModal, setEditOverrideModal] = useState(false);
  const [deficitModal, setDeficitModal] = useState(false);
  const [transferModal, setTransferModal] = useState(false);
  const [customDeficitAmount, setCustomDeficitAmount] = useState<number | string>(0);
  const [transferTargetWalletId, setTransferTargetWalletId] = useState<string>("");
  const [transferTitle, setTransferTitle] = useState("");
  const [transferType, setTransferType] = useState<"FIXED" | "PERCENTAGE">("FIXED");
  const [transferAmount, setTransferAmount] = useState<number | string>(100);
  const [transferPercentage, setTransferPercentage] = useState<number | string>(50);
  const [transferDay, setTransferDay] = useState<number | "">(5);

  const envLimitsSum = useMemo(() => {
    if (!data?.envelopes) return 0;
    return data.envelopes.reduce((acc: number, e: any) => acc + (e.hasLimit && e.limitAmount > 0 ? e.limitAmount : 0), 0);
  }, [data?.envelopes]);

  const rawRevenuesTotal = data?.summary?.totalRevenues || 0;
  const rawFixedTotal = data?.summary?.fixedExpenses || 0;
  const previewTransferBase = Math.max(0, rawRevenuesTotal - rawFixedTotal - envLimitsSum);
  const previewTransferAmount = Math.round(((Number(transferPercentage) || 0) / 100) * previewTransferBase * 100) / 100;
  const [editTarget, setEditTarget] = useState<{
    id: string;
    title: string;
    type: "REVENUE" | "RECURRING" | "INSTALLMENT";
    subType?: string;
    category?: string;
    dayOfMonth?: number;
    startMonth?: number;
    startYear?: number;
    endMonth?: number;
    endYear?: number;
    currentAmount: number;
    originalAmount: number;
    hasOverride: boolean;
  } | null>(null);

  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDay, setEditDay] = useState<number | "">(5);
  const [editEntryCategory, setEditEntryCategory] = useState<"REVENUE" | "REIMBURSEMENT">("REVENUE");
  const [editEntryFrequency, setEditEntryFrequency] = useState<"FIXED" | "VARIABLE">("FIXED");
  const [editInstStartMonth, setEditInstStartMonth] = useState<number>(month);
  const [editInstStartYear, setEditInstStartYear] = useState<number>(year);
  const [editInstEndMonth, setEditInstEndMonth] = useState<number>(month);
  const [editInstEndYear, setEditInstEndYear] = useState<number>(year);
  const [editScope, setEditScope] = useState<"MONTH" | "GLOBAL">("MONTH");
  const [editAmount, setEditAmount] = useState<number | string>(0);

  // Forms State
  const [revTitle, setRevTitle] = useState("");
  const [revAmount, setRevAmount] = useState<number | string>(1000);
  const [entryCategory, setEntryCategory] = useState<"REVENUE" | "REIMBURSEMENT">("REVENUE");
  const [entryFrequency, setEntryFrequency] = useState<"FIXED" | "VARIABLE">("FIXED");
  const [revMonth, setRevMonth] = useState<number>(month);
  const [revYear, setRevYear] = useState<number>(year);

  const [recTitle, setRecTitle] = useState("");
  const [recAmount, setRecAmount] = useState<number | string>(100);
  const [recCategory, setRecCategory] = useState("Abonnements");
  const [recColor, setRecColor] = useState("blue");
  const [recDay, setRecDay] = useState<number | "">(5);

  const [instTitle, setInstTitle] = useState("");
  const [instTotal, setInstTotal] = useState<number | string>(500);
  const [instAmount, setInstAmount] = useState<number | string>(50);
  const [instCategory, setInstCategory] = useState("Paiement échelonné");
  const [instColor, setInstColor] = useState("violet");
  const [instDay, setInstDay] = useState<number | "">(10);
  const [instStartMonth, setInstStartMonth] = useState<number>(month);
  const [instStartYear, setInstStartYear] = useState<number>(year);
  const [instEndMonth, setInstEndMonth] = useState<number>(month + 3 > 12 ? (month + 3) % 12 : month + 3);
  const [instEndYear, setInstEndYear] = useState<number>(month + 3 > 12 ? year + 1 : year);

  const [envCategory, setEnvCategory] = useState("");
  const [envLimit, setEnvLimit] = useState<number | string>(300);
  const [envColor, setEnvColor] = useState("teal");
  const [envMonth, setEnvMonth] = useState<number>(month);
  const [envYear, setEnvYear] = useState<number>(year);

  const [trxTitle, setTrxTitle] = useState("");
  const [trxAmount, setTrxAmount] = useState<number | string>(25);
  const [trxCategory, setTrxCategory] = useState("Alimentation");
  const [trxColor, setTrxColor] = useState("teal");
  const [trxDay, setTrxDay] = useState<number | "">(new Date().getDate());
  const [trxMonth, setTrxMonth] = useState<number>(month);
  const [trxYear, setTrxYear] = useState<number>(year);
  const [trxNotes, setTrxNotes] = useState("");

  const [newWalletName, setNewWalletName] = useState("");

  const [members, setMembers] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<{ id: string; name: string | null; email: string }[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [searchMemberQuery, setSearchMemberQuery] = useState("");
  const [inviteRole, setInviteRole] = useState<PermissionLevel>("FULL_ACCESS");

  const [searchTx, setSearchTx] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const activeWallet = wallets.find((w) => w.id === activeWalletId) || wallets[0];

  const loadData = async () => {
    if (!activeWalletId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await getDashboardData(activeWalletId, month, year);
      setData(res);
    } catch (e: any) {
      setErrorMsg(e.message || "Erreur de chargement des données.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeWalletId, month, year]);

  const loadMembers = async () => {
    if (!activeWalletId) return;
    try {
      const [m, avail] = await Promise.all([
        getWalletMembers(activeWalletId),
        getAvailableUsersToInvite(activeWalletId).catch(() => []),
      ]);
      setMembers(m);
      setAvailableUsers(avail);
    } catch (e) {
      // Ignorer si l'utilisateur n'est pas le propriétaire
    }
  };

  const handleCreateWallet = async () => {
    if (!newWalletName.trim()) return;
    try {
      const w = await createWallet(newWalletName.trim());
      const updatedWallets = [...wallets, { id: w.id, name: w.name, currency: w.currency, isPersonal: false, role: "OWNER" as PermissionLevel, isOwner: true }];
      setWallets(updatedWallets);
      setActiveWalletId(w.id);
      setNewWalletName("");
      setCreateWalletModal(false);
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleDeleteWallet = async () => {
    if (!activeWalletId || activeWallet?.isPersonal) {
      setErrorMsg("Le portefeuille personnel principal ne peut pas être supprimé.");
      setConfirmDeleteWalletModal(false);
      return;
    }
    try {
      const walletToDeleteId = activeWalletId;
      await deleteWallet(walletToDeleteId);
      const remaining = wallets.filter((w) => w.id !== walletToDeleteId);
      setWallets(remaining);
      setActiveWalletId(remaining[0].id);
      setConfirmDeleteWalletModal(false);
    } catch (e: any) {
      setErrorMsg(e.message);
      setConfirmDeleteWalletModal(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) return;

    try {
      await inviteUserToWallet(activeWalletId, inviteEmail.trim(), inviteRole);
      setInviteEmail("");
      await loadMembers();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await removeUserFromWallet(activeWalletId, userId);
      await loadMembers();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleAddRevenue = async () => {
    if (!revTitle.trim() || revAmount === "") return;
    const targetType = entryCategory === "REVENUE"
      ? (entryFrequency === "FIXED" ? "FIXED" : "VARIABLE")
      : (entryFrequency === "FIXED" ? "REIMBURSEMENT_FIXED" : "REIMBURSEMENT");

    try {
      await addRevenue(activeWalletId, {
        title: revTitle,
        amount: parseAmount(revAmount),
        type: targetType,
        month: revMonth,
        year: revYear,
      });
      setRevenueModal(false);
      setRevTitle("");
      if (month !== revMonth || year !== revYear) {
        setMonth(revMonth);
        setYear(revYear);
      } else {
        await loadData();
      }
      router.refresh();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleAddRecurring = async () => {
    if (!recTitle.trim() || recAmount === "" || !recDay) return;
    try {
      await addRecurringExpense(activeWalletId, {
        title: recTitle,
        amount: parseAmount(recAmount),
        category: recCategory,
        color: getCategoryColor(recCategory),
        dayOfMonth: Number(recDay),
      });
      setRecurringModal(false);
      setRecTitle("");
      await loadData();
      router.refresh();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleAddTransfer = async () => {
    if (!transferTargetWalletId || !transferTitle.trim()) return;
    try {
      const targetM = month === 0 ? new Date().getMonth() + 1 : month;
      const isPercent = transferType === "PERCENTAGE";
      await createWalletTransfer(activeWalletId, transferTargetWalletId, {
        title: transferTitle,
        amount: isPercent ? 0 : parseAmount(transferAmount),
        isPercentage: isPercent,
        percentage: isPercent ? parseAmount(transferPercentage) : undefined,
        dayOfMonth: isPercent ? 1 : (Number(transferDay) || 1),
        month: targetM,
        year,
      });
      setTransferModal(false);
      setTransferTitle("");
      setTransferTargetWalletId("");
      await loadData();
      router.refresh();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleAddInstallment = async () => {
    if (!instTitle.trim() || instAmount === "" || !instDay) return;
    try {
      await addInstallment(activeWalletId, {
        title: instTitle,
        totalAmount: instTotal !== "" ? parseAmount(instTotal) : undefined,
        amount: parseAmount(instAmount),
        category: instCategory,
        color: instColor,
        dayOfMonth: Number(instDay),
        startMonth: instStartMonth,
        startYear: instStartYear,
        endMonth: instEndMonth,
        endYear: instEndYear,
      });
      setInstallmentModal(false);
      setInstTitle("");
      await loadData();
      router.refresh();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleSaveEnvelope = async () => {
    if (!envCategory.trim()) return;
    try {
      await saveBudgetEnvelope(activeWalletId, {
        category: envCategory,
        limitAmount: envLimit !== "" ? parseAmount(envLimit) : 0,
        color: envColor,
        month: envMonth,
        year: envYear,
      });
      setEnvelopeModal(false);
      setEnvCategory("");
      if (month !== envMonth || year !== envYear) {
        setMonth(envMonth);
        setYear(envYear);
      } else {
        await loadData();
      }
      router.refresh();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleAddTransaction = async () => {
    if (!trxTitle.trim() || trxAmount === "" || !trxDay) return;
    try {
      await addTransaction(activeWalletId, {
        title: trxTitle,
        amount: parseAmount(trxAmount),
        category: trxCategory,
        color: trxColor,
        day: Number(trxDay),
        month: trxMonth,
        year: trxYear,
        notes: trxNotes,
      });
      setTransactionModal(false);
      setTrxTitle("");
      setTrxNotes("");
      if (month !== trxMonth || year !== trxYear) {
        setMonth(trxMonth);
        setYear(trxYear);
      } else {
        await loadData();
      }
      router.refresh();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleToggleProcessed = async (paymentId: string, type: "REVENUE" | "RECURRING" | "INSTALLMENT", currentStatus: boolean) => {
    try {
      await togglePaymentProcessed(activeWalletId, {
        paymentId,
        type,
        month,
        year,
        processed: !currentStatus,
      });
      await loadData();
      router.refresh();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleOpenEditModal = (target: {
    id: string;
    title: string;
    type: "REVENUE" | "RECURRING" | "INSTALLMENT";
    subType?: string;
    category?: string;
    dayOfMonth?: number;
    startMonth?: number;
    startYear?: number;
    endMonth?: number;
    endYear?: number;
    currentAmount: number;
    originalAmount: number;
    hasOverride: boolean;
  }) => {
    setEditTarget(target);
    setEditTitle(target.title);
    setEditAmount(target.currentAmount);
    setEditScope("MONTH");

    if (target.type === "REVENUE") {
      const sub = target.subType || "FIXED";
      if (sub === "FIXED") {
        setEditEntryCategory("REVENUE");
        setEditEntryFrequency("FIXED");
      } else if (sub === "VARIABLE") {
        setEditEntryCategory("REVENUE");
        setEditEntryFrequency("VARIABLE");
      } else if (sub === "REIMBURSEMENT_FIXED") {
        setEditEntryCategory("REIMBURSEMENT");
        setEditEntryFrequency("FIXED");
      } else {
        setEditEntryCategory("REIMBURSEMENT");
        setEditEntryFrequency("VARIABLE");
      }
    } else if (target.type === "INSTALLMENT") {
      setEditCategory(target.category || "Général");
      setEditDay(target.dayOfMonth || 10);
      setEditInstStartMonth(target.startMonth || month);
      setEditInstStartYear(target.startYear || year);
      setEditInstEndMonth(target.endMonth || month);
      setEditInstEndYear(target.endYear || year);
    } else {
      setEditCategory(target.category || "Général");
      setEditDay(target.dayOfMonth || 5);
    }

    setEditOverrideModal(true);
  };

  const handleSaveEditOverride = async () => {
    if (!editTarget || editAmount === "" || !editTitle.trim()) return;
    try {
      if (editTarget.type === "REVENUE") {
        const targetType = editEntryCategory === "REVENUE"
          ? (editEntryFrequency === "FIXED" ? "FIXED" : "VARIABLE")
          : (editEntryFrequency === "FIXED" ? "REIMBURSEMENT_FIXED" : "REIMBURSEMENT");

        if (editScope === "MONTH") {
          await updateRevenueGlobal(activeWalletId, editTarget.id, { title: editTitle, type: targetType });
          await setExpenseOverride(activeWalletId, {
            paymentId: editTarget.id,
            type: "REVENUE",
            amount: parseAmount(editAmount),
            month: month === 0 ? new Date().getMonth() + 1 : month,
            year,
          });
        } else {
          await updateRevenueGlobal(activeWalletId, editTarget.id, {
            title: editTitle,
            type: targetType,
            amount: parseAmount(editAmount),
          });
          if (editTarget.hasOverride) {
            await removeExpenseOverride(activeWalletId, {
              paymentId: editTarget.id,
              type: "REVENUE",
              month: month === 0 ? new Date().getMonth() + 1 : month,
              year,
            });
          }
        }
      } else if (editTarget.type === "INSTALLMENT") {
        await updateInstallmentGlobal(activeWalletId, editTarget.id, {
          title: editTitle,
          category: editCategory,
          dayOfMonth: Number(editDay),
          amount: parseAmount(editAmount),
          startMonth: editInstStartMonth,
          startYear: editInstStartYear,
          endMonth: editInstEndMonth,
          endYear: editInstEndYear,
        });
      } else {
        // RECURRING
        if (editScope === "MONTH") {
          await updateRecurringExpenseGlobal(activeWalletId, editTarget.id, {
            title: editTitle,
            category: editCategory,
            dayOfMonth: Number(editDay),
          });
          await setExpenseOverride(activeWalletId, {
            paymentId: editTarget.id,
            type: "RECURRING",
            amount: parseAmount(editAmount),
            month: month === 0 ? new Date().getMonth() + 1 : month,
            year,
          });
        } else {
          await updateRecurringExpenseGlobal(activeWalletId, editTarget.id, {
            title: editTitle,
            category: editCategory,
            dayOfMonth: Number(editDay),
            amount: parseAmount(editAmount),
          });
          if (editTarget.hasOverride) {
            await removeExpenseOverride(activeWalletId, {
              paymentId: editTarget.id,
              type: "RECURRING",
              month: month === 0 ? new Date().getMonth() + 1 : month,
              year,
            });
          }
        }
      }

      setEditOverrideModal(false);
      setEditTarget(null);
      await loadData();
      router.refresh();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleRemoveOverride = async () => {
    if (!editTarget || editTarget.type === "INSTALLMENT") return;
    try {
      await removeExpenseOverride(activeWalletId, {
        paymentId: editTarget.id,
        type: editTarget.type,
        month: month === 0 ? new Date().getMonth() + 1 : month,
        year,
      });
      setEditOverrideModal(false);
      setEditTarget(null);
      await loadData();
      router.refresh();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const filteredTransactions = data?.transactions?.filter((t: any) => {
    const matchesSearch = t.title.toLowerCase().includes(searchTx.toLowerCase()) || t.category.toLowerCase().includes(searchTx.toLowerCase());
    const matchesCategory = filterCategory ? t.category === filterCategory : true;
    return matchesSearch && matchesCategory;
  }) || [];

  return (
    <Box style={{ minHeight: "100vh", backgroundColor: "#0b0e17", color: "#f1f3f5", paddingBottom: "60px" }}>
      {/* Header Bar */}
      <Paper p="md" radius={0} style={{ backgroundColor: "#121829", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <Container size="xl">
          <Group justify="space-between" align="center">
            <Group gap="md">
              <ThemeIcon size="lg" radius="md" variant="gradient" gradient={{ from: "teal", to: "cyan" }}>
                <IconWallet size={24} />
              </ThemeIcon>

              <div>
                <Group gap="xs">
                  <Title order={3} style={{ color: "#fff", fontWeight: 800, letterSpacing: "-0.5px" }}>
                    MyWallet
                  </Title>
                  <Badge variant="outline" color="teal" size="sm">
                    PWA
                  </Badge>
                </Group>
                <Text size="xs" c="dimmed">
                  Connecté en tant que {user?.name || user?.email}
                </Text>
              </div>
            </Group>

            {/* Controls Right */}
            <Group gap="sm">
              {/* Wallet Selector */}
              <Menu shadow="md" width={220}>
                <Menu.Target>
                  <Button variant="light" color="teal" leftSection={<IconWallet size={18} />} rightSection={<IconArrowsExchange size={16} />}>
                    {activeWallet?.name || "Portefeuille"}
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>Mes Portefeuilles</Menu.Label>
                  {wallets.map((w) => (
                    <Menu.Item key={w.id} onClick={() => setActiveWalletId(w.id)}>
                      <Group justify="space-between">
                        <Group gap={6}>
                          <Text size="sm" fw={w.id === activeWalletId ? 700 : 400}>
                            {w.name}
                          </Text>
                          {w.isPersonal && (
                            <Badge size="xs" color="teal" variant="light">
                              Personnel
                            </Badge>
                          )}
                        </Group>
                        <Badge size="xs" color={w.role === "OWNER" ? "teal" : "blue"}>
                          {w.role}
                        </Badge>
                      </Group>
                    </Menu.Item>
                  ))}
                  <Menu.Divider />
                  <Menu.Item leftSection={<IconPlus size={16} />} onClick={() => setCreateWalletModal(true)}>
                    Nouveau portefeuille
                  </Menu.Item>
                  {!activeWallet?.isPersonal && activeWallet?.isOwner && (
                    <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={() => setConfirmDeleteWalletModal(true)}>
                      Supprimer ce portefeuille
                    </Menu.Item>
                  )}
                </Menu.Dropdown>
              </Menu>

              {/* Share button if OWNER */}
              {activeWallet?.isOwner && (
                <Tooltip label="Gérer les accès et membres">
                  <ActionIcon
                    variant="light"
                    color="blue"
                    size="lg"
                    radius="md"
                    onClick={() => {
                      loadMembers();
                      setShareWalletModal(true);
                    }}
                  >
                    <IconShare size={20} />
                  </ActionIcon>
                </Tooltip>
              )}

              {/* Month / Year Picker */}
              <Group gap={6}>
                <Select
                  size="xs"
                  data={MONTH_OPTIONS}
                  value={month.toString()}
                  onChange={(val) => val !== null && setMonth(parseInt(val))}
                  maxDropdownHeight={450}
                  style={{ width: 140 }}
                />
                <Select
                  size="xs"
                  data={["2024", "2025", "2026", "2027", "2028"]}
                  value={year.toString()}
                  onChange={(val) => val && setYear(parseInt(val))}
                  style={{ width: 85 }}
                />
              </Group>

              {/* AD Logout */}
              <Tooltip label="Déconnexion (AD)">
                <ActionIcon variant="subtle" color="red" size="lg" radius="md" onClick={() => signOut({ callbackUrl: "/login" })}>
                  <IconLogout size={20} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
        </Container>
      </Paper>

      {/* Main Container */}
      <Container size="xl" mt="lg">
        {errorMsg && (
          <Notification icon={<IconAlertCircle size={18} />} color="red" title="Information" onClose={() => setErrorMsg(null)} mb="md">
            {errorMsg}
          </Notification>
        )}

        {/* Global Summary KPI Bar */}
        {data?.summary && (
          <Grid mb="lg">
            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Paper p="md" radius="md" style={{ backgroundColor: "#161d30", border: "1px solid rgba(255,255,255,0.06)" }}>
                <Group justify="space-between" mb={4}>
                  <Text size="xs" c="dimmed" fw={700}>
                    REVENUS TOTAUX
                  </Text>
                  <ThemeIcon size="sm" color="teal" variant="light" radius="xl">
                    <IconTrendingUp size={14} />
                  </ThemeIcon>
                </Group>
                <Text size="xl" fw={800} c="teal.4">
                  {data.summary.totalRevenues.toFixed(2)} €
                </Text>
                <Text size="xs" c="dimmed">
                  Pour {getMonthLabel(month)} {year}
                </Text>
              </Paper>
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Paper p="md" radius="md" style={{ backgroundColor: "#161d30", border: "1px solid rgba(255,255,255,0.06)" }}>
                <Group justify="space-between" mb={4}>
                  <Text size="xs" c="dimmed" fw={700}>
                    CHARGES FIXES
                  </Text>
                  <ThemeIcon size="sm" color="indigo" variant="light" radius="xl">
                    <IconCreditCard size={14} />
                  </ThemeIcon>
                </Group>
                <Text size="xl" fw={800} c="indigo.4">
                  {data.summary.fixedExpenses.toFixed(2)} €
                </Text>
                <Text size="xs" c="dimmed">
                  Récurrents + Crédits
                </Text>
              </Paper>
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Paper p="md" radius="md" style={{ backgroundColor: "#161d30", border: "1px solid rgba(255,255,255,0.06)" }}>
                <Group justify="space-between" mb={4}>
                  <Text size="xs" c="dimmed" fw={700}>
                    DÉPENSES COURANTES
                  </Text>
                  <ThemeIcon size="sm" color="orange" variant="light" radius="xl">
                    <IconReceipt size={14} />
                  </ThemeIcon>
                </Group>
                <Text size="xl" fw={800} c="orange.4">
                  {data.summary.totalTransactions.toFixed(2)} €
                </Text>
                <Text size="xs" c="dimmed">
                  Saisies sur le mois
                </Text>
              </Paper>
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Paper p="md" radius="md" style={{ backgroundColor: "#161d30", border: "1px solid rgba(255,255,255,0.06)" }}>
                <Group justify="space-between" mb={4}>
                  <Text size="xs" c="dimmed" fw={700}>
                    CAPACITÉ D'ÉPARGNE
                  </Text>
                  <ThemeIcon size="sm" color={data.summary.netSavings >= 0 ? "teal" : "red"} variant="light" radius="xl">
                    {data.summary.netSavings >= 0 ? <IconTrendingUp size={14} /> : <IconTrendingDown size={14} />}
                  </ThemeIcon>
                </Group>
                <Text size="xl" fw={800} c={data.summary.netSavings >= 0 ? "teal.3" : "red.4"}>
                  {data.summary.netSavings.toFixed(2)} €
                </Text>
                <Text size="xs" c="dimmed">
                  {data.summary.netSavings >= 0 ? "Solde prévisionnel" : "Déficit budgétaire"}
                </Text>
              </Paper>
            </Grid.Col>
          </Grid>
        )}

        {/* Tabbed Navigation */}
        <Tabs defaultValue="overview" variant="pills" color="teal">
          <Tabs.List mb="md" style={{ gap: "8px" }}>
            <Tabs.Tab value="overview" leftSection={<IconSparkles size={16} />}>
              Vue d'Ensemble
            </Tabs.Tab>
            <Tabs.Tab value="pointage" leftSection={<IconCheck size={16} />}>
              Pointage Bancaire
            </Tabs.Tab>
            <Tabs.Tab value="fixed" leftSection={<IconCreditCard size={16} />}>
              Revenus & Charges Fixes
            </Tabs.Tab>
            <Tabs.Tab value="transactions" leftSection={<IconReceipt size={16} />}>
              Dépenses Quotidiennes
            </Tabs.Tab>
            {wallets.length >= 2 && (
              <Tabs.Tab value="transfers" leftSection={<IconArrowsExchange size={16} />}>
                Virements Inter-Portefeuilles
              </Tabs.Tab>
            )}
          </Tabs.List>

          {/* TAB 1: OVERVIEW */}
          <Tabs.Panel value="overview">
            <Grid>
              {/* Envelopes Status Grid */}
              <Grid.Col span={{ base: 12, md: 8 }}>
                <Paper p="lg" radius="md" style={{ backgroundColor: "#121829", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <Group justify="space-between" mb="md">
                    <div>
                      <Title order={4} style={{ color: "#fff" }}>
                        Suivi des Enveloppes Budgétaires
                      </Title>
                      <Text size="xs" c="dimmed">
                        Plafond vs Dépenses réelles pour {getMonthLabel(month)}
                      </Text>
                    </div>
                    <Button
                      size="xs"
                      variant="light"
                      color="teal"
                      leftSection={<IconPlus size={14} />}
                      onClick={() => {
                        setEnvMonth(month === 0 ? new Date().getMonth() + 1 : month);
                        setEnvYear(year);
                        setEnvelopeModal(true);
                      }}
                    >
                      Ajouter une enveloppe
                    </Button>
                  </Group>

                  {!data?.envelopes || data.envelopes.length === 0 ? (
                    <Text size="sm" c="dimmed" ta="center" py="xl">
                      Aucune catégorie configurée pour ce mois. Cliquez sur "Ajouter une enveloppe" pour commencer.
                    </Text>
                  ) : (
                    <Stack gap="lg">
                      {/* SECTION 1: ENVELOPPES AVEC PLAFOND */}
                      <div>
                        <Group justify="space-between" mb="xs">
                          <Text size="sm" fw={700} c="teal.4">
                            Enveloppes Budgétaires Plafonnées ({data.envelopes.filter((e: any) => e.hasLimit).length})
                          </Text>
                        </Group>

                        {data.envelopes.filter((e: any) => e.hasLimit).length === 0 ? (
                          <Paper p="sm" radius="md" style={{ backgroundColor: "#182036", border: "1px dashed rgba(255,255,255,0.1)" }}>
                            <Text size="xs" c="dimmed" ta="center">
                              Aucun plafond défini. Cliquez sur "Ajouter une enveloppe" ou sur l'icône de modification pour fixer un plafond.
                            </Text>
                          </Paper>
                        ) : (
                          <Grid gap="md">
                            {data.envelopes
                              .filter((env: any) => env.hasLimit)
                              .map((env: any) => {
                                const isOver = env.remaining < 0;
                                return (
                                  <Grid.Col key={env.id} span={{ base: 12, sm: 6 }}>
                                    <Card padding="md" radius="md" style={{ backgroundColor: "#182036", border: isOver ? "1px solid #fa5252" : "1px solid rgba(255,255,255,0.06)" }}>
                                      <Group justify="space-between" mb="xs">
                                        <Group gap="xs">
                                          <Badge color={env.color || "teal"} variant="filled" size="sm">
                                            {env.category}
                                          </Badge>
                                        </Group>
                                        <Group gap="xs">
                                          <Badge color={isOver ? "red" : "teal"} variant="light" size="sm">
                                            {isOver ? "DÉPASSÉ" : `${env.remaining.toFixed(2)} € restant`}
                                          </Badge>
                                          <Tooltip label="Modifier le plafond / couleur">
                                            <ActionIcon
                                              size="xs"
                                              variant="subtle"
                                              color="blue"
                                              onClick={() => {
                                                setEnvCategory(env.category);
                                                setEnvLimit(env.limitAmount || "");
                                                setEnvColor(env.color || "teal");
                                                setEnvMonth(month === 0 ? new Date().getMonth() + 1 : month);
                                                setEnvYear(year);
                                                setEnvelopeModal(true);
                                              }}
                                            >
                                              <IconEdit size={14} />
                                            </ActionIcon>
                                          </Tooltip>
                                        </Group>
                                      </Group>

                                      <Group justify="space-between" align="baseline" mb={4}>
                                        <Text size="sm" c="dimmed">
                                          Dépensé: <strong style={{ color: "#fff" }}>{env.spent.toFixed(2)} €</strong>
                                        </Text>
                                        <Text size="sm" c="dimmed">
                                          Plafond: <strong style={{ color: "#fff" }}>{env.limitAmount.toFixed(2)} €</strong>
                                        </Text>
                                      </Group>

                                      <Progress
                                        value={Math.min(env.percentSpent, 100)}
                                        color={isOver ? "red" : env.percentSpent > 80 ? "orange" : (env.color || "teal")}
                                        size="md"
                                        radius="xl"
                                      />
                                    </Card>
                                  </Grid.Col>
                                );
                              })}
                          </Grid>
                        )}
                      </div>

                      {/* SECTION 2: CATÉGORIES SANS PLAFOND */}
                      <div>
                        <Group justify="space-between" mb="xs">
                          <Text size="sm" fw={700} c="dimmed">
                            Catégories Suivies sans Plafond ({data.envelopes.filter((e: any) => !e.hasLimit).length})
                          </Text>
                        </Group>

                        {data.envelopes.filter((e: any) => !e.hasLimit).length === 0 ? (
                          <Text size="xs" c="dimmed">
                            Toutes vos catégories possèdent un plafond défini.
                          </Text>
                        ) : (
                          <Grid gap="md">
                            {data.envelopes
                              .filter((env: any) => !env.hasLimit)
                              .map((env: any) => {
                                return (
                                  <Grid.Col key={env.id} span={{ base: 12, sm: 6 }}>
                                    <Card padding="md" radius="md" style={{ backgroundColor: "#182036", border: "1px solid rgba(255,255,255,0.06)" }}>
                                      <Group justify="space-between" mb="xs">
                                        <Group gap="xs">
                                          <Badge color={env.color || "teal"} variant="filled" size="sm">
                                            {env.category}
                                          </Badge>
                                        </Group>
                                        <Group gap="xs">
                                          <Badge color="gray" variant="light" size="sm">
                                            Plafond non défini
                                          </Badge>
                                          <Tooltip label="Définir un plafond ou changer la couleur">
                                            <ActionIcon
                                              size="xs"
                                              variant="subtle"
                                              color="blue"
                                              onClick={() => {
                                                setEnvCategory(env.category);
                                                setEnvLimit(env.limitAmount || "");
                                                setEnvColor(env.color || "teal");
                                                setEnvMonth(month === 0 ? new Date().getMonth() + 1 : month);
                                                setEnvYear(year);
                                                setEnvelopeModal(true);
                                              }}
                                            >
                                              <IconEdit size={14} />
                                            </ActionIcon>
                                          </Tooltip>
                                        </Group>
                                      </Group>

                                      <Group justify="space-between" align="baseline">
                                        <Text size="sm" c="dimmed">
                                          Total Dépensé: <strong style={{ color: "#fff" }}>{env.spent.toFixed(2)} €</strong>
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                          Plafond: —
                                        </Text>
                                      </Group>
                                    </Card>
                                  </Grid.Col>
                                );
                              })}
                          </Grid>
                        )}
                      </div>
                    </Stack>
                  )}
                </Paper>
              </Grid.Col>

              {/* Suivi du Pointage et Reste à payer des charges fixes */}
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Stack gap="md">
                  {/* Reste à Vivre Réel */}
                  <Paper p="md" radius="md" style={{ backgroundColor: "#121829", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <Group justify="space-between" mb="xs">
                      <Text size="xs" c="dimmed" fw={700}>
                        RESTE À VIVRE RÉEL
                      </Text>
                      <ThemeIcon size="sm" color={data?.summary?.realRestToLive >= 0 ? "teal" : "red"} variant="light" radius="xl">
                        {data?.summary?.realRestToLive >= 0 ? <IconTrendingUp size={14} /> : <IconTrendingDown size={14} />}
                      </ThemeIcon>
                    </Group>
                    <Text size="xl" fw={800} c={data?.summary?.realRestToLive >= 0 ? "teal.3" : "red.4"}>
                      {data?.summary?.realRestToLive ? data.summary.realRestToLive.toFixed(2) : "0.00"} €
                    </Text>

                    <Divider my="sm" color="gray.8" />

                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Text size="xs" c="dimmed">Revenus pointés :</Text>
                        <Text size="xs" fw={700} c="teal.4">
                          +{data?.summary?.pointedRevenues ? data.summary.pointedRevenues.toFixed(2) : "0.00"} €
                        </Text>
                      </Group>

                      <Group justify="space-between">
                        <Text size="xs" c="dimmed">Dépenses courantes :</Text>
                        <Text size="xs" fw={700} c="orange.4">
                          -{data?.summary?.totalTransactions ? data.summary.totalTransactions.toFixed(2) : "0.00"} €
                        </Text>
                      </Group>

                      <Group justify="space-between">
                        <Text size="xs" c="dimmed">Charges & crédits pointés :</Text>
                        <Text size="xs" fw={700} c="indigo.4">
                          -{data?.summary?.pointedFixedExpenses ? data.summary.pointedFixedExpenses.toFixed(2) : "0.00"} €
                        </Text>
                      </Group>

                      <Group justify="space-between" wrap="nowrap">
                        <Group gap={4}>
                          <Text size="xs" c={data?.summary?.previousMonthDeficit > 0 ? "red.4" : "dimmed"} fw={data?.summary?.previousMonthDeficit > 0 ? 700 : 400}>
                            Déficit mois dernier ({data?.summary?.prevMonthLabel || "M-1"}) {data?.summary?.hasManualDeficit ? "(Ajusté)" : ""} :
                          </Text>
                          <Tooltip label="Ajuster le report de déficit manuellement">
                            <ActionIcon
                              size="xs"
                              variant="subtle"
                              color="blue"
                              onClick={() => {
                                setCustomDeficitAmount(data?.summary?.previousMonthDeficit || 0);
                                setDeficitModal(true);
                              }}
                            >
                              <IconEdit size={12} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                        <Text size="xs" fw={700} c={data?.summary?.previousMonthDeficit > 0 ? "red.4" : "dimmed"}>
                          -{data?.summary?.previousMonthDeficit ? data.summary.previousMonthDeficit.toFixed(2) : "0.00"} €
                        </Text>
                      </Group>

                      {data?.summary?.previousMonthSurplus > 0 && (
                        <Group justify="space-between">
                          <Text size="xs" c="teal.4" fw={700}>
                            Bonus mois dernier ({data?.summary?.prevMonthLabel || "M-1"}) :
                          </Text>
                          <Text size="xs" fw={700} c="teal.4">
                            +{data.summary.previousMonthSurplus.toFixed(2)} €
                          </Text>
                        </Group>
                      )}
                    </Stack>
                  </Paper>

                  {/* Reste à Payer (Charges Fixes) */}
                  <Paper p="md" radius="md" style={{ backgroundColor: "#121829", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <Group justify="space-between" mb="xs">
                      <Text size="xs" c="dimmed" fw={700}>
                        RESTE À PAYER (CHARGES FIXES)
                      </Text>
                      <ThemeIcon size="sm" color="indigo" variant="light" radius="xl">
                        <IconCheck size={14} />
                      </ThemeIcon>
                    </Group>
                    <Text size="xl" fw={800} c={data?.summary?.remainingFixedExpenses > 0 ? "orange.4" : "teal.4"}>
                      {data?.summary?.remainingFixedExpenses ? data.summary.remainingFixedExpenses.toFixed(2) : "0.00"} €
                    </Text>
                    <Text size="xs" c="dimmed" mt={4}>
                      Montant des prélèvements fixes non encore pointés en banque pour {getMonthLabel(month)}.
                    </Text>
                  </Paper>

                  {/* Recent Transactions List */}
                  <Paper p="md" radius="md" style={{ backgroundColor: "#121829", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <Title order={5} style={{ color: "#fff" }} mb="sm">
                      Dernières Dépenses
                    </Title>
                    {!data?.transactions || data.transactions.length === 0 ? (
                      <Text size="xs" c="dimmed">
                        Aucune dépense saisie ce mois-ci.
                      </Text>
                    ) : (
                      <Stack gap="xs">
                        {data.transactions.slice(0, 5).map((t: any) => (
                          <Group key={t.id} justify="space-between" wrap="nowrap">
                            <div>
                              <Text size="sm" fw={600} style={{ color: "#fff" }}>
                                {t.title}
                              </Text>
                              <Text size="xs" c="dimmed">
                                Jour {t.day} • {t.category}
                              </Text>
                            </div>
                            <Text size="sm" fw={700} c={`${getCategoryColor(t.category)}.4`}>
                              -{t.amount.toFixed(2)} €
                            </Text>
                          </Group>
                        ))}
                      </Stack>
                    )}
                  </Paper>
                </Stack>
              </Grid.Col>
            </Grid>
          </Tabs.Panel>

          {/* TAB 2: POINTAGE BANCAIRE */}
          <Tabs.Panel value="pointage">
            <Paper p="lg" radius="md" style={{ backgroundColor: "#121829", border: "1px solid rgba(255,255,255,0.06)" }}>
              <Title order={4} style={{ color: "#fff" }} mb="xs">
                Pointage Bancaire ({getMonthLabel(month)} {year})
              </Title>
              <Text size="sm" c="dimmed" mb="lg">
                Cochez les revenus perçus et les prélèvements (charges et crédits) effectivement passés sur votre compte bancaire.
              </Text>

              <Grid>
                {/* Pointage Revenus */}
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Paper p="md" radius="md" style={{ backgroundColor: "#182036" }}>
                    <Text fw={700} c="teal.4" mb="sm">
                      Revenus Encaissés
                    </Text>
                    {data?.revenues?.length === 0 ? (
                      <Text size="xs" c="dimmed">
                        Aucun revenu.
                      </Text>
                    ) : (
                      <Stack gap="xs">
                        {data?.revenues?.map((r: any) => (
                          <Group key={r.id} justify="space-between" p="xs" style={{ backgroundColor: "#121829", borderRadius: 6 }}>
                            <div>
                              <Text size="sm" fw={600}>
                                {r.title}
                              </Text>
                              <Text size="xs" c="teal.4" fw={700}>
                                +{r.amount.toFixed(2)} €
                              </Text>
                            </div>
                            <Switch
                              color="teal"
                              checked={r.processed}
                              onChange={() => handleToggleProcessed(r.id, "REVENUE", r.processed)}
                            />
                          </Group>
                        ))}
                      </Stack>
                    )}
                  </Paper>
                </Grid.Col>

                {/* Pointage Charges Récurrentes */}
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Paper p="md" radius="md" style={{ backgroundColor: "#182036" }}>
                    <Text fw={700} c="indigo.4" mb="sm">
                      Charges Récurrentes Prlevées
                    </Text>
                    {data?.recurring?.length === 0 ? (
                      <Text size="xs" c="dimmed">
                        Aucune charge récurrente.
                      </Text>
                    ) : (
                      <Stack gap="xs">
                        {data?.recurring?.map((r: any) => (
                          <Group key={r.id} justify="space-between" p="xs" style={{ backgroundColor: "#121829", borderRadius: 6 }}>
                            <div>
                              <Text size="sm" fw={600}>
                                {r.title} (Jour {r.dayOfMonth})
                              </Text>
                              <Text size="xs" c="indigo.4" fw={700}>
                                -{r.amount.toFixed(2)} €
                              </Text>
                            </div>
                            <Switch
                              color="indigo"
                              checked={r.processed}
                              onChange={() => handleToggleProcessed(r.id, "RECURRING", r.processed)}
                            />
                          </Group>
                        ))}
                      </Stack>
                    )}
                  </Paper>
                </Grid.Col>

                {/* Pointage Échéances / Crédits */}
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Paper p="md" radius="md" style={{ backgroundColor: "#182036" }}>
                    <Text fw={700} c="violet.4" mb="sm">
                      Échéances Prlevées
                    </Text>
                    {data?.installments?.length === 0 ? (
                      <Text size="xs" c="dimmed">
                        Aucune échéance active ce mois-ci.
                      </Text>
                    ) : (
                      <Stack gap="xs">
                        {data?.installments?.map((i: any) => (
                          <Group key={i.id} justify="space-between" p="xs" style={{ backgroundColor: "#121829", borderRadius: 6 }}>
                            <div>
                              <Text size="sm" fw={600}>
                                {i.title} (Jour {i.dayOfMonth})
                              </Text>
                              <Text size="xs" c={`${getCategoryColor(i.category)}.4`} fw={700}>
                                -{i.amount.toFixed(2)} €
                              </Text>
                            </div>
                            <Switch
                              color="violet"
                              checked={i.processed}
                              onChange={() => handleToggleProcessed(i.id, "INSTALLMENT", i.processed)}
                            />
                          </Group>
                        ))}
                      </Stack>
                    )}
                  </Paper>
                </Grid.Col>
              </Grid>
            </Paper>
          </Tabs.Panel>



          {/* TAB 4: REVENUS ET CHARGES FIXES */}
          <Tabs.Panel value="fixed">
            <Stack gap="lg">
              {/* Section Revenus & Remboursements côte à côte */}
              <Grid>
                {/* Colonne Revenus du Mois */}
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper p="lg" radius="md" style={{ backgroundColor: "#121829", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <Group justify="space-between" mb="md">
                      <Title order={4} style={{ color: "#fff" }}>
                        Revenus du Mois
                      </Title>
                      <Button size="xs" color="teal" leftSection={<IconPlus size={14} />} onClick={() => {
                        setEntryCategory("REVENUE");
                        setEntryFrequency("FIXED");
                        setRevMonth(month === 0 ? new Date().getMonth() + 1 : month);
                        setRevYear(year);
                        setRevenueModal(true);
                      }}>
                        Ajouter un Revenu
                      </Button>
                    </Group>
                    <Table>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Libellé</Table.Th>
                          <Table.Th>Type</Table.Th>
                          <Table.Th>Montant</Table.Th>
                          <Table.Th>Action</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {data?.revenues?.map((r: any) => (
                          <Table.Tr key={r.id}>
                            <Table.Td fw={600}>
                              <Text size="sm" fw={600}>{r.title}</Text>
                            </Table.Td>
                            <Table.Td>
                              <Badge color={r.type === "FIXED" ? "teal" : "blue"} variant="light">
                                {r.type === "FIXED" ? "Fixe" : "Variable"}
                              </Badge>
                            </Table.Td>
                            <Table.Td fw={700} c="teal.4">
                              +{r.amount.toFixed(2)} €
                            </Table.Td>
                            <Table.Td>
                              <Group gap={4}>
                                <Tooltip label="Ajuster ou modifier">
                                  <ActionIcon color="blue" variant="subtle" onClick={() => handleOpenEditModal({
                                    id: r.id,
                                    title: r.title,
                                    type: "REVENUE",
                                    subType: r.type,
                                    currentAmount: r.amount,
                                    originalAmount: r.originalAmount,
                                    hasOverride: r.hasOverride,
                                  })}>
                                    <IconEdit size={16} />
                                  </ActionIcon>
                                </Tooltip>
                                <ActionIcon color="red" variant="subtle" onClick={() => deleteRevenue(activeWalletId, r.id).then(loadData)}>
                                  <IconTrash size={16} />
                                </ActionIcon>
                              </Group>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Paper>
                </Grid.Col>

                {/* Colonne Remboursements en ma faveur */}
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper p="lg" radius="md" style={{ backgroundColor: "#121829", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <Group justify="space-between" mb="md">
                      <Title order={4} style={{ color: "#fff" }}>
                        Remboursements en ma faveur
                      </Title>
                      <Button size="xs" color="teal" leftSection={<IconPlus size={14} />} onClick={() => {
                        setEntryCategory("REIMBURSEMENT");
                        setEntryFrequency("FIXED");
                        setRevMonth(month === 0 ? new Date().getMonth() + 1 : month);
                        setRevYear(year);
                        setRevenueModal(true);
                      }}>
                        Ajouter un Remboursement
                      </Button>
                    </Group>
                    <Table>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Libellé</Table.Th>
                          <Table.Th>Montant</Table.Th>
                          <Table.Th>Action</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {data?.reimbursements?.map((r: any) => (
                          <Table.Tr key={r.id}>
                            <Table.Td fw={600}>
                              <Text size="sm" fw={600}>{r.title}</Text>
                            </Table.Td>
                            <Table.Td fw={700} c="teal.4">
                              +{r.amount.toFixed(2)} €
                            </Table.Td>
                            <Table.Td>
                              <Group gap={4}>
                                <Tooltip label="Ajuster ou modifier">
                                  <ActionIcon color="blue" variant="subtle" onClick={() => handleOpenEditModal({
                                    id: r.id,
                                    title: r.title,
                                    type: "REVENUE",
                                    subType: r.type,
                                    currentAmount: r.amount,
                                    originalAmount: r.originalAmount,
                                    hasOverride: r.hasOverride,
                                  })}>
                                    <IconEdit size={16} />
                                  </ActionIcon>
                                </Tooltip>
                                <ActionIcon color="red" variant="subtle" onClick={() => deleteRevenue(activeWalletId, r.id).then(loadData)}>
                                  <IconTrash size={16} />
                                </ActionIcon>
                              </Group>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Paper>
                </Grid.Col>
              </Grid>

              {/* Section Charges Récurrentes & Échéances */}
              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper p="lg" radius="md" style={{ backgroundColor: "#121829", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <Group justify="space-between" mb="md">
                      <Title order={4} style={{ color: "#fff" }}>
                        Charges Récurrentes
                      </Title>
                      <Button size="xs" color="indigo" leftSection={<IconPlus size={14} />} onClick={() => setRecurringModal(true)}>
                        Ajouter une charge
                      </Button>
                    </Group>
                    <Table highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th style={{ cursor: "pointer", userSelect: "none" }} onClick={() => handleRecSort("title")}>
                            <Group gap={4} wrap="nowrap">
                              <Text size="xs" fw={700}>Libellé</Text>
                              {recSortField === "title" ? (
                                recSortOrder === "asc" ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />
                              ) : (
                                <IconSelector size={14} style={{ opacity: 0.3 }} />
                              )}
                            </Group>
                          </Table.Th>
                          <Table.Th style={{ cursor: "pointer", userSelect: "none" }} onClick={() => handleRecSort("category")}>
                            <Group gap={4} wrap="nowrap">
                              <Text size="xs" fw={700}>Catégorie</Text>
                              {recSortField === "category" ? (
                                recSortOrder === "asc" ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />
                              ) : (
                                <IconSelector size={14} style={{ opacity: 0.3 }} />
                              )}
                            </Group>
                          </Table.Th>
                          <Table.Th style={{ cursor: "pointer", userSelect: "none" }} onClick={() => handleRecSort("dayOfMonth")}>
                            <Group gap={4} wrap="nowrap">
                              <Text size="xs" fw={700}>Jour</Text>
                              {recSortField === "dayOfMonth" ? (
                                recSortOrder === "asc" ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />
                              ) : (
                                <IconSelector size={14} style={{ opacity: 0.3 }} />
                              )}
                            </Group>
                          </Table.Th>
                          <Table.Th style={{ cursor: "pointer", userSelect: "none" }} onClick={() => handleRecSort("amount")}>
                            <Group gap={4} wrap="nowrap">
                              <Text size="xs" fw={700}>Montant</Text>
                              {recSortField === "amount" ? (
                                recSortOrder === "asc" ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />
                              ) : (
                                <IconSelector size={14} style={{ opacity: 0.3 }} />
                              )}
                            </Group>
                          </Table.Th>
                          <Table.Th>Actions</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {sortedRecurring.map((r: any) => (
                          <Table.Tr key={r.id}>
                            <Table.Td fw={600}>
                              <Text size="sm" fw={600}>{r.title}</Text>
                            </Table.Td>
                            <Table.Td>
                              <Badge color={getCategoryColor(r.category)} variant="filled" size="sm">
                                {r.category || "Général"}
                              </Badge>
                            </Table.Td>
                            <Table.Td fw={600}>{r.dayOfMonth}</Table.Td>
                            <Table.Td fw={700} c={`${getCategoryColor(r.category)}.4`}>
                              -{r.amount.toFixed(2)} €
                            </Table.Td>
                            <Table.Td>
                              <Group gap={4}>
                                <Tooltip label="Ajuster ou modifier">
                                  <ActionIcon color="blue" variant="subtle" onClick={() => handleOpenEditModal({
                                    id: r.id,
                                    title: r.title,
                                    type: "RECURRING",
                                    category: r.category,
                                    dayOfMonth: r.dayOfMonth,
                                    currentAmount: r.amount,
                                    originalAmount: r.originalAmount,
                                    hasOverride: r.hasOverride,
                                  })}>
                                    <IconEdit size={16} />
                                  </ActionIcon>
                                </Tooltip>
                                <ActionIcon color="red" variant="subtle" onClick={() => deleteRecurringExpense(activeWalletId, r.id).then(loadData)}>
                                  <IconTrash size={16} />
                                </ActionIcon>
                              </Group>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Paper>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper p="lg" radius="md" style={{ backgroundColor: "#121829", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <Group justify="space-between" mb="md">
                      <Title order={4} style={{ color: "#fff" }}>
                        Paiements Échelonnés / Crédits
                      </Title>
                      <Button size="xs" color="violet" leftSection={<IconPlus size={14} />} onClick={() => setInstallmentModal(true)}>
                        Ajouter un crédit
                      </Button>
                    </Group>
                    <Table highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Libellé</Table.Th>
                          <Table.Th>Catégorie</Table.Th>
                          <Table.Th>Jour</Table.Th>
                          <Table.Th>Période</Table.Th>
                          <Table.Th>Montant/Mois</Table.Th>
                          <Table.Th>Actions</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {data?.installments?.map((i: any) => (
                          <Table.Tr key={i.id}>
                            <Table.Td fw={600}>{i.title}</Table.Td>
                            <Table.Td>
                              <Badge color={getCategoryColor(i.category)} variant="filled" size="sm">
                                {i.category || "Général"}
                              </Badge>
                            </Table.Td>
                            <Table.Td fw={600}>{i.dayOfMonth}</Table.Td>
                            <Table.Td>
                              <Text size="xs" c="dimmed">
                                {i.startMonth}/{i.startYear} ➔ {i.endMonth}/{i.endYear}
                              </Text>
                            </Table.Td>
                            <Table.Td fw={700} c={`${getCategoryColor(i.category)}.4`}>
                              -{i.amount.toFixed(2)} €
                            </Table.Td>
                            <Table.Td>
                              <Group gap={4}>
                                <Tooltip label="Modifier le crédit">
                                  <ActionIcon color="blue" variant="subtle" onClick={() => handleOpenEditModal({
                                    id: i.id,
                                    title: i.title,
                                    type: "INSTALLMENT",
                                    category: i.category,
                                    dayOfMonth: i.dayOfMonth,
                                    startMonth: i.startMonth,
                                    startYear: i.startYear,
                                    endMonth: i.endMonth,
                                    endYear: i.endYear,
                                    currentAmount: i.amount,
                                    originalAmount: i.amount,
                                    hasOverride: false,
                                  })}>
                                    <IconEdit size={16} />
                                  </ActionIcon>
                                </Tooltip>
                                <ActionIcon color="red" variant="subtle" onClick={() => deleteInstallment(activeWalletId, i.id).then(loadData)}>
                                  <IconTrash size={16} />
                                </ActionIcon>
                              </Group>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Paper>
                </Grid.Col>
              </Grid>
            </Stack>
          </Tabs.Panel>

          {/* TAB 5: TRANSACTIONS QUOTIDIENNES */}
          <Tabs.Panel value="transactions">
            <Paper p="lg" radius="md" style={{ backgroundColor: "#121829", border: "1px solid rgba(255,255,255,0.06)" }}>
              <Group justify="space-between" mb="md">
                <Title order={4} style={{ color: "#fff" }}>
                  Historique des Dépenses ({getMonthLabel(month)} {year})
                </Title>
                <Button variant="gradient" gradient={{ from: "teal", to: "cyan" }} leftSection={<IconPlus size={16} />} onClick={() => {
                  setTrxMonth(month === 0 ? new Date().getMonth() + 1 : month);
                  setTrxYear(year);
                  setTransactionModal(true);
                }}>
                  Saisir une dépense
                </Button>
              </Group>

              {/* Filter & Search */}
              <Group mb="md">
                <TextInput
                  placeholder="Rechercher par titre..."
                  leftSection={<IconSearch size={16} />}
                  value={searchTx}
                  onChange={(e) => setSearchTx(e.target.value)}
                  style={{ flex: 1 }}
                />
              </Group>

              {!filteredTransactions || filteredTransactions.length === 0 ? (
                <Text size="sm" c="dimmed" ta="center" py="xl">
                  Aucune dépense trouvée.
                </Text>
              ) : (
                <Table highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Jour</Table.Th>
                      <Table.Th>Libellé</Table.Th>
                      <Table.Th>Catégorie</Table.Th>
                      <Table.Th>Montant</Table.Th>
                      <Table.Th>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {filteredTransactions.map((t: any) => (
                      <Table.Tr key={t.id}>
                        <Table.Td fw={600}>{t.day}</Table.Td>
                        <Table.Td>{t.title}</Table.Td>
                        <Table.Td>
                          <Badge color={getCategoryColor(t.category)} variant="filled" size="sm">
                            {t.category}
                          </Badge>
                        </Table.Td>
                        <Table.Td fw={700} c={`${getCategoryColor(t.category)}.4`}>
                          -{t.amount.toFixed(2)} €
                        </Table.Td>
                        <Table.Td>
                          <ActionIcon color="red" variant="subtle" onClick={() => deleteTransaction(activeWalletId, t.id).then(loadData)}>
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </Paper>
          </Tabs.Panel>

          {/* TAB 6: VIREMENTS INTER-PORTEFEUILLES */}
          {wallets.length >= 2 && (
            <Tabs.Panel value="transfers">
              <Stack gap="md">
                <Paper p="lg" radius="md" style={{ backgroundColor: "#121829", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <Group justify="space-between" mb="md">
                    <div>
                      <Title order={4} style={{ color: "#fff" }}>
                        Virements Inter-Portefeuilles
                      </Title>
                      <Text size="xs" c="dimmed">
                        Prévoyez et transférez des fonds directement d'un portefeuille vers un autre.
                      </Text>
                    </div>
                    <Button
                      size="xs"
                      color="cyan"
                      leftSection={<IconArrowsExchange size={14} />}
                      onClick={() => {
                        const otherWallet = wallets.find((w) => w.id !== activeWalletId);
                        if (otherWallet) setTransferTargetWalletId(otherWallet.id);
                        setTransferModal(true);
                      }}
                    >
                      Nouveau Virement Inter-Portefeuille
                    </Button>
                  </Group>

                  <Grid gap="md">
                    {/* Virements Émis (Sortants) */}
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Paper p="md" radius="md" style={{ backgroundColor: "#182036", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <Title order={5} style={{ color: "#fff" }} mb="xs">
                          Virements Émis (Sortants)
                        </Title>
                        {!data?.transfersSent || data.transfersSent.length === 0 ? (
                          <Text size="xs" c="dimmed" py="sm">
                            Aucun virement émis depuis ce portefeuille pour {getMonthLabel(month)}.
                          </Text>
                        ) : (
                          <Table highlightOnHover>
                            <Table.Thead>
                              <Table.Tr>
                                <Table.Th>Pointé</Table.Th>
                                <Table.Th>Motif</Table.Th>
                                <Table.Th>Destinataire</Table.Th>
                                <Table.Th>Montant</Table.Th>
                                <Table.Th>Action</Table.Th>
                              </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                              {data.transfersSent.map((t: any) => (
                                <Table.Tr key={t.id}>
                                  <Table.Td>
                                    <Checkbox
                                      checked={t.processed}
                                      onChange={() => handleToggleProcessed(t.id, "TRANSFER" as any, t.processed)}
                                      color="cyan"
                                    />
                                  </Table.Td>
                                  <Table.Td fw={600}>{t.title}</Table.Td>
                                  <Table.Td>
                                    <Badge color="cyan" variant="light" size="sm">
                                      {t.targetWallet?.name || "Portefeuille"}
                                    </Badge>
                                  </Table.Td>
                                  <Table.Td fw={700} c="cyan.4">
                                    {t.isPercentage ? (
                                      <Badge color="cyan" variant="filled" size="sm">
                                        {t.percentage}% (-{t.amount.toFixed(2)} €)
                                      </Badge>
                                    ) : (
                                      `-${t.amount.toFixed(2)} €`
                                    )}
                                  </Table.Td>
                                  <Table.Td>
                                    <ActionIcon color="red" variant="subtle" onClick={() => deleteWalletTransfer(activeWalletId, t.id).then(loadData)}>
                                      <IconTrash size={16} />
                                    </ActionIcon>
                                  </Table.Td>
                                </Table.Tr>
                              ))}
                            </Table.Tbody>
                          </Table>
                        )}
                      </Paper>
                    </Grid.Col>

                    {/* Virements Reçus (Entrants) */}
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Paper p="md" radius="md" style={{ backgroundColor: "#182036", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <Title order={5} style={{ color: "#fff" }} mb="xs">
                          Virements Reçus (Entrants)
                        </Title>
                        {!data?.transfersReceived || data.transfersReceived.length === 0 ? (
                          <Text size="xs" c="dimmed" py="sm">
                            Aucun virement reçu sur ce portefeuille pour {getMonthLabel(month)}.
                          </Text>
                        ) : (
                          <Table highlightOnHover>
                            <Table.Thead>
                              <Table.Tr>
                                <Table.Th>Motif</Table.Th>
                                <Table.Th>Émetteur</Table.Th>
                                <Table.Th>Origine</Table.Th>
                                <Table.Th>Montant</Table.Th>
                              </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                              {data.transfersReceived.map((t: any) => (
                                <Table.Tr key={t.id}>
                                  <Table.Td fw={600}>{t.title}</Table.Td>
                                  <Table.Td>
                                    <Badge color="teal" variant="filled" size="sm">
                                      {t.createdBy?.name || t.createdBy?.email}
                                    </Badge>
                                  </Table.Td>
                                  <Table.Td style={{ fontSize: "12px" }}>
                                    <Text size="xs" c="dimmed">{t.sourceWallet?.name}</Text>
                                  </Table.Td>
                                  <Table.Td fw={700} c="teal.4">
                                    +{t.amount.toFixed(2)} €
                                  </Table.Td>
                                </Table.Tr>
                              ))}
                            </Table.Tbody>
                          </Table>
                        )}
                      </Paper>
                    </Grid.Col>
                  </Grid>
                </Paper>
              </Stack>
            </Tabs.Panel>
          )}
        </Tabs>
      </Container>

      {/* ==========================================================================
          MODALS
         ========================================================================== */}

      {/* Modal Nouveau Portefeuille */}
      <Modal opened={createWalletModal} onClose={() => setCreateWalletModal(false)} title="Créer un Portefeuille" centered>
        <Stack gap="md">
          <TextInput label="Nom du portefeuille" placeholder="ex: Budget Famille, Voyages..." value={newWalletName} onChange={(e) => setNewWalletName(e.target.value)} />
          <Button color="teal" fullWidth onClick={handleCreateWallet}>
            Créer
          </Button>
        </Stack>
      </Modal>

      {/* Modal Partage & Membres */}
      <Modal opened={shareWalletModal} onClose={() => setShareWalletModal(false)} title="Gestion des Membres & Partage" centered size="lg">
        <Stack gap="md">
          <Paper p="sm" radius="md" style={{ backgroundColor: "#182036" }}>
            <Text size="sm" fw={700} mb="xs">
              Inviter un membre
            </Text>
            <Group gap="xs">
              <Autocomplete
                placeholder="Rechercher par nom ou e-mail..."
                style={{ flex: 1 }}
                data={availableUsers.map((u) => (u.name ? `${u.name} (${u.email})` : u.email))}
                value={inviteEmail}
                onChange={(val) => setInviteEmail(val)}
              />
              <Select
                data={[
                  { label: "Accès Complet", value: "FULL_ACCESS" },
                  { label: "Lecture Seule", value: "READ_ONLY" },
                ]}
                value={inviteRole}
                onChange={(val) => val && setInviteRole(val as PermissionLevel)}
                style={{ width: 140 }}
              />
              <Button color="teal" onClick={handleInviteMember}>
                Inviter
              </Button>
            </Group>
          </Paper>

          <Text size="sm" fw={700} mt="xs">
            Membres Actuels
          </Text>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Utilisateur</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Rôle</Table.Th>
                <Table.Th>Action</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {members.map((m) => (
                <Table.Tr key={m.userId}>
                  <Table.Td fw={600}>{m.name || "Invité"}</Table.Td>
                  <Table.Td>{m.email}</Table.Td>
                  <Table.Td>
                    <Badge color={m.role === "OWNER" ? "teal" : "blue"}>{m.role}</Badge>
                  </Table.Td>
                  <Table.Td>
                    {m.role !== "OWNER" && (
                      <ActionIcon color="red" variant="subtle" onClick={() => handleRemoveMember(m.userId)}>
                        <IconTrash size={16} />
                      </ActionIcon>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Stack>
      </Modal>

      {/* Modal Revenu ou Remboursement */}
      <Modal opened={revenueModal} onClose={() => setRevenueModal(false)} title="Ajouter une Entrée d'argent" centered>
        <Stack gap="md">
          <TextInput label="Libellé" placeholder="ex: Salaire, Remboursement Mutuelle, CPAM..." value={revTitle} onChange={(e) => setRevTitle(e.target.value)} />
          <NumberInput
            label="Montant (€)"
            value={revAmount}
            onChange={(val) => setRevAmount(val)}
            min={0}
            decimalScale={2}
            decimalSeparator=","
            allowNegative={false}
          />

          <Stack gap={4}>
            <Text size="xs" fw={700} c="dimmed">Nature du montant</Text>
            <SegmentedControl
              fullWidth
              color="teal"
              value={entryCategory}
              onChange={(val) => setEntryCategory(val as "REVENUE" | "REIMBURSEMENT")}
              data={[
                { label: "Revenu", value: "REVENUE" },
                { label: "Remboursement", value: "REIMBURSEMENT" },
              ]}
            />
          </Stack>

          <Stack gap={4}>
            <Text size="xs" fw={700} c="dimmed">Fréquence</Text>
            <SegmentedControl
              fullWidth
              color="teal"
              value={entryFrequency}
              onChange={(val) => setEntryFrequency(val as "FIXED" | "VARIABLE")}
              data={[
                { label: "Fixe (Mensuel)", value: "FIXED" },
                { label: "Variable (Ponctuel)", value: "VARIABLE" },
              ]}
            />
          </Stack>

          <Group grow>
            <Select
              label="Mois"
              data={MONTH_OPTIONS}
              value={revMonth.toString()}
              onChange={(val) => val && setRevMonth(parseInt(val))}
              maxDropdownHeight={450}
            />
            <NumberInput label="Année" value={revYear} onChange={(val) => setRevYear(Number(val))} />
          </Group>
          <Button color="teal" fullWidth onClick={handleAddRevenue}>
            Enregistrer
          </Button>
        </Stack>
      </Modal>

      {/* Modal Charge Récurrente */}
      <Modal opened={recurringModal} onClose={() => setRecurringModal(false)} title="Ajouter une Charge Récurrente" centered>
        <Stack gap="md">
          <TextInput label="Libellé" placeholder="ex: Loyer, Netflix, EDF..." value={recTitle} onChange={(e) => setRecTitle(e.target.value)} />
          <NumberInput
            label="Montant (€)"
            value={recAmount}
            onChange={(val) => setRecAmount(val)}
            min={0}
            decimalScale={2}
            decimalSeparator=","
            allowNegative={false}
          />
          <CategorySelect label="Catégorie" value={recCategory} onChange={setRecCategory} existingCategories={data?.categories} />
          <NumberInput label="Jour du mois (1-31)" value={recDay} onChange={(val) => setRecDay(typeof val === "number" ? val : "")} min={1} max={31} />
          <Button color="indigo" fullWidth onClick={handleAddRecurring}>
            Enregistrer
          </Button>
        </Stack>
      </Modal>

      {/* Modal Crédit / Échéances */}
      <Modal opened={installmentModal} onClose={() => setInstallmentModal(false)} title="Ajouter un Paiement Échelonné" centered>
        <Stack gap="md">
          <TextInput label="Libellé" placeholder="ex: Matériel Informatique 4x, Crédit Auto..." value={instTitle} onChange={(e) => setInstTitle(e.target.value)} />
          <Stack gap={4}>
            <Text size="xs" fw={700} c="dimmed">Type d'engagement</Text>
            <SegmentedControl
              fullWidth
              color="violet"
              value={instCategory}
              onChange={setInstCategory}
              data={[
                { label: "Paiement échelonné", value: "Paiement échelonné" },
                { label: "Crédit", value: "Crédit" },
              ]}
            />
          </Stack>
          <NumberInput
            label="Montant Mensuel (€)"
            value={instAmount}
            onChange={(val) => setInstAmount(val)}
            min={0}
            decimalScale={2}
            decimalSeparator=","
            allowNegative={false}
          />
          <NumberInput label="Jour du mois (1-31)" value={instDay} onChange={(val) => setInstDay(typeof val === "number" ? val : "")} min={1} max={31} />
          <Group grow>
            <Select
              label="Mois de Début"
              data={MONTH_OPTIONS}
              value={instStartMonth.toString()}
              onChange={(val) => val && setInstStartMonth(parseInt(val))}
              maxDropdownHeight={450}
            />
            <NumberInput label="Année de Début" value={instStartYear} onChange={(val) => setInstStartYear(Number(val))} />
          </Group>
          <Group grow>
            <Select
              label="Mois de Fin"
              data={MONTH_OPTIONS}
              value={instEndMonth.toString()}
              onChange={(val) => val && setInstEndMonth(parseInt(val))}
              maxDropdownHeight={450}
            />
            <NumberInput label="Année de Fin" value={instEndYear} onChange={(val) => setInstEndYear(Number(val))} />
          </Group>
          <Button color="violet" fullWidth onClick={handleAddInstallment}>
            Enregistrer
          </Button>
        </Stack>
      </Modal>

      {/* Modal Enveloppe Budgétaire */}
      <Modal opened={envelopeModal} onClose={() => setEnvelopeModal(false)} title="Créer une Enveloppe Budgétaire" centered>
        <Stack gap="md">
          <CategorySelect label="Catégorie" value={envCategory} onChange={setEnvCategory} existingCategories={data?.categories} />
          <NumberInput
            label="Plafond Max Mensuel (€) — Optionnel"
            placeholder="Laisser vide si aucun plafond"
            value={envLimit}
            onChange={(val) => setEnvLimit(val)}
            min={0}
            decimalScale={2}
            decimalSeparator=","
            allowNegative={false}
          />
          <Select label="Couleur de l'enveloppe" data={PRESET_COLORS} value={envColor} onChange={(val) => val && setEnvColor(val)} />
          <Button color="teal" fullWidth onClick={handleSaveEnvelope}>
            Enregistrer l'Enveloppe
          </Button>
        </Stack>
      </Modal>

      {/* Modal Dépense Quotidienne */}
      <Modal opened={transactionModal} onClose={() => setTransactionModal(false)} title="Saisir une Dépense" centered>
        <Stack gap="md">
          <TextInput label="Libellé de la dépense" placeholder="ex: Courses Carrefour, Plein d'essence..." value={trxTitle} onChange={(e) => setTrxTitle(e.target.value)} />
          <NumberInput
            label="Montant (€)"
            value={trxAmount}
            onChange={(val) => setTrxAmount(val)}
            min={0}
            decimalScale={2}
            decimalSeparator=","
            allowNegative={false}
          />
          <CategorySelect label="Catégorie (identique à l'enveloppe si applicable)" value={trxCategory} onChange={setTrxCategory} existingCategories={data?.categories} />
          <NumberInput label="Jour du mois" value={trxDay} onChange={(val) => setTrxDay(typeof val === "number" ? val : "")} min={1} max={31} />
          <TextInput label="Notes optionnelles" placeholder="Détails supplémentaires..." value={trxNotes} onChange={(e) => setTrxNotes(e.target.value)} />
          <Button color="teal" fullWidth onClick={handleAddTransaction}>
            Enregistrer la dépense
          </Button>
        </Stack>
      </Modal>

      {/* Modal Confirmation de Suppression de Portefeuille */}
      <Modal
        opened={confirmDeleteWalletModal}
        onClose={() => setConfirmDeleteWalletModal(false)}
        title="Supprimer le Portefeuille"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            Êtes-vous sûr de vouloir supprimer définitivement le portefeuille{" "}
            <strong style={{ color: "#fff" }}>{activeWallet?.name}</strong> et l'ensemble de ses données (revenus, charges, enveloppes, dépenses) ?
          </Text>
          <Text size="xs" c="red.4" fw={700}>
            Cette action est irréversible.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setConfirmDeleteWalletModal(false)}>
              Annuler
            </Button>
            <Button color="red" leftSection={<IconTrash size={16} />} onClick={handleDeleteWallet}>
              Supprimer définitivement
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal Ajustement / Modification de Revenu ou Charge */}
      <Modal
        opened={editOverrideModal}
        onClose={() => {
          setEditOverrideModal(false);
          setEditTarget(null);
        }}
        title={`Modifier: ${editTarget?.title || ""}`}
        centered
      >
        <Stack gap="md">
          <TextInput
            label="Libellé"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
          />

          {editTarget?.type === "RECURRING" ? (
            <>
              <CategorySelect
                label="Catégorie"
                value={editCategory}
                onChange={setEditCategory}
                existingCategories={data?.categories}
              />
              <NumberInput
                label="Jour du mois (1-31)"
                value={editDay}
                onChange={(val) => setEditDay(typeof val === "number" ? val : "")}
                min={1}
                max={31}
              />
            </>
          ) : editTarget?.type === "INSTALLMENT" ? (
            <>
              <Stack gap={4}>
                <Text size="xs" fw={700} c="dimmed">Type d'engagement</Text>
                <SegmentedControl
                  fullWidth
                  color="violet"
                  value={editCategory}
                  onChange={setEditCategory}
                  data={[
                    { label: "Paiement échelonné", value: "Paiement échelonné" },
                    { label: "Crédit", value: "Crédit" },
                  ]}
                />
              </Stack>
              <NumberInput
                label="Jour du mois (1-31)"
                value={editDay}
                onChange={(val) => setEditDay(typeof val === "number" ? val : "")}
                min={1}
                max={31}
              />
              <Group grow>
                <Select
                  label="Mois de Début"
                  data={MONTH_OPTIONS}
                  value={editInstStartMonth.toString()}
                  onChange={(val) => val && setEditInstStartMonth(parseInt(val))}
                  maxDropdownHeight={450}
                />
                <NumberInput label="Année de Début" value={editInstStartYear} onChange={(val) => setEditInstStartYear(Number(val))} />
              </Group>
              <Group grow>
                <Select
                  label="Mois de Fin"
                  data={MONTH_OPTIONS}
                  value={editInstEndMonth.toString()}
                  onChange={(val) => val && setEditInstEndMonth(parseInt(val))}
                  maxDropdownHeight={450}
                />
                <NumberInput label="Année de Fin" value={editInstEndYear} onChange={(val) => setEditInstEndYear(Number(val))} />
              </Group>
            </>
          ) : (
            <>
              <Stack gap={4}>
                <Text size="xs" fw={700} c="dimmed">Nature du montant</Text>
                <SegmentedControl
                  fullWidth
                  color="teal"
                  value={editEntryCategory}
                  onChange={(val) => setEditEntryCategory(val as "REVENUE" | "REIMBURSEMENT")}
                  data={[
                    { label: "Revenu", value: "REVENUE" },
                    { label: "Remboursement", value: "REIMBURSEMENT" },
                  ]}
                />
              </Stack>

              <Stack gap={4}>
                <Text size="xs" fw={700} c="dimmed">Fréquence</Text>
                <SegmentedControl
                  fullWidth
                  color="teal"
                  value={editEntryFrequency}
                  onChange={(val) => setEditEntryFrequency(val as "FIXED" | "VARIABLE")}
                  data={[
                    { label: "Fixe (Mensuel)", value: "FIXED" },
                    { label: "Variable (Ponctuel)", value: "VARIABLE" },
                  ]}
                />
              </Stack>
            </>
          )}

          {editTarget?.type !== "INSTALLMENT" && (
            <Radio.Group
              value={editScope}
              onChange={(val) => setEditScope(val as "MONTH" | "GLOBAL")}
              name="editScope"
              label="Portée du montant"
            >
              <Stack gap="xs" mt="xs">
                <Radio
                  value="MONTH"
                  label={`Ajustement ponctuel pour ${getMonthLabel(month)} ${year}`}
                />
                <Radio
                  value="GLOBAL"
                  label="Modification globale du montant (tous les mois)"
                />
              </Stack>
            </Radio.Group>
          )}

          <NumberInput
            label="Montant (€)"
            value={editAmount}
            onChange={(val) => setEditAmount(val)}
            min={0}
            decimalScale={2}
            decimalSeparator=","
            allowNegative={false}
          />

          {editTarget?.hasOverride && (
            <Paper p="xs" radius="md" style={{ backgroundColor: "#182036" }}>
              <Group justify="space-between">
                <div>
                  <Text size="xs" fw={700} c="orange.4">
                    Ajustement ponctuel actif ce mois-ci
                  </Text>
                  <Text size="xs" c="dimmed">
                    Montant global de référence: {editTarget.originalAmount.toFixed(2)} €
                  </Text>
                </div>
                <Button size="xs" variant="light" color="orange" onClick={handleRemoveOverride}>
                  Rétablir montant global
                </Button>
              </Group>
            </Paper>
          )}

          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={() => setEditOverrideModal(false)}>
              Annuler
            </Button>
            <Button color="teal" onClick={handleSaveEditOverride}>
              Enregistrer les modifications
            </Button>
          </Group>
        </Stack>
      </Modal>
      {/* Modal Ajustement du Report de Déficit */}
      <Modal
        opened={deficitModal}
        onClose={() => setDeficitModal(false)}
        title={`Ajuster le Déficit Reporté (${getMonthLabel(month)} ${year})`}
        centered
      >
        <Stack gap="md">
          <Text size="xs" c="dimmed">
            Vous pouvez spécifier manuellement un montant de déficit à imputer sur ce mois. Ce montant sera déduit du Reste à vivre réel et de la Capacité d'épargne.
          </Text>
          <NumberInput
            label="Montant du déficit (€)"
            placeholder="ex: 150.00"
            value={customDeficitAmount}
            onChange={(val) => setCustomDeficitAmount(val)}
            min={0}
            decimalScale={2}
            decimalSeparator=","
            allowNegative={false}
          />
          <Group justify="space-between">
            {data?.summary?.hasManualDeficit ? (
              <Button
                variant="light"
                color="orange"
                size="xs"
                onClick={async () => {
                  const targetM = month === 0 ? new Date().getMonth() + 1 : month;
                  await removeDeficitOverride(activeWalletId, { month: targetM, year });
                  setDeficitModal(false);
                  await loadData();
                  router.refresh();
                }}
              >
                Rétablir calcul automatique
              </Button>
            ) : (
              <div />
            )}
            <Button
              color="teal"
              size="xs"
              onClick={async () => {
                const targetM = month === 0 ? new Date().getMonth() + 1 : month;
                await setDeficitOverride(activeWalletId, {
                  month: targetM,
                  year,
                  amount: parseAmount(customDeficitAmount),
                });
                setDeficitModal(false);
                await loadData();
                router.refresh();
              }}
            >
              Enregistrer le déficit
            </Button>
          </Group>
        </Stack>
      </Modal>
      {/* Modal Virement Inter-Portefeuilles */}
      <Modal
        opened={transferModal}
        onClose={() => setTransferModal(false)}
        title="Effectuer un Virement Inter-Portefeuille"
        centered
      >
        <Stack gap="md">
          <Select
            label="Portefeuille de Destination"
            data={wallets
              .filter((w) => w.id !== activeWalletId)
              .map((w) => ({ label: w.name, value: w.id }))}
            value={transferTargetWalletId}
            onChange={(val) => val && setTransferTargetWalletId(val)}
          />
          <TextInput
            label="Libellé / Motif"
            placeholder="ex: Participation loyer, Épargne commune..."
            value={transferTitle}
            onChange={(e) => setTransferTitle(e.target.value)}
          />
          <Stack gap={4}>
            <Text size="xs" fw={700} c="dimmed">Mode du virement</Text>
            <SegmentedControl
              fullWidth
              color="cyan"
              value={transferType}
              onChange={(val) => setTransferType(val as "FIXED" | "PERCENTAGE")}
              data={[
                { label: "Montant Fixe (€)", value: "FIXED" },
                { label: "Pourcentage du solde disponible (%)", value: "PERCENTAGE" },
              ]}
            />
          </Stack>
          {transferType === "FIXED" ? (
            <NumberInput
              label="Montant (€)"
              value={transferAmount}
              onChange={(val) => setTransferAmount(val)}
              min={0}
              decimalScale={2}
              decimalSeparator=","
              allowNegative={false}
            />
          ) : (
            <Stack gap="xs">
              <NumberInput
                label="Pourcentage (%)"
                placeholder="ex: 50"
                value={transferPercentage}
                onChange={(val) => setTransferPercentage(val)}
                min={1}
                max={100}
                decimalScale={2}
                decimalSeparator=","
                allowNegative={false}
              />
              <Paper p="xs" radius="sm" style={{ backgroundColor: "rgba(0,188,212,0.1)", border: "1px solid rgba(0,188,212,0.2)" }}>
                <Group justify="space-between">
                  <Text size="xs" c="dimmed">
                    Montant estimé pour ce mois :
                  </Text>
                  <Text size="sm" fw={800} c="cyan.4">
                    {previewTransferAmount.toFixed(2)} €
                  </Text>
                </Group>
                <Text style={{ fontSize: "10px" }} c="dimmed" mt={4}>
                  Base : {previewTransferBase.toFixed(2)} € (Revenus {rawRevenuesTotal.toFixed(2)}€ - Charges {rawFixedTotal.toFixed(2)}€ - Plafonds enveloppes {envLimitsSum.toFixed(2)}€)
                </Text>
              </Paper>
            </Stack>
          )}
          <Button color="cyan" fullWidth onClick={handleAddTransfer}>
            Valider le Virement
          </Button>
        </Stack>
      </Modal>
    </Box>
  );
}
