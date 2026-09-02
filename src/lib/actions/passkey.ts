"use server";

import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from "@simplewebauthn/server";
import type { AuthenticatorTransport } from "@simplewebauthn/server";
import { cookies, headers } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

async function getRpIDAndOrigin() {
  const headerList = await headers();
  const host = headerList.get("host") || "localhost:3000";
  const hostname = host.split(":")[0];
  const proto = headerList.get("x-forwarded-proto") || (host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https");
  const origin = `${proto}://${host}`;
  const rpID = process.env.RP_ID || hostname;
  return { rpID, origin };
}

export async function getUserPasskeys() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as any;
  if (!sessionUser?.id) return [];

  const passkeys = await db.passkey.findMany({
    where: { userId: sessionUser.id },
    orderBy: { createdAt: "desc" },
  });

  return passkeys.map((p) => ({
    id: p.id,
    name: p.name,
    credentialId: p.credentialId,
    transports: p.transports,
    createdAt: p.createdAt.toISOString(),
  }));
}

export async function deletePasskey(passkeyId: string) {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as any;
  if (!sessionUser?.id) throw new Error("Non autorisé");

  await db.passkey.deleteMany({
    where: { id: passkeyId, userId: sessionUser.id },
  });

  return { success: true };
}

export async function renamePasskey(passkeyId: string, newName: string) {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as any;
  if (!sessionUser?.id) throw new Error("Non autorisé");

  const trimmed = newName.trim();
  if (!trimmed) throw new Error("Le nom de la clé ne peut pas être vide.");

  await db.passkey.updateMany({
    where: { id: passkeyId, userId: sessionUser.id },
    data: { name: trimmed },
  });

  return { success: true };
}

export async function generatePasskeyRegistrationOptionsAction(customName?: string) {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as any;
  if (!sessionUser?.id) throw new Error("Non autorisé");

  const { rpID } = await getRpIDAndOrigin();

  const userPasskeys = await db.passkey.findMany({
    where: { userId: sessionUser.id },
  });

  const options = await generateRegistrationOptions({
    rpName: "MyWallet",
    rpID,
    userID: Buffer.from(sessionUser.id),
    userName: sessionUser.email,
    userDisplayName: sessionUser.name || sessionUser.email,
    attestationType: "none",
    timeout: 600000, // 10 minutes pour laisser le temps aux gestionnaires comme Bitwarden
    excludeCredentials: userPasskeys.map((pk) => ({
      id: pk.credentialId,
      transports: pk.transports ? (pk.transports.split(",") as AuthenticatorTransport[]) : undefined,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  const cookieStore = await cookies();
  cookieStore.set("passkey_reg_challenge", options.challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 900, // 15 minutes
    path: "/",
  });

  return options;
}

export async function verifyPasskeyRegistrationAction(response: any, customName?: string) {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as any;
  if (!sessionUser?.id) throw new Error("Non autorisé");

  const { rpID, origin } = await getRpIDAndOrigin();
  const cookieStore = await cookies();
  const expectedChallenge = cookieStore.get("passkey_reg_challenge")?.value;

  if (!expectedChallenge) {
    throw new Error("Challenge expiré ou introuvable. Réessayez.");
  }

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("La vérification de la Passkey a échoué.");
  }

  const { credential } = verification.registrationInfo;

  await db.passkey.create({
    data: {
      name: customName?.trim() || "Ma Clé de Sécurité",
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64"),
      counter: BigInt(credential.counter),
      transports: credential.transports ? credential.transports.join(",") : null,
      userId: sessionUser.id,
    },
  });

  cookieStore.delete("passkey_reg_challenge");

  return { success: true };
}

export async function generatePasskeyAuthenticationOptionsAction(emailInput?: string) {
  const { rpID } = await getRpIDAndOrigin();

  let allowCredentials: { id: string; transports?: AuthenticatorTransport[] }[] = [];

  if (emailInput && emailInput.trim()) {
    const userPasskeys = await db.passkey.findMany({
      where: { user: { email: emailInput.trim().toLowerCase() } },
    });
    allowCredentials = userPasskeys.map((pk) => ({
      id: pk.credentialId,
      transports: pk.transports ? (pk.transports.split(",") as AuthenticatorTransport[]) : undefined,
    }));
  }

  const options = await generateAuthenticationOptions({
    rpID,
    timeout: 600000, // 10 minutes pour laisser le temps aux gestionnaires comme Bitwarden
    userVerification: "preferred",
    allowCredentials,
  });

  const cookieStore = await cookies();
  cookieStore.set("passkey_auth_challenge", options.challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 900, // 15 minutes
    path: "/",
  });

  return options;
}

export async function verifyPasskeyAuthenticationServer(response: any) {
  const { rpID, origin } = await getRpIDAndOrigin();
  const cookieStore = await cookies();
  const expectedChallenge = cookieStore.get("passkey_auth_challenge")?.value;

  if (!expectedChallenge) {
    return { success: false, error: "Challenge de connexion expiré ou invalide." };
  }

  const passkey = await db.passkey.findUnique({
    where: { credentialId: response.id },
    include: { user: true },
  });

  if (!passkey) {
    return { success: false, error: "Clé de sécurité / Passkey non reconnue." };
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: passkey.credentialId,
      publicKey: Buffer.from(passkey.publicKey, "base64"),
      counter: Number(passkey.counter),
      transports: passkey.transports ? (passkey.transports.split(",") as AuthenticatorTransport[]) : undefined,
    },
  });

  if (!verification.verified || !verification.authenticationInfo) {
    return { success: false, error: "Authentification par Passkey refusée." };
  }

  await db.passkey.update({
    where: { id: passkey.id },
    data: {
      counter: BigInt(verification.authenticationInfo.newCounter),
    },
  });

  cookieStore.delete("passkey_auth_challenge");

  return {
    success: true,
    user: {
      id: passkey.user.id,
      name: passkey.user.name,
      email: passkey.user.email,
      role: passkey.user.role,
    },
  };
}
