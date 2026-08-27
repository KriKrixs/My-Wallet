"use client";

import { useState, useEffect, useMemo } from "react";
import { signOut } from "next-auth/react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
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
  IconPencil,
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
  IconRepeat,
  IconEye,
  IconEyeOff,
  IconChartPie,
  IconShoppingCart,
  IconLink,
  IconExternalLink,
  IconFlame,
  IconCircleCheck,
  IconWifiOff,
  IconCalendarShare,
} from "@tabler/icons-react";
import {
  getDashboardData,
  addRevenue,
  deleteRevenue,
  moveRevenueMonth,
  addRecurringExpense,
  deleteRecurringExpense,
  addInstallment,
  deleteInstallment,
  saveBudgetEnvelope,
  deleteBudgetEnvelope,
  addTransaction,
  updateTransaction,
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
  toggleDisableItem,
  updateRevenueGlobal,
  updateRecurringExpenseGlobal,
  updateInstallmentGlobal,
  setDeficitOverride,
  removeDeficitOverride,
  createWalletTransfer,
  updateWalletTransfer,
  deleteWalletTransfer,
  updateWalletCarryoverSettings,
  getUserWallets,
  createWishlistItem,
  updateWishlistItem,
  deleteWishlistItem,
  convertWishlistItemToTransaction,
  convertWishlistItemToInstallment,
  PermissionLevel,
} from "@/lib/actions/finance";

interface WalletItem {
  id: string;
  name: string;
  currency: string;
  isPersonal?: boolean;
  role: PermissionLevel;
  isOwner: boolean;
  carryoverMode?: "NONE" | "NEXT_MONTH" | "TARGET_WALLET";
  carryoverTargetWalletId?: string | null;
}

const DEFAULT_CATEGORIES = [
  "High-Tech",
  "Alimentation / Courses",
  "Loisirs & Sorties",
  "Maison & Déco",
  "Auto & Transport",
  "Santé & Bien-être",
  "Vêtements & Mode",
  "Voyages & Vacances",
  "Cadeaux",
  "Abonnements / Services",
  "Général",
];

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
  { label: "⚪ Blanc", value: "white" },
  { label: "🟢 Vert d'eau (Teal)", value: "teal" },
  { label: "🔵 Bleu", value: "blue" },
  { label: "🟣 Violet", value: "violet" },
  { label: "🔮 Indigo", value: "indigo" },
  { label: "🍇 Raisin (Grape)", value: "grape" },
  { label: "🌸 Rose (Pink)", value: "pink" },
  { label: "🔴 Rouge", value: "red" },
  { label: "🟠 Orange", value: "orange" },
  { label: "🟡 Jaune", value: "yellow" },
  { label: "🍏 Vert Citron (Lime)", value: "lime" },
  { label: "🌿 Vert", value: "green" },
  { label: "💎 Cyan / Turquoise", value: "cyan" },
  { label: "🩶 Gris", value: "gray" },
  { label: "🌺 Framboise", value: "#e64980" },
  { label: "🌷 Magenta", value: "#d63384" },
  { label: "🪻 Améthyste", value: "#be4bdb" },
  { label: "🎆 Pourpre", value: "#7950f2" },
  { label: "🌐 Bleu Cobalt", value: "#4c6ef5" },
  { label: "🧊 Bleu Ciel", value: "#339af0" },
  { label: "🌊 Turquoise Profond", value: "#12b886" },
  { label: "☘️ Vert Émeraude", value: "#20c997" },
  { label: "🍃 Vert Menthe", value: "#51cf66" },
  { label: "🌾 Vert Olive", value: "#82c91e" },
  { label: "🍯 Miel / Ambre", value: "#fab005" },
  { label: "🍊 Mandarine", value: "#e8590c" },
  { label: "🪸 Corail", value: "#ff6b6b" },
];

function CategorySelect({
  label = "Catégorie",
  placeholder = "Sélectionner ou saisir une catégorie...",
  value,
  onChange,
  existingCategories = [],
  error,
}: {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
  existingCategories?: string[];
  error?: string;
}) {
  const [searchValue, setSearchValue] = useState("");
  const [createdOptions, setCreatedOptions] = useState<string[]>([]);

  const formattedData = useMemo(() => {
    const EXCLUDED_SYSTEM = ["crédit", "credit", "crédits", "credits", "paiement échelonné", "paiement echelonne", "paiements échelonnés", "échéance", "echeance"];
    const combined = Array.from(new Set([...(existingCategories || []), ...createdOptions, value].filter(Boolean)))
      .filter((cat) => !EXCLUDED_SYSTEM.includes(cat.trim().toLowerCase()));
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
      error={error}
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
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const VALID_TABS = ["overview", "pointage", "fixed", "transactions", "transfers", "stats", "wishlist"];

  const initialTab = useMemo(() => {
    const t = searchParams.get("tab");
    return t && VALID_TABS.includes(t) ? t : "overview";
  }, []);

  const initialUrlWallet = useMemo(() => {
    const w = searchParams.get("wallet");
    return w && initialWallets.some((item) => item.id === w) ? w : initialWalletId;
  }, [initialWallets, initialWalletId]);

  const initialUrlMonth = useMemo(() => {
    const m = searchParams.get("month");
    if (m !== null) {
      const parsed = Number(m);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 12) return parsed;
    }
    return new Date().getMonth() + 1;
  }, []);

  const initialUrlYear = useMemo(() => {
    const y = searchParams.get("year");
    if (y !== null) {
      const parsed = Number(y);
      if (!isNaN(parsed) && parsed > 2000) return parsed;
    }
    return new Date().getFullYear();
  }, []);

  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [month, setMonth] = useState<number>(initialUrlMonth);
  const [year, setYear] = useState<number>(initialUrlYear);

  const [wallets, setWallets] = useState<WalletItem[]>(initialWallets);
  const [activeWalletId, setActiveWalletId] = useState<string>(initialUrlWallet);

  const updateUrlParams = (updates: { tab?: string; wallet?: string; month?: number; year?: number }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (updates.tab !== undefined) params.set("tab", updates.tab);
    if (updates.wallet !== undefined) params.set("wallet", updates.wallet);
    if (updates.month !== undefined) params.set("month", updates.month.toString());
    if (updates.year !== undefined) params.set("year", updates.year.toString());

    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    updateUrlParams({ tab: newTab });
  };

  const handleWalletSelect = (newWalletId: string) => {
    setActiveWalletId(newWalletId);
    updateUrlParams({ wallet: newWalletId });
  };

  const handleMonthChange = (newMonth: number) => {
    setMonth(newMonth);
    updateUrlParams({ month: newMonth });
  };

  const handleYearChange = (newYear: number) => {
    setYear(newYear);
    updateUrlParams({ year: newYear });
  };

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t && VALID_TABS.includes(t) && t !== activeTab) {
      setActiveTab(t);
    }
    const w = searchParams.get("wallet");
    if (w && wallets.some((item) => item.id === w) && w !== activeWalletId) {
      setActiveWalletId(w);
    }
    const m = searchParams.get("month");
    if (m !== null) {
      const parsedM = Number(m);
      if (!isNaN(parsedM) && parsedM >= 0 && parsedM <= 12 && parsedM !== month) {
        setMonth(parsedM);
      }
    }
    const y = searchParams.get("year");
    if (y !== null) {
      const parsedY = Number(y);
      if (!isNaN(parsedY) && parsedY > 2000 && parsedY !== year) {
        setYear(parsedY);
      }
    }
  }, [searchParams, wallets]);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);

      const handleOffline = () => setIsOffline(true);
      const handleOnline = () => {
        setIsOffline(false);
        loadData();
      };

      window.addEventListener("offline", handleOffline);
      window.addEventListener("online", handleOnline);

      return () => {
        window.removeEventListener("offline", handleOffline);
        window.removeEventListener("online", handleOnline);
      };
    }
  }, []);

  const [actionModalItem, setActionModalItem] = useState<{
    item: any;
    type: "REVENUE" | "REIMBURSEMENT" | "RECURRING" | "INSTALLMENT" | "TRANSACTION" | "TRANSFER" | "WISHLIST";
  } | null>(null);

  const handleRowClick = (item: any, type: any) => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setActionModalItem({ item, type });
    }
  };

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
    if (!category) return "white";
    const target = category.trim().toLowerCase();
    const env = data?.envelopes?.find((e: any) => e.category.trim().toLowerCase() === target);
    const col = env?.color || "white";
    return col === "gray" ? "white" : col;
  };

  const getCategoryTextColor = (category?: string) => {
    const col = getCategoryColor(category);
    if (!col || col === "white" || col === "gray") return "white";
    if (col.startsWith("#")) return col;
    return `${col}.4`;
  };

  const MANTINE_COLOR_MAP: Record<string, string> = {
    teal: "#20c997",
    cyan: "#22b8cf",
    blue: "#339af0",
    indigo: "#4c6ef5",
    violet: "#7950f2",
    grape: "#be4bdb",
    pink: "#e64980",
    red: "#fa5252",
    orange: "#fd7e14",
    yellow: "#fab005",
    lime: "#82c91e",
    green: "#40c057",
    gray: "#adb5bd",
    white: "#f8f9fa",
  };

  const getCategoryChartColor = (category?: string, idx: number = 0) => {
    const col = getCategoryColor(category);
    const PRESET_COLORS = [
      "#20c997", "#339af0", "#7950f2", "#f783ac", "#fd7e14",
      "#40c057", "#fa5252", "#12b886", "#fab005", "#15aabf",
      "#be4bdb", "#e64980", "#82c91e", "#4dabf7", "#e8590c",
      "#d63384", "#4c6ef5", "#51cf66", "#ff6b6b", "#cc5de8",
      "#22b8cf", "#94d82d", "#fcc419", "#ff922b", "#a9e34b",
      "#74c0fc", "#66d9e8"
    ];
    if (!col || col === "white") {
      return PRESET_COLORS[idx % PRESET_COLORS.length];
    }
    if (col.startsWith("#")) return col;
    return MANTINE_COLOR_MAP[col] || PRESET_COLORS[idx % PRESET_COLORS.length];
  };

  const renderCategoryBadge = (category?: string) => {
    const col = getCategoryColor(category);
    const isWhite = col === "white";
    return (
      <Badge
        color={col}
        variant="filled"
        size="sm"
        fullWidth={false}
        styles={{
          label: {
            overflow: "visible",
            textOverflow: "clip",
            whiteSpace: "nowrap",
          },
        }}
        style={{
          width: "max-content",
          maxWidth: "none",
          whiteSpace: "nowrap",
          ...(isWhite ? { color: "#000", fontWeight: 700 } : {}),
        }}
      >
        {category || "Général"}
      </Badge>
    );
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
  const [editingTransferId, setEditingTransferId] = useState<string | null>(null);
  const [carryoverModal, setCarryoverModal] = useState(false);
  const [cMode, setCMode] = useState<"NONE" | "NEXT_MONTH" | "TARGET_WALLET">("NONE");
  const [cTargetWalletId, setCTargetWalletId] = useState<string>("");
  const [customDeficitAmount, setCustomDeficitAmount] = useState<number | string>(0);
  const [transferTargetWalletId, setTransferTargetWalletId] = useState<string>("");
  const [transferTitle, setTransferTitle] = useState("");
  const [transferType, setTransferType] = useState<"FIXED" | "PERCENTAGE">("FIXED");
  const [transferIsRecurring, setTransferIsRecurring] = useState(true);
  const [transferAmount, setTransferAmount] = useState<number | string>(100);
  const [transferPercentage, setTransferPercentage] = useState<number | string>(50);
  const [transferDay, setTransferDay] = useState<number | "">(5);

  // Wishlist / Liste d'achat State
  const [wishlistModal, setWishlistModal] = useState(false);
  const [editingWishlistId, setEditingWishlistId] = useState<string | null>(null);
  const [wishlistTitle, setWishlistTitle] = useState("");
  const [wishlistAmount, setWishlistAmount] = useState<number | string>(150);
  const [wishlistUrl, setWishlistUrl] = useState("");
  const [wishlistCategory, setWishlistCategory] = useState("");
  const [wishlistNotes, setWishlistNotes] = useState("");
  const [wishlistPriority, setWishlistPriority] = useState<string>("NORMAL");
  const [showPurchasedWishlist, setShowPurchasedWishlist] = useState(false);
  const [selectedWishlistIds, setSelectedWishlistIds] = useState<string[]>([]);
  const [safetyMarginPercent, setSafetyMarginPercent] = useState<number | string>(0);
  const [searchWishlist, setSearchWishlist] = useState("");
  const [filterWishlistCategory, setFilterWishlistCategory] = useState<string | null>(null);
  const [wishlistSortField, setWishlistSortField] = useState<"priority" | "title" | "amount" | "category">("priority");
  const [wishlistSortOrder, setWishlistSortOrder] = useState<"asc" | "desc">("desc");

  const handleWishlistSort = (field: "priority" | "title" | "amount" | "category") => {
    if (wishlistSortField === field) {
      setWishlistSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setWishlistSortField(field);
      setWishlistSortOrder(field === "priority" || field === "amount" ? "desc" : "asc");
    }
  };

  // Statistics Mode & Category Filter State
  const [statsMode, setStatsMode] = useState<string>("envelopes");
  const [statsCategoryFilter, setStatsCategoryFilter] = useState<string>("ALL");

  // Form Errors State
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Conversion Wishlist -> Finance State
  const [convertModal, setConvertModal] = useState(false);
  const [convertingItem, setConvertingItem] = useState<any>(null);
  const [convertMode, setConvertMode] = useState<"SINGLE" | "MULTIPLE" | "CREDIT">("SINGLE");
  const [convertTargetWalletId, setConvertTargetWalletId] = useState<string>("");
  const [convertAmount, setConvertAmount] = useState<number | string>(0);
  const [convertDay, setConvertDay] = useState<number | "">(new Date().getDate());
  const [convertMonth, setConvertMonth] = useState<number>(new Date().getMonth() + 1);
  const [convertYear, setConvertYear] = useState<number>(new Date().getFullYear());
  const [convertTotalMonths, setConvertTotalMonths] = useState<number | string>(4);
  const [convertInstallmentAmount, setConvertInstallmentAmount] = useState<number | string>(0);
  const [convertStartMonth, setConvertStartMonth] = useState<number>(new Date().getMonth() + 1);
  const [convertStartYear, setConvertStartYear] = useState<number>(new Date().getFullYear());
  const [convertEndMonth, setConvertEndMonth] = useState<number>(new Date().getMonth() + 1);
  const [convertEndYear, setConvertEndYear] = useState<number>(new Date().getFullYear() + 1);
  const [convertDayOfMonth, setConvertDayOfMonth] = useState<number | "">(new Date().getDate());

  const activeWallet = useMemo(() => wallets.find((w) => w.id === activeWalletId) || wallets[0], [wallets, activeWalletId]);
  const isReadOnly = activeWallet?.role === "READ_ONLY";

  const envLimitsSum = useMemo(() => {
    if (!data?.envelopes) return 0;
    return data.envelopes.reduce((acc: number, e: any) => acc + (e.hasLimit && e.limitAmount > 0 ? e.limitAmount : 0), 0);
  }, [data?.envelopes]);

  const unprocessedRevenuesTotal = useMemo(() => {
    if (!data?.revenues) return 0;
    return data.revenues
      .filter((r: any) => !r.processed && !(r.isDisabled || (r.hasOverride && r.amount === 0)))
      .reduce((acc: number, r: any) => acc + r.amount, 0);
  }, [data?.revenues]);

  const unprocessedReimbursementsTotal = useMemo(() => {
    if (!data?.reimbursements) return 0;
    return data.reimbursements
      .filter((r: any) => !r.processed && !(r.isDisabled || (r.hasOverride && r.amount === 0)))
      .reduce((acc: number, r: any) => acc + r.amount, 0);
  }, [data?.reimbursements]);

  const unprocessedRecurringTotal = useMemo(() => {
    if (!data?.recurring) return 0;
    return data.recurring
      .filter((r: any) => !r.processed && !(r.isDisabled || (r.hasOverride && r.amount === 0)))
      .reduce((acc: number, r: any) => acc + r.amount, 0);
  }, [data?.recurring]);

  const unprocessedInstallmentsTotal = useMemo(() => {
    if (!data?.installments) return 0;
    return data.installments
      .filter((i: any) => !i.processed && !(i.isDisabled || (i.hasOverride && i.amount === 0)))
      .reduce((acc: number, i: any) => acc + i.amount, 0);
  }, [data?.installments]);

  const rawRevenuesTotal = data?.summary?.totalRevenues || 0;
  const rawFixedTotal = data?.summary?.fixedExpenses || 0;
  const previewTransferBase = Math.max(0, rawRevenuesTotal - rawFixedTotal - envLimitsSum);

  // STATS 1: Enveloppes Overall
  const overallEnvelopesStats = useMemo(() => {
    if (!data || !data.envelopes) return { items: [], totalSpent: 0 };
    const items = data.envelopes
      .filter((e: any) => e.spent > 0)
      .map((e: any, idx: number) => ({
        name: e.category,
        value: Math.round(e.spent * 100) / 100,
        color: getCategoryChartColor(e.category, idx),
        limitAmount: e.limitAmount,
        hasLimit: e.hasLimit,
      }))
      .sort((a: any, b: any) => b.value - a.value);

    const totalSpent = items.reduce((acc: number, item: any) => acc + item.value, 0);
    return { items, totalSpent };
  }, [data]);

  // Options de filtrage des catégories pour les statistiques de dépenses quotidiennes
  const statsCategoryOptions = useMemo(() => {
    const opts = [{ label: "Toutes les catégories", value: "ALL" }];
    const catsSet = new Set<string>();
    if (data?.categories) {
      data.categories.forEach((cat: string) => catsSet.add(cat.trim()));
    }
    if (data?.transactions) {
      data.transactions.forEach((t: any) => {
        if (t.category) catsSet.add(t.category.trim());
      });
    }
    Array.from(catsSet)
      .sort((a, b) => a.localeCompare(b))
      .forEach((cat) => {
        opts.push({ label: cat, value: cat });
      });
    return opts;
  }, [data?.categories, data?.transactions]);

  // STATS 2A: Dépenses Quotidiennes par Libellés
  const dailyExpensesByTitleStats = useMemo(() => {
    if (!data || !data.transactions) return { items: [], total: 0 };
    const grouped: { [title: string]: { amount: number; category: string } } = {};
    data.transactions.forEach((t: any) => {
      if (t.amount > 0) {
        const cat = (t.category || "Général").trim();
        if (statsCategoryFilter !== "ALL" && cat.toLowerCase() !== statsCategoryFilter.trim().toLowerCase()) {
          return;
        }
        const title = (t.title || "Dépense").trim();
        if (!grouped[title]) {
          grouped[title] = { amount: 0, category: cat };
        }
        grouped[title].amount += t.amount;
      }
    });

    const PRESET_COLORS = [
      "#20c997", "#339af0", "#7950f2", "#f783ac", "#fd7e14",
      "#40c057", "#fa5252", "#12b886", "#fab005", "#15aabf",
      "#be4bdb", "#e64980", "#82c91e", "#4dabf7", "#e8590c",
      "#d63384", "#4c6ef5", "#51cf66", "#ff6b6b", "#cc5de8",
      "#22b8cf", "#94d82d", "#fcc419", "#ff922b", "#a9e34b",
      "#74c0fc", "#66d9e8"
    ];

    const items = Object.entries(grouped)
      .map(([name, obj], idx) => ({
        name,
        value: Math.round(obj.amount * 100) / 100,
        category: obj.category,
        color: PRESET_COLORS[idx % PRESET_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);

    const total = items.reduce((acc, item) => acc + item.value, 0);
    return { items, total };
  }, [data, statsCategoryFilter]);

  // STATS 2B: Dépenses Quotidiennes par Enveloppes / Catégories
  const dailyExpensesByCategoryStats = useMemo(() => {
    if (!data || !data.transactions) return { items: [], total: 0 };
    const grouped: { [cat: string]: number } = {};
    data.transactions.forEach((t: any) => {
      if (t.amount > 0) {
        const cat = (t.category || "Général").trim();
        if (statsCategoryFilter !== "ALL" && cat.toLowerCase() !== statsCategoryFilter.trim().toLowerCase()) {
          return;
        }
        grouped[cat] = (grouped[cat] || 0) + t.amount;
      }
    });

    const items = Object.entries(grouped)
      .map(([cat, amount], idx) => ({
        name: cat,
        value: Math.round(amount * 100) / 100,
        color: getCategoryChartColor(cat, idx),
      }))
      .sort((a, b) => b.value - a.value);

    const total = items.reduce((acc, item) => acc + item.value, 0);
    return { items, total };
  }, [data, statsCategoryFilter]);

  // STATS Summary Header KPIs
  const statsSummary = useMemo(() => {
    const totalRevenues = data?.summary?.totalRevenues || 0;
    const totalExpenses = (data?.summary?.fixedExpenses || 0) + (data?.summary?.totalTransactions || 0);
    const unspent = Math.max(0, totalRevenues - totalExpenses);
    return { totalRevenues, totalExpenses, unspent };
  }, [data]);

  const wishlistCalc = useMemo(() => {
    const pendingItems = (data?.wishlistItems || []).filter((i: any) => i.status === "PENDING");
    const selectedItems = pendingItems.filter((i: any) => selectedWishlistIds.includes(i.id));
    const selectedTotalAmount = selectedItems.reduce((acc: number, i: any) => acc + i.amount, 0);

    const netSavings = data?.summary?.netSavings || 0;
    const margin = Math.min(100, Math.max(0, Number(safetyMarginPercent) || 0));
    const safetyAmount = (netSavings * margin) / 100;
    const availableBudget = Math.max(0, netSavings - safetyAmount);

    const canAffordCash = selectedTotalAmount > 0 && availableBudget >= selectedTotalAmount;
    const deficit = Math.max(0, selectedTotalAmount - availableBudget);

    const installmentMonths = [3, 4, 6, 12];
    const feasibleInstallments = selectedTotalAmount > 0 ? installmentMonths.map((m) => {
      const monthly = selectedTotalAmount / m;
      return {
        months: m,
        monthly,
        isFeasible: availableBudget >= monthly,
      };
    }) : [];

    return {
      pendingItems,
      selectedItems,
      selectedTotalAmount,
      netSavings,
      margin,
      safetyAmount,
      availableBudget,
      canAffordCash,
      deficit,
      feasibleInstallments,
    };
  }, [data?.wishlistItems, data?.summary?.netSavings, selectedWishlistIds, safetyMarginPercent]);

  const wishlistCategoryOptions = useMemo(() => {
    const cats = Array.from(
      new Set(data?.wishlistItems?.map((w: any) => w.category?.trim()).filter(Boolean) || [])
    ).sort((a: any, b: any) => a.localeCompare(b));
    return cats.map((c: any) => ({ label: c, value: c }));
  }, [data?.wishlistItems]);

  const filteredWishlistItems = useMemo(() => {
    if (!data?.wishlistItems) return [];
    return data.wishlistItems.filter((item: any) => {
      const matchesSearch = searchWishlist.trim() === "" ||
        item.title.toLowerCase().includes(searchWishlist.toLowerCase()) ||
        (item.notes && item.notes.toLowerCase().includes(searchWishlist.toLowerCase()));
      const matchesCategory = filterWishlistCategory ? item.category === filterWishlistCategory : true;
      return matchesSearch && matchesCategory;
    });
  }, [data?.wishlistItems, searchWishlist, filterWishlistCategory]);

  const sortedWishlistItems = useMemo(() => {
    const items = [...filteredWishlistItems];

    const priorityWeights: Record<string, number> = {
      URGENT: 5,
      IMPORTANT: 4,
      MAJOR: 3,
      NORMAL: 2,
      LOW: 1,
    };

    return items.sort((a, b) => {
      let aVal: any = a[wishlistSortField];
      let bVal: any = b[wishlistSortField];

      if (wishlistSortField === "priority") {
        aVal = priorityWeights[a.priority] || 2;
        bVal = priorityWeights[b.priority] || 2;
        return wishlistSortOrder === "desc" ? bVal - aVal : aVal - bVal;
      }

      if (wishlistSortField === "title" || wishlistSortField === "category") {
        aVal = (aVal || "").toLowerCase();
        bVal = (bVal || "").toLowerCase();
        return wishlistSortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      aVal = Number(aVal) || 0;
      bVal = Number(bVal) || 0;
      return wishlistSortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [filteredWishlistItems, wishlistSortField, wishlistSortOrder]);
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
  const [editRevMonth, setEditRevMonth] = useState<number>(month === 0 ? new Date().getMonth() + 1 : month);
  const [editRevYear, setEditRevYear] = useState<number>(year);
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
  const [recStartMonth, setRecStartMonth] = useState<number>(month === 0 ? new Date().getMonth() + 1 : month);
  const [recStartYear, setRecStartYear] = useState<number>(year);
  const [editRecStartMonth, setEditRecStartMonth] = useState<number>(1);
  const [editRecStartYear, setEditRecStartYear] = useState<number>(year);

  const [instTitle, setInstTitle] = useState("");
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

  const [editingTxId, setEditingTxId] = useState<string | null>(null);

  useEffect(() => {
    const targetM = month === 0 ? new Date().getMonth() + 1 : month;
    setRevMonth(targetM);
    setRevYear(year);
    setRecStartMonth(targetM);
    setRecStartYear(year);
    setInstStartMonth(targetM);
    setInstStartYear(year);
    let endM = targetM + 3;
    let endY = year;
    if (endM > 12) {
      endM = endM - 12;
      endY = year + 1;
    }
    setInstEndMonth(endM);
    setInstEndYear(endY);
    setEnvMonth(targetM);
    setEnvYear(year);
    setTrxMonth(targetM);
    setTrxYear(year);
  }, [month, year]);

  const handleOpenAddRevenue = (type: "REVENUE" | "REIMBURSEMENT" = "REVENUE") => {
    setFormErrors({});
    setRevTitle("");
    setRevAmount(1000);
    setEntryCategory(type);
    setEntryFrequency("FIXED");
    setRevMonth(month === 0 ? new Date().getMonth() + 1 : month);
    setRevYear(year);
    setRevenueModal(true);
  };

  const handleOpenAddRecurring = () => {
    setFormErrors({});
    setRecTitle("");
    setRecAmount(50);
    setRecCategory("Logement");
    setRecDay(5);
    setRecStartMonth(month === 0 ? new Date().getMonth() + 1 : month);
    setRecStartYear(year);
    setRecurringModal(true);
  };

  const handleOpenAddInstallment = () => {
    setFormErrors({});
    const targetM = month === 0 ? new Date().getMonth() + 1 : month;
    setInstTitle("");
    setInstAmount(50);
    setInstCategory("Paiement échelonné");
    setInstDay(10);
    setInstStartMonth(targetM);
    setInstStartYear(year);
    let endM = targetM + 3;
    let endY = year;
    if (endM > 12) {
      endM = endM - 12;
      endY = year + 1;
    }
    setInstEndMonth(endM);
    setInstEndYear(endY);
    setInstallmentModal(true);
  };

  const handleOpenAddEnvelope = () => {
    setFormErrors({});
    setEnvCategory("");
    setEnvLimit("");
    setEnvColor("teal");
    setEnvMonth(month === 0 ? new Date().getMonth() + 1 : month);
    setEnvYear(year);
    setEnvelopeModal(true);
  };

  const handleOpenAddTransaction = () => {
    setFormErrors({});
    setEditingTxId(null);
    setTrxTitle("");
    setTrxAmount(25);
    setTrxCategory("Alimentation");
    setTrxColor("teal");
    setTrxDay(new Date().getDate());
    setTrxMonth(month === 0 ? new Date().getMonth() + 1 : month);
    setTrxYear(year);
    setTrxNotes("");
    setTransactionModal(true);
  };

  const handleOpenEditTransaction = (t: any) => {
    setFormErrors({});
    setEditingTxId(t.id);
    setTrxTitle(t.title);
    setTrxAmount(t.amount);
    setTrxCategory(t.category);
    setTrxColor(t.color || "teal");
    setTrxDay(t.day);
    setTrxMonth(t.month);
    setTrxYear(t.year);
    setTrxNotes(t.notes || "");
    setTransactionModal(true);
  };

  const [searchTx, setSearchTx] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [txSortField, setTxSortField] = useState<"day" | "title" | "category" | "amount">("day");
  const [txSortOrder, setTxSortOrder] = useState<"asc" | "desc">("desc");

  const handleTxSort = (field: "day" | "title" | "category" | "amount") => {
    if (txSortField === field) {
      setTxSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setTxSortField(field);
      setTxSortOrder("asc");
    }
  };

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
    const trimmed = newWalletName.trim();
    if (!trimmed) {
      setFormErrors({ newWalletName: "Le nom du portefeuille est obligatoire." });
      return;
    }
    setFormErrors({});
    try {
      const w = await createWallet(trimmed);
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
    setFormErrors({});
    if (!inviteEmail.trim()) {
      setFormErrors({ inviteEmail: "L'adresse e-mail est obligatoire." });
      return;
    } else if (!inviteEmail.includes("@")) {
      setFormErrors({ inviteEmail: "Veuillez saisir une adresse e-mail valide." });
      return;
    }

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
    setFormErrors({});
    const errors: Record<string, string> = {};
    if (!revTitle.trim()) errors.revTitle = "Le libellé est obligatoire.";
    if (revAmount === "" || parseAmount(revAmount) <= 0) errors.revAmount = "Le montant doit être supérieur à 0 €.";
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

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
    setFormErrors({});
    const errors: Record<string, string> = {};
    if (!recTitle.trim()) errors.recTitle = "Le libellé est obligatoire.";
    if (recAmount === "" || parseAmount(recAmount) <= 0) errors.recAmount = "Le montant doit être supérieur à 0 €.";
    if (!recCategory.trim()) errors.recCategory = "La catégorie est obligatoire.";
    if (!recDay || Number(recDay) < 1 || Number(recDay) > 31) errors.recDay = "Le jour doit être compris entre 1 et 31.";
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      await addRecurringExpense(activeWalletId, {
        title: recTitle,
        amount: parseAmount(recAmount),
        category: recCategory,
        color: getCategoryColor(recCategory),
        dayOfMonth: Number(recDay),
        startMonth: recStartMonth,
        startYear: recStartYear,
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
    setFormErrors({});
    const errors: Record<string, string> = {};
    if (!transferTargetWalletId) errors.transferTargetWalletId = "Veuillez choisir un portefeuille destinataire.";
    if (!transferTitle.trim()) errors.transferTitle = "Le libellé est obligatoire.";
    if (transferType === "FIXED" && (transferAmount === "" || parseAmount(transferAmount) <= 0)) {
      errors.transferAmount = "Le montant doit être supérieur à 0 €.";
    }
    if (transferType === "PERCENTAGE" && (transferPercentage === "" || Number(transferPercentage) <= 0 || Number(transferPercentage) > 100)) {
      errors.transferPercentage = "Le pourcentage doit être compris entre 1% et 100%.";
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      const targetM = month === 0 ? new Date().getMonth() + 1 : month;
      const isPercent = transferType === "PERCENTAGE";
      if (editingTransferId) {
        await updateWalletTransfer(activeWalletId, editingTransferId, {
          title: transferTitle,
          targetWalletId: transferTargetWalletId,
          isPercentage: isPercent,
          percentage: isPercent ? parseAmount(transferPercentage) : undefined,
          amount: isPercent ? previewTransferAmount : parseAmount(transferAmount),
          dayOfMonth: isPercent ? 1 : (Number(transferDay) || 1),
        });
      } else {
        await createWalletTransfer(activeWalletId, transferTargetWalletId, {
          title: transferTitle,
          amount: isPercent ? previewTransferAmount : parseAmount(transferAmount),
          isPercentage: isPercent,
          percentage: isPercent ? parseAmount(transferPercentage) : undefined,
          isRecurring: transferIsRecurring,
          dayOfMonth: isPercent ? 1 : (Number(transferDay) || 1),
          month: targetM,
          year,
        });
      }
      setTransferModal(false);
      setEditingTransferId(null);
      setTransferTitle("");
      setTransferTargetWalletId("");
      await loadData();
      router.refresh();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleOpenAddTransfer = () => {
    setEditingTransferId(null);
    const otherWallet = wallets.find((w) => w.id !== activeWalletId);
    if (otherWallet) setTransferTargetWalletId(otherWallet.id);
    setTransferTitle("");
    setTransferType("FIXED");
    setTransferAmount(100);
    setTransferPercentage(50);
    setTransferIsRecurring(true);
    setTransferDay(5);
    setTransferModal(true);
  };

  const handleOpenEditTransfer = (t: any) => {
    setEditingTransferId(t.id);
    setTransferTitle(t.title);
    setTransferTargetWalletId(t.targetWalletId);
    setTransferType(t.isPercentage ? "PERCENTAGE" : "FIXED");
    setTransferAmount(t.amount);
    setTransferPercentage(t.percentage || 50);
    setTransferIsRecurring(t.isRecurring !== undefined ? t.isRecurring : true);
    setTransferDay(t.dayOfMonth || 1);
    setTransferModal(true);
  };

  const handleOpenCarryoverModal = () => {
    if (activeWallet) {
      setCMode(activeWallet.carryoverMode || "NONE");
      setCTargetWalletId(activeWallet.carryoverTargetWalletId || "");
      setCarryoverModal(true);
    }
  };

  const handleSaveCarryoverSettings = async () => {
    if (!activeWalletId) return;
    try {
      await updateWalletCarryoverSettings(activeWalletId, cMode, cMode === "TARGET_WALLET" ? cTargetWalletId : undefined);
      const freshWallets = await getUserWallets();
      setWallets(freshWallets);
      setCarryoverModal(false);
      await loadData();
      router.refresh();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleToggleDisableItem = async (item: any, type: "REVENUE" | "RECURRING" | "INSTALLMENT") => {
    const targetM = month === 0 ? new Date().getMonth() + 1 : month;
    await toggleDisableItem(activeWalletId, {
      paymentId: item.id,
      type,
      month: targetM,
      year,
    });
    await loadData();
    router.refresh();
  };

  // Handlers Wishlist / Liste d'achat
  const handleOpenAddWishlist = () => {
    setEditingWishlistId(null);
    setWishlistTitle("");
    setWishlistAmount(150);
    setWishlistUrl("");
    setWishlistCategory("");
    setWishlistNotes("");
    setWishlistPriority("NORMAL");
    setWishlistModal(true);
  };

  const handleOpenEditWishlist = (item: any) => {
    setEditingWishlistId(item.id);
    setWishlistTitle(item.title);
    setWishlistAmount(item.amount);
    setWishlistUrl(item.url || "");
    setWishlistCategory(item.category || "");
    setWishlistPriority(item.priority || "NORMAL");
    setWishlistNotes(item.notes || "");
    setWishlistModal(true);
  };

  const handleSaveWishlist = async () => {
    setFormErrors({});
    const errors: Record<string, string> = {};
    if (!wishlistTitle.trim()) errors.wishlistTitle = "Le libellé de l'article est obligatoire.";
    if (wishlistAmount === "" || parseAmount(wishlistAmount) <= 0) errors.wishlistAmount = "Le montant estimé doit être supérieur à 0 €.";
    if (!wishlistCategory.trim()) errors.wishlistCategory = "La catégorie est obligatoire.";
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      if (editingWishlistId) {
        await updateWishlistItem(activeWalletId, editingWishlistId, {
          title: wishlistTitle,
          amount: parseAmount(wishlistAmount),
          url: wishlistUrl,
          category: wishlistCategory,
          notes: wishlistNotes,
          priority: wishlistPriority,
        });
      } else {
        await createWishlistItem(activeWalletId, {
          title: wishlistTitle,
          amount: parseAmount(wishlistAmount),
          url: wishlistUrl,
          category: wishlistCategory,
          notes: wishlistNotes,
          priority: wishlistPriority,
        });
      }
      setWishlistModal(false);
      await loadData();
      router.refresh();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleDeleteWishlist = async (itemId: string) => {
    try {
      await deleteWishlistItem(activeWalletId, itemId);
      await loadData();
      router.refresh();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleOpenConvertWishlist = (item: any) => {
    const todayDay = new Date().getDate();
    const targetM = month === 0 ? new Date().getMonth() + 1 : month;
    const targetY = year;

    setConvertingItem(item);
    setConvertTargetWalletId(activeWalletId);
    setConvertAmount(item.amount);
    setConvertMode("SINGLE");
    setConvertDay(todayDay);
    setConvertMonth(targetM);
    setConvertYear(targetY);

    setConvertTotalMonths(4);
    setConvertInstallmentAmount((item.amount / 4).toFixed(2));
    setConvertStartMonth(targetM);
    setConvertStartYear(targetY);
    setConvertEndMonth(targetM);
    setConvertEndYear(targetY + 1);
    setConvertDayOfMonth(todayDay);

    setFormErrors({});
    setConvertModal(true);
  };

  const handleExecuteConvertWishlist = async () => {
    setFormErrors({});
    const errors: Record<string, string> = {};
    if (!convertTargetWalletId) errors.convertTargetWalletId = "Veuillez choisir un portefeuille cible.";

    if (convertMode === "SINGLE") {
      if (convertAmount === "" || parseAmount(convertAmount) <= 0) errors.convertAmount = "Le montant doit être supérieur à 0 €.";
      if (!convertDay || Number(convertDay) < 1 || Number(convertDay) > 31) errors.convertDay = "Le jour doit être compris entre 1 et 31.";
    } else if (convertMode === "MULTIPLE") {
      if (convertInstallmentAmount === "" || parseAmount(convertInstallmentAmount) <= 0) errors.convertInstallmentAmount = "Le montant mensuel doit être supérieur à 0 €.";
      if (convertTotalMonths === "" || Number(convertTotalMonths) <= 0) errors.convertTotalMonths = "Le nombre de mensualités doit être d'au moins 1.";
      if (!convertDayOfMonth || Number(convertDayOfMonth) < 1 || Number(convertDayOfMonth) > 31) errors.convertDayOfMonth = "Le jour doit être compris entre 1 et 31.";
    } else {
      if (convertInstallmentAmount === "" || parseAmount(convertInstallmentAmount) <= 0) errors.convertInstallmentAmount = "Le montant mensuel doit être supérieur à 0 €.";
      if (!convertDayOfMonth || Number(convertDayOfMonth) < 1 || Number(convertDayOfMonth) > 31) errors.convertDayOfMonth = "Le jour doit être compris entre 1 et 31.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      if (convertMode === "SINGLE") {
        await convertWishlistItemToTransaction(activeWalletId, convertingItem.id, {
          targetWalletId: convertTargetWalletId,
          day: Number(convertDay) || 1,
          month: convertMonth,
          year: convertYear,
          amount: parseAmount(convertAmount),
          category: convertingItem.category || "Général",
        });
      } else if (convertMode === "MULTIPLE") {
        await convertWishlistItemToInstallment(activeWalletId, convertingItem.id, {
          targetWalletId: convertTargetWalletId,
          amount: parseAmount(convertInstallmentAmount),
          totalMonths: Number(convertTotalMonths) || 1,
          startMonth: convertStartMonth,
          startYear: convertStartYear,
          dayOfMonth: Number(convertDayOfMonth) || 1,
          category: convertingItem.category || "Général",
        });
      } else {
        const calculatedMonths = Math.max(1, (convertEndYear - convertStartYear) * 12 + (convertEndMonth - convertStartMonth) + 1);
        await convertWishlistItemToInstallment(activeWalletId, convertingItem.id, {
          targetWalletId: convertTargetWalletId,
          amount: parseAmount(convertInstallmentAmount),
          totalMonths: calculatedMonths,
          startMonth: convertStartMonth,
          startYear: convertStartYear,
          dayOfMonth: Number(convertDayOfMonth) || 1,
          category: convertingItem.category || "Général",
        });
      }
      setConvertModal(false);
      setConvertingItem(null);
      await loadData();
      router.refresh();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleAddInstallment = async () => {
    setFormErrors({});
    const errors: Record<string, string> = {};
    if (!instTitle.trim()) errors.instTitle = "Le libellé est obligatoire.";
    if (instAmount === "" || parseAmount(instAmount) <= 0) errors.instAmount = "Le montant mensuel doit être supérieur à 0 €.";
    if (!instDay || Number(instDay) < 1 || Number(instDay) > 31) errors.instDay = "Le jour doit être compris entre 1 et 31.";
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      const totalM = Math.max(1, (instEndYear - instStartYear) * 12 + (instEndMonth - instStartMonth) + 1);
      const calculatedTotal = parseAmount(instAmount) * totalM;

      await addInstallment(activeWalletId, {
        title: instTitle,
        totalAmount: calculatedTotal,
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
    setFormErrors({});
    const errors: Record<string, string> = {};
    if (!envCategory.trim()) errors.envCategory = "La catégorie de l'enveloppe est obligatoire.";
    if (envLimit !== "" && parseAmount(envLimit) <= 0) errors.envLimit = "Le plafond doit être supérieur à 0 €.";
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

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
    setFormErrors({});
    const errors: Record<string, string> = {};
    if (!trxTitle.trim()) errors.trxTitle = "Le libellé de la dépense est obligatoire.";
    if (trxAmount === "" || parseAmount(trxAmount) <= 0) errors.trxAmount = "Le montant doit être supérieur à 0 €.";
    if (!trxCategory.trim()) errors.trxCategory = "La catégorie est obligatoire.";
    if (!trxDay || Number(trxDay) < 1 || Number(trxDay) > 31) errors.trxDay = "Le jour doit être compris entre 1 et 31.";
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      if (editingTxId) {
        await updateTransaction(activeWalletId, editingTxId, {
          title: trxTitle,
          amount: parseAmount(trxAmount),
          category: trxCategory,
          color: trxColor,
          day: Number(trxDay),
          month: trxMonth,
          year: trxYear,
          notes: trxNotes,
        });
      } else {
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
      }
      setTransactionModal(false);
      setEditingTxId(null);
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
    overrideAmount?: number;
    isDisabled?: boolean;
    hasOverride: boolean;
    month?: number;
    year?: number;
  }) => {
    setEditTarget(target);
    setEditTitle(target.title);
    const initialAmount = (target.overrideAmount && target.overrideAmount > 0)
      ? target.overrideAmount
      : (target.currentAmount > 0 ? target.currentAmount : target.originalAmount);
    setEditAmount(initialAmount);
    setEditScope("MONTH");
    setEditRevMonth(target.month || (month === 0 ? new Date().getMonth() + 1 : month));
    setEditRevYear(target.year || year);

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
      setEditRecStartMonth(target.startMonth || (month === 0 ? 1 : month));
      setEditRecStartYear(target.startYear || year);
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

        if (editEntryFrequency === "VARIABLE") {
          await updateRevenueGlobal(activeWalletId, editTarget.id, {
            title: editTitle,
            type: targetType,
            amount: parseAmount(editAmount),
            month: editRevMonth,
            year: editRevYear,
          });
        } else if (editScope === "MONTH") {
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
        if (editScope === "MONTH") {
          await updateInstallmentGlobal(activeWalletId, editTarget.id, {
            title: editTitle,
            category: editCategory,
            dayOfMonth: Number(editDay),
            startMonth: editInstStartMonth,
            startYear: editInstStartYear,
            endMonth: editInstEndMonth,
            endYear: editInstEndYear,
          });
          await setExpenseOverride(activeWalletId, {
            paymentId: editTarget.id,
            type: "INSTALLMENT",
            amount: parseAmount(editAmount),
            month: month === 0 ? new Date().getMonth() + 1 : month,
            year,
          });
        } else {
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
          if (editTarget.hasOverride) {
            await removeExpenseOverride(activeWalletId, {
              paymentId: editTarget.id,
              type: "INSTALLMENT",
              month: month === 0 ? new Date().getMonth() + 1 : month,
              year,
            });
          }
        }
      } else {
        // RECURRING
        if (editScope === "MONTH") {
          await updateRecurringExpenseGlobal(activeWalletId, editTarget.id, {
            title: editTitle,
            category: editCategory,
            dayOfMonth: Number(editDay),
            startMonth: editRecStartMonth,
            startYear: editRecStartYear,
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
            startMonth: editRecStartMonth,
            startYear: editRecStartYear,
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
    if (!editTarget) return;
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

  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a: any, b: any) => {
      let valA = a[txSortField];
      let valB = b[txSortField];
      if (typeof valA === "string") {
        valA = valA.toLowerCase();
        valB = (valB || "").toLowerCase();
        return txSortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return txSortOrder === "asc" ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
    });
  }, [filteredTransactions, txSortField, txSortOrder]);

  return (
    <Box style={{ minHeight: "100vh", backgroundColor: "#0b0e17", color: "#f1f3f5", paddingBottom: "60px" }}>
      {/* Header Bar */}
      <Paper p="md" radius={0} style={{ backgroundColor: "#121829", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <Container style={{ maxWidth: "1650px" }}>
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
                    v1.4.0
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
                    <Menu.Item key={w.id} onClick={() => handleWalletSelect(w.id)}>
                      <Group justify="space-between">
                        <Text size="sm" fw={w.id === activeWalletId ? 700 : 400}>
                          {w.name}
                        </Text>
                        {!w.isPersonal && w.role === "READ_ONLY" && (
                          <Badge size="xs" color="orange" variant="light">
                            Lecture seule
                          </Badge>
                        )}
                      </Group>
                    </Menu.Item>
                  ))}
                  <Menu.Divider />
                  {activeWallet?.isOwner && (
                    <Menu.Item leftSection={<IconRepeat size={16} />} onClick={handleOpenCarryoverModal}>
                      Report de fin de mois
                    </Menu.Item>
                  )}
                  <Menu.Item leftSection={<IconPlus size={16} />} onClick={() => { setFormErrors({}); setNewWalletName(""); setCreateWalletModal(true); }}>
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
                  onChange={(val) => val !== null && handleMonthChange(parseInt(val))}
                  maxDropdownHeight={450}
                  style={{ width: 140 }}
                />
                <Select
                  size="xs"
                  data={["2024", "2025", "2026", "2027", "2028"]}
                  value={year.toString()}
                  onChange={(val) => val && handleYearChange(parseInt(val))}
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
      <Container style={{ maxWidth: "1650px" }} mt="lg">
        {isOffline && (
          <Notification
            icon={<IconWifiOff size={18} />}
            color="red"
            title="Connexion interrompue"
            withCloseButton={false}
            mb="md"
          >
            Impossible de se connecter à l'application. Une connexion Internet active est requise.
          </Notification>
        )}

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
                    REVENUS DU MOIS
                  </Text>
                  <ThemeIcon size="sm" color="teal" variant="light" radius="xl">
                    <IconTrendingUp size={14} />
                  </ThemeIcon>
                </Group>
                <Text size="xl" fw={800} c="teal.3">
                  +{data.summary.totalRevenues.toFixed(2)} €
                </Text>
              </Paper>
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Paper p="md" radius="md" style={{ backgroundColor: "#161d30", border: "1px solid rgba(255,255,255,0.06)" }}>
                <Group justify="space-between" mb={4}>
                  <Text size="xs" c="dimmed" fw={700}>
                    CHARGES FIXES
                  </Text>
                  <ThemeIcon size="sm" color="red" variant="light" radius="xl">
                    <IconTrendingDown size={14} />
                  </ThemeIcon>
                </Group>
                <Text size="xl" fw={800} c="red.4">
                  -{data.summary.fixedExpenses.toFixed(2)} €
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
                <Tooltip label="Revenus totaux - Charges fixes - Dépenses courantes - Plafonds d'enveloppes (si non dépassés)">
                  <Text size="xs" c="dimmed" style={{ cursor: "help" }}>
                    {data.summary.netSavings >= 0 ? "Réservé selon enveloppes" : "Déficit prévisionnel"}
                  </Text>
                </Tooltip>
              </Paper>
            </Grid.Col>
          </Grid>
        )}

        {/* Tabbed Navigation */}
        <Tabs value={activeTab} onChange={(val) => val && handleTabChange(val)} variant="pills" color="teal">
          <Tabs.List mb="md" style={{ gap: "8px" }}>
            <Tabs.Tab value="overview" leftSection={<IconSparkles size={16} />}>
              Vue d'Ensemble
            </Tabs.Tab>
            <Tabs.Tab value="pointage" leftSection={<IconCheck size={16} />}>
              Pointage
            </Tabs.Tab>
            <Tabs.Tab value="fixed" leftSection={<IconCreditCard size={16} />}>
              Revenus & Charges Fixes
            </Tabs.Tab>
            <Tabs.Tab value="transactions" leftSection={<IconReceipt size={16} />}>
              Dépenses
            </Tabs.Tab>
            {wallets.length >= 2 && (
              <Tabs.Tab value="transfers" leftSection={<IconArrowsExchange size={16} />}>
                Virements Inter-Portefeuilles
              </Tabs.Tab>
            )}
            <Tabs.Tab value="stats" leftSection={<IconChartPie size={16} />}>
              Statistiques
            </Tabs.Tab>
            <Tabs.Tab value="wishlist" leftSection={<IconShoppingCart size={16} />}>
              Liste d'Achat
            </Tabs.Tab>
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
                    {!isReadOnly && (
                      <Button
                        size="xs"
                        variant="light"
                        color="teal"
                        leftSection={<IconPlus size={14} />}
                        onClick={handleOpenAddEnvelope}
                      >
                        Ajouter une enveloppe
                      </Button>
                    )}
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
                                const cardColor = getCategoryColor(env.category);
                                return (
                                  <Grid.Col key={env.id} span={{ base: 12, sm: 6 }}>
                                    <Card padding="md" radius="md" style={{ backgroundColor: "#182036", border: isOver ? "1px solid #fa5252" : "1px solid rgba(255,255,255,0.06)" }}>
                                      <Group justify="space-between" mb="xs">
                                        <Group gap="xs">
                                          <Badge color={cardColor} style={cardColor === "white" ? { color: "#000", fontWeight: 700 } : undefined} variant="filled" size="sm">
                                            {env.category}
                                          </Badge>
                                        </Group>
                                        <Group gap="xs">
                                          <Badge color={isOver ? "red" : "teal"} variant="light" size="sm">
                                            {isOver ? "DÉPASSÉ" : `${env.remaining.toFixed(2)} € restant`}
                                          </Badge>
                                          {!isReadOnly && (
                                            <Tooltip label="Modifier le plafond / couleur">
                                              <ActionIcon
                                                size="xs"
                                                variant="subtle"
                                                color="blue"
                                                onClick={() => {
                                                  setEnvCategory(env.category);
                                                  setEnvLimit(env.limitAmount || "");
                                                  setEnvColor(cardColor);
                                                  setEnvMonth(month === 0 ? new Date().getMonth() + 1 : month);
                                                  setEnvYear(year);
                                                  setEnvelopeModal(true);
                                                }}
                                              >
                                                <IconEdit size={14} />
                                              </ActionIcon>
                                            </Tooltip>
                                          )}
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
                                        color={isOver ? "red" : env.percentSpent > 80 ? "orange" : cardColor}
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
                                const cardColor = getCategoryColor(env.category);
                                return (
                                  <Grid.Col key={env.id} span={{ base: 12, sm: 6 }}>
                                    <Card padding="md" radius="md" style={{ backgroundColor: "#182036", border: "1px solid rgba(255,255,255,0.06)" }}>
                                      <Group justify="space-between" mb="xs">
                                        <Group gap="xs">
                                          <Badge color={cardColor} style={cardColor === "white" ? { color: "#000", fontWeight: 700 } : undefined} variant="filled" size="sm">
                                            {env.category}
                                          </Badge>
                                        </Group>
                                        <Group gap="xs">
                                          <Badge color="white" style={{ color: "#000", fontWeight: 700 }} variant="filled" size="sm">
                                            Plafond non défini
                                          </Badge>
                                          {!isReadOnly && (
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
                                          )}
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
                          {!isReadOnly && (
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
                          )}
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

                  {/* 1. Carte Crédits & Emprunts */}
                  <Paper p="md" radius="md" style={{ backgroundColor: "#121829", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <Group justify="space-between" mb="xs">
                      <Text size="xs" c="dimmed" fw={700}>
                        CRÉDITS & PRÊTS ({data?.installments?.filter((i: any) => i.isCredit).length || 0})
                      </Text>
                      <ThemeIcon size="sm" color="violet" variant="light" radius="xl">
                        <IconCreditCard size={14} />
                      </ThemeIcon>
                    </Group>

                    <Group justify="space-between" align="baseline" mb="xs">
                      <div>
                        <Text size="xl" fw={800} c="violet.4">
                          {data?.summary?.totalCredits ? data.summary.totalCredits.toFixed(2) : "0.00"} € <Text span size="xs" c="dimmed">/ mois</Text>
                        </Text>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <Text size="xs" c="dimmed">Restant Dû :</Text>
                        <Text size="xs" fw={700} c="violet.3">
                          {data?.summary?.totalCreditsRemaining ? data.summary.totalCreditsRemaining.toFixed(2) : "0.00"} €
                        </Text>
                      </div>
                    </Group>

                    {!data?.installments || data.installments.filter((i: any) => i.isCredit).length === 0 ? (
                      <Text size="xs" c="dimmed">
                        Aucun crédit ou emprunt actif ce mois-ci.
                      </Text>
                    ) : (
                      <Stack gap="xs" mt="xs">
                        {data.installments
                          .filter((i: any) => i.isCredit)
                          .map((inst: any) => (
                            <Paper key={inst.id} p="xs" radius="sm" style={{ backgroundColor: "#182036", border: "1px solid rgba(255,255,255,0.04)" }}>
                              <Group justify="space-between" wrap="nowrap">
                                <div>
                                  <Group gap={6}>
                                    <Text size="xs" fw={600} style={{ color: "#fff" }}>
                                      {inst.title}
                                    </Text>
                                    {inst.processed && (
                                      <Badge size="xs" color="teal" variant="light">
                                        Pointé
                                      </Badge>
                                    )}
                                  </Group>
                                  <Text size="xs" c="dimmed">
                                    Prélèvement le {inst.dayOfMonth} • {inst.category}
                                  </Text>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                  <Text size="xs" fw={700} c="violet.3">
                                    -{inst.amount.toFixed(2)} €
                                  </Text>
                                  <Text size="xs" c="dimmed">
                                    Restant: {inst.remainingAmount.toFixed(2)} €
                                  </Text>
                                </div>
                              </Group>
                            </Paper>
                          ))}
                      </Stack>
                    )}
                  </Paper>

                  {/* 2. Carte Paiements Fractionnés (3x / 4x) */}
                  <Paper p="md" radius="md" style={{ backgroundColor: "#121829", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <Group justify="space-between" mb="xs">
                      <Text size="xs" c="dimmed" fw={700}>
                        PAIEMENTS FRACTIONNÉS ({data?.installments?.filter((i: any) => !i.isCredit).length || 0})
                      </Text>
                      <ThemeIcon size="sm" color="cyan" variant="light" radius="xl">
                        <IconReceipt size={14} />
                      </ThemeIcon>
                    </Group>

                    <Group justify="space-between" align="baseline" mb="xs">
                      <div>
                        <Text size="xl" fw={800} c="cyan.4">
                          {data?.summary?.totalFractional ? data.summary.totalFractional.toFixed(2) : "0.00"} € <Text span size="xs" c="dimmed">/ mois</Text>
                        </Text>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <Text size="xs" c="dimmed">Restant Dû :</Text>
                        <Text size="xs" fw={700} c="cyan.3">
                          {data?.summary?.totalFractionalRemaining ? data.summary.totalFractionalRemaining.toFixed(2) : "0.00"} €
                        </Text>
                      </div>
                    </Group>

                    {!data?.installments || data.installments.filter((i: any) => !i.isCredit).length === 0 ? (
                      <Text size="xs" c="dimmed">
                        Aucun paiement fractionné en cours ce mois-ci.
                      </Text>
                    ) : (
                      <Stack gap="xs" mt="xs">
                        {data.installments
                          .filter((i: any) => !i.isCredit)
                          .map((inst: any) => (
                            <Paper key={inst.id} p="xs" radius="sm" style={{ backgroundColor: "#182036", border: "1px solid rgba(255,255,255,0.04)" }}>
                              <Group justify="space-between" wrap="nowrap">
                                <div>
                                  <Group gap={6}>
                                    <Text size="xs" fw={600} style={{ color: "#fff" }}>
                                      {inst.title}
                                    </Text>
                                    {inst.processed && (
                                      <Badge size="xs" color="teal" variant="light">
                                        Pointé
                                      </Badge>
                                    )}
                                  </Group>
                                  <Text size="xs" c="dimmed">
                                    Prélèvement le {inst.dayOfMonth} • {inst.category}
                                  </Text>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                  <Text size="xs" fw={700} c="cyan.3">
                                    -{inst.amount.toFixed(2)} €
                                  </Text>
                                  <Text size="xs" c="dimmed">
                                    Restant: {inst.remainingAmount.toFixed(2)} €
                                  </Text>
                                </div>
                              </Group>
                            </Paper>
                          ))}
                      </Stack>
                    )}
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
                            <Text size="sm" fw={700} c={getCategoryTextColor(t.category)}>
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
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                  <Paper p="md" radius="md" style={{ backgroundColor: "#182036" }}>
                    <Text fw={700} c="teal.4" mb={4}>
                      Revenus Encaissés
                    </Text>
                    <Group justify="space-between" align="center" mb="sm" p="xs" style={{ backgroundColor: "#121829", borderRadius: 6, border: "1px solid rgba(255,255,255,0.05)" }}>
                      <Text size="xs" c="dimmed">Restant à encaisser :</Text>
                      <Badge color="teal" variant="light" size="sm">
                        +{unprocessedRevenuesTotal.toFixed(2)} €
                      </Badge>
                    </Group>
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
                              disabled={isReadOnly}
                              onChange={() => handleToggleProcessed(r.id, "REVENUE", r.processed)}
                            />
                          </Group>
                        ))}
                      </Stack>
                    )}
                  </Paper>
                </Grid.Col>

                {/* Pointage Remboursements */}
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                  <Paper p="md" radius="md" style={{ backgroundColor: "#182036" }}>
                    <Text fw={700} c="cyan.4" mb={4}>
                      Remboursements Encaissés
                    </Text>
                    <Group justify="space-between" align="center" mb="sm" p="xs" style={{ backgroundColor: "#121829", borderRadius: 6, border: "1px solid rgba(255,255,255,0.05)" }}>
                      <Text size="xs" c="dimmed">Restant à encaisser :</Text>
                      <Badge color="cyan" variant="light" size="sm">
                        +{unprocessedReimbursementsTotal.toFixed(2)} €
                      </Badge>
                    </Group>
                    {data?.reimbursements?.length === 0 ? (
                      <Text size="xs" c="dimmed">
                        Aucun remboursement.
                      </Text>
                    ) : (
                      <Stack gap="xs">
                        {data?.reimbursements?.map((r: any) => (
                          <Group key={r.id} justify="space-between" p="xs" style={{ backgroundColor: "#121829", borderRadius: 6 }}>
                            <div>
                              <Text size="sm" fw={600}>
                                {r.title}
                              </Text>
                              <Text size="xs" c="cyan.4" fw={700}>
                                +{r.amount.toFixed(2)} €
                              </Text>
                            </div>
                            <Switch
                              color="cyan"
                              checked={r.processed}
                              disabled={isReadOnly}
                              onChange={() => handleToggleProcessed(r.id, "REVENUE", r.processed)}
                            />
                          </Group>
                        ))}
                      </Stack>
                    )}
                  </Paper>
                </Grid.Col>

                {/* Pointage Charges Récurrentes */}
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                  <Paper p="md" radius="md" style={{ backgroundColor: "#182036" }}>
                    <Text fw={700} c="indigo.4" mb={4}>
                      Charges Récurrentes
                    </Text>
                    <Group justify="space-between" align="center" mb="sm" p="xs" style={{ backgroundColor: "#121829", borderRadius: 6, border: "1px solid rgba(255,255,255,0.05)" }}>
                      <Text size="xs" c="dimmed">Restant à prélever :</Text>
                      <Badge color="indigo" variant="light" size="sm">
                        -{unprocessedRecurringTotal.toFixed(2)} €
                      </Badge>
                    </Group>
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
                              disabled={isReadOnly}
                              onChange={() => handleToggleProcessed(r.id, "RECURRING", r.processed)}
                            />
                          </Group>
                        ))}
                      </Stack>
                    )}
                  </Paper>
                </Grid.Col>

                {/* Pointage Échéances / Crédits */}
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                  <Paper p="md" radius="md" style={{ backgroundColor: "#182036" }}>
                    <Text fw={700} c="violet.4" mb={4}>
                      Échéances Prélevées
                    </Text>
                    <Group justify="space-between" align="center" mb="sm" p="xs" style={{ backgroundColor: "#121829", borderRadius: 6, border: "1px solid rgba(255,255,255,0.05)" }}>
                      <Text size="xs" c="dimmed">Restant à prélever :</Text>
                      <Badge color="violet" variant="light" size="sm">
                        -{unprocessedInstallmentsTotal.toFixed(2)} €
                      </Badge>
                    </Group>
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
                              <Text size="xs" c={getCategoryTextColor(i.category)} fw={700}>
                                -{i.amount.toFixed(2)} €
                              </Text>
                            </div>
                            <Switch
                              color="violet"
                              checked={i.processed}
                              disabled={isReadOnly}
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
                  <Paper p={{ base: "xs", sm: "md", md: "lg" }} radius="md" style={{ backgroundColor: "#121829", border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <Group justify="space-between" mb="md">
                      <Title order={4} style={{ color: "#fff" }}>
                        Revenus du Mois
                      </Title>
                      {!isReadOnly && (
                        <Button size="xs" color="teal" leftSection={<IconPlus size={14} />} onClick={() => handleOpenAddRevenue("REVENUE")}>
                          Ajouter un Revenu
                        </Button>
                      )}
                    </Group>
                    <Table.ScrollContainer minWidth={300}>
                      <Table highlightOnHover style={{ tableLayout: "auto", width: "100%" }}>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th style={{ width: 1, whiteSpace: "nowrap" }}>Type</Table.Th>
                            <Table.Th style={{ width: "100%" }}>Libellé</Table.Th>
                            <Table.Th style={{ width: 1, whiteSpace: "nowrap" }}>Montant</Table.Th>
                            {!isReadOnly && <Table.Th visibleFrom="md" style={{ width: 1, whiteSpace: "nowrap" }}>Action</Table.Th>}
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {data?.revenues?.map((r: any) => {
                            const isItemDisabled = Boolean(r.isDisabled || (r.hasOverride && r.amount === 0));
                            return (
                              <Table.Tr
                                key={r.id}
                                style={{ cursor: "pointer", opacity: isItemDisabled ? 0.4 : 1 }}
                                onClick={() => handleRowClick(r, "REVENUE")}
                              >
                                <Table.Td style={{ width: 1, whiteSpace: "nowrap" }}>
                                  <Badge
                                    color={r.type === "FIXED" ? "teal" : "blue"}
                                    variant="light"
                                    fullWidth={false}
                                    styles={{
                                      label: {
                                        overflow: "visible",
                                        textOverflow: "clip",
                                        whiteSpace: "nowrap",
                                      },
                                    }}
                                    style={{ width: "max-content", maxWidth: "none", whiteSpace: "nowrap" }}
                                  >
                                    {r.type === "FIXED" ? "Fixe" : "Variable"}
                                  </Badge>
                                </Table.Td>
                                <Table.Td fw={600} style={{ width: "100%" }}>
                                  <Text size="sm" fw={600}>{r.title}</Text>
                                </Table.Td>
                                <Table.Td fw={700} c={isItemDisabled ? "dimmed" : "teal.4"} style={{ width: 1, whiteSpace: "nowrap" }}>
                                  +{r.amount.toFixed(2)} €
                                </Table.Td>
                                {!isReadOnly && (
                                  <Table.Td visibleFrom="md" style={{ width: 1, whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                                    <Group gap={4} wrap="nowrap">
                                      <Tooltip label={isItemDisabled ? "Réactiver ce mois-ci" : "Désactiver ce mois-ci"}>
                                        <ActionIcon
                                          color={isItemDisabled ? "teal" : "gray"}
                                          variant={isItemDisabled ? "light" : "subtle"}
                                          onClick={() => handleToggleDisableItem(r, "REVENUE")}
                                        >
                                          {isItemDisabled ? <IconEye size={16} /> : <IconEyeOff size={16} />}
                                        </ActionIcon>
                                      </Tooltip>
                                      <Tooltip label="Ajuster ou modifier">
                                        <ActionIcon color="blue" variant="subtle" onClick={() => handleOpenEditModal({
                                          id: r.id,
                                          title: r.title,
                                          type: "REVENUE",
                                          subType: r.type,
                                          currentAmount: r.amount,
                                          originalAmount: r.originalAmount,
                                          overrideAmount: r.overrideAmount,
                                          isDisabled: r.isDisabled,
                                          hasOverride: r.hasOverride,
                                          month: r.month,
                                          year: r.year,
                                        })}>
                                          <IconEdit size={16} />
                                        </ActionIcon>
                                      </Tooltip>
                                      <ActionIcon color="red" variant="subtle" onClick={() => deleteRevenue(activeWalletId, r.id, month === 0 ? new Date().getMonth() + 1 : month, year).then(loadData)}>
                                        <IconTrash size={16} />
                                      </ActionIcon>
                                    </Group>
                                  </Table.Td>
                                )}
                              </Table.Tr>
                            );
                          })}
                        </Table.Tbody>
                        <Table.Tfoot>
                          <Table.Tr style={{ borderTop: "2px solid rgba(255,255,255,0.12)" }}>
                            <Table.Td colSpan={2} style={{ width: "100%" }}>
                              <Text size="sm" fw={400} c="white">
                                Total
                              </Text>
                            </Table.Td>
                            <Table.Td fw={400} c="white" style={{ width: 1, whiteSpace: "nowrap" }}>
                              +{data?.summary?.totalStandardRevenues ? data.summary.totalStandardRevenues.toFixed(2) : "0.00"} €
                            </Table.Td>
                            {!isReadOnly && <Table.Td visibleFrom="md" style={{ width: 1, whiteSpace: "nowrap" }} />}
                          </Table.Tr>
                        </Table.Tfoot>
                      </Table>
                    </Table.ScrollContainer>
                  </Paper>
                </Grid.Col>

                {/* Colonne Remboursements en ma faveur */}
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper p={{ base: "xs", sm: "md", md: "lg" }} radius="md" style={{ backgroundColor: "#121829", border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <Group justify="space-between" mb="md">
                      <Title order={4} style={{ color: "#fff" }}>
                        Remboursements en ma faveur
                      </Title>
                      {!isReadOnly && (
                        <Button size="xs" color="teal" leftSection={<IconPlus size={14} />} onClick={() => handleOpenAddRevenue("REIMBURSEMENT")}>
                          Ajouter un Remboursement
                        </Button>
                      )}
                    </Group>
                    <Table.ScrollContainer minWidth={300}>
                      <Table highlightOnHover style={{ tableLayout: "auto", width: "100%" }}>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th style={{ width: "100%" }}>Libellé</Table.Th>
                            <Table.Th style={{ width: 1, whiteSpace: "nowrap" }}>Montant</Table.Th>
                            {!isReadOnly && <Table.Th visibleFrom="md" style={{ width: 1, whiteSpace: "nowrap" }}>Action</Table.Th>}
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {data?.reimbursements?.map((r: any) => {
                            const isItemDisabled = Boolean(r.isDisabled || (r.hasOverride && r.amount === 0));
                            return (
                              <Table.Tr
                                key={r.id}
                                style={{ cursor: "pointer", opacity: isItemDisabled ? 0.4 : 1 }}
                                onClick={() => handleRowClick(r, "REIMBURSEMENT")}
                              >
                                <Table.Td fw={600} style={{ width: "100%" }}>
                                  <Text size="sm" fw={600}>{r.title}</Text>
                                </Table.Td>
                                <Table.Td fw={700} c={isItemDisabled ? "dimmed" : "teal.4"} style={{ width: 1, whiteSpace: "nowrap" }}>
                                  +{r.amount.toFixed(2)} €
                                </Table.Td>
                                {!isReadOnly && (
                                  <Table.Td visibleFrom="md" style={{ width: 1, whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                                    <Group gap={4} wrap="nowrap">
                                      <Tooltip label={isItemDisabled ? "Réactiver ce mois-ci" : "Désactiver ce mois-ci"}>
                                        <ActionIcon
                                          color={isItemDisabled ? "teal" : "gray"}
                                          variant={isItemDisabled ? "light" : "subtle"}
                                          onClick={() => handleToggleDisableItem(r, "REVENUE")}
                                        >
                                          {isItemDisabled ? <IconEye size={16} /> : <IconEyeOff size={16} />}
                                        </ActionIcon>
                                      </Tooltip>
                                      <Tooltip label="Ajuster ou modifier">
                                        <ActionIcon color="blue" variant="subtle" onClick={() => handleOpenEditModal({
                                          id: r.id,
                                          title: r.title,
                                          type: "REVENUE",
                                          subType: r.type,
                                          currentAmount: r.amount,
                                          originalAmount: r.originalAmount,
                                          overrideAmount: r.overrideAmount,
                                          isDisabled: r.isDisabled,
                                          hasOverride: r.hasOverride,
                                          month: r.month,
                                          year: r.year,
                                        })}>
                                          <IconEdit size={16} />
                                        </ActionIcon>
                                      </Tooltip>
                                      <ActionIcon color="red" variant="subtle" onClick={() => deleteRevenue(activeWalletId, r.id, month === 0 ? new Date().getMonth() + 1 : month, year).then(loadData)}>
                                        <IconTrash size={16} />
                                      </ActionIcon>
                                    </Group>
                                  </Table.Td>
                                )}
                              </Table.Tr>
                            );
                          })}
                        </Table.Tbody>
                        <Table.Tfoot>
                          <Table.Tr style={{ borderTop: "2px solid rgba(255,255,255,0.12)" }}>
                            <Table.Td colSpan={1} style={{ width: "100%" }}>
                              <Text size="sm" fw={400} c="white">
                                Total
                              </Text>
                            </Table.Td>
                            <Table.Td fw={400} c="white" style={{ width: 1, whiteSpace: "nowrap" }}>
                              +{data?.summary?.totalReimbursements ? data.summary.totalReimbursements.toFixed(2) : "0.00"} €
                            </Table.Td>
                            {!isReadOnly && <Table.Td visibleFrom="md" style={{ width: 1, whiteSpace: "nowrap" }} />}
                          </Table.Tr>
                        </Table.Tfoot>
                      </Table>
                    </Table.ScrollContainer>
                  </Paper>
                </Grid.Col>
              </Grid>

              {/* Section Charges Récurrentes & Échéances */}
              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper p={{ base: "xs", sm: "md", md: "lg" }} radius="md" style={{ backgroundColor: "#121829", border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <Group justify="space-between" mb="md">
                      <Title order={4} style={{ color: "#fff" }}>
                        Charges Récurrentes
                      </Title>
                      {!isReadOnly && (
                        <Button size="xs" color="indigo" leftSection={<IconPlus size={14} />} onClick={handleOpenAddRecurring}>
                          Ajouter une charge
                        </Button>
                      )}
                    </Group>
                    <Table.ScrollContainer minWidth={300}>
                      <Table highlightOnHover style={{ tableLayout: "auto", width: "100%" }}>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th style={{ cursor: "pointer", userSelect: "none", width: 1, whiteSpace: "nowrap" }} onClick={() => handleRecSort("category")}>
                              <Group gap={2} wrap="nowrap">
                                <Text size="xs" fw={700}>Catégorie</Text>
                                {recSortField === "category" ? (
                                  recSortOrder === "asc" ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />
                                ) : (
                                  <IconSelector size={12} style={{ opacity: 0.3 }} />
                                )}
                              </Group>
                            </Table.Th>
                            <Table.Th style={{ cursor: "pointer", userSelect: "none", width: "100%" }} onClick={() => handleRecSort("title")}>
                              <Group gap={2} wrap="nowrap">
                                <Text size="xs" fw={700}>Libellé</Text>
                                {recSortField === "title" ? (
                                  recSortOrder === "asc" ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />
                                ) : (
                                  <IconSelector size={12} style={{ opacity: 0.3 }} />
                                )}
                              </Group>
                            </Table.Th>
                            <Table.Th style={{ cursor: "pointer", userSelect: "none", width: 1, whiteSpace: "nowrap" }} onClick={() => handleRecSort("dayOfMonth")}>
                              <Group gap={2} wrap="nowrap">
                                <Text size="xs" fw={700}>Jour</Text>
                                {recSortField === "dayOfMonth" ? (
                                  recSortOrder === "asc" ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />
                                ) : (
                                  <IconSelector size={12} style={{ opacity: 0.3 }} />
                                )}
                              </Group>
                            </Table.Th>
                            <Table.Th style={{ cursor: "pointer", userSelect: "none", width: 1, whiteSpace: "nowrap" }} onClick={() => handleRecSort("amount")}>
                              <Group gap={2} wrap="nowrap">
                                <Text size="xs" fw={700}>Montant</Text>
                                {recSortField === "amount" ? (
                                  recSortOrder === "asc" ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />
                                ) : (
                                  <IconSelector size={12} style={{ opacity: 0.3 }} />
                                )}
                              </Group>
                            </Table.Th>
                            {!isReadOnly && <Table.Th visibleFrom="md" style={{ width: 1, whiteSpace: "nowrap" }}>Actions</Table.Th>}
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {sortedRecurring.map((r: any) => {
                            const isItemDisabled = Boolean(r.isDisabled || (r.hasOverride && r.amount === 0));
                            return (
                              <Table.Tr
                                key={r.id}
                                style={{ cursor: "pointer", opacity: isItemDisabled ? 0.4 : 1 }}
                                onClick={() => handleRowClick(r, "RECURRING")}
                              >
                                <Table.Td style={{ width: 1, whiteSpace: "nowrap" }}>
                                  {renderCategoryBadge(r.category)}
                                </Table.Td>
                                <Table.Td style={{ width: "100%" }}>
                                  <Text size="sm" fw={600}>{r.title}</Text>
                                  {r.startMonth && r.startYear && (
                                    <Text size="xs" c="dimmed">
                                      Depuis {r.startMonth < 10 ? `0${r.startMonth}` : r.startMonth}/{r.startYear}
                                    </Text>
                                  )}
                                </Table.Td>
                                <Table.Td fw={600} style={{ width: 1, whiteSpace: "nowrap" }}>{r.dayOfMonth}</Table.Td>
                                <Table.Td fw={700} c={isItemDisabled ? "dimmed" : getCategoryTextColor(r.category)} style={{ width: 1, whiteSpace: "nowrap" }}>
                                  -{r.amount.toFixed(2)} €
                                </Table.Td>
                                {!isReadOnly && (
                                  <Table.Td visibleFrom="md" style={{ width: 1, whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                                    <Group gap={4} wrap="nowrap">
                                      <Tooltip label={isItemDisabled ? "Réactiver ce mois-ci" : "Désactiver ce mois-ci"}>
                                        <ActionIcon
                                          color={isItemDisabled ? "teal" : "gray"}
                                          variant={isItemDisabled ? "light" : "subtle"}
                                          onClick={() => handleToggleDisableItem(r, "RECURRING")}
                                        >
                                          {isItemDisabled ? <IconEye size={16} /> : <IconEyeOff size={16} />}
                                        </ActionIcon>
                                      </Tooltip>
                                      <Tooltip label="Ajuster ou modifier">
                                        <ActionIcon color="blue" variant="subtle" onClick={() => handleOpenEditModal({
                                          id: r.id,
                                          title: r.title,
                                          type: "RECURRING",
                                          category: r.category,
                                          dayOfMonth: r.dayOfMonth,
                                          startMonth: r.startMonth,
                                          startYear: r.startYear,
                                          currentAmount: r.amount,
                                          originalAmount: r.originalAmount,
                                          overrideAmount: r.overrideAmount,
                                          isDisabled: r.isDisabled,
                                          hasOverride: r.hasOverride,
                                        })}>
                                          <IconEdit size={16} />
                                        </ActionIcon>
                                      </Tooltip>
                                      <ActionIcon color="red" variant="subtle" onClick={() => deleteRecurringExpense(activeWalletId, r.id, month === 0 ? new Date().getMonth() + 1 : month, year).then(loadData)}>
                                        <IconTrash size={16} />
                                      </ActionIcon>
                                    </Group>
                                  </Table.Td>
                                )}
                              </Table.Tr>
                            );
                          })}
                        </Table.Tbody>
                        <Table.Tfoot>
                          <Table.Tr style={{ borderTop: "2px solid rgba(255,255,255,0.12)" }}>
                            <Table.Td colSpan={3} style={{ width: "100%" }}>
                              <Text size="sm" fw={400} c="white">
                                Total
                              </Text>
                            </Table.Td>
                            <Table.Td fw={400} c="white" style={{ width: 1, whiteSpace: "nowrap" }}>
                              -{data?.summary?.totalRecurring ? data.summary.totalRecurring.toFixed(2) : "0.00"} €
                            </Table.Td>
                            {!isReadOnly && <Table.Td visibleFrom="md" style={{ width: 1, whiteSpace: "nowrap" }} />}
                          </Table.Tr>
                        </Table.Tfoot>
                      </Table>
                    </Table.ScrollContainer>
                  </Paper>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper p={{ base: "xs", sm: "md", md: "lg" }} radius="md" style={{ backgroundColor: "#121829", border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <Group justify="space-between" mb="md">
                      <Title order={4} style={{ color: "#fff" }}>
                        Paiements Échelonnés / Crédits
                      </Title>
                      {!isReadOnly && (
                        <Button size="xs" color="violet" leftSection={<IconPlus size={14} />} onClick={handleOpenAddInstallment}>
                          Ajouter un crédit
                        </Button>
                      )}
                    </Group>
                    <Table.ScrollContainer minWidth={300}>
                      <Table highlightOnHover style={{ tableLayout: "auto", width: "100%" }}>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th style={{ width: 1, whiteSpace: "nowrap" }}>Catégorie</Table.Th>
                            <Table.Th style={{ width: "100%" }}>Libellé</Table.Th>
                            <Table.Th style={{ width: 1, whiteSpace: "nowrap" }}>Jour</Table.Th>
                            <Table.Th style={{ width: 1, whiteSpace: "nowrap" }}>Montant/Mois</Table.Th>
                            {!isReadOnly && <Table.Th visibleFrom="md" style={{ width: 1, whiteSpace: "nowrap" }}>Actions</Table.Th>}
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {data?.installments?.map((i: any) => {
                            const isItemDisabled = Boolean(i.isDisabled || (i.hasOverride && i.amount === 0));
                            return (
                              <Table.Tr
                                key={i.id}
                                style={{ cursor: "pointer", opacity: isItemDisabled ? 0.4 : 1 }}
                                onClick={() => handleRowClick(i, "INSTALLMENT")}
                              >
                                <Table.Td style={{ width: 1, whiteSpace: "nowrap" }}>
                                  {renderCategoryBadge(i.category)}
                                </Table.Td>
                                <Table.Td style={{ width: "100%" }}>
                                  <Text size="sm" fw={600}>{i.title}</Text>
                                  <Text size="xs" c="dimmed">
                                    {i.startMonth}/{i.startYear} ➔ {i.endMonth}/{i.endYear}
                                  </Text>
                                </Table.Td>
                                <Table.Td fw={600} style={{ width: 1, whiteSpace: "nowrap" }}>{i.dayOfMonth}</Table.Td>
                                <Table.Td fw={700} c={isItemDisabled ? "dimmed" : getCategoryTextColor(i.category)} style={{ width: 1, whiteSpace: "nowrap" }}>
                                  -{i.amount.toFixed(2)} €
                                </Table.Td>
                                {!isReadOnly && (
                                  <Table.Td visibleFrom="md" style={{ width: 1, whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                                    <Group gap={4} wrap="nowrap">
                                      <Tooltip label={isItemDisabled ? "Réactiver ce mois-ci" : "Désactiver ce mois-ci"}>
                                        <ActionIcon
                                          color={isItemDisabled ? "teal" : "gray"}
                                          variant={isItemDisabled ? "light" : "subtle"}
                                          onClick={() => handleToggleDisableItem(i, "INSTALLMENT")}
                                        >
                                          {isItemDisabled ? <IconEye size={16} /> : <IconEyeOff size={16} />}
                                        </ActionIcon>
                                      </Tooltip>
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
                                          originalAmount: i.originalAmount || i.amount,
                                          overrideAmount: i.overrideAmount,
                                          isDisabled: i.isDisabled,
                                          hasOverride: Boolean(i.hasOverride),
                                        })}>
                                          <IconEdit size={16} />
                                        </ActionIcon>
                                      </Tooltip>
                                      <ActionIcon color="red" variant="subtle" onClick={() => deleteInstallment(activeWalletId, i.id, month === 0 ? new Date().getMonth() + 1 : month, year).then(loadData)}>
                                        <IconTrash size={16} />
                                      </ActionIcon>
                                    </Group>
                                  </Table.Td>
                                )}
                              </Table.Tr>
                            );
                          })}
                        </Table.Tbody>
                        <Table.Tfoot>
                          <Table.Tr style={{ borderTop: "2px solid rgba(255,255,255,0.12)" }}>
                            <Table.Td colSpan={3} style={{ width: "100%" }}>
                              <Text size="sm" fw={400} c="white">
                                Total
                              </Text>
                            </Table.Td>
                            <Table.Td fw={400} c="white" style={{ width: 1, whiteSpace: "nowrap" }}>
                              -{data?.summary?.totalInstallments ? data.summary.totalInstallments.toFixed(2) : "0.00"} €
                            </Table.Td>
                            {!isReadOnly && <Table.Td visibleFrom="md" style={{ width: 1, whiteSpace: "nowrap" }} />}
                          </Table.Tr>
                        </Table.Tfoot>
                      </Table>
                    </Table.ScrollContainer>
                  </Paper>
                </Grid.Col>
              </Grid>
            </Stack>
          </Tabs.Panel>

          {/* TAB 5: TRANSACTIONS QUOTIDIENNES */}
          <Tabs.Panel value="transactions">
            <Paper p={{ base: "xs", sm: "md", md: "lg" }} radius="md" style={{ backgroundColor: "#121829", border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <Group justify="space-between" mb="md">
                <Title order={4} style={{ color: "#fff" }}>
                  Historique des Dépenses ({getMonthLabel(month)} {year})
                </Title>
                {!isReadOnly && (
                  <Button variant="gradient" gradient={{ from: "teal", to: "cyan" }} leftSection={<IconPlus size={16} />} onClick={handleOpenAddTransaction}>
                    Saisir une dépense
                  </Button>
                )}
              </Group>

              {/* Filter & Search */}
              <Grid mb="md" align="center">
                <Grid.Col span={{ base: 12, sm: 4, md: 3 }}>
                  <Select
                    placeholder="Toutes les catégories"
                    aria-label="Filtrer par catégorie"
                    clearable
                    value={filterCategory}
                    onChange={(val) => setFilterCategory(val)}
                    data={Array.from(new Set(data?.transactions?.map((t: any) => t.category) || [])).map((c: any) => ({
                      label: c,
                      value: c,
                    }))}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 8, md: 9 }}>
                  <TextInput
                    placeholder="Rechercher par titre ou catégorie..."
                    leftSection={<IconSearch size={16} />}
                    value={searchTx}
                    onChange={(e) => setSearchTx(e.target.value)}
                  />
                </Grid.Col>
              </Grid>

              {!sortedTransactions || sortedTransactions.length === 0 ? (
                <Text size="sm" c="dimmed" ta="center" py="xl">
                  Aucune dépense trouvée.
                </Text>
              ) : (
                <Table.ScrollContainer minWidth={300}>
                  <Table highlightOnHover style={{ tableLayout: "auto", width: "100%" }}>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th style={{ cursor: "pointer", userSelect: "none", width: 1, whiteSpace: "nowrap" }} onClick={() => handleTxSort("category")}>
                          <Group gap={2} wrap="nowrap">
                            <span>Catégorie</span>
                            {txSortField === "category" ? (
                              txSortOrder === "asc" ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />
                            ) : (
                              <IconSelector size={12} style={{ opacity: 0.3 }} />
                            )}
                          </Group>
                        </Table.Th>
                        <Table.Th style={{ cursor: "pointer", userSelect: "none", width: "100%" }} onClick={() => handleTxSort("title")}>
                          <Group gap={2} wrap="nowrap">
                            <span>Libellé</span>
                            {txSortField === "title" ? (
                              txSortOrder === "asc" ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />
                            ) : (
                              <IconSelector size={12} style={{ opacity: 0.3 }} />
                            )}
                          </Group>
                        </Table.Th>
                        <Table.Th style={{ cursor: "pointer", userSelect: "none", width: 1, whiteSpace: "nowrap" }} onClick={() => handleTxSort("day")}>
                          <Group gap={2} wrap="nowrap">
                            <span>Jour</span>
                            {txSortField === "day" ? (
                              txSortOrder === "asc" ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />
                            ) : (
                              <IconSelector size={12} style={{ opacity: 0.3 }} />
                            )}
                          </Group>
                        </Table.Th>
                        <Table.Th style={{ cursor: "pointer", userSelect: "none", width: 1, whiteSpace: "nowrap" }} onClick={() => handleTxSort("amount")}>
                          <Group gap={2} wrap="nowrap">
                            <span>Montant</span>
                            {txSortField === "amount" ? (
                              txSortOrder === "asc" ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />
                            ) : (
                              <IconSelector size={12} style={{ opacity: 0.3 }} />
                            )}
                          </Group>
                        </Table.Th>
                        {!isReadOnly && <Table.Th visibleFrom="md" style={{ width: 1, whiteSpace: "nowrap" }}>Actions</Table.Th>}
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {sortedTransactions.map((t: any) => (
                        <Table.Tr
                          key={t.id}
                          style={{ cursor: "pointer" }}
                          onClick={() => handleRowClick(t, "TRANSACTION")}
                        >
                          <Table.Td style={{ width: 1, whiteSpace: "nowrap" }}>
                            {renderCategoryBadge(t.category)}
                          </Table.Td>
                          <Table.Td style={{ width: "100%" }}>
                            <Text size="sm" fw={500}>
                              {t.title}
                            </Text>
                            {t.notes && t.notes.trim() !== "" && (
                              <Text size="xs" c="dimmed" style={{ lineHeight: 1.2 }}>
                                {t.notes}
                              </Text>
                            )}
                          </Table.Td>
                          <Table.Td fw={600} style={{ width: 1, whiteSpace: "nowrap" }}>{t.day}</Table.Td>
                          <Table.Td fw={700} c={getCategoryTextColor(t.category)} style={{ width: 1, whiteSpace: "nowrap" }}>
                            -{t.amount.toFixed(2)} €
                          </Table.Td>
                          {!isReadOnly && (
                            <Table.Td visibleFrom="md" style={{ width: 1, whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                              <Group gap={4} wrap="nowrap">
                                <ActionIcon color="blue" variant="subtle" onClick={() => handleOpenEditTransaction(t)}>
                                  <IconPencil size={16} />
                                </ActionIcon>
                                <ActionIcon color="red" variant="subtle" onClick={() => deleteTransaction(activeWalletId, t.id).then(loadData)}>
                                  <IconTrash size={16} />
                                </ActionIcon>
                              </Group>
                            </Table.Td>
                          )}
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                    <Table.Tfoot>
                      <Table.Tr style={{ borderTop: "2px solid rgba(255,255,255,0.12)" }}>
                        <Table.Td colSpan={3} style={{ width: "100%" }}>
                          <Group justify="space-between" align="center">
                            <Text size="sm" fw={700} c="white">
                              Total des dépenses
                            </Text>
                            {filterCategory && (
                              <Badge size="xs" color="cyan" variant="light">
                                Filtre : {filterCategory}
                              </Badge>
                            )}
                          </Group>
                        </Table.Td>
                        <Table.Td fw={800} c="red.4" style={{ fontSize: "15px", width: 1, whiteSpace: "nowrap" }}>
                          -{filteredTransactions.reduce((acc: number, t: any) => acc + t.amount, 0).toFixed(2)} €
                        </Table.Td>
                        {!isReadOnly && <Table.Td visibleFrom="md" style={{ width: 1, whiteSpace: "nowrap" }} />}
                      </Table.Tr>
                    </Table.Tfoot>
                  </Table>
                </Table.ScrollContainer>
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
                    {!isReadOnly && (
                      <Button
                        size="xs"
                        color="cyan"
                        leftSection={<IconArrowsExchange size={14} />}
                        onClick={handleOpenAddTransfer}
                      >
                        Nouveau Virement Inter-Portefeuille
                      </Button>
                    )}
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
                                <Table.Th>Motif</Table.Th>
                                <Table.Th>Destinataire</Table.Th>
                                <Table.Th>Montant</Table.Th>
                                {!isReadOnly && <Table.Th visibleFrom="md">Actions</Table.Th>}
                              </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                              {data.transfersSent.map((t: any) => {
                                const isItemDisabled = Boolean(t.isDisabled || (t.hasOverride && t.amount === 0));
                                return (
                                  <Table.Tr
                                    key={t.id}
                                    style={{ cursor: "pointer", opacity: isItemDisabled ? 0.4 : 1 }}
                                    onClick={() => handleRowClick(t, "TRANSFER")}
                                  >
                                    <Table.Td fw={600}>{t.title}</Table.Td>
                                    <Table.Td>
                                      <Badge color="cyan" variant="light" size="sm">
                                        {t.targetWallet?.name || "Portefeuille"}
                                      </Badge>
                                    </Table.Td>
                                    <Table.Td fw={700} c={isItemDisabled ? "dimmed" : "cyan.4"}>
                                      {t.isPercentage ? (
                                        <Badge color="cyan" variant="filled" size="sm">
                                          {t.percentage}% (-{t.amount.toFixed(2)} €)
                                        </Badge>
                                      ) : (
                                        `-${t.amount.toFixed(2)} €`
                                      )}
                                    </Table.Td>
                                    {!isReadOnly && (
                                      <Table.Td visibleFrom="md" onClick={(e) => e.stopPropagation()}>
                                        <Group gap={4}>
                                          <Tooltip label={isItemDisabled ? "Réactiver ce mois-ci" : "Désactiver ce mois-ci"}>
                                            <ActionIcon
                                              color={isItemDisabled ? "teal" : "gray"}
                                              variant={isItemDisabled ? "light" : "subtle"}
                                              onClick={() => handleToggleDisableItem(t, "TRANSFER" as any)}
                                            >
                                              {isItemDisabled ? <IconEye size={16} /> : <IconEyeOff size={16} />}
                                            </ActionIcon>
                                          </Tooltip>
                                          <Tooltip label="Modifier le virement">
                                            <ActionIcon color="blue" variant="subtle" onClick={() => handleOpenEditTransfer(t)}>
                                              <IconEdit size={16} />
                                            </ActionIcon>
                                          </Tooltip>
                                          <ActionIcon color="red" variant="subtle" onClick={() => deleteWalletTransfer(activeWalletId, t.id).then(loadData)}>
                                            <IconTrash size={16} />
                                          </ActionIcon>
                                        </Group>
                                      </Table.Td>
                                    )}
                                  </Table.Tr>
                                );
                              })}
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
                                      {t.senderName}
                                    </Badge>
                                  </Table.Td>
                                  <Table.Td>
                                    <Badge color="blue" variant="light" size="sm">
                                      {t.sourceWalletName}
                                    </Badge>
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

          {/* TAB 7: STATISTIQUES */}
          <Tabs.Panel value="stats">
            <Stack gap="lg">
              {/* Cartes KPI statistiques */}
              <Grid>
                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <Paper p="md" radius="md" style={{ backgroundColor: "#161d30", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <Text size="xs" c="dimmed" fw={700}>REVENUS TOTAUX DU MOIS</Text>
                    <Text size="xl" fw={800} c="teal.3">
                      +{statsSummary.totalRevenues.toFixed(2)} €
                    </Text>
                  </Paper>
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <Paper p="md" radius="md" style={{ backgroundColor: "#161d30", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <Text size="xs" c="dimmed" fw={700}>DÉPENSES TOTALES DU MOIS</Text>
                    <Text size="xl" fw={800} c="red.4">
                      -{statsSummary.totalExpenses.toFixed(2)} €
                      <Text span size="xs" c="dimmed" ml={6}>
                        ({statsSummary.totalRevenues > 0 ? ((statsSummary.totalExpenses / statsSummary.totalRevenues) * 100).toFixed(1) : 0}%)
                      </Text>
                    </Text>
                  </Paper>
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <Paper p="md" radius="md" style={{ backgroundColor: "#161d30", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <Text size="xs" c="dimmed" fw={700}>SOLDE DISPONIBLE / ÉPARGNE</Text>
                    <Text size="xl" fw={800} c="teal.4">
                      +{statsSummary.unspent.toFixed(2)} €
                      <Text span size="xs" c="dimmed" ml={6}>
                        ({statsSummary.totalRevenues > 0 ? ((statsSummary.unspent / statsSummary.totalRevenues) * 100).toFixed(1) : 0}%)
                      </Text>
                    </Text>
                  </Paper>
                </Grid.Col>
              </Grid>

              {/* Segmented Control pour la vue Statistiques */}
              <SegmentedControl
                value={statsMode}
                onChange={setStatsMode}
                data={[
                  { label: "📊 Enveloppes", value: "envelopes" },
                  { label: "💸 Dépenses Quotidiennes", value: "expenses" },
                ]}
                color="cyan"
                bg="#161d30"
                radius="md"
                size="sm"
                fullWidth
              />

              {/* MODE 1: ENVELOPPES OVERALL */}
              {statsMode === "envelopes" && (
                <Grid>
                  <Grid.Col span={{ base: 12, md: 7 }}>
                    <Paper p="lg" radius="md" style={{ backgroundColor: "#121829", border: "1px solid rgba(255,255,255,0.06)", height: 500 }}>
                      <Title order={4} style={{ color: "#fff" }} mb="xs">
                        Répartition Globale par Enveloppe Budgétaire
                      </Title>
                      <Text size="xs" c="dimmed" mb="md">
                        Vue d'ensemble de la consommation globale de vos enveloppes budgétaires (charges fixes, crédits et dépenses quotidiennes incluses).
                      </Text>

                      {overallEnvelopesStats.items.length === 0 ? (
                        <Text size="sm" c="dimmed" ta="center" py="xl">
                          Aucune enveloppe consommée pour ce mois.
                        </Text>
                      ) : (
                        <ResponsiveContainer width="100%" height={380}>
                          <PieChart>
                            <Pie
                              data={overallEnvelopesStats.items}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={80}
                              outerRadius={140}
                              paddingAngle={2}
                            >
                              {overallEnvelopesStats.items.map((entry: any, index: number) => (
                                <Cell key={`cell-env-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <RechartsTooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const d = payload[0].payload;
                                  const pctTotal = overallEnvelopesStats.totalSpent > 0 ? ((d.value / overallEnvelopesStats.totalSpent) * 100).toFixed(1) : 0;
                                  const pctRev = statsSummary.totalRevenues > 0 ? ((d.value / statsSummary.totalRevenues) * 100).toFixed(1) : 0;
                                  return (
                                    <Paper p="xs" radius="md" style={{ backgroundColor: "#1a2238", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}>
                                      <Group gap="xs" mb={2}>
                                        {renderCategoryBadge(d.name)}
                                      </Group>
                                      <Text size="sm" fw={800} c="white" mt={4}>
                                        {d.value.toFixed(2)} €
                                      </Text>
                                      <Text size="xs" c="dimmed">
                                        {pctTotal}% du budget consommé ({pctRev}% du revenu)
                                      </Text>
                                      {d.hasLimit && (
                                        <Text size="xs" c={d.value > d.limitAmount ? "red.4" : "teal.4"} fw={600} mt={2}>
                                          Plafond : {d.limitAmount.toFixed(2)} € ({((d.value / d.limitAmount) * 100).toFixed(0)}%)
                                        </Text>
                                      )}
                                    </Paper>
                                  );
                                }
                                return null;
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </Paper>
                  </Grid.Col>

                  <Grid.Col span={{ base: 12, md: 5 }}>
                    <Paper p="lg" radius="md" style={{ backgroundColor: "#121829", border: "1px solid rgba(255,255,255,0.06)", height: 500, overflowY: "auto" }}>
                      <Title order={4} style={{ color: "#fff" }} mb="md">
                        Détail par Enveloppe Budgétaire
                      </Title>
                      <Table highlightOnHover>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th style={{ width: "100%" }}>Enveloppe / Catégorie</Table.Th>
                            <Table.Th style={{ width: 1, whiteSpace: "nowrap" }}>Montant</Table.Th>
                            <Table.Th style={{ width: 1, whiteSpace: "nowrap" }}>% Consommé</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {overallEnvelopesStats.items.map((item: any, idx: number) => {
                            const pct = overallEnvelopesStats.totalSpent > 0 ? (item.value / overallEnvelopesStats.totalSpent) * 100 : 0;
                            return (
                              <Table.Tr key={idx}>
                                <Table.Td style={{ width: "100%" }}>
                                  <Group gap={6} wrap="nowrap">
                                    <Box style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: item.color, flexShrink: 0 }} />
                                    {renderCategoryBadge(item.name)}
                                  </Group>
                                </Table.Td>
                                <Table.Td fw={700} style={{ width: 1, whiteSpace: "nowrap" }}>
                                  {item.value.toFixed(2)} €
                                </Table.Td>
                                <Table.Td fw={700} style={{ width: 1, whiteSpace: "nowrap" }}>
                                  <Group gap={6} align="center" wrap="nowrap">
                                    <Text size="xs" fw={700}>{pct.toFixed(1)}%</Text>
                                    <Progress value={Math.min(100, pct)} color={item.color} size="sm" style={{ width: 60 }} />
                                  </Group>
                                </Table.Td>
                              </Table.Tr>
                            );
                          })}
                        </Table.Tbody>
                        <Table.Tfoot style={{ borderTop: "2px solid rgba(255,255,255,0.12)" }}>
                          <Table.Tr style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
                            <Table.Td fw={800} style={{ color: "#fff" }}>
                              Total Consommé
                            </Table.Td>
                            <Table.Td fw={800} style={{ color: "#20c997", whiteSpace: "nowrap" }}>
                              {overallEnvelopesStats.totalSpent.toFixed(2)} €
                            </Table.Td>
                            <Table.Td fw={800} style={{ color: "#fff", whiteSpace: "nowrap" }}>
                              100%
                            </Table.Td>
                          </Table.Tr>
                        </Table.Tfoot>
                      </Table>
                    </Paper>
                  </Grid.Col>
                </Grid>
              )}

              {/* MODE 2: DÉPENSES QUOTIDIENNES (2 Camemberts empilés) */}
              {statsMode === "expenses" && (
                <Stack gap="xl">
                  {/* Filtre par Catégorie */}
                  <Paper p="md" radius="md" style={{ backgroundColor: "#161d30", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <Group justify="space-between" align="center" wrap="wrap" gap="sm">
                      <div>
                        <Text size="sm" fw={700} style={{ color: "#fff" }}>
                          Filtre par Catégorie / Enveloppe
                        </Text>
                        <Text size="xs" c="dimmed">
                          {statsCategoryFilter === "ALL"
                            ? "Affichage de l'ensemble des dépenses quotidiennes (Toutes par défaut)"
                            : `Filtre actif : "${statsCategoryFilter}" (${dailyExpensesByTitleStats.total.toFixed(2)} € au total)`}
                        </Text>
                      </div>
                      <Select
                        placeholder="Toutes les catégories"
                        data={statsCategoryOptions}
                        value={statsCategoryFilter}
                        onChange={(val) => setStatsCategoryFilter(val || "ALL")}
                        leftSection={<IconFilter size={16} />}
                        size="sm"
                        style={{ minWidth: 260 }}
                        comboboxProps={{ shadow: "md", zIndex: 1000 }}
                      />
                    </Group>
                  </Paper>

                  {/* Camembert 1: Par Libellés de Dépenses */}
                  <div>
                    <Title order={4} style={{ color: "#fff" }} mb="xs">
                      1. Dépenses Quotidiennes par Libellés
                    </Title>
                    <Text size="xs" c="dimmed" mb="md">
                      Ventilation détaillée des dépenses quotidiennes regroupées par intitulé de dépense.
                    </Text>
                    <Grid>
                      <Grid.Col span={{ base: 12, md: 7 }}>
                        <Paper p="lg" radius="md" style={{ backgroundColor: "#121829", border: "1px solid rgba(255,255,255,0.06)", height: 500 }}>
                          {dailyExpensesByTitleStats.items.length === 0 ? (
                            <Text size="sm" c="dimmed" ta="center" py="xl">
                              Aucune dépense quotidienne enregistrée pour ce mois.
                            </Text>
                          ) : (
                            <ResponsiveContainer width="100%" height={430}>
                              <PieChart>
                                <Pie
                                  data={dailyExpensesByTitleStats.items}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={80}
                                  outerRadius={140}
                                  paddingAngle={2}
                                >
                                  {dailyExpensesByTitleStats.items.map((entry: any, index: number) => (
                                    <Cell key={`cell-title-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <RechartsTooltip
                                  content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                      const d = payload[0].payload;
                                      const pctExp = dailyExpensesByTitleStats.total > 0 ? ((d.value / dailyExpensesByTitleStats.total) * 100).toFixed(1) : 0;
                                      return (
                                        <Paper p="xs" radius="md" style={{ backgroundColor: "#1a2238", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}>
                                          <Group gap="xs" mb={2}>
                                            {renderCategoryBadge(d.category)}
                                            <Text size="xs" fw={700}>
                                              {d.name}
                                            </Text>
                                          </Group>
                                          <Text size="sm" fw={800} c="white">
                                            {d.value.toFixed(2)} €
                                          </Text>
                                          <Text size="xs" c="dimmed">
                                            {pctExp}% du total des dépenses quotidiennes
                                          </Text>
                                        </Paper>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          )}
                        </Paper>
                      </Grid.Col>

                      <Grid.Col span={{ base: 12, md: 5 }}>
                        <Paper p="lg" radius="md" style={{ backgroundColor: "#121829", border: "1px solid rgba(255,255,255,0.06)", height: 500, overflowY: "auto" }}>
                          <Title order={5} style={{ color: "#fff" }} mb="md">
                            Détail par Intitulé
                          </Title>
                          <Table highlightOnHover>
                            <Table.Thead>
                              <Table.Tr>
                                <Table.Th style={{ width: "100%" }}>Libellé</Table.Th>
                                <Table.Th style={{ width: 1, whiteSpace: "nowrap" }}>Montant</Table.Th>
                                <Table.Th style={{ width: 1, whiteSpace: "nowrap" }}>% Dépenses</Table.Th>
                              </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                              {dailyExpensesByTitleStats.items.map((item: any, idx: number) => {
                                const pct = dailyExpensesByTitleStats.total > 0 ? (item.value / dailyExpensesByTitleStats.total) * 100 : 0;
                                return (
                                  <Table.Tr key={idx}>
                                    <Table.Td style={{ width: "100%" }}>
                                      <Group gap={6} wrap="nowrap">
                                        <Box style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: item.color, flexShrink: 0 }} />
                                        <Text size="sm" fw={600}>{item.name}</Text>
                                      </Group>
                                    </Table.Td>
                                    <Table.Td fw={700} style={{ width: 1, whiteSpace: "nowrap" }}>
                                      {item.value.toFixed(2)} €
                                    </Table.Td>
                                    <Table.Td fw={700} style={{ width: 1, whiteSpace: "nowrap" }}>
                                      <Group gap={6} align="center" wrap="nowrap">
                                        <Text size="xs" fw={700}>{pct.toFixed(1)}%</Text>
                                        <Progress value={Math.min(100, pct)} color="cyan" size="sm" style={{ width: 60 }} />
                                      </Group>
                                    </Table.Td>
                                  </Table.Tr>
                                );
                              })}
                            </Table.Tbody>
                            <Table.Tfoot style={{ borderTop: "2px solid rgba(255,255,255,0.12)" }}>
                              <Table.Tr style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
                                <Table.Td fw={800} style={{ color: "#fff" }}>
                                  Total Dépenses
                                </Table.Td>
                                <Table.Td fw={800} style={{ color: "#20c997", whiteSpace: "nowrap" }}>
                                  {dailyExpensesByTitleStats.total.toFixed(2)} €
                                </Table.Td>
                                <Table.Td fw={800} style={{ color: "#fff", whiteSpace: "nowrap" }}>
                                  100%
                                </Table.Td>
                              </Table.Tr>
                            </Table.Tfoot>
                          </Table>
                        </Paper>
                      </Grid.Col>
                    </Grid>
                  </div>

                  {/* Camembert 2: Par Enveloppes ciblées uniquement sur les dépenses */}
                  <div>
                    <Title order={4} style={{ color: "#fff" }} mb="xs">
                      2. Dépenses Quotidiennes par Enveloppes Budgétaires
                    </Title>
                    <Text size="xs" c="dimmed" mb="md">
                      Ventilation des dépenses quotidiennes regroupées par enveloppes / catégories d'enveloppe.
                    </Text>
                    <Grid>
                      <Grid.Col span={{ base: 12, md: 7 }}>
                        <Paper p="lg" radius="md" style={{ backgroundColor: "#121829", border: "1px solid rgba(255,255,255,0.06)", height: 500 }}>
                          {dailyExpensesByCategoryStats.items.length === 0 ? (
                            <Text size="sm" c="dimmed" ta="center" py="xl">
                              Aucune dépense quotidienne enregistrée pour ce mois.
                            </Text>
                          ) : (
                            <ResponsiveContainer width="100%" height={430}>
                              <PieChart>
                                <Pie
                                  data={dailyExpensesByCategoryStats.items}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={80}
                                  outerRadius={140}
                                  paddingAngle={2}
                                >
                                  {dailyExpensesByCategoryStats.items.map((entry: any, index: number) => (
                                    <Cell key={`cell-cat-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <RechartsTooltip
                                  content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                      const d = payload[0].payload;
                                      const pctExp = dailyExpensesByCategoryStats.total > 0 ? ((d.value / dailyExpensesByCategoryStats.total) * 100).toFixed(1) : 0;
                                      return (
                                        <Paper p="xs" radius="md" style={{ backgroundColor: "#1a2238", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}>
                                          <Group gap="xs" mb={2}>
                                            {renderCategoryBadge(d.name)}
                                          </Group>
                                          <Text size="sm" fw={800} c="white" mt={4}>
                                            {d.value.toFixed(2)} €
                                          </Text>
                                          <Text size="xs" c="dimmed">
                                            {pctExp}% des dépenses quotidiennes
                                          </Text>
                                        </Paper>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          )}
                        </Paper>
                      </Grid.Col>

                      <Grid.Col span={{ base: 12, md: 5 }}>
                        <Paper p="lg" radius="md" style={{ backgroundColor: "#121829", border: "1px solid rgba(255,255,255,0.06)", height: 500, overflowY: "auto" }}>
                          <Title order={5} style={{ color: "#fff" }} mb="md">
                            Détail par Enveloppe de Dépense
                          </Title>
                          <Table highlightOnHover>
                            <Table.Thead>
                              <Table.Tr>
                                <Table.Th style={{ width: "100%" }}>Catégorie / Enveloppe</Table.Th>
                                <Table.Th style={{ width: 1, whiteSpace: "nowrap" }}>Montant</Table.Th>
                                <Table.Th style={{ width: 1, whiteSpace: "nowrap" }}>% Dépenses</Table.Th>
                              </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                              {dailyExpensesByCategoryStats.items.map((item: any, idx: number) => {
                                const pct = dailyExpensesByCategoryStats.total > 0 ? (item.value / dailyExpensesByCategoryStats.total) * 100 : 0;
                                return (
                                  <Table.Tr key={idx}>
                                    <Table.Td style={{ width: "100%" }}>
                                      <Group gap={6} wrap="nowrap">
                                        <Box style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: item.color, flexShrink: 0 }} />
                                        {renderCategoryBadge(item.name)}
                                      </Group>
                                    </Table.Td>
                                    <Table.Td fw={700} style={{ width: 1, whiteSpace: "nowrap" }}>
                                      {item.value.toFixed(2)} €
                                    </Table.Td>
                                    <Table.Td fw={700} style={{ width: 1, whiteSpace: "nowrap" }}>
                                      <Group gap={6} align="center" wrap="nowrap">
                                        <Text size="xs" fw={700}>{pct.toFixed(1)}%</Text>
                                        <Progress value={Math.min(100, pct)} color={item.color} size="sm" style={{ width: 60 }} />
                                      </Group>
                                    </Table.Td>
                                  </Table.Tr>
                                );
                              })}
                            </Table.Tbody>
                            <Table.Tfoot style={{ borderTop: "2px solid rgba(255,255,255,0.12)" }}>
                              <Table.Tr style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
                                <Table.Td fw={800} style={{ color: "#fff" }}>
                                  Total Dépenses
                                </Table.Td>
                                <Table.Td fw={800} style={{ color: "#20c997", whiteSpace: "nowrap" }}>
                                  {dailyExpensesByCategoryStats.total.toFixed(2)} €
                                </Table.Td>
                                <Table.Td fw={800} style={{ color: "#fff", whiteSpace: "nowrap" }}>
                                  100%
                                </Table.Td>
                              </Table.Tr>
                            </Table.Tfoot>
                          </Table>
                        </Paper>
                      </Grid.Col>
                    </Grid>
                  </div>
                </Stack>
              )}
            </Stack>
          </Tabs.Panel>
          {/* TAB 8: LISTE D'ACHAT (WISHLIST) */}
          <Tabs.Panel value="wishlist">
            <Stack gap="md">
              {/* KPI Wishlist & Calculation Simulator */}
              <Grid>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Paper p="md" radius="md" style={{ backgroundColor: "#161d30", border: "1px solid rgba(255,255,255,0.06)", height: "100%" }}>
                    <Group justify="space-between" mb={4}>
                      <Text size="xs" c="dimmed" fw={700}>SÉLECTION COCHÉE</Text>
                      <ThemeIcon size="sm" color="cyan" variant="light" radius="xl">
                        <IconShoppingCart size={14} />
                      </ThemeIcon>
                    </Group>
                    <Text size="xl" fw={800} c="cyan.3">
                      {wishlistCalc.selectedTotalAmount.toFixed(2)} €
                    </Text>
                    <Text size="xs" c="dimmed">
                      {wishlistCalc.selectedItems.length} article(s) coché(s) sur {wishlistCalc.pendingItems.length} en attente
                    </Text>
                  </Paper>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Paper p="md" radius="md" style={{ backgroundColor: "#161d30", border: "1px solid rgba(255,255,255,0.06)", height: "100%" }}>
                    <Group justify="space-between" mb={4}>
                      <Text size="xs" c="dimmed" fw={700}>BUDGET & MARGE DE SÉCURITÉ</Text>
                      <NumberInput
                        size="xs"
                        placeholder="Marge %"
                        value={safetyMarginPercent}
                        onChange={(val) => setSafetyMarginPercent(val)}
                        min={0}
                        max={100}
                        suffix="%"
                        style={{ width: 90 }}
                      />
                    </Group>
                    <Text size="xl" fw={800} c="teal.3">
                      {wishlistCalc.availableBudget.toFixed(2)} €
                    </Text>
                    <Text size="xs" c="dimmed">
                      Épargne brute: {wishlistCalc.netSavings.toFixed(2)} € ({wishlistCalc.margin}% conservé)
                    </Text>
                  </Paper>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Paper p="md" radius="md" style={{ backgroundColor: "#161d30", border: "1px solid rgba(255,255,255,0.06)", height: "100%" }}>
                    <Group justify="space-between" mb={4}>
                      <Text size="xs" c="dimmed" fw={700}>FAISABILITÉ COMPTANT</Text>
                      <ThemeIcon size="sm" color={wishlistCalc.selectedTotalAmount === 0 ? "gray" : wishlistCalc.canAffordCash ? "teal" : "red"} variant="light" radius="xl">
                        {wishlistCalc.canAffordCash ? <IconCircleCheck size={14} /> : <IconAlertCircle size={14} />}
                      </ThemeIcon>
                    </Group>

                    {wishlistCalc.selectedTotalAmount === 0 ? (
                      <Text size="sm" c="dimmed">
                        Cochez des articles dans la liste ci-dessous pour évaluer la faisabilité.
                      </Text>
                    ) : wishlistCalc.canAffordCash ? (
                      <div>
                        <Text size="xl" fw={800} c="teal.3">
                          Finançable au comptant
                        </Text>
                        <Text size="xs" c="dimmed">
                          Reste disponible après achat: {(wishlistCalc.availableBudget - wishlistCalc.selectedTotalAmount).toFixed(2)} €
                        </Text>
                      </div>
                    ) : (
                      <Stack gap={4}>
                        <Group gap="xs">
                          <Text size="md" fw={800} c="red.4">
                            Dépassement (-{wishlistCalc.deficit.toFixed(2)} €)
                          </Text>
                        </Group>
                        <Text style={{ fontSize: "11px" }} fw={700} c="dimmed">
                          Simulateur échelonné disponible :
                        </Text>
                        <Group gap={4} wrap="wrap">
                          {wishlistCalc.feasibleInstallments.map((inst) => (
                            <Badge
                              key={inst.months}
                              color={inst.isFeasible ? "teal" : "red"}
                              variant={inst.isFeasible ? "filled" : "outline"}
                              size="xs"
                            >
                              {inst.months}x : {inst.monthly.toFixed(2)} €/mois
                            </Badge>
                          ))}
                        </Group>
                      </Stack>
                    )}
                  </Paper>
                </Grid.Col>
              </Grid>

              {/* Main Wishlist Table */}
              <Paper p={{ base: "xs", sm: "md", md: "lg" }} radius="md" style={{ backgroundColor: "#121829", border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <Group justify="space-between" mb="md">
                  <div>
                    <Title order={4} style={{ color: "#fff" }}>
                      Ma Liste d'Achat
                    </Title>
                    <Text size="xs" c="dimmed">
                      Préconfigurez vos achats souhaités et déclenchez le paiement au moment voulu.
                    </Text>
                  </div>
                  {!isReadOnly && (
                    <Button
                      size="xs"
                      color="cyan"
                      leftSection={<IconPlus size={14} />}
                      onClick={handleOpenAddWishlist}
                    >
                      Ajouter un souhait d'achat
                    </Button>
                  )}
                </Group>

                {/* Filter & Search Wishlist */}
                <Grid mb="md" align="center">
                  <Grid.Col span={{ base: 12, sm: 4, md: 3 }}>
                    <Select
                      placeholder="Toutes les catégories"
                      aria-label="Filtrer par catégorie dans la liste d'achat"
                      clearable
                      value={filterWishlistCategory}
                      onChange={(val) => setFilterWishlistCategory(val)}
                      data={wishlistCategoryOptions}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 8, md: 9 }}>
                    <TextInput
                      placeholder="Rechercher par libellé ou description..."
                      leftSection={<IconSearch size={16} />}
                      value={searchWishlist}
                      onChange={(e) => setSearchWishlist(e.target.value)}
                    />
                  </Grid.Col>
                </Grid>

                {(!data?.wishlistItems || data.wishlistItems.length === 0) ? (
                  <Text size="sm" c="dimmed" ta="center" py="xl">
                    Aucun achat en attente dans votre liste. Cliquez sur "Ajouter un souhait d'achat" pour planifier votre premier achat.
                  </Text>
                ) : (
                  <Table.ScrollContainer minWidth={300}>
                    <Table highlightOnHover style={{ tableLayout: "auto", width: "100%" }}>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th style={{ width: 1, whiteSpace: "nowrap" }}>
                            <Checkbox
                              size="xs"
                              color="cyan"
                              checked={
                                wishlistCalc.pendingItems.length > 0 &&
                                wishlistCalc.pendingItems.every((i: any) => selectedWishlistIds.includes(i.id))
                              }
                              onChange={(e) => {
                                if (e.currentTarget.checked) {
                                  setSelectedWishlistIds(wishlistCalc.pendingItems.map((i: any) => i.id));
                                } else {
                                  setSelectedWishlistIds([]);
                                }
                              }}
                            />
                          </Table.Th>
                          <Table.Th style={{ cursor: "pointer", userSelect: "none", width: 1, whiteSpace: "nowrap" }} onClick={() => handleWishlistSort("priority")}>
                            <Group gap={2} wrap="nowrap">
                              <span>Priorité</span>
                              {wishlistSortField === "priority" ? (
                                wishlistSortOrder === "asc" ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />
                              ) : (
                                <IconSelector size={12} style={{ opacity: 0.3 }} />
                              )}
                            </Group>
                          </Table.Th>
                          <Table.Th style={{ cursor: "pointer", userSelect: "none", width: 1, whiteSpace: "nowrap" }} onClick={() => handleWishlistSort("category")}>
                            <Group gap={2} wrap="nowrap">
                              <span>Catégorie</span>
                              {wishlistSortField === "category" ? (
                                wishlistSortOrder === "asc" ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />
                              ) : (
                                <IconSelector size={12} style={{ opacity: 0.3 }} />
                              )}
                            </Group>
                          </Table.Th>
                          <Table.Th style={{ cursor: "pointer", userSelect: "none", width: "100%" }} onClick={() => handleWishlistSort("title")}>
                            <Group gap={2} wrap="nowrap">
                              <span>Libellé</span>
                              {wishlistSortField === "title" ? (
                                wishlistSortOrder === "asc" ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />
                              ) : (
                                <IconSelector size={12} style={{ opacity: 0.3 }} />
                              )}
                            </Group>
                          </Table.Th>
                          <Table.Th visibleFrom="md" style={{ width: 1, whiteSpace: "nowrap" }}>Lien</Table.Th>
                          <Table.Th style={{ cursor: "pointer", userSelect: "none", width: 1, whiteSpace: "nowrap" }} onClick={() => handleWishlistSort("amount")}>
                            <Group gap={2} wrap="nowrap">
                              <span>Montant Estimé</span>
                              {wishlistSortField === "amount" ? (
                                wishlistSortOrder === "asc" ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />
                              ) : (
                                <IconSelector size={12} style={{ opacity: 0.3 }} />
                              )}
                            </Group>
                          </Table.Th>
                          {!isReadOnly && <Table.Th visibleFrom="md" style={{ width: 1, whiteSpace: "nowrap" }}>Actions</Table.Th>}
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {sortedWishlistItems.map((item: any) => {
                          const isSelected = selectedWishlistIds.includes(item.id);
                          let pColor = "blue";
                          let pLabel = "Normal";
                          if (item.priority === "URGENT") { pColor = "red"; pLabel = "Urgent"; }
                          else if (item.priority === "IMPORTANT") { pColor = "orange"; pLabel = "Important"; }
                          else if (item.priority === "MAJOR") { pColor = "yellow"; pLabel = "Majeur"; }
                          else if (item.priority === "LOW") { pColor = "gray"; pLabel = "Faible"; }

                          return (
                            <Table.Tr
                              key={item.id}
                              style={{ cursor: "pointer" }}
                              onClick={() => handleRowClick(item, "WISHLIST")}
                            >
                              <Table.Td onClick={(e) => e.stopPropagation()} style={{ width: 1, whiteSpace: "nowrap" }}>
                                <Checkbox
                                  size="xs"
                                  color="cyan"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.currentTarget.checked) {
                                      setSelectedWishlistIds((prev) => [...prev, item.id]);
                                    } else {
                                      setSelectedWishlistIds((prev) => prev.filter((id) => id !== item.id));
                                    }
                                  }}
                                />
                              </Table.Td>
                              <Table.Td style={{ width: 1, whiteSpace: "nowrap" }}>
                                <Badge
                                  color={pColor}
                                  variant="filled"
                                  size="sm"
                                  fullWidth={false}
                                  styles={{
                                    label: {
                                      overflow: "visible",
                                      textOverflow: "clip",
                                      whiteSpace: "nowrap",
                                    },
                                  }}
                                  style={{ width: "max-content", maxWidth: "none", whiteSpace: "nowrap" }}
                                >
                                  {pLabel}
                                </Badge>
                              </Table.Td>
                              <Table.Td style={{ width: 1, whiteSpace: "nowrap" }}>
                                {renderCategoryBadge(item.category)}
                              </Table.Td>
                              <Table.Td style={{ width: "100%" }}>
                                <Text size="sm" fw={600}>{item.title}</Text>
                                {item.notes && (
                                  <Text size="xs" c="dimmed" style={{ lineHeight: 1.2 }}>
                                    {item.notes}
                                  </Text>
                                )}
                              </Table.Td>
                              <Table.Td visibleFrom="md" style={{ width: 1, whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                                {item.url ? (
                                  <Tooltip label="Ouvrir le lien marchand">
                                    <ActionIcon
                                      component="a"
                                      href={item.url.startsWith("http") ? item.url : `https://${item.url}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      size="sm"
                                      color="cyan"
                                      variant="subtle"
                                    >
                                      <IconExternalLink size={16} />
                                    </ActionIcon>
                                  </Tooltip>
                                ) : (
                                  <Text size="xs" c="dimmed">—</Text>
                                )}
                              </Table.Td>
                              <Table.Td fw={700} c="cyan.4" style={{ width: 1, whiteSpace: "nowrap" }}>
                                {item.amount.toFixed(2)} €
                              </Table.Td>
                              {!isReadOnly && (
                                <Table.Td visibleFrom="md" style={{ width: 1, whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                                  <Group gap={6} wrap="nowrap">
                                    <Button
                                      size="xs"
                                      color="teal"
                                      variant="light"
                                      leftSection={<IconShoppingCart size={14} />}
                                      onClick={() => handleOpenConvertWishlist(item)}
                                    >
                                      Déclencher l'achat
                                    </Button>
                                    <Tooltip label="Modifier le souhait">
                                      <ActionIcon color="blue" variant="subtle" onClick={() => handleOpenEditWishlist(item)}>
                                        <IconEdit size={16} />
                                      </ActionIcon>
                                    </Tooltip>
                                    <ActionIcon color="red" variant="subtle" onClick={() => handleDeleteWishlist(item.id)}>
                                      <IconTrash size={16} />
                                    </ActionIcon>
                                  </Group>
                                </Table.Td>
                              )}
                            </Table.Tr>
                          );
                        })}
                      </Table.Tbody>
                      <Table.Tfoot>
                        <Table.Tr style={{ borderTop: "2px solid rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.02)" }}>
                          <Table.Td colSpan={4} style={{ width: "100%" }}>
                            <Group justify="space-between" align="center">
                              <Text size="sm" fw={700} c="white">
                                Total de la liste ({sortedWishlistItems.length} article{sortedWishlistItems.length > 1 ? "s" : ""})
                              </Text>
                              {wishlistCalc.selectedItems.length > 0 && (
                                <Badge size="xs" color="cyan" variant="light">
                                  Sélection : {wishlistCalc.selectedTotalAmount.toFixed(2)} € ({wishlistCalc.selectedItems.length})
                                </Badge>
                              )}
                            </Group>
                          </Table.Td>
                          <Table.Td visibleFrom="md" style={{ width: 1, whiteSpace: "nowrap" }} />
                          <Table.Td fw={800} c="cyan.3" style={{ fontSize: "15px", width: 1, whiteSpace: "nowrap" }}>
                            {sortedWishlistItems.reduce((acc: number, item: any) => acc + item.amount, 0).toFixed(2)} €
                          </Table.Td>
                          {!isReadOnly && <Table.Td visibleFrom="md" style={{ width: 1, whiteSpace: "nowrap" }} />}
                        </Table.Tr>
                      </Table.Tfoot>
                    </Table>
                  </Table.ScrollContainer>
                )}
              </Paper>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Container>

      {/* ==========================================================================
          MODALS
         ========================================================================== */}

      {/* Modal Nouveau Portefeuille */}
      <Modal
        opened={createWalletModal}
        onClose={() => {
          setCreateWalletModal(false);
          setFormErrors({});
        }}
        title="Créer un Portefeuille"
        centered
        closeOnClickOutside={false}
      >
        <form onSubmit={(e) => { e.preventDefault(); handleCreateWallet(); }}>
          <Stack gap="md">
            <TextInput
              label="Nom du portefeuille"
              placeholder="ex: Budget Famille, Voyages..."
              value={newWalletName}
              onChange={(e) => {
                setNewWalletName(e.target.value);
                if (formErrors.newWalletName) setFormErrors((prev) => ({ ...prev, newWalletName: "" }));
              }}
              error={formErrors.newWalletName}
            />
            <Button color="teal" fullWidth type="submit">
              Créer
            </Button>
          </Stack>
        </form>
      </Modal>

      {/* Modal Report de Fin de Mois */}
      <Modal opened={carryoverModal} onClose={() => setCarryoverModal(false)} title="Configuration du Report de Fin de Mois" centered size="md" closeOnClickOutside={false}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Choisissez ce qui se passe avec l'excédent (le solde restant) à la fin du mois pour le portefeuille <b>{activeWallet?.name}</b> :
          </Text>

          <Radio.Group value={cMode} onChange={(val) => setCMode(val as any)} name="carryoverMode">
            <Stack gap="sm">
              <Radio
                value="NONE"
                label={
                  <div>
                    <Text size="sm" fw={600}>Pas du tout (Aucun report)</Text>
                    <Text size="xs" c="dimmed">L'excédent du mois n'est pas reporté.</Text>
                  </div>
                }
              />
              <Radio
                value="NEXT_MONTH"
                label={
                  <div>
                    <Text size="sm" fw={600}>Reporter au mois suivant</Text>
                    <Text size="xs" c="dimmed">Le solde restant est ajouté au solde du mois suivant sur ce même portefeuille.</Text>
                  </div>
                }
              />
              <Radio
                value="TARGET_WALLET"
                label={
                  <div>
                    <Text size="sm" fw={600}>Reporter sur un autre portefeuille</Text>
                    <Text size="xs" c="dimmed">Le solde restant est versé le mois suivant sur un portefeuille cible (ex: Épargne).</Text>
                  </div>
                }
              />
            </Stack>
          </Radio.Group>

          {cMode === "TARGET_WALLET" && (
            <Select
              label="Portefeuille destinataire de l'excédent"
              placeholder="Choisir un portefeuille..."
              data={wallets.filter((w) => w.id !== activeWalletId).map((w) => ({ label: w.name, value: w.id }))}
              value={cTargetWalletId}
              onChange={(val) => val && setCTargetWalletId(val)}
            />
          )}

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" color="gray" onClick={() => setCarryoverModal(false)}>
              Annuler
            </Button>
            <Button color="teal" onClick={handleSaveCarryoverSettings}>
              Enregistrer
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal Partage & Membres */}
      <Modal opened={shareWalletModal} onClose={() => setShareWalletModal(false)} title="Gestion des Membres & Partage" centered size="lg" closeOnClickOutside={false}>
        <Stack gap="md">
          <Paper p="sm" radius="md" style={{ backgroundColor: "#182036" }}>
            <Text size="sm" fw={700} mb="xs">
              Inviter un membre
            </Text>
            <Group gap="xs">
              <Autocomplete
                id="search_query_no_autofill"
                name="search_query_no_autofill"
                autoComplete="new-password"
                aria-autocomplete="none"
                data-bwignore="true"
                data-1p-ignore="true"
                data-lpignore="true"
                placeholder="Rechercher par nom ou e-mail..."
                style={{ flex: 1 }}
                data={availableUsers.map((u) => (u.name ? `${u.name} (${u.email})` : u.email))}
                value={inviteEmail}
                onChange={(val) => setInviteEmail(val)}
                error={formErrors.inviteEmail}
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
      <Modal opened={revenueModal} onClose={() => setRevenueModal(false)} title="Ajouter une Entrée d'argent" centered closeOnClickOutside={false}>
        <Stack gap="md">
          <TextInput label="Libellé" placeholder="ex: Salaire, Remboursement Mutuelle, CPAM..." value={revTitle} onChange={(e) => setRevTitle(e.target.value)} error={formErrors.revTitle} />
          <NumberInput
            label="Montant (€)"
            value={revAmount}
            onChange={(val) => setRevAmount(val)}
            min={0}
            decimalScale={2}
            decimalSeparator=","
            allowNegative={false}
            error={formErrors.revAmount}
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
                { label: "Fixe", value: "FIXED" },
                { label: "Variable", value: "VARIABLE" },
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
      <Modal opened={recurringModal} onClose={() => setRecurringModal(false)} title="Ajouter une Charge Récurrente" centered closeOnClickOutside={false}>
        <Stack gap="md">
          <TextInput label="Libellé" placeholder="ex: Loyer, Netflix, EDF..." value={recTitle} onChange={(e) => setRecTitle(e.target.value)} error={formErrors.recTitle} />
          <NumberInput
            label="Montant (€)"
            value={recAmount}
            onChange={(val) => setRecAmount(val)}
            min={0}
            decimalScale={2}
            decimalSeparator=","
            allowNegative={false}
            error={formErrors.recAmount}
          />
          <CategorySelect label="Catégorie" value={recCategory} onChange={setRecCategory} existingCategories={data?.categories} error={formErrors.recCategory} />
          <NumberInput label="Jour du mois (1-31)" value={recDay} onChange={(val) => setRecDay(typeof val === "number" ? val : "")} min={1} max={31} error={formErrors.recDay} />
          <Group grow>
            <Select
              label="Mois de Début (Optionnel)"
              data={MONTH_OPTIONS}
              value={recStartMonth.toString()}
              onChange={(val) => val && setRecStartMonth(parseInt(val))}
              maxDropdownHeight={450}
            />
            <NumberInput label="Année de Début" value={recStartYear} onChange={(val) => setRecStartYear(Number(val))} />
          </Group>
          <Button color="indigo" fullWidth onClick={handleAddRecurring}>
            Enregistrer
          </Button>
        </Stack>
      </Modal>

      {/* Modal Crédit / Échéances */}
      <Modal opened={installmentModal} onClose={() => setInstallmentModal(false)} title="Ajouter un Paiement Échelonné" centered closeOnClickOutside={false}>
        <Stack gap="md">
          <TextInput label="Libellé" placeholder="ex: Matériel Informatique 4x, Crédit Auto..." value={instTitle} onChange={(e) => setInstTitle(e.target.value)} error={formErrors.instTitle} />
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
            error={formErrors.instAmount}
          />
          <NumberInput label="Jour du mois (1-31)" value={instDay} onChange={(val) => setInstDay(typeof val === "number" ? val : "")} min={1} max={31} error={formErrors.instDay} />
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
      <Modal opened={envelopeModal} onClose={() => setEnvelopeModal(false)} title="Créer une Enveloppe Budgétaire" centered closeOnClickOutside={false}>
        <Stack gap="md">
          <CategorySelect label="Catégorie" value={envCategory} onChange={setEnvCategory} existingCategories={data?.categories} error={formErrors.envCategory} />
          <NumberInput
            label="Plafond Max Mensuel (€) — Optionnel"
            placeholder="Laisser vide si aucun plafond"
            value={envLimit}
            onChange={(val) => setEnvLimit(val)}
            min={0}
            decimalScale={2}
            decimalSeparator=","
            allowNegative={false}
            error={formErrors.envLimit}
          />
          <Select label="Couleur de l'enveloppe" data={PRESET_COLORS} value={envColor} onChange={(val) => val && setEnvColor(val)} />
          <Button color="teal" fullWidth onClick={handleSaveEnvelope}>
            Enregistrer l'Enveloppe
          </Button>
        </Stack>
      </Modal>

      {/* Modal Dépense Quotidienne */}
      <Modal
        opened={transactionModal}
        onClose={() => {
          setTransactionModal(false);
          setEditingTxId(null);
          setFormErrors({});
        }}
        title={editingTxId ? "Modifier la Dépense" : "Saisir une Dépense"}
        centered
        closeOnClickOutside={false}
      >
        <form onSubmit={(e) => { e.preventDefault(); handleAddTransaction(); }}>
          <Stack gap="md">
            <TextInput
              label="Libellé de la dépense"
              placeholder="ex: Courses Carrefour, Plein d'essence..."
              value={trxTitle}
              onChange={(e) => {
                setTrxTitle(e.target.value);
                if (formErrors.trxTitle) setFormErrors((prev) => ({ ...prev, trxTitle: "" }));
              }}
              error={formErrors.trxTitle}
            />
            <NumberInput
              label="Montant (€)"
              value={trxAmount}
              onChange={(val) => {
                setTrxAmount(val);
                if (formErrors.trxAmount) setFormErrors((prev) => ({ ...prev, trxAmount: "" }));
              }}
              min={0}
              decimalScale={2}
              decimalSeparator=","
              allowNegative={false}
              error={formErrors.trxAmount}
            />
            <CategorySelect
              label="Catégorie (identique à l'enveloppe si applicable)"
              value={trxCategory}
              onChange={(val) => {
                setTrxCategory(val);
                if (formErrors.trxCategory) setFormErrors((prev) => ({ ...prev, trxCategory: "" }));
              }}
              existingCategories={data?.categories}
              error={formErrors.trxCategory}
            />
            <NumberInput
              label="Jour du mois"
              value={trxDay}
              onChange={(val) => {
                setTrxDay(typeof val === "number" ? val : "");
                if (formErrors.trxDay) setFormErrors((prev) => ({ ...prev, trxDay: "" }));
              }}
              min={1}
              max={31}
              error={formErrors.trxDay}
            />
            <TextInput label="Notes optionnelles" placeholder="Détails supplémentaires..." value={trxNotes} onChange={(e) => setTrxNotes(e.target.value)} />
            <Button color="teal" fullWidth type="submit">
              {editingTxId ? "Mettre à jour la dépense" : "Enregistrer la dépense"}
            </Button>
          </Stack>
        </form>
      </Modal>

      {/* Modal Confirmation de Suppression de Portefeuille */}
      <Modal
        opened={confirmDeleteWalletModal}
        onClose={() => setConfirmDeleteWalletModal(false)}
        title="Supprimer le Portefeuille"
        centered
        closeOnClickOutside={false}
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
        closeOnClickOutside={false}
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
              <Group grow>
                <Select
                  label="Mois de Début"
                  data={MONTH_OPTIONS}
                  value={editRecStartMonth.toString()}
                  onChange={(val) => val && setEditRecStartMonth(parseInt(val))}
                  maxDropdownHeight={450}
                />
                <NumberInput label="Année de Début" value={editRecStartYear} onChange={(val) => setEditRecStartYear(Number(val))} />
              </Group>
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
                    { label: "Fixe", value: "FIXED" },
                    { label: "Variable", value: "VARIABLE" },
                  ]}
                />
              </Stack>

              {editEntryFrequency === "VARIABLE" && (
                <Group grow>
                  <Select
                    label="Mois"
                    data={MONTH_OPTIONS}
                    value={editRevMonth.toString()}
                    onChange={(val) => val && setEditRevMonth(parseInt(val))}
                    maxDropdownHeight={450}
                  />
                  <NumberInput
                    label="Année"
                    value={editRevYear}
                    onChange={(val) => setEditRevYear(Number(val))}
                    min={2020}
                    max={2050}
                  />
                </Group>
              )}
            </>
          )}

          {editEntryFrequency !== "VARIABLE" && (
            <Radio.Group
              value={editScope}
              onChange={(val) => setEditScope(val as "MONTH" | "GLOBAL")}
              name="editScope"
              label="Portée du montant"
            >
              <Stack gap="xs" mt="xs">
                <Radio
                  value="MONTH"
                  label={`Ajustement ponctuel`}
                />
                <Radio
                  value="GLOBAL"
                  label="Modification globale"
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
        closeOnClickOutside={false}
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
        title={editingTransferId ? "Modifier le Virement Inter-Portefeuille" : "Effectuer un Virement Inter-Portefeuille"}
        centered
        closeOnClickOutside={false}
      >
        <Stack gap="md">
          <Select
            label="Portefeuille de Destination"
            data={wallets
              .filter((w) => w.id !== activeWalletId)
              .map((w) => ({ label: w.name, value: w.id }))}
            value={transferTargetWalletId}
            onChange={(val) => val && setTransferTargetWalletId(val)}
            error={formErrors.transferTargetWalletId}
          />
          <TextInput
            label="Libellé / Motif"
            placeholder="ex: Participation loyer, Épargne commune..."
            value={transferTitle}
            onChange={(e) => setTransferTitle(e.target.value)}
            error={formErrors.transferTitle}
          />
          <Stack gap={4}>
            <Text size="xs" fw={700} c="dimmed">Récurrence du virement</Text>
            <SegmentedControl
              fullWidth
              color="cyan"
              value={transferIsRecurring ? "RECURRING" : "ONE_TIME"}
              onChange={(val) => setTransferIsRecurring(val === "RECURRING")}
              data={[
                { label: "Récurrent", value: "RECURRING" },
                { label: "Ponctuel", value: "ONE_TIME" },
              ]}
            />
          </Stack>
          <Stack gap={4}>
            <Text size="xs" fw={700} c="dimmed">Mode du virement</Text>
            <SegmentedControl
              fullWidth
              color="cyan"
              value={transferType}
              onChange={(val) => setTransferType(val as "FIXED" | "PERCENTAGE")}
              data={[
                { label: "Montant", value: "FIXED" },
                { label: "Pourcentage", value: "PERCENTAGE" },
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
              error={formErrors.transferAmount}
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
                error={formErrors.transferPercentage}
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
            {editingTransferId ? "Enregistrer les modifications" : "Valider le Virement"}
          </Button>
        </Stack>
      </Modal>

      {/* Modal d'Actions Rapides sur Éléments (Tab 3 - Revenus & Charges fixes) */}
      <Modal
        opened={Boolean(actionModalItem)}
        onClose={() => setActionModalItem(null)}
        title={actionModalItem?.item?.title || "Choisir une action"}
        centered
        radius="md"
        closeOnClickOutside={false}
      >
        {actionModalItem && (
          <Stack gap="sm">
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">
                {actionModalItem.type === "REVENUE"
                  ? "Revenu du mois"
                  : actionModalItem.type === "REIMBURSEMENT"
                  ? "Remboursement"
                  : actionModalItem.type === "RECURRING"
                  ? "Charge récurrente"
                  : actionModalItem.type === "INSTALLMENT"
                  ? "Paiement échelonné / Crédit"
                  : actionModalItem.type === "TRANSFER"
                  ? "Virement inter-portefeuille"
                  : actionModalItem.type === "WISHLIST"
                  ? "Souhait d'achat"
                  : "Dépense courante"}
              </Text>
              <Text
                size="lg"
                fw={800}
                c={
                  actionModalItem.type === "REVENUE" || actionModalItem.type === "REIMBURSEMENT"
                    ? "teal.4"
                    : actionModalItem.type === "TRANSFER" || actionModalItem.type === "WISHLIST"
                    ? "cyan.4"
                    : "red.4"
                }
              >
                {actionModalItem.type === "REVENUE" || actionModalItem.type === "REIMBURSEMENT" ? "+" : "-"}
                {actionModalItem.item.amount.toFixed(2)} €
              </Text>
            </Group>

            {!isReadOnly && (
              <>
                {actionModalItem.type === "TRANSACTION" ? (
                  <>
                    <Button
                      fullWidth
                      variant="light"
                      color="blue"
                      leftSection={<IconPencil size={18} />}
                      onClick={() => {
                        const item = actionModalItem.item;
                        setActionModalItem(null);
                        handleOpenEditTransaction(item);
                      }}
                    >
                      Modifier la dépense
                    </Button>
                    <Button
                      fullWidth
                      variant="light"
                      color="red"
                      leftSection={<IconTrash size={18} />}
                      onClick={async () => {
                        const item = actionModalItem.item;
                        setActionModalItem(null);
                        await deleteTransaction(activeWalletId, item.id);
                        await loadData();
                      }}
                    >
                      Supprimer définitivement
                    </Button>
                  </>
                ) : actionModalItem.type === "WISHLIST" ? (
                  <>
                    <Button
                      fullWidth
                      variant="light"
                      color="teal"
                      leftSection={<IconShoppingCart size={18} />}
                      onClick={() => {
                        const item = actionModalItem.item;
                        setActionModalItem(null);
                        handleOpenConvertWishlist(item);
                      }}
                    >
                      Déclencher l'achat (Convertir)
                    </Button>
                    <Button
                      fullWidth
                      variant="light"
                      color="blue"
                      leftSection={<IconEdit size={18} />}
                      onClick={() => {
                        const item = actionModalItem.item;
                        setActionModalItem(null);
                        handleOpenEditWishlist(item);
                      }}
                    >
                      Modifier le souhait d'achat
                    </Button>
                    {actionModalItem.item.url && (
                      <Button
                        fullWidth
                        component="a"
                        href={actionModalItem.item.url.startsWith("http") ? actionModalItem.item.url : `https://${actionModalItem.item.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="light"
                        color="cyan"
                        leftSection={<IconExternalLink size={18} />}
                        onClick={() => setActionModalItem(null)}
                      >
                        Ouvrir le lien marchand
                      </Button>
                    )}
                    <Button
                      fullWidth
                      variant="light"
                      color="red"
                      leftSection={<IconTrash size={18} />}
                      onClick={async () => {
                        const item = actionModalItem.item;
                        setActionModalItem(null);
                        await handleDeleteWishlist(item.id);
                      }}
                    >
                      Supprimer définitivement
                    </Button>
                  </>
                ) : actionModalItem.type === "TRANSFER" ? (
                  <>
                    <Button
                      fullWidth
                      variant="light"
                      color={actionModalItem.item.isDisabled || (actionModalItem.item.hasOverride && actionModalItem.item.amount === 0) ? "teal" : "orange"}
                      leftSection={
                        actionModalItem.item.isDisabled || (actionModalItem.item.hasOverride && actionModalItem.item.amount === 0) ? (
                          <IconEye size={18} />
                        ) : (
                          <IconEyeOff size={18} />
                        )
                      }
                      onClick={async () => {
                        const item = actionModalItem.item;
                        setActionModalItem(null);
                        await handleToggleDisableItem(item, "TRANSFER" as any);
                      }}
                    >
                      {actionModalItem.item.isDisabled || (actionModalItem.item.hasOverride && actionModalItem.item.amount === 0)
                        ? "Réactiver ce virement ce mois-ci"
                        : "Désactiver ce virement ce mois-ci"}
                    </Button>
                    <Button
                      fullWidth
                      variant="light"
                      color="blue"
                      leftSection={<IconEdit size={18} />}
                      onClick={() => {
                        const item = actionModalItem.item;
                        setActionModalItem(null);
                        handleOpenEditTransfer(item);
                      }}
                    >
                      Modifier le virement
                    </Button>
                    <Button
                      fullWidth
                      variant="light"
                      color="red"
                      leftSection={<IconTrash size={18} />}
                      onClick={async () => {
                        const item = actionModalItem.item;
                        setActionModalItem(null);
                        await deleteWalletTransfer(activeWalletId, item.id);
                        await loadData();
                      }}
                    >
                      Supprimer définitivement
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      fullWidth
                      variant="light"
                      color={actionModalItem.item.isDisabled || (actionModalItem.item.hasOverride && actionModalItem.item.amount === 0) ? "teal" : "orange"}
                      leftSection={
                        actionModalItem.item.isDisabled || (actionModalItem.item.hasOverride && actionModalItem.item.amount === 0) ? (
                          <IconEye size={18} />
                        ) : (
                          <IconEyeOff size={18} />
                        )
                      }
                      onClick={async () => {
                        const item = actionModalItem.item;
                        const type = actionModalItem.type === "REIMBURSEMENT" ? "REVENUE" : actionModalItem.type;
                        setActionModalItem(null);
                        await handleToggleDisableItem(item, type as any);
                      }}
                    >
                      {actionModalItem.item.isDisabled || (actionModalItem.item.hasOverride && actionModalItem.item.amount === 0)
                        ? "Réactiver cet élément ce mois-ci"
                        : "Désactiver cet élément ce mois-ci"}
                    </Button>

                    <Button
                      fullWidth
                      variant="light"
                      color="blue"
                      leftSection={<IconEdit size={18} />}
                      onClick={() => {
                        const item = actionModalItem.item;
                        const type = actionModalItem.type === "REIMBURSEMENT" ? "REVENUE" : actionModalItem.type;
                        setActionModalItem(null);
                        handleOpenEditModal({
                          id: item.id,
                          title: item.title,
                          type: type as any,
                          subType: item.type,
                          category: item.category,
                          dayOfMonth: item.dayOfMonth,
                          startMonth: item.startMonth,
                          startYear: item.startYear,
                          endMonth: item.endMonth,
                          endYear: item.endYear,
                          currentAmount: item.amount,
                          originalAmount: item.originalAmount || item.amount,
                          overrideAmount: item.overrideAmount,
                          isDisabled: item.isDisabled,
                          hasOverride: Boolean(item.hasOverride),
                          month: item.month,
                          year: item.year,
                        });
                      }}
                    >
                      Modifier ou ajuster le montant
                    </Button>

                    <Button
                      fullWidth
                      variant="light"
                      color="red"
                      leftSection={<IconTrash size={18} />}
                      onClick={async () => {
                        const item = actionModalItem.item;
                        const type = actionModalItem.type;
                        setActionModalItem(null);
                        const targetM = month === 0 ? new Date().getMonth() + 1 : month;
                        if (type === "REVENUE" || type === "REIMBURSEMENT") {
                          await deleteRevenue(activeWalletId, item.id, targetM, year);
                        } else if (type === "RECURRING") {
                          await deleteRecurringExpense(activeWalletId, item.id, targetM, year);
                        } else if (type === "INSTALLMENT") {
                          await deleteInstallment(activeWalletId, item.id, targetM, year);
                        }
                        await loadData();
                      }}
                    >
                      Supprimer définitivement
                    </Button>
                  </>
                )}
              </>
            )}
          </Stack>
        )}
      </Modal>

      {/* Modal Créer / Modifier Souhait d'Achat */}
      <Modal
        opened={wishlistModal}
        onClose={() => setWishlistModal(false)}
        title={editingWishlistId ? "Modifier le Souhait d'Achat" : "Ajouter un Souhait d'Achat"}
        centered
        closeOnClickOutside={false}
      >
        <Stack gap="md">
          <TextInput
            label="Libellé / Nom de l'article"
            placeholder="ex: Écran 4K Dell, Pneus voiture..."
            value={wishlistTitle}
            onChange={(e) => setWishlistTitle(e.target.value)}
            error={formErrors.wishlistTitle}
            required
          />
          <NumberInput
            label="Montant Estimé (€)"
            placeholder="ex: 150.00"
            value={wishlistAmount}
            onChange={(val) => setWishlistAmount(val)}
            min={0}
            decimalScale={2}
            decimalSeparator=","
            allowNegative={false}
            error={formErrors.wishlistAmount}
            required
          />
          <TextInput
            label="Lien Web (facultatif)"
            placeholder="ex: https://amazon.fr/dp/..."
            value={wishlistUrl}
            onChange={(e) => setWishlistUrl(e.target.value)}
            leftSection={<IconLink size={16} />}
          />
          <Grid>
            <Grid.Col span={6}>
              <CategorySelect
                label="Catégorie"
                value={wishlistCategory}
                onChange={setWishlistCategory}
                existingCategories={data?.categories}
                error={formErrors.wishlistCategory}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <Select
                label="Priorité / Criticité"
                data={[
                  { label: "🔴 Urgent", value: "URGENT" },
                  { label: "🟠 Important", value: "IMPORTANT" },
                  { label: "🟡 Majeur", value: "MAJOR" },
                  { label: "🔵 Normal", value: "NORMAL" },
                  { label: "⚪ Faible", value: "LOW" },
                ]}
                value={wishlistPriority}
                onChange={(val) => val && setWishlistPriority(val)}
              />
            </Grid.Col>
          </Grid>
          <TextInput
            label="Notes / Modèle / Description (facultatif)"
            placeholder="ex: Référence couleur noir, vendeur LDLC..."
            value={wishlistNotes}
            onChange={(e) => setWishlistNotes(e.target.value)}
          />
          <Button color="cyan" fullWidth onClick={handleSaveWishlist}>
            {editingWishlistId ? "Enregistrer les modifications" : "Ajouter à ma liste"}
          </Button>
        </Stack>
      </Modal>

      {/* Modal Déclencher l'Achat (Conversion en Dépense, Plusieurs Fois ou Crédit) */}
      <Modal
        opened={convertModal}
        onClose={() => setConvertModal(false)}
        title={`Déclencher l'Achat : ${convertingItem?.title || ""}`}
        centered
        size="lg"
        closeOnClickOutside={false}
      >
        <Stack gap="md">
          <Paper p="sm" radius="md" style={{ backgroundColor: "#182036", border: "1px solid rgba(255,255,255,0.06)" }}>
            <Group justify="space-between">
              <div>
                <Text size="sm" fw={700} c="white">{convertingItem?.title}</Text>
                <Text size="xs" c="dimmed">Catégorie: {convertingItem?.category || "Général"}</Text>
              </div>
              <Badge color="cyan" size="lg" variant="filled">
                {convertingItem?.amount ? convertingItem.amount.toFixed(2) : "0.00"} €
              </Badge>
            </Group>
          </Paper>

          {/* Portefeuille Cible au-dessus */}
          <Select
            label="Portefeuille Cible"
            data={wallets.map((w) => ({ label: w.name, value: w.id }))}
            value={convertTargetWalletId}
            onChange={(val) => val && setConvertTargetWalletId(val)}
            error={formErrors.convertTargetWalletId}
          />

          <Stack gap={4}>
            <Text size="xs" fw={700} c="dimmed">Type de paiement</Text>
            <SegmentedControl
              fullWidth
              color="teal"
              value={convertMode}
              onChange={(val) => {
                const mode = val as "SINGLE" | "MULTIPLE" | "CREDIT";
                setConvertMode(mode);
                if (convertingItem?.amount) {
                  if (mode === "MULTIPLE") {
                    const months = Number(convertTotalMonths) || 4;
                    setConvertInstallmentAmount((convertingItem.amount / months).toFixed(2));
                  } else if (mode === "CREDIT") {
                    const calcMonths = Math.max(1, (convertEndYear - convertStartYear) * 12 + (convertEndMonth - convertStartMonth) + 1);
                    setConvertInstallmentAmount((convertingItem.amount / calcMonths).toFixed(2));
                  }
                }
              }}
              data={[
                { label: "Comptant", value: "SINGLE" },
                { label: "Plusieurs fois", value: "MULTIPLE" },
                { label: "Crédits", value: "CREDIT" },
              ]}
            />
          </Stack>

          {convertMode === "SINGLE" && (
            <>
              <NumberInput
                label="Montant Réel Payé (€)"
                value={convertAmount}
                onChange={(val) => setConvertAmount(val)}
                min={0}
                decimalScale={2}
                decimalSeparator=","
                allowNegative={false}
                error={formErrors.convertAmount}
              />
              <Grid>
                <Grid.Col span={4}>
                  <NumberInput
                    label="Jour"
                    value={convertDay}
                    onChange={(val) => setConvertDay(Number(val))}
                    min={1}
                    max={31}
                    error={formErrors.convertDay}
                  />
                </Grid.Col>
                <Grid.Col span={4}>
                  <Select
                    label="Mois"
                    data={MONTH_OPTIONS}
                    value={convertMonth.toString()}
                    onChange={(val) => val && setConvertMonth(Number(val))}
                  />
                </Grid.Col>
                <Grid.Col span={4}>
                  <NumberInput
                    label="Année"
                    value={convertYear}
                    onChange={(val) => setConvertYear(Number(val))}
                  />
                </Grid.Col>
              </Grid>
            </>
          )}

          {convertMode === "MULTIPLE" && (
            <>
              <Grid>
                <Grid.Col span={6}>
                  <NumberInput
                    label="Montant par Mensualité (€)"
                    value={convertInstallmentAmount}
                    onChange={(val) => setConvertInstallmentAmount(val)}
                    min={0}
                    decimalScale={2}
                    decimalSeparator=","
                    allowNegative={false}
                    error={formErrors.convertInstallmentAmount}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <NumberInput
                    label="Nombre de Mensualités"
                    placeholder="ex: 4"
                    value={convertTotalMonths}
                    onChange={(val) => {
                      setConvertTotalMonths(val);
                      const m = Number(val) || 1;
                      if (convertingItem?.amount) {
                        setConvertInstallmentAmount((convertingItem.amount / m).toFixed(2));
                      }
                    }}
                    min={1}
                    max={120}
                    error={formErrors.convertTotalMonths}
                  />
                </Grid.Col>
              </Grid>

              <Grid>
                <Grid.Col span={4}>
                  <NumberInput
                    label="Jour de Prélèvement"
                    value={convertDayOfMonth}
                    onChange={(val) => setConvertDayOfMonth(Number(val))}
                    min={1}
                    max={31}
                  />
                </Grid.Col>
                <Grid.Col span={4}>
                  <Select
                    label="Mois de Début"
                    data={MONTH_OPTIONS}
                    value={convertStartMonth.toString()}
                    onChange={(val) => val && setConvertStartMonth(Number(val))}
                  />
                </Grid.Col>
                <Grid.Col span={4}>
                  <NumberInput
                    label="Année de Début"
                    value={convertStartYear}
                    onChange={(val) => setConvertStartYear(Number(val))}
                  />
                </Grid.Col>
              </Grid>
            </>
          )}

          {convertMode === "CREDIT" && (
            <>
              <Grid>
                <Grid.Col span={6}>
                  <NumberInput
                    label="Montant par Mensualité (€)"
                    value={convertInstallmentAmount}
                    onChange={(val) => setConvertInstallmentAmount(val)}
                    min={0}
                    decimalScale={2}
                    decimalSeparator=","
                    allowNegative={false}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <NumberInput
                    label="Jour de Prélèvement"
                    value={convertDayOfMonth}
                    onChange={(val) => setConvertDayOfMonth(Number(val))}
                    min={1}
                    max={31}
                  />
                </Grid.Col>
              </Grid>

              <Grid>
                <Grid.Col span={6}>
                  <Select
                    label="Mois de Début"
                    data={MONTH_OPTIONS}
                    value={convertStartMonth.toString()}
                    onChange={(val) => val && setConvertStartMonth(Number(val))}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <NumberInput
                    label="Année de Début"
                    value={convertStartYear}
                    onChange={(val) => setConvertStartYear(Number(val))}
                  />
                </Grid.Col>
              </Grid>

              <Grid>
                <Grid.Col span={6}>
                  <Select
                    label="Mois de Fin"
                    data={MONTH_OPTIONS}
                    value={convertEndMonth.toString()}
                    onChange={(val) => val && setConvertEndMonth(Number(val))}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <NumberInput
                    label="Année de Fin"
                    value={convertEndYear}
                    onChange={(val) => setConvertEndYear(Number(val))}
                  />
                </Grid.Col>
              </Grid>
            </>
          )}

          <Button color="teal" fullWidth onClick={handleExecuteConvertWishlist}>
            Valider et Intégrer l'Achat en Comptabilité
          </Button>
        </Stack>
      </Modal>
    </Box>
  );
}
