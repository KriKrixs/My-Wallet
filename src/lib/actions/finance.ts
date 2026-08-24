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
    include: {
      wallet: {
        include: {
          users: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      },
    },
  });

  return userWallets.map((uw) => {
    const isOwner = uw.wallet.ownerId === userId;
    const isPersonalForCurrentUser = uw.wallet.isPersonal && isOwner;

    let displayName = uw.wallet.name;
    if (uw.wallet.isPersonal && !isOwner) {
      const ownerUser = uw.wallet.users.find((u) => u.userId === uw.wallet.ownerId)?.user;
      let firstName = "Propriétaire";
      if (ownerUser?.name && ownerUser.name.trim() !== "") {
        firstName = ownerUser.name.trim().split(" ")[0];
      } else if (ownerUser?.email) {
        firstName = ownerUser.email.split("@")[0];
      }
      displayName = `Portefeuille de ${firstName}`;
    }

    return {
      id: uw.wallet.id,
      name: displayName,
      currency: uw.wallet.currency,
      isPersonal: isPersonalForCurrentUser,
      role: uw.role as PermissionLevel,
      isOwner,
      carryoverMode: (uw.wallet.carryoverMode || "NONE") as "NONE" | "NEXT_MONTH" | "TARGET_WALLET",
      carryoverTargetWalletId: uw.wallet.carryoverTargetWalletId,
    };
  });
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
        r.year < year || (r.year === year && (month === 0 || r.month <= month));
      if (!createdBeforeOrInMonth) return false;

      if (r.endYear && r.endMonth) {
        const endedBefore =
          r.endYear < year || (r.endYear === year && month !== 0 && r.endMonth < month);
        if (endedBefore) return false;
      }

      return true;
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

export async function deleteRevenue(walletId: string, id: string, currentMonth?: number, currentYear?: number) {
  await requireWalletAccess(walletId, "FULL_ACCESS");

  const revenue = await db.revenue.findUnique({ where: { id, walletId } });
  if (!revenue) return;

  const targetM = currentMonth && currentMonth > 0 ? currentMonth : new Date().getMonth() + 1;
  const targetY = currentYear || new Date().getFullYear();

  const isFixed = revenue.type === "FIXED" || revenue.type === "REIMBURSEMENT_FIXED";
  const createdInPast = revenue.year < targetY || (revenue.year === targetY && revenue.month < targetM);

  if (isFixed && createdInPast) {
    let prevM = targetM - 1;
    let prevY = targetY;
    if (prevM < 1) {
      prevM = 12;
      prevY -= 1;
    }
    await db.revenue.update({
      where: { id, walletId },
      data: { endMonth: prevM, endYear: prevY },
    });
  } else {
    await db.revenue.delete({ where: { id, walletId } });
  }

  revalidatePath("/");
}

/* ==========================================================================
   RECURRING EXPENSES
   ========================================================================== */

export async function getRecurringExpenses(walletId: string, month?: number, year?: number) {
  await requireWalletAccess(walletId, "READ_ONLY");
  const all = await db.recurringExpense.findMany({
    where: { walletId },
    orderBy: { dayOfMonth: "asc" },
  });

  if (!month || !year) return all;

  return all.filter((r) => {
    if (!r.startYear || !r.startMonth) return true;
    const isAfterStart = r.startYear < year || (r.startYear === year && (month === 0 || r.startMonth <= month));
    if (!isAfterStart) return false;

    if (r.endYear && r.endMonth) {
      const endedBefore = r.endYear < year || (r.endYear === year && month !== 0 && r.endMonth < month);
      if (endedBefore) return false;
    }

    return true;
  });
}

export async function addRecurringExpense(
  walletId: string,
  data: {
    title: string;
    amount: number;
    category: string;
    color: string;
    dayOfMonth: number;
    startMonth?: number;
    startYear?: number;
  }
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
      startMonth: data.startMonth,
      startYear: data.startYear,
    },
  });
  revalidatePath("/");
  return expense;
}

export async function deleteRecurringExpense(walletId: string, id: string, currentMonth?: number, currentYear?: number) {
  await requireWalletAccess(walletId, "FULL_ACCESS");

  const item = await db.recurringExpense.findUnique({ where: { id, walletId } });
  if (!item) return;

  const targetM = currentMonth && currentMonth > 0 ? currentMonth : new Date().getMonth() + 1;
  const targetY = currentYear || new Date().getFullYear();

  const startM = item.startMonth || 1;
  const startY = item.startYear || targetY;

  const createdInPast = startY < targetY || (startY === targetY && startM < targetM);

  if (createdInPast) {
    let prevM = targetM - 1;
    let prevY = targetY;
    if (prevM < 1) {
      prevM = 12;
      prevY -= 1;
    }
    await db.recurringExpense.update({
      where: { id, walletId },
      data: { endMonth: prevM, endYear: prevY },
    });
  } else {
    await db.recurringExpense.delete({ where: { id, walletId } });
  }

  revalidatePath("/");
}

export async function updateRecurringExpenseGlobal(
  walletId: string,
  id: string,
  data: {
    title?: string;
    amount?: number;
    category?: string;
    dayOfMonth?: number;
    startMonth?: number;
    startYear?: number;
  }
) {
  await requireWalletAccess(walletId, "FULL_ACCESS");
  const updated = await db.recurringExpense.update({
    where: { id, walletId },
    data,
  });
  revalidatePath("/");
  return updated;
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

export async function deleteInstallment(walletId: string, id: string, currentMonth?: number, currentYear?: number) {
  await requireWalletAccess(walletId, "FULL_ACCESS");

  const item = await db.installmentPayment.findUnique({ where: { id, walletId } });
  if (!item) return;

  const targetM = currentMonth && currentMonth > 0 ? currentMonth : new Date().getMonth() + 1;
  const targetY = currentYear || new Date().getFullYear();

  const createdInPast = item.startYear < targetY || (item.startYear === targetY && item.startMonth < targetM);

  if (createdInPast) {
    let prevM = targetM - 1;
    let prevY = targetY;
    if (prevM < 1) {
      prevM = 12;
      prevY -= 1;
    }
    await db.installmentPayment.update({
      where: { id, walletId },
      data: { endMonth: prevM, endYear: prevY },
    });
  } else {
    await db.installmentPayment.delete({ where: { id, walletId } });
  }

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

  if (month === 0) {
    return db.budgetEnvelope.findMany({
      where: { walletId, year },
      orderBy: { category: "asc" },
    });
  }

  // Récupérer toutes les enveloppes définies jusqu'au mois/année demandé inclus
  const allPriorOrEqualBudgets = await db.budgetEnvelope.findMany({
    where: {
      walletId,
      OR: [
        { year: { lt: year } },
        { year, month: { lte: month } },
      ],
    },
    orderBy: [
      { year: "desc" },
      { month: "desc" },
    ],
  });

  // Conserver l'enveloppe la plus récente pour chaque catégorie
  const latestByCategory = new Map<string, any>();
  for (const b of allPriorOrEqualBudgets) {
    const key = b.category.toLowerCase();
    if (!latestByCategory.has(key)) {
      latestByCategory.set(key, b);
    }
  }

  const result = Array.from(latestByCategory.values()).map((b) => ({
    ...b,
    month,
    year,
  }));

  result.sort((a, b) => a.category.localeCompare(b.category));
  return result;
}

export async function saveBudgetEnvelope(
  walletId: string,
  data: { category: string; limitAmount: number; color: string; month: number; year: number }
) {
  await requireWalletAccess(walletId, "FULL_ACCESS");

  // 1. Upsert pour le mois cible
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

  // 2. Mettre à jour tous les mois FUTURS (month > data.month ou year > data.year) pour cette catégorie
  // Sans toucher aux mois d'AVANT
  await db.budgetEnvelope.updateMany({
    where: {
      walletId,
      category: data.category,
      OR: [
        { year: { gt: data.year } },
        { year: data.year, month: { gt: data.month } },
      ],
    },
    data: {
      limitAmount: data.limitAmount,
      ...(data.color ? { color: data.color } : {}),
    },
  });

  // 3. Mettre à jour la couleur sur tous les mois existants de cette catégorie
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

export async function updateTransaction(
  walletId: string,
  id: string,
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
  const transaction = await db.transaction.update({
    where: { id, walletId },
    data: {
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
    type: "REVENUE" | "RECURRING" | "INSTALLMENT" | "TRANSFER";
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
    type: "REVENUE" | "RECURRING" | "INSTALLMENT";
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
    update: { amount: data.amount, isDisabled: false },
    create: {
      walletId,
      paymentId: data.paymentId,
      type: data.type,
      amount: data.amount,
      isDisabled: false,
      month: data.month,
      year: data.year,
    },
  });

  revalidatePath("/");
}

export async function toggleDisableItem(
  walletId: string,
  data: {
    paymentId: string;
    type: "REVENUE" | "RECURRING" | "INSTALLMENT" | "TRANSFER";
    month: number;
    year: number;
  }
) {
  await requireWalletAccess(walletId, "FULL_ACCESS");

  const existing = await db.expenseOverride.findUnique({
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

  if (existing) {
    const isCurrentlyDisabled = existing.isDisabled || existing.amount === 0;
    if (isCurrentlyDisabled) {
      if (existing.amount === null || existing.amount === undefined || existing.amount === 0) {
        await db.expenseOverride.delete({
          where: { id: existing.id },
        });
      } else {
        await db.expenseOverride.update({
          where: { id: existing.id },
          data: { isDisabled: false },
        });
      }
    } else {
      await db.expenseOverride.update({
        where: { id: existing.id },
        data: { isDisabled: true },
      });
    }
  } else {
    await db.expenseOverride.create({
      data: {
        walletId,
        paymentId: data.paymentId,
        type: data.type,
        month: data.month,
        year: data.year,
        amount: null,
        isDisabled: true,
      },
    });
  }

  revalidatePath("/");
}

export async function removeExpenseOverride(
  walletId: string,
  data: {
    paymentId: string;
    type: "REVENUE" | "RECURRING" | "INSTALLMENT";
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
  data: { title?: string; amount?: number; type?: string; month?: number; year?: number }
) {
  await requireWalletAccess(walletId, "FULL_ACCESS");
  const updated = await db.revenue.update({
    where: { id, walletId },
    data,
  });
  revalidatePath("/");
  return updated;
}

export async function moveRevenueMonth(
  walletId: string,
  id: string,
  targetMonth: number,
  targetYear: number
) {
  await requireWalletAccess(walletId, "FULL_ACCESS");
  const revenue = await db.revenue.findUnique({
    where: { id, walletId },
  });

  if (!revenue) {
    throw new Error("Remboursement ou revenu introuvable.");
  }

  const updated = await db.revenue.update({
    where: { id, walletId },
    data: {
      month: targetMonth,
      year: targetYear,
    },
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
    isRecurring?: boolean;
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
      isRecurring: data.isRecurring !== undefined ? !!data.isRecurring : true,
      dayOfMonth: data.dayOfMonth,
      month: data.month,
      year: data.year,
    },
  });

  revalidatePath("/");
  return transfer;
}

export async function updateWalletTransfer(
  walletId: string,
  id: string,
  data: {
    title?: string;
    amount?: number;
    isPercentage?: boolean;
    percentage?: number;
    targetWalletId?: string;
    dayOfMonth?: number;
  }
) {
  await requireWalletAccess(walletId, "FULL_ACCESS");
  const transfer = await db.walletTransfer.update({
    where: { id },
    data,
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

function getEffectiveOverrideAmount(baseAmount: number, ov?: { amount: number | null; isDisabled: boolean }) {
  if (!ov) return baseAmount;
  if (ov.isDisabled || ov.amount === 0) return 0;
  return ov.amount !== null && ov.amount !== undefined ? ov.amount : baseAmount;
}

async function calculateWalletMonthlyNet(walletId: string, month: number, year: number): Promise<number> {
  const [revenues, recurring, installments, transactions, overrides, rawTransfersSent, rawTransfersReceived, envelopes] = await Promise.all([
    getRevenues(walletId, month, year),
    getRecurringExpenses(walletId, month, year),
    getInstallments(walletId, month, year),
    getTransactions(walletId, month, year),
    db.expenseOverride.findMany({ where: { walletId, year } }),
    db.walletTransfer.findMany({
      where: { sourceWalletId: walletId },
      include: {
        targetWallet: { select: { id: true, name: true } },
        createdBy: { select: { name: true, email: true } },
      },
    }),
    db.walletTransfer.findMany({
      where: { targetWalletId: walletId },
      include: {
        sourceWallet: { select: { id: true, name: true } },
        createdBy: { select: { name: true, email: true } },
      },
    }),
    getBudgets(walletId, month, year),
  ]);

  const revTotal = revenues.reduce((acc, r) => {
    const ov = overrides.find((o) => o.paymentId === r.id && o.type === "REVENUE" && o.month === month);
    return acc + getEffectiveOverrideAmount(r.amount, ov);
  }, 0);

  const transfersSent = rawTransfersSent.filter((t) => {
    if (!t.isRecurring) return t.month === month && t.year === year;
    return t.year < year || (t.year === year && t.month <= month);
  });

  const transfersReceived = rawTransfersReceived.filter((t) => {
    if (!t.isRecurring) return t.month === month && t.year === year;
    return t.year < year || (t.year === year && t.month <= month);
  });

  const envLimitsSum = envelopes.reduce((acc, e) => acc + (e.limitAmount > 0 ? e.limitAmount : 0), 0);

  let transfersReceivedTotal = 0;
  for (const t of transfersReceived) {
    let amt = t.amount;
    if ((amt === 0 || amt === null) && t.isPercentage && t.percentage && t.percentage > 0) {
      const [sRevenues, sRecurring, sInstallments, sOverrides] = await Promise.all([
        getRevenues(t.sourceWalletId, month, year),
        getRecurringExpenses(t.sourceWalletId, month, year),
        getInstallments(t.sourceWalletId, month, year),
        db.expenseOverride.findMany({ where: { walletId: t.sourceWalletId, year } }),
      ]);
      const sRev = sRevenues.reduce((acc, r) => {
        const ov = sOverrides.find((o) => o.paymentId === r.id && o.type === "REVENUE" && o.month === month);
        return acc + getEffectiveOverrideAmount(r.amount, ov);
      }, 0);
      const sRec = sRecurring.reduce((acc, r) => {
        const ov = sOverrides.find((o) => o.paymentId === r.id && o.type === "RECURRING" && o.month === month);
        return acc + getEffectiveOverrideAmount(r.amount, ov);
      }, 0);
      const sInst = sInstallments.reduce((acc, i) => {
        const ov = sOverrides.find((o) => o.paymentId === i.id && o.type === "INSTALLMENT" && o.month === month);
        return acc + getEffectiveOverrideAmount(i.amount, ov);
      }, 0);
      const sBase = Math.max(0, sRev - (sRec + sInst) - envLimitsSum);
      amt = Math.round((t.percentage / 100) * sBase * 100) / 100;
    }
    transfersReceivedTotal += amt;
  }

  let transfersSentTotal = 0;
  for (const t of transfersSent) {
    let amt = t.amount;
    if ((amt === 0 || amt === null) && t.isPercentage && t.percentage && t.percentage > 0) {
      const recTotal = recurring.reduce((acc, r) => {
        const ov = overrides.find((o) => o.paymentId === r.id && o.type === "RECURRING" && o.month === month);
        return acc + getEffectiveOverrideAmount(r.amount, ov);
      }, 0);
      const instTotal = installments.reduce((acc, i) => {
        const ov = overrides.find((o) => o.paymentId === i.id && o.type === "INSTALLMENT" && o.month === month);
        return acc + getEffectiveOverrideAmount(i.amount, ov);
      }, 0);
      const base = Math.max(0, revTotal - (recTotal + instTotal) - envLimitsSum);
      amt = Math.round((t.percentage / 100) * base * 100) / 100;
    }
    transfersSentTotal += amt;
  }

  const recTotal = recurring.reduce((acc, r) => {
    const ov = overrides.find((o) => o.paymentId === r.id && o.type === "RECURRING" && o.month === month);
    return acc + getEffectiveOverrideAmount(r.amount, ov);
  }, 0);

  const instTotal = installments.reduce((acc, i) => {
    const ov = overrides.find((o) => o.paymentId === i.id && o.type === "INSTALLMENT" && o.month === month);
    return acc + getEffectiveOverrideAmount(i.amount, ov);
  }, 0);

  const trxTotal = transactions.reduce((acc, t) => acc + t.amount, 0);

  const totalRevenuesAll = revTotal + transfersReceivedTotal;
  const totalExpensesAll = recTotal + instTotal + trxTotal + transfersSentTotal;

  return totalRevenuesAll - totalExpensesAll;
}

async function calculateWalletCarryoverSurplus(
  walletId: string,
  targetMonth: number,
  year: number,
  depth = 0
): Promise<number> {
  if (depth > 24) return 0;

  const wallet = await db.wallet.findUnique({
    where: { id: walletId },
    select: { carryoverMode: true, carryoverTargetWalletId: true },
  });

  const carryoverMode = wallet?.carryoverMode || "NONE";
  const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1;
  const prevYear = targetMonth === 1 ? year - 1 : year;

  const prevNetFlow = await calculateWalletMonthlyNet(walletId, prevMonth, prevYear);

  let prevStartingCarryover = 0;
  if (carryoverMode === "NEXT_MONTH") {
    prevStartingCarryover = await calculateWalletCarryoverSurplus(walletId, prevMonth, prevYear, depth + 1);
  }

  const prevEndingBalance = prevStartingCarryover + prevNetFlow;

  let surplus = 0;
  if (carryoverMode === "NEXT_MONTH" && prevEndingBalance > 0) {
    surplus = prevEndingBalance;
  }

  const sourceWallets = await db.wallet.findMany({
    where: { carryoverMode: "TARGET_WALLET", carryoverTargetWalletId: walletId },
  });

  for (const sW of sourceWallets) {
    const sNetFlow = await calculateWalletMonthlyNet(sW.id, prevMonth, prevYear);
    const sStartingCarryover = await calculateWalletCarryoverSurplus(sW.id, prevMonth, prevYear, depth + 1);
    const sEndingBalance = sStartingCarryover + sNetFlow;
    if (sEndingBalance > 0) {
      surplus += sEndingBalance;
    }
  }

  return surplus;
}

export async function getPreviousMonthCarryover(walletId: string, month: number, year: number): Promise<{
  deficit: number;
  surplus: number;
  prevMonthName: string;
  isPersonal: boolean;
}> {
  const wallet = await db.wallet.findUnique({
    where: { id: walletId },
    select: { isPersonal: true, carryoverMode: true, carryoverTargetWalletId: true },
  });

  const isPersonal = wallet?.isPersonal ?? false;

  const targetMonth = month === 0 ? new Date().getMonth() + 1 : month;
  const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1;
  const prevYear = targetMonth === 1 ? year - 1 : year;
  const prevMonthName = MONTH_NAMES[prevMonth - 1];

  const prevNet = await calculateWalletMonthlyNet(walletId, prevMonth, prevYear);
  const deficit = prevNet < 0 ? Math.abs(prevNet) : 0;
  const surplus = await calculateWalletCarryoverSurplus(walletId, targetMonth, year);

  return {
    deficit,
    surplus,
    prevMonthName,
    isPersonal,
  };
}

export async function updateWalletCarryoverSettings(
  walletId: string,
  carryoverMode: "NONE" | "NEXT_MONTH" | "TARGET_WALLET",
  carryoverTargetWalletId?: string
) {
  await requireWalletAccess(walletId, "OWNER");

  await db.wallet.update({
    where: { id: walletId },
    data: {
      carryoverMode,
      carryoverTargetWalletId: carryoverMode === "TARGET_WALLET" ? (carryoverTargetWalletId || null) : null,
    },
  });

  revalidatePath("/");
}

export async function getDashboardData(walletId: string, month: number, year: number) {
  const { userRole } = await requireWalletAccess(walletId, "READ_ONLY");

  const targetM = month === 0 ? new Date().getMonth() + 1 : month;
  const processedWhere: any = { walletId, year };
  if (month > 0) processedWhere.month = month;

  const [revenues, recurring, installments, transactions, envelopes, processed, overrides, prevMonthCarryoverInfo, rawTransfersSent, rawTransfersReceived, wishlistItems] = await Promise.all([
    getRevenues(walletId, month, year),
    getRecurringExpenses(walletId, month, year),
    getInstallments(walletId, month, year),
    getTransactions(walletId, month, year),
    getBudgets(walletId, month, year),
    db.processedPayment.findMany({ where: processedWhere }),
    db.expenseOverride.findMany({ where: { walletId, year } }),
    getPreviousMonthCarryover(walletId, month, year),
    db.walletTransfer.findMany({
      where: { sourceWalletId: walletId },
      include: {
        targetWallet: { select: { id: true, name: true } },
        createdBy: { select: { name: true, email: true } },
      },
    }),
    db.walletTransfer.findMany({
      where: { targetWalletId: walletId },
      include: {
        sourceWallet: { select: { id: true, name: true } },
        createdBy: { select: { name: true, email: true } },
      },
    }),
    getWishlistItems(walletId),
  ]);

  const transfersSent = rawTransfersSent.filter((t) => {
    if (!t.isRecurring) {
      return t.month === targetM && t.year === year;
    }
    return t.year < year || (t.year === year && (targetM === 0 || t.month <= targetM));
  });

  const transfersReceived = rawTransfersReceived.filter((t) => {
    if (!t.isRecurring) {
      return t.month === targetM && t.year === year;
    }
    return t.year < year || (t.year === year && (targetM === 0 || t.month <= targetM));
  });

  const manualDeficitOv = overrides.find(
    (o) => o.paymentId === "PREV_DEFICIT" && o.type === "DEFICIT" && o.month === targetM
  );

  let previousMonthDeficit = 0;
  let previousMonthSurplus = prevMonthCarryoverInfo.surplus;
  let prevMonthLabel = prevMonthCarryoverInfo.prevMonthName;
  let isPersonalWallet = prevMonthCarryoverInfo.isPersonal;
  let hasManualDeficit = false;

  if (manualDeficitOv) {
    previousMonthDeficit = manualDeficitOv.amount ?? 0;
    hasManualDeficit = true;
  } else {
    previousMonthDeficit = prevMonthCarryoverInfo.deficit;
  }

  // Appliquer les ajustements ponctuels (overrides) sur les revenus
  const revenuesWithOverrides = revenues.map((r) => {
    const ov = overrides.find(
      (o) => o.paymentId === r.id && o.type === "REVENUE" && (month === 0 || o.month === month)
    );
    const isDisabled = ov ? (ov.isDisabled || ov.amount === 0) : false;
    const overrideAmount = (ov && ov.amount !== null && ov.amount !== undefined && ov.amount > 0) ? ov.amount : r.amount;
    const amount = isDisabled ? 0 : overrideAmount;
    return {
      ...r,
      amount,
      overrideAmount,
      originalAmount: r.amount,
      isDisabled,
      hasOverride: !!ov,
      processed: processed.some((p) => p.paymentId === r.id && p.type === "REVENUE"),
    };
  });

  // Appliquer les ajustements ponctuels (overrides) sur les charges récurrentes
  const recurringWithOverrides = recurring.map((r) => {
    const ov = overrides.find(
      (o) => o.paymentId === r.id && o.type === "RECURRING" && (month === 0 || o.month === month)
    );
    const isDisabled = ov ? (ov.isDisabled || ov.amount === 0) : false;
    const overrideAmount = (ov && ov.amount !== null && ov.amount !== undefined && ov.amount > 0) ? ov.amount : r.amount;
    const amount = isDisabled ? 0 : overrideAmount;
    return {
      ...r,
      amount,
      overrideAmount,
      originalAmount: r.amount,
      isDisabled,
      hasOverride: !!ov,
      processed: processed.some((p) => p.paymentId === r.id && p.type === "RECURRING"),
    };
  });

  // Helper pour distinguer un Crédit d'un Paiement Fractionné
  const isCreditCategory = (cat: string) => {
    const c = (cat || "").toLowerCase();
    return (
      c.includes("crédit") ||
      c.includes("credit") ||
      c.includes("prêt") ||
      c.includes("pret") ||
      c.includes("emprunt") ||
      c.includes("immo") ||
      c.includes("auto") ||
      c.includes("banque")
    );
  };

  // Appliquer les ajustements ponctuels (overrides) sur les crédits / paiements fractionnés
  const installmentsWithOverrides = installments.map((i) => {
    const ov = overrides.find(
      (o) => o.paymentId === i.id && o.type === "INSTALLMENT" && (targetM === 0 || o.month === targetM)
    );
    const isDisabled = ov ? (ov.isDisabled || ov.amount === 0) : false;
    const overrideAmount = (ov && ov.amount !== null && ov.amount !== undefined && ov.amount > 0) ? ov.amount : i.amount;
    const amount = isDisabled ? 0 : overrideAmount;
    const isCredit = isCreditCategory(i.category);
    
    const totalMonths = Math.max(1, (i.endYear - i.startYear) * 12 + (i.endMonth - i.startMonth) + 1);
    
    // Mois visé pour le calcul du restant (si "Tous les mois" (0) est sélectionné, on prend le mois actuel)
    const currentM = targetM === 0 ? new Date().getMonth() + 1 : targetM;
    const currentY = year;

    let remainingMonths = 0;
    if (currentY < i.startYear || (currentY === i.startYear && currentM < i.startMonth)) {
      // Pas encore commencé -> 100% du crédit reste à payer
      remainingMonths = totalMonths;
    } else if (currentY > i.endYear || (currentY === i.endYear && currentM > i.endMonth)) {
      // Déjà entièrement remboursé -> 0 € restant
      remainingMonths = 0;
    } else {
      // En cours de remboursement -> Mois restants du mois courant jusqu'au mois de fin inclus
      remainingMonths = (i.endYear - currentY) * 12 + (i.endMonth - currentM) + 1;
    }

    remainingMonths = Math.min(totalMonths, Math.max(0, remainingMonths));
    const elapsedMonths = totalMonths - remainingMonths;
    const paidAmount = elapsedMonths * amount;
    
    // Si totalAmount est spécifié et supérieur au montant payé, on déduit le payé du totalAmount, sinon remainingMonths * amount
    const remainingAmount = (i.totalAmount && i.totalAmount > paidAmount)
      ? Math.max(0, i.totalAmount - paidAmount)
      : remainingMonths * amount;

    return {
      ...i,
      amount,
      overrideAmount,
      originalAmount: i.amount,
      isDisabled,
      hasOverride: !!ov,
      processed: processed.some((p) => p.paymentId === i.id && p.type === "INSTALLMENT"),
      isCredit,
      totalMonths,
      remainingMonths,
      remainingAmount,
    };
  });

  // Calcul de la base pour les virements en pourcentage du portefeuille source
  const totalEnvelopeLimits = envelopes.reduce((acc, e) => acc + (e.limitAmount > 0 ? e.limitAmount : 0), 0);
  const rawRevenuesTotal = revenuesWithOverrides.reduce((acc, r) => acc + r.amount, 0);
  const rawFixedTotal = recurringWithOverrides.reduce((acc, r) => acc + r.amount, 0) + installmentsWithOverrides.reduce((acc, i) => acc + i.amount, 0);
  const transferBase = Math.max(0, rawRevenuesTotal - rawFixedTotal - totalEnvelopeLimits);

  const transfersSentWithProcessed = transfersSent.map((t) => {
    const ov = overrides.find(
      (o) => o.paymentId === t.id && o.type === "TRANSFER" && (targetM === 0 || o.month === targetM)
    );
    const isDisabled = ov ? (ov.isDisabled || ov.amount === 0) : false;
    const overrideAmount = (ov && ov.amount !== null && ov.amount !== undefined && ov.amount > 0) ? ov.amount : t.amount;

    const baseAmount = ((overrideAmount === 0 || overrideAmount === null) && t.isPercentage && t.percentage && t.percentage > 0)
      ? Math.round((t.percentage / 100) * transferBase * 100) / 100
      : overrideAmount;

    const effectiveAmount = isDisabled ? 0 : baseAmount;

    return {
      ...t,
      amount: effectiveAmount,
      originalAmount: t.amount,
      overrideAmount,
      isDisabled,
      hasOverride: !!ov,
      calculatedBase: transferBase,
      processed: processed.some((p) => p.paymentId === t.id && p.type === "TRANSFER"),
    };
  });

  const transfersReceivedWithProcessed = await Promise.all(
    transfersReceived.map(async (t) => {
      let effectiveAmount = t.amount;
      if ((effectiveAmount === 0 || effectiveAmount === null) && t.isPercentage && t.percentage && t.percentage > 0) {
        const [sRevenues, sRecurring, sInstallments, sEnvelopes, sOverrides] = await Promise.all([
          getRevenues(t.sourceWalletId, targetM, year),
          getRecurringExpenses(t.sourceWalletId, targetM, year),
          getInstallments(t.sourceWalletId, targetM, year),
          getBudgets(t.sourceWalletId, targetM, year),
          db.expenseOverride.findMany({ where: { walletId: t.sourceWalletId, year } }),
        ]);

        const sRevTotal = sRevenues.reduce((acc, r) => {
          const ov = sOverrides.find((o) => o.paymentId === r.id && o.type === "REVENUE" && (targetM === 0 || o.month === targetM));
          return acc + getEffectiveOverrideAmount(r.amount, ov);
        }, 0);

        const sRecTotal = sRecurring.reduce((acc, r) => {
          const ov = sOverrides.find((o) => o.paymentId === r.id && o.type === "RECURRING" && (targetM === 0 || o.month === targetM));
          return acc + getEffectiveOverrideAmount(r.amount, ov);
        }, 0);

        const sInstTotal = sInstallments.reduce((acc, i) => {
          const ov = sOverrides.find((o) => o.paymentId === i.id && o.type === "INSTALLMENT" && (targetM === 0 || o.month === targetM));
          return acc + getEffectiveOverrideAmount(i.amount, ov);
        }, 0);

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
  const totalInstallments = installmentsWithOverrides.reduce((acc, i) => acc + i.amount, 0);
  const totalTransactions = transactions.reduce((acc, t) => acc + t.amount, 0);

  const creditsList = installmentsWithOverrides.filter((i) => i.isCredit);
  const fractionalList = installmentsWithOverrides.filter((i) => !i.isCredit);

  const totalCredits = creditsList.reduce((acc, i) => acc + i.amount, 0);
  const totalFractional = fractionalList.reduce((acc, i) => acc + i.amount, 0);
  const totalCreditsRemaining = creditsList.reduce((acc, i) => acc + i.remainingAmount, 0);
  const totalFractionalRemaining = fractionalList.reduce((acc, i) => acc + i.remainingAmount, 0);

  const fixedExpenses = totalRecurring + totalInstallments;
  const restToLive = totalRevenues - fixedExpenses - totalTransfersSent;
  const totalExpenses = fixedExpenses + totalTransfersSent + totalTransactions;

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

  const pointedInstallments = installmentsWithOverrides
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

  const [allWalletRecurring, allWalletTransactions, allWalletEnvelopes, allWalletInstallments, allWalletWishlist] = await Promise.all([
    db.recurringExpense.findMany({ where: { walletId }, select: { category: true } }),
    db.transaction.findMany({ where: { walletId }, select: { category: true } }),
    db.budgetEnvelope.findMany({ where: { walletId }, select: { category: true, color: true } }),
    db.installmentPayment.findMany({ where: { walletId }, select: { category: true } }),
    db.wishlistItem.findMany({ where: { walletId }, select: { category: true } }),
  ]);

  const categorySet = new Set<string>();
  allWalletRecurring.forEach((r) => r.category && categorySet.add(r.category.trim()));
  allWalletTransactions.forEach((t) => t.category && categorySet.add(t.category.trim()));
  allWalletEnvelopes.forEach((e) => e.category && categorySet.add(e.category.trim()));
  allWalletInstallments.forEach((i) => i.category && categorySet.add(i.category.trim()));
  allWalletWishlist.forEach((w) => w.category && categorySet.add(w.category.trim()));

  const EXCLUDED_SYSTEM_CATEGORIES = [
    "crédit",
    "credit",
    "crédits",
    "credits",
    "paiement échelonné",
    "paiement echelonne",
    "paiements échelonnés",
    "échéance",
    "echeance",
  ];

  const categories = Array.from(categorySet)
    .filter((cat) => !EXCLUDED_SYSTEM_CATEGORIES.includes(cat.trim().toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  const envelopeCategoriesList = categories;

  const PRESET_COLORS_LIST = [
    "teal", "blue", "violet", "indigo", "grape", "pink", "red", "orange",
    "yellow", "lime", "green", "cyan", "gray", "#e64980", "#d63384",
    "#be4bdb", "#7950f2", "#4c6ef5", "#339af0", "#12b886", "#20c997",
    "#51cf66", "#82c91e", "#fab005", "#e8590c", "#ff6b6b", "#f783ac"
  ];

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

  // Réservation du reliquat des plafonds d'enveloppes uniquement si non dépassé
  const unspentEnvelopeLimits = envelopeStats.reduce((acc, env) => {
    if (env.hasLimit && env.spent < env.limitAmount) {
      return acc + (env.limitAmount - env.spent);
    }
    return acc;
  }, 0);

  const netSavings = totalRevenues - fixedExpenses - totalTransactions - unspentEnvelopeLimits - totalTransfersSent - previousMonthDeficit + previousMonthSurplus;

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
      totalCredits,
      totalFractional,
      totalCreditsRemaining,
      totalFractionalRemaining,
      totalTransfersSent,
      fixedExpenses,
      restToLive,
      totalTransactions,
      totalExpenses,
      unspentEnvelopeLimits,
      netSavings,
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
    installments: installmentsWithOverrides,
    transfersSent: transfersSentWithProcessed,
    transfersReceived: transfersReceivedWithProcessed,
    wishlistItems,
  };
}

/* ==========================================================================
   WISHLIST / LISTE D'ACHAT
   ========================================================================== */

export async function getWishlistItems(walletId: string) {
  await requireWalletAccess(walletId, "READ_ONLY");

  const items = await db.wishlistItem.findMany({
    where: { walletId },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: [
      { status: "asc" },
      { createdAt: "desc" },
    ],
  });

  return items.map((i) => ({
    ...i,
    creatorName: i.createdBy.name || i.createdBy.email.split("@")[0],
  }));
}

export async function createWishlistItem(
  walletId: string,
  data: {
    title: string;
    amount: number;
    url?: string;
    category?: string;
    notes?: string;
    priority?: string;
  }
) {
  const { userId } = await requireWalletAccess(walletId, "FULL_ACCESS");

  const item = await db.wishlistItem.create({
    data: {
      walletId,
      createdById: userId,
      title: data.title.trim(),
      amount: data.amount,
      url: data.url ? data.url.trim() : null,
      category: data.category || "Général",
      notes: data.notes ? data.notes.trim() : null,
      priority: data.priority || "NORMAL",
      status: "PENDING",
    },
  });

  revalidatePath("/");
  return item;
}

export async function updateWishlistItem(
  walletId: string,
  itemId: string,
  data: Partial<{
    title: string;
    amount: number;
    url?: string;
    category?: string;
    notes?: string;
    priority?: string;
    status?: string;
  }>
) {
  await requireWalletAccess(walletId, "FULL_ACCESS");

  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title.trim();
  if (data.amount !== undefined) updateData.amount = data.amount;
  if (data.url !== undefined) updateData.url = data.url ? data.url.trim() : null;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.notes !== undefined) updateData.notes = data.notes ? data.notes.trim() : null;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.status !== undefined) {
    updateData.status = data.status;
    if (data.status === "PURCHASED") {
      updateData.purchasedAt = new Date();
    }
  }

  const updated = await db.wishlistItem.update({
    where: { id: itemId },
    data: updateData,
  });

  revalidatePath("/");
  return updated;
}

export async function deleteWishlistItem(walletId: string, itemId: string) {
  await requireWalletAccess(walletId, "FULL_ACCESS");

  await db.wishlistItem.delete({
    where: { id: itemId },
  });

  revalidatePath("/");
}

export async function convertWishlistItemToTransaction(
  sourceWalletId: string,
  itemId: string,
  data: {
    targetWalletId: string;
    day: number;
    month: number;
    year: number;
    amount: number;
    category: string;
  }
) {
  const { userId } = await requireWalletAccess(data.targetWalletId, "FULL_ACCESS");

  const wishlistItem = await db.wishlistItem.findUnique({ where: { id: itemId } });
  if (!wishlistItem) throw new Error("Élément de la liste d'achat non trouvé.");

  await db.$transaction([
    db.transaction.create({
      data: {
        walletId: data.targetWalletId,
        title: wishlistItem.title,
        amount: data.amount,
        category: data.category || wishlistItem.category || "Général",
        day: data.day,
        month: data.month,
        year: data.year,
      },
    }),
    db.wishlistItem.delete({
      where: { id: itemId },
    }),
  ]);

  revalidatePath("/");
}

export async function convertWishlistItemToInstallment(
  sourceWalletId: string,
  itemId: string,
  data: {
    targetWalletId: string;
    amount: number;
    totalMonths: number;
    startMonth: number;
    startYear: number;
    dayOfMonth: number;
    category: string;
  }
) {
  await requireWalletAccess(data.targetWalletId, "FULL_ACCESS");

  const wishlistItem = await db.wishlistItem.findUnique({ where: { id: itemId } });
  if (!wishlistItem) throw new Error("Élément de la liste d'achat non trouvé.");

  let endMonth = data.startMonth + data.totalMonths - 1;
  let endYear = data.startYear;
  while (endMonth > 12) {
    endMonth -= 12;
    endYear += 1;
  }

  await db.$transaction([
    db.installmentPayment.create({
      data: {
        walletId: data.targetWalletId,
        title: wishlistItem.title,
        amount: data.amount,
        totalAmount: data.amount * data.totalMonths,
        category: data.category || wishlistItem.category || "Général",
        color: "violet",
        dayOfMonth: data.dayOfMonth,
        startMonth: data.startMonth,
        startYear: data.startYear,
        endMonth,
        endYear,
      },
    }),
    db.wishlistItem.delete({
      where: { id: itemId },
    }),
  ]);

  revalidatePath("/");
}
