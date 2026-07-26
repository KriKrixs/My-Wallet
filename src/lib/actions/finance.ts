"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type PermissionLevel = "OWNER" | "FULL_ACCESS" | "READ_ONLY";

const permissionHierarchy: Record<PermissionLevel, number> = {
  READ_ONLY: 1,
  FULL_ACCESS: 2,
  OWNER: 3,
};

export async function requireWalletAccess(walletId: string, requiredLevel: PermissionLevel) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;

  if (!userId) {
    throw new Error("Non autorisé. Veuillez vous connecter.");
  }

  const walletUser = await db.walletUser.findUnique({
    where: {
      walletId_userId: {
        userId,
        walletId,
      },
    },
  });

  if (!walletUser) {
    throw new Error("Accès au portefeuille non autorisé.");
  }

  const userLevel = permissionHierarchy[walletUser.role as PermissionLevel] || 0;
  const required = permissionHierarchy[requiredLevel];

  if (userLevel < required) {
    throw new Error(`Permission insuffisante. Accès ${requiredLevel} requis.`);
  }

  return { userId, walletId, userRole: walletUser.role as PermissionLevel };
}

/* ==========================================================================
   WALLETS & MANAGEMENT
   ========================================================================== */

export async function getUserWallets() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;

  if (!userId) return [];

  const userWallets = await db.walletUser.findMany({
    where: { userId },
    include: { wallet: true },
  });

  return userWallets.map((uw) => ({
    id: uw.wallet.id,
    name: uw.wallet.name,
    currency: uw.wallet.currency,
    isPersonal: uw.wallet.isPersonal,
    role: uw.role as PermissionLevel,
    isOwner: uw.wallet.ownerId === userId,
  }));
}

export async function createWallet(name: string, currency = "EUR") {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;

  if (!userId) {
    throw new Error("Non autorisé. Veuillez vous connecter.");
  }

  const newWallet = await db.wallet.create({
    data: {
      name,
      currency,
      isPersonal: false,
      ownerId: userId,
      users: {
        create: {
          userId,
          role: "OWNER",
        },
      },
    },
  });

  revalidatePath("/");
  return newWallet;
}

export async function deleteWallet(walletId: string) {
  const { userId } = await requireWalletAccess(walletId, "OWNER");

  const wallet = await db.wallet.findUnique({
    where: { id: walletId },
  });

  if (!wallet) {
    throw new Error("Portefeuille introuvable.");
  }

  if (wallet.isPersonal) {
    throw new Error("Votre portefeuille personnel principal ne peut pas être supprimé.");
  }

  await db.wallet.delete({
    where: { id: walletId },
  });

  revalidatePath("/");
}

export async function getWalletMembers(walletId: string) {
  await requireWalletAccess(walletId, "READ_ONLY");

  const members = await db.walletUser.findMany({
    where: { walletId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  return members.map((m) => ({
    userId: m.userId,
    name: m.user.name,
    email: m.user.email,
    role: m.role as PermissionLevel,
  }));
}

export async function getAvailableUsersToInvite(walletId: string) {
  await requireWalletAccess(walletId, "OWNER");

  const existingMembers = await db.walletUser.findMany({
    where: { walletId },
    select: { userId: true },
  });

  const memberUserIds = existingMembers.map((m) => m.userId);

  const availableUsers = await db.user.findMany({
    where: {
      id: { notIn: memberUserIds },
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
    take: 50,
  });

  return availableUsers;
}

export async function inviteUserToWallet(walletId: string, email: string, role: PermissionLevel) {
  const { userId: currentUserId } = await requireWalletAccess(walletId, "OWNER");

  if (role === "OWNER") {
    throw new Error("Impossible d'assigner le rôle de propriétaire.");
  }

  let cleanEmail = email.trim();
  const match = cleanEmail.match(/\(([^)]+)\)/);
  if (match && match[1]) {
    cleanEmail = match[1].trim();
  }

  const targetUser = await db.user.findFirst({
    where: {
      email: cleanEmail,
    },
  });

  if (!targetUser) {
    throw new Error(`Aucun utilisateur trouvé avec l'adresse e-mail: ${cleanEmail}`);
  }

  if (targetUser.id === currentUserId) {
    throw new Error("Vous êtes déjà le propriétaire de ce portefeuille.");
  }

  const walletUser = await db.walletUser.upsert({
    where: {
      walletId_userId: {
        walletId,
        userId: targetUser.id,
      },
    },
    update: { role },
    create: {
      walletId,
      userId: targetUser.id,
      role,
    },
  });

  revalidatePath("/");
  return walletUser;
}

export async function removeUserFromWallet(walletId: string, userId: string) {
  const { userId: currentUserId } = await requireWalletAccess(walletId, "OWNER");

  if (userId === currentUserId) {
    throw new Error("Vous ne pouvez pas vous retirer vous-même de votre propre portefeuille.");
  }

  await db.walletUser.delete({
    where: {
      walletId_userId: {
        walletId,
        userId,
      },
    },
  });

  revalidatePath("/");
}

/* ==========================================================================
   REVENUES
   ========================================================================== */

export async function getRevenues(walletId: string, month: number, year: number) {
  await requireWalletAccess(walletId, "READ_ONLY");

  if (month === 0) {
    return db.revenue.findMany({
      where: { walletId, year },
      orderBy: { date: "desc" },
    });
  }

  const allRevenues = await db.revenue.findMany({
    where: { walletId },
    orderBy: { date: "desc" },
  });

  return allRevenues.filter((r) => {
    if (r.type === "FIXED" || r.type === "REIMBURSEMENT_FIXED") {
      // Les revenus et remboursements fixes se répercutent automatiquement sur tous les mois suivants
      const createdBeforeOrInMonth =
        r.year < year || (r.year === year && r.month <= month);
      return createdBeforeOrInMonth;
    } else {
      // Les revenus et remboursements ponctuels/variables sont stricts pour leur mois et année
      return r.month === month && r.year === year;
    }
  });
}

export async function addRevenue(
  walletId: string,
  data: { title: string; amount: number; type: "FIXED" | "VARIABLE" | "REIMBURSEMENT" | "REIMBURSEMENT_FIXED"; month: number; year: number }
) {
  await requireWalletAccess(walletId, "FULL_ACCESS");
  const revenue = await db.revenue.create({
    data: {
      walletId,
      title: data.title,
      amount: data.amount,
      type: data.type,
      month: data.month,
      year: data.year,
    },
  });
  revalidatePath("/");
  return revenue;
}

export async function deleteRevenue(walletId: string, id: string) {
  await requireWalletAccess(walletId, "FULL_ACCESS");
  await db.revenue.delete({ where: { id, walletId } });
  revalidatePath("/");
}

/* ==========================================================================
   RECURRING EXPENSES
   ========================================================================== */

export async function getRecurringExpenses(walletId: string) {
  await requireWalletAccess(walletId, "READ_ONLY");
  return db.recurringExpense.findMany({
    where: { walletId },
    orderBy: { dayOfMonth: "asc" },
  });
}

export async function addRecurringExpense(
  walletId: string,
  data: { title: string; amount: number; category: string; color: string; dayOfMonth: number }
) {
  await requireWalletAccess(walletId, "FULL_ACCESS");
  const expense = await db.recurringExpense.create({
    data: {
      walletId,
      title: data.title,
      amount: data.amount,
      category: data.category,
      color: data.color || "blue",
      dayOfMonth: data.dayOfMonth,
    },
  });
  revalidatePath("/");
  return expense;
}

export async function deleteRecurringExpense(walletId: string, id: string) {
  await requireWalletAccess(walletId, "FULL_ACCESS");
  await db.recurringExpense.delete({ where: { id, walletId } });
  revalidatePath("/");
}

/* ==========================================================================
   INSTALLMENT PAYMENTS
   ========================================================================== */

export async function getInstallments(walletId: string, month: number, year: number) {
  await requireWalletAccess(walletId, "READ_ONLY");
  const allInstallments = await db.installmentPayment.findMany({
    where: { walletId },
    orderBy: { dayOfMonth: "asc" },
  });

  if (month === 0) {
    return allInstallments.filter((inst) => {
      const isAfterStart = inst.startYear <= year;
      const isBeforeEnd = inst.endYear >= year;
      return isAfterStart && isBeforeEnd;
    });
  }

  return allInstallments.filter((inst) => {
    const isAfterStart = inst.startYear < year || (inst.startYear === year && inst.startMonth <= month);
    const isBeforeEnd = inst.endYear > year || (inst.endYear === year && inst.endMonth >= month);
    return isAfterStart && isBeforeEnd;
  });
}

export async function addInstallment(
  walletId: string,
  data: {
    title: string;
    totalAmount?: number;
    amount: number;
    category: string;
    color: string;
    dayOfMonth: number;
    startMonth: number;
    startYear: number;
    endMonth: number;
    endYear: number;
  }
) {
  await requireWalletAccess(walletId, "FULL_ACCESS");
  const installment = await db.installmentPayment.create({
    data: {
      walletId,
      title: data.title,
      totalAmount: data.totalAmount,
      amount: data.amount,
      category: data.category,
      color: data.color || "violet",
      dayOfMonth: data.dayOfMonth,
      startMonth: data.startMonth,
      startYear: data.startYear,
      endMonth: data.endMonth,
      endYear: data.endYear,
    },
  });
  revalidatePath("/");
  return installment;
}

export async function deleteInstallment(walletId: string, id: string) {
  await requireWalletAccess(walletId, "FULL_ACCESS");
  await db.installmentPayment.delete({ where: { id, walletId } });
  revalidatePath("/");
}

export async function updateInstallmentGlobal(
  walletId: string,
  id: string,
  data: {
    title?: string;
    amount?: number;
    category?: string;
    dayOfMonth?: number;
    startMonth?: number;
    startYear?: number;
    endMonth?: number;
    endYear?: number;
  }
) {
  await requireWalletAccess(walletId, "FULL_ACCESS");
  const updated = await db.installmentPayment.update({
    where: { id, walletId },
    data,
  });
  revalidatePath("/");
  return updated;
}

/* ==========================================================================
   BUDGET ENVELOPES
   ========================================================================== */

export async function getBudgets(walletId: string, month: number, year: number) {
  await requireWalletAccess(walletId, "READ_ONLY");
  const whereClause: any = { walletId, year };
  if (month > 0) whereClause.month = month;
  return db.budgetEnvelope.findMany({
    where: whereClause,
    orderBy: { category: "asc" },
  });
}

export async function saveBudgetEnvelope(
  walletId: string,
  data: { category: string; limitAmount: number; color: string; month: number; year: number }
) {
  await requireWalletAccess(walletId, "FULL_ACCESS");
  const envelope = await db.budgetEnvelope.upsert({
    where: {
      walletId_category_month_year: {
        walletId,
        category: data.category,
        month: data.month,
        year: data.year,
      },
    },
    update: {
      limitAmount: data.limitAmount,
      color: data.color,
    },
    create: {
      walletId,
      category: data.category,
      limitAmount: data.limitAmount,
      color: data.color || "teal",
      month: data.month,
      year: data.year,
    },
  });

  // Mettre à jour la couleur globalement sur toutes les enveloppes existantes de cette catégorie
  if (data.color) {
    await db.budgetEnvelope.updateMany({
      where: {
        walletId,
        category: data.category,
      },
      data: {
        color: data.color,
      },
    });
  }

  revalidatePath("/");
  return envelope;
}

export async function deleteBudgetEnvelope(walletId: string, id: string) {
  await requireWalletAccess(walletId, "FULL_ACCESS");
  await db.budgetEnvelope.delete({ where: { id, walletId } });
  revalidatePath("/");
}

/* ==========================================================================
   TRANSACTIONS
   ========================================================================== */

export async function getTransactions(walletId: string, month: number, year: number) {
  await requireWalletAccess(walletId, "READ_ONLY");
  const whereClause: any = { walletId, year };
  if (month > 0) whereClause.month = month;
  return db.transaction.findMany({
    where: whereClause,
    orderBy: { day: "desc" },
  });
}

export async function addTransaction(
  walletId: string,
  data: {
    title: string;
    amount: number;
    category: string;
    color: string;
    day: number;
    month: number;
    year: number;
    notes?: string;
  }
) {
  await requireWalletAccess(walletId, "FULL_ACCESS");
  const transaction = await db.transaction.create({
    data: {
      walletId,
      title: data.title,
      amount: data.amount,
      category: data.category,
      color: data.color || "gray",
      day: data.day,
      month: data.month,
      year: data.year,
      notes: data.notes,
    },
  });
  revalidatePath("/");
  return transaction;
}

export async function deleteTransaction(walletId: string, id: string) {
  await requireWalletAccess(walletId, "FULL_ACCESS");
  await db.transaction.delete({ where: { id, walletId } });
  revalidatePath("/");
}

/* ==========================================================================
   POINTAGE BANCAIRE (PROCESSED PAYMENTS)
   ========================================================================== */

export async function togglePaymentProcessed(
  walletId: string,
  data: {
    paymentId: string;
    type: "REVENUE" | "RECURRING" | "INSTALLMENT";
    month: number;
    year: number;
    processed: boolean;
  }
) {
  await requireWalletAccess(walletId, "FULL_ACCESS");

  if (data.processed) {
    await db.processedPayment.upsert({
      where: {
        walletId_paymentId_type_month_year: {
          walletId,
          paymentId: data.paymentId,
          type: data.type,
          month: data.month,
          year: data.year,
        },
      },
      update: {},
      create: {
        walletId,
        paymentId: data.paymentId,
        type: data.type,
        month: data.month,
        year: data.year,
      },
    });
  } else {
    try {
      await db.processedPayment.delete({
        where: {
          walletId_paymentId_type_month_year: {
            walletId,
            paymentId: data.paymentId,
            type: data.type,
            month: data.month,
            year: data.year,
          },
        },
      });
    } catch {
      // Ignorer si déjà supprimé
    }
  }
  revalidatePath("/");
}

export async function setExpenseOverride(
  walletId: string,
  data: {
    paymentId: string;
    type: "REVENUE" | "RECURRING";
    amount: number;
    month: number;
    year: number;
  }
) {
  await requireWalletAccess(walletId, "FULL_ACCESS");

  await db.expenseOverride.upsert({
    where: {
      walletId_paymentId_type_month_year: {
        walletId,
        paymentId: data.paymentId,
        type: data.type,
        month: data.month,
        year: data.year,
      },
    },
    update: { amount: data.amount },
    create: {
      walletId,
      paymentId: data.paymentId,
      type: data.type,
      amount: data.amount,
      month: data.month,
      year: data.year,
    },
  });

  revalidatePath("/");
}

export async function removeExpenseOverride(
  walletId: string,
  data: {
    paymentId: string;
    type: "REVENUE" | "RECURRING";
    month: number;
    year: number;
  }
) {
  await requireWalletAccess(walletId, "FULL_ACCESS");

  try {
    await db.expenseOverride.delete({
      where: {
        walletId_paymentId_type_month_year: {
          walletId,
          paymentId: data.paymentId,
          type: data.type,
          month: data.month,
          year: data.year,
        },
      },
    });
  } catch {
    // Ignorer si déjà supprimé
  }

  revalidatePath("/");
}

export async function updateRevenueGlobal(
  walletId: string,
  id: string,
  data: { title?: string; amount?: number; type?: string }
) {
  await requireWalletAccess(walletId, "FULL_ACCESS");
  const updated = await db.revenue.update({
    where: { id, walletId },
    data,
  });
  revalidatePath("/");
  return updated;
}

export async function updateRecurringExpenseGlobal(
  walletId: string,
  id: string,
  data: { title?: string; amount?: number; category?: string; dayOfMonth?: number }
) {
  await requireWalletAccess(walletId, "FULL_ACCESS");
  const updated = await db.recurringExpense.update({
    where: { id, walletId },
    data,
  });
  revalidatePath("/");
  return updated;
}

export async function setDeficitOverride(
  walletId: string,
  data: { month: number; year: number; amount: number }
) {
  await requireWalletAccess(walletId, "FULL_ACCESS");
  await db.expenseOverride.upsert({
    where: {
      walletId_paymentId_type_month_year: {
        walletId,
        paymentId: "PREV_DEFICIT",
        type: "DEFICIT",
        month: data.month,
        year: data.year,
      },
    },
    update: { amount: data.amount },
    create: {
      walletId,
      paymentId: "PREV_DEFICIT",
      type: "DEFICIT",
      amount: data.amount,
      month: data.month,
      year: data.year,
    },
  });
  revalidatePath("/");
}

export async function removeDeficitOverride(
  walletId: string,
  data: { month: number; year: number }
) {
  await requireWalletAccess(walletId, "FULL_ACCESS");
  try {
    await db.expenseOverride.delete({
      where: {
        walletId_paymentId_type_month_year: {
          walletId,
          paymentId: "PREV_DEFICIT",
          type: "DEFICIT",
          month: data.month,
          year: data.year,
        },
      },
    });
  } catch {}
  revalidatePath("/");
}

export async function createWalletTransfer(
  sourceWalletId: string,
  targetWalletId: string,
  data: {
    title: string;
    amount: number;
    isPercentage?: boolean;
    percentage?: number;
    dayOfMonth: number;
    month: number;
    year: number;
  }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Non autorisé");

  const user = await db.user.findUnique({ where: { email: session.user.email } });
  if (!user) throw new Error("Utilisateur introuvable");

  await requireWalletAccess(sourceWalletId, "FULL_ACCESS");
  await requireWalletAccess(targetWalletId, "FULL_ACCESS");

  const transfer = await db.walletTransfer.create({
    data: {
      sourceWalletId,
      targetWalletId,
      createdById: user.id,
      title: data.title,
      amount: data.amount,
      isPercentage: !!data.isPercentage,
      percentage: data.percentage || null,
      dayOfMonth: data.dayOfMonth,
      month: data.month,
      year: data.year,
    },
  });

  revalidatePath("/");
  return transfer;
}

export async function deleteWalletTransfer(walletId: string, id: string) {
  await requireWalletAccess(walletId, "FULL_ACCESS");
  await db.walletTransfer.delete({ where: { id } });
  revalidatePath("/");
}

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

async function getPreviousMonthCarryover(walletId: string, month: number, year: number): Promise<{
  deficit: number;
  surplus: number;
  prevMonthName: string;
  isPersonal: boolean;
}> {
  const wallet = await db.wallet.findUnique({ where: { id: walletId }, select: { isPersonal: true } });
  const isPersonal = wallet?.isPersonal ?? false;

  const targetMonth = month === 0 ? new Date().getMonth() + 1 : month;
  const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1;
  const prevYear = targetMonth === 1 ? year - 1 : year;
  const prevMonthName = MONTH_NAMES[prevMonth - 1];

  const [prevRevenues, prevRecurring, prevInstallments, prevTransactions, prevOverrides] = await Promise.all([
    getRevenues(walletId, prevMonth, prevYear),
    getRecurringExpenses(walletId),
    getInstallments(walletId, prevMonth, prevYear),
    getTransactions(walletId, prevMonth, prevYear),
    db.expenseOverride.findMany({ where: { walletId, year: prevYear } }),
  ]);

  const prevRevWithOverrides = prevRevenues.reduce((acc, r) => {
    const ov = prevOverrides.find((o) => o.paymentId === r.id && o.type === "REVENUE" && o.month === prevMonth);
    return acc + (ov ? ov.amount : r.amount);
  }, 0);

  const prevRecWithOverrides = prevRecurring.reduce((acc, r) => {
    const ov = prevOverrides.find((o) => o.paymentId === r.id && o.type === "RECURRING" && o.month === prevMonth);
    return acc + (ov ? ov.amount : r.amount);
  }, 0);

  const prevInstTotal = prevInstallments.reduce((acc, i) => acc + i.amount, 0);
  const prevTrxTotal = prevTransactions.reduce((acc, t) => acc + t.amount, 0);

  const prevTotalExpenses = prevRecWithOverrides + prevInstTotal + prevTrxTotal;
  const prevNet = prevRevWithOverrides - prevTotalExpenses;

  const deficit = prevNet < 0 ? Math.abs(prevNet) : 0;
  // Sur les portefeuilles additionnels/partagés (isPersonal === false), on reporte le surplus du mois précédent
  const surplus = (!isPersonal && prevNet > 0) ? prevNet : 0;

  return {
    deficit,
    surplus,
    prevMonthName,
    isPersonal,
  };
}

export async function getDashboardData(walletId: string, month: number, year: number) {
  const { userRole } = await requireWalletAccess(walletId, "READ_ONLY");

  const targetM = month === 0 ? new Date().getMonth() + 1 : month;
  const processedWhere: any = { walletId, year };
  if (month > 0) processedWhere.month = month;

  const [revenues, recurring, installments, transactions, envelopes, processed, overrides, prevMonthCarryoverInfo, transfersSent, transfersReceived] = await Promise.all([
    getRevenues(walletId, month, year),
    getRecurringExpenses(walletId),
    getInstallments(walletId, month, year),
    getTransactions(walletId, month, year),
    getBudgets(walletId, month, year),
    db.processedPayment.findMany({ where: processedWhere }),
    db.expenseOverride.findMany({ where: { walletId, year } }),
    getPreviousMonthCarryover(walletId, month, year),
    db.walletTransfer.findMany({
      where: { sourceWalletId: walletId, month: targetM, year },
      include: {
        targetWallet: { select: { id: true, name: true } },
        createdBy: { select: { name: true, email: true } },
      },
    }),
    db.walletTransfer.findMany({
      where: { targetWalletId: walletId, month: targetM, year },
      include: {
        sourceWallet: { select: { id: true, name: true } },
        createdBy: { select: { name: true, email: true } },
      },
    }),
  ]);

  const manualDeficitOv = overrides.find(
    (o) => o.paymentId === "PREV_DEFICIT" && o.type === "DEFICIT" && o.month === targetM
  );

  let previousMonthDeficit = 0;
  let previousMonthSurplus = prevMonthCarryoverInfo.surplus;
  let prevMonthLabel = prevMonthCarryoverInfo.prevMonthName;
  let isPersonalWallet = prevMonthCarryoverInfo.isPersonal;
  let hasManualDeficit = false;

  if (manualDeficitOv) {
    previousMonthDeficit = manualDeficitOv.amount;
    hasManualDeficit = true;
  } else {
    previousMonthDeficit = prevMonthCarryoverInfo.deficit;
  }

  // Appliquer les ajustements ponctuels (overrides) sur les revenus
  const revenuesWithOverrides = revenues.map((r) => {
    const ov = overrides.find(
      (o) => o.paymentId === r.id && o.type === "REVENUE" && (month === 0 || o.month === month)
    );
    const amount = ov ? ov.amount : r.amount;
    return {
      ...r,
      amount,
      originalAmount: r.amount,
      hasOverride: !!ov,
      processed: processed.some((p) => p.paymentId === r.id && p.type === "REVENUE"),
    };
  });

  // Appliquer les ajustements ponctuels (overrides) sur les charges récurrentes
  const recurringWithOverrides = recurring.map((r) => {
    const ov = overrides.find(
      (o) => o.paymentId === r.id && o.type === "RECURRING" && (month === 0 || o.month === month)
    );
    const amount = ov ? ov.amount : r.amount;
    return {
      ...r,
      amount,
      originalAmount: r.amount,
      hasOverride: !!ov,
      processed: processed.some((p) => p.paymentId === r.id && p.type === "RECURRING"),
    };
  });

  // Calcul de la base pour les virements en pourcentage du portefeuille source
  const totalEnvelopeLimits = envelopes.reduce((acc, e) => acc + (e.limitAmount > 0 ? e.limitAmount : 0), 0);
  const rawRevenuesTotal = revenuesWithOverrides.reduce((acc, r) => acc + r.amount, 0);
  const rawFixedTotal = recurringWithOverrides.reduce((acc, r) => acc + r.amount, 0) + installments.reduce((acc, i) => acc + i.amount, 0);
  const transferBase = Math.max(0, rawRevenuesTotal - rawFixedTotal - totalEnvelopeLimits);

  const transfersSentWithProcessed = transfersSent.map((t) => {
    const effectiveAmount = (t.isPercentage && t.percentage && t.percentage > 0)
      ? Math.round((t.percentage / 100) * transferBase * 100) / 100
      : t.amount;

    return {
      ...t,
      amount: effectiveAmount,
      calculatedBase: transferBase,
      processed: processed.some((p) => p.paymentId === t.id && p.type === "TRANSFER"),
    };
  });

  const transfersReceivedWithProcessed = await Promise.all(
    transfersReceived.map(async (t) => {
      let effectiveAmount = t.amount;
      if (t.isPercentage && t.percentage && t.percentage > 0) {
        const [sRevenues, sRecurring, sInstallments, sEnvelopes, sOverrides] = await Promise.all([
          getRevenues(t.sourceWalletId, targetM, year),
          getRecurringExpenses(t.sourceWalletId),
          getInstallments(t.sourceWalletId, targetM, year),
          getBudgets(t.sourceWalletId, targetM, year),
          db.expenseOverride.findMany({ where: { walletId: t.sourceWalletId, year } }),
        ]);

        const sRevTotal = sRevenues.reduce((acc, r) => {
          const ov = sOverrides.find((o) => o.paymentId === r.id && o.type === "REVENUE" && o.month === targetM);
          return acc + (ov ? ov.amount : r.amount);
        }, 0);

        const sRecTotal = sRecurring.reduce((acc, r) => {
          const ov = sOverrides.find((o) => o.paymentId === r.id && o.type === "RECURRING" && o.month === targetM);
          return acc + (ov ? ov.amount : r.amount);
        }, 0);

        const sInstTotal = sInstallments.reduce((acc, i) => acc + i.amount, 0);
        const sEnvTotal = sEnvelopes.reduce((acc, e) => acc + (e.limitAmount > 0 ? e.limitAmount : 0), 0);

        const sBase = Math.max(0, sRevTotal - (sRecTotal + sInstTotal) - sEnvTotal);
        effectiveAmount = Math.round((t.percentage / 100) * sBase * 100) / 100;
      }

      return {
        ...t,
        amount: effectiveAmount,
      };
    })
  );

  // Incorporer les virements reçus comme revenus dans le portefeuille destinataire
  const transferRevenues = transfersReceivedWithProcessed.map((t) => ({
    id: `transfer-${t.id}`,
    walletId,
    title: `${t.title} (Virement de ${t.createdBy.name || t.createdBy.email})`,
    amount: t.amount,
    type: "VARIABLE",
    isTransferIn: true,
    senderName: t.createdBy.name || t.createdBy.email,
    sourceWalletName: t.sourceWallet.name,
    month: t.month,
    year: t.year,
    date: t.createdAt,
    originalAmount: t.amount,
    hasOverride: false,
    processed: processed.some((p) => p.paymentId === t.id && p.type === "TRANSFER"),
  }));

  const standardRevenues = [
    ...revenuesWithOverrides.filter((r) => r.type === "FIXED" || r.type === "VARIABLE"),
    ...transferRevenues,
  ];
  const reimbursements = revenuesWithOverrides.filter(
    (r) => r.type === "REIMBURSEMENT" || r.type === "REIMBURSEMENT_FIXED"
  );

  const totalStandardRevenues = standardRevenues.reduce((acc, r) => acc + r.amount, 0);
  const totalReimbursements = reimbursements.reduce((acc, r) => acc + r.amount, 0);
  const totalRevenues = totalStandardRevenues + totalReimbursements;

  const totalTransfersSent = transfersSentWithProcessed.reduce((acc, t) => acc + t.amount, 0);
  const totalRecurring = recurringWithOverrides.reduce((acc, r) => acc + r.amount, 0);
  const totalInstallments = installments.reduce((acc, i) => acc + i.amount, 0);
  const totalTransactions = transactions.reduce((acc, t) => acc + t.amount, 0);

  const fixedExpenses = totalRecurring + totalInstallments + totalTransfersSent;
  const restToLive = totalRevenues - fixedExpenses;
  const totalExpenses = fixedExpenses + totalTransactions;
  const netSavings = totalRevenues - totalExpenses - previousMonthDeficit + previousMonthSurplus;

  const installmentsWithProcessed = installments.map((i) => ({
    ...i,
    processed: processed.some((p) => p.paymentId === i.id && p.type === "INSTALLMENT"),
  }));

  // Calcul du pointage bancaire
  const pointedRevenues = [
    ...revenuesWithOverrides,
    ...transferRevenues,
  ]
    .filter((r) => r.processed)
    .reduce((acc, r) => acc + r.amount, 0);

  const pointedRecurring = recurringWithOverrides
    .filter((r) => r.processed)
    .reduce((acc, r) => acc + r.amount, 0);

  const pointedInstallments = installmentsWithProcessed
    .filter((i) => i.processed)
    .reduce((acc, i) => acc + i.amount, 0);

  const pointedTransfersSent = transfersSentWithProcessed
    .filter((t) => t.processed)
    .reduce((acc, t) => acc + t.amount, 0);

  const pointedFixedExpenses = pointedRecurring + pointedInstallments + pointedTransfersSent;
  const remainingFixedExpenses = fixedExpenses - pointedFixedExpenses;
  const bankBalance = pointedRevenues - pointedFixedExpenses;

  // Reste à vivre réel = Revenus pointés - Dépenses courantes - Charges pointées - Déficit mois précédent + Bonus mois précédent
  const realRestToLive = pointedRevenues - totalTransactions - pointedFixedExpenses - previousMonthDeficit + previousMonthSurplus;

  const [allWalletRecurring, allWalletTransactions, allWalletEnvelopes, allWalletInstallments] = await Promise.all([
    db.recurringExpense.findMany({ where: { walletId }, select: { category: true } }),
    db.transaction.findMany({ where: { walletId }, select: { category: true } }),
    db.budgetEnvelope.findMany({ where: { walletId }, select: { category: true, color: true } }),
    db.installmentPayment.findMany({ where: { walletId }, select: { category: true } }),
  ]);

  const categorySet = new Set<string>();
  allWalletRecurring.forEach((r) => r.category && categorySet.add(r.category.trim()));
  allWalletTransactions.forEach((t) => t.category && categorySet.add(t.category.trim()));
  allWalletEnvelopes.forEach((e) => e.category && categorySet.add(e.category.trim()));
  allWalletInstallments.forEach((i) => i.category && categorySet.add(i.category.trim()));

  const categories = Array.from(categorySet).sort((a, b) => a.localeCompare(b));

  const EXCLUDED_ENVELOPE_CATEGORIES = [
    "crédit",
    "credit",
    "paiement échelonné",
    "paiement echelonne",
  ];

  const envelopeCategoriesList = categories.filter(
    (cat) => !EXCLUDED_ENVELOPE_CATEGORIES.includes(cat.trim().toLowerCase())
  );

  const PRESET_COLORS_LIST = ["teal", "blue", "violet", "pink", "orange", "green", "red", "gray"];

  // Calcul enveloppes pour les catégories éligibles (hors crédits & paiements échelonnés)
  const envelopeStats = envelopeCategoriesList.map((catName, idx) => {
    const env = envelopes.find(
      (e) => e.category.trim().toLowerCase() === catName.trim().toLowerCase()
    );

    const anyEnvForCat = allWalletEnvelopes.find(
      (e) => e.category.trim().toLowerCase() === catName.trim().toLowerCase()
    );

    const transactionSpent = transactions
      .filter((t) => t.category.trim().toLowerCase() === catName.trim().toLowerCase())
      .reduce((acc, t) => acc + t.amount, 0);

    const recurringSpent = recurringWithOverrides
      .filter((r) => r.category.trim().toLowerCase() === catName.trim().toLowerCase())
      .reduce((acc, r) => acc + r.amount, 0);

    const spent = transactionSpent + recurringSpent;

    const limitAmount = env ? env.limitAmount : 0;
    const color = env?.color || anyEnvForCat?.color || PRESET_COLORS_LIST[idx % PRESET_COLORS_LIST.length];
    const id = env ? env.id : `virtual-${catName}`;

    return {
      id,
      category: catName,
      color,
      limitAmount,
      spent,
      transactionSpent,
      recurringSpent,
      remaining: limitAmount > 0 ? limitAmount - spent : -spent,
      percentSpent: limitAmount > 0 ? Math.round((spent / limitAmount) * 100) : (spent > 0 ? 100 : 0),
      hasLimit: limitAmount > 0,
    };
  });

  return {
    userRole,
    month,
    year,
    categories,
    summary: {
      totalStandardRevenues,
      totalReimbursements,
      totalRevenues,
      totalRecurring,
      totalInstallments,
      totalTransfersSent,
      fixedExpenses,
      restToLive,
      totalTransactions,
      totalExpenses,
      netSavings: totalRevenues - totalExpenses - previousMonthDeficit,
      pointedRevenues,
      pointedFixedExpenses,
      remainingFixedExpenses,
      bankBalance,
      realRestToLive,
      previousMonthDeficit,
      previousMonthSurplus,
      prevMonthLabel,
      hasManualDeficit,
      isPersonalWallet,
    },
    envelopes: envelopeStats,
    outOfEnvelopeSpent: 0,
    transactions,
    revenues: standardRevenues,
    reimbursements,
    recurring: recurringWithOverrides,
    installments: installmentsWithProcessed,
    transfersSent: transfersSentWithProcessed,
    transfersReceived: transfersReceivedWithProcessed,
  };
}
