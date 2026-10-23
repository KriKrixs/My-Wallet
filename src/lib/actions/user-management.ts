"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as any;
  if (!sessionUser?.id) throw new Error("Non autorisé");

  const dbUser = await db.user.findUnique({ where: { id: sessionUser.id } });
  if (!dbUser || dbUser.role !== "ADMIN") {
    throw new Error("Accès réservé aux administrateurs.");
  }
  return sessionUser;
}

export async function getAllUsersForAdmin() {
  await requireAdmin();

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      accounts: {
        select: { provider: true },
      },
      passkeys: {
        select: { id: true },
      },
      wallets: {
        select: { walletId: true, role: true },
      },
    },
  });

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
    hasPassword: Boolean(u.password),
    passkeyCount: u.passkeys.length,
    walletCount: u.wallets.length,
    providers: Array.from(new Set(u.accounts.map((a) => a.provider))),
  }));
}

export async function updateUserRoleAdmin(targetUserId: string, newRole: "ADMIN" | "USER") {
  const adminUser = await requireAdmin();

  if (targetUserId === adminUser.id && newRole !== "ADMIN") {
    throw new Error("Vous ne pouvez pas retirer vos propres droits d'administration.");
  }

  await db.user.update({
    where: { id: targetUserId },
    data: { role: newRole },
  });

  return { success: true };
}

export async function updateUserByAdmin(targetUserId: string, data: { name?: string; email?: string; password?: string }) {
  await requireAdmin();

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.email !== undefined) {
    const emailLower = data.email.trim().toLowerCase();
    if (!emailLower) throw new Error("L'adresse e-mail ne peut pas être vide.");

    const existing = await db.user.findUnique({ where: { email: emailLower } });
    if (existing && existing.id !== targetUserId) {
      throw new Error("Cette adresse e-mail est déjà utilisée par un autre compte.");
    }
    updateData.email = emailLower;
  }
  if (data.password !== undefined && data.password.trim() !== "") {
    if (data.password.length < 6) {
      throw new Error("Le mot de passe doit contenir au moins 6 caractères.");
    }
    updateData.password = await bcrypt.hash(data.password, 10);
  }

  await db.user.update({
    where: { id: targetUserId },
    data: updateData,
  });

  return { success: true };
}

export async function updateOwnProfile(data: { name?: string; email?: string }) {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as any;
  if (!sessionUser?.id) throw new Error("Non autorisé");

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.email !== undefined) {
    const emailLower = data.email.trim().toLowerCase();
    if (!emailLower) throw new Error("L'adresse e-mail ne peut pas être vide.");

    const existing = await db.user.findUnique({ where: { email: emailLower } });
    if (existing && existing.id !== sessionUser.id) {
      throw new Error("Cette adresse e-mail est déjà utilisée par un autre compte.");
    }
    updateData.email = emailLower;
  }

  const updatedUser = await db.user.update({
    where: { id: sessionUser.id },
    data: updateData,
  });

  return {
    success: true,
    user: {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
    },
  };
}

export async function deleteUserByAdmin(targetUserId: string) {
  const adminUser = await requireAdmin();

  if (targetUserId === adminUser.id) {
    throw new Error("Vous ne pouvez pas supprimer votre propre compte administrateur.");
  }

  const targetUser = await db.user.findUnique({
    where: { id: targetUserId },
  });

  if (!targetUser) {
    throw new Error("Utilisateur introuvable.");
  }

  await db.user.delete({
    where: { id: targetUserId },
  });

  const orphanWallets = await db.wallet.findMany({
    where: { ownerId: targetUserId },
    include: { users: true },
  });

  for (const w of orphanWallets) {
    if (w.users.length === 0) {
      await db.wallet.delete({ where: { id: w.id } });
    }
  }

  return { success: true };
}
