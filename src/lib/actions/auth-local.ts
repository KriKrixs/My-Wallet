"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export async function registerLocalUser(data: {
  name: string;
  email: string;
  password: string;
}) {
  const name = data.name.trim();
  const email = data.email.trim().toLowerCase();
  const password = data.password;

  if (!name) {
    throw new Error("Le nom d'utilisateur est obligatoire.");
  }
  if (!email || !email.includes("@")) {
    throw new Error("Veuillez fournir une adresse e-mail valide.");
  }
  if (!password || password.length < 6) {
    throw new Error("Le mot de passe doit contenir au moins 6 caractères.");
  }

  // Vérifier si l'utilisateur existe déjà
  const existing = await db.user.findUnique({
    where: { email },
  });

  if (existing) {
    throw new Error("Un compte avec cette adresse e-mail existe déjà.");
  }

  // Hashage du mot de passe
  const hashedPassword = await bcrypt.hash(password, 10);

  // Création du compte utilisateur et de son portefeuille personnel initial
  const user = await db.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: "USER",
    },
  });

  await db.wallet.create({
    data: {
      name: "Portefeuille Personnel",
      isPersonal: true,
      ownerId: user.id,
      users: {
        create: {
          userId: user.id,
          role: "OWNER",
        },
      },
    },
  });

  return { success: true, user: { id: user.id, name: user.name, email: user.email } };
}
