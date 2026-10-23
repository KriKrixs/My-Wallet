import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { authenticate } from "ldap-authentication";
import { db } from "@/lib/db";

function parseLdapError(error: any): string {
  const msg: string = error?.message || String(error);
  if (msg.includes("data 52e"))  return "Identifiant ou mot de passe incorrect.";
  if (msg.includes("data 532"))  return "Le mot de passe a expiré, veuillez le renouveler sur votre session Windows.";
  if (msg.includes("data 533"))  return "Ce compte Active Directory est désactivé.";
  if (msg.includes("data 701"))  return "Ce compte Active Directory a expiré.";
  if (msg.includes("data 775"))  return "Ce compte est verrouillé. Veuillez contacter votre administrateur.";
  if (msg.includes("data 773"))  return "Vous devez changer votre mot de passe lors de la prochaine connexion.";
  if (msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND") || msg.includes("ETIMEDOUT"))
    return "Impossible de joindre le serveur Active Directory. Vérifiez LDAP_URL dans votre configuration.";
  if (msg.includes("InvalidCredentialsError") || msg.includes("0x31"))
    return "Identifiant ou mot de passe incorrect.";
  return `Erreur LDAP : ${msg}`;
}

async function tryAuthenticate(opts: Record<string, any>): Promise<any> {
  return authenticate(opts as any);
}

async function authenticateAD(usernameInput: string, passwordInput: string): Promise<{ email: string; name: string } | never> {
  const ldapUrl = process.env.LDAP_URL;
  if (!ldapUrl) return { email: usernameInput, name: usernameInput.split("@")[0] };

  const domain = process.env.LDAP_DOMAIN || "";
  const sAMAccountName = usernameInput.split("@")[0];

  // Construire les variantes de l'identifiant à essayer pour le bind direct
  const upn = usernameInput.includes("@") ? usernameInput : domain ? `${usernameInput}@${domain}` : usernameInput;
  const netbios = domain ? `${domain.split(".")[0].toUpperCase()}\\${sAMAccountName}` : sAMAccountName;

  const baseDn = process.env.LDAP_BASE_DN || (domain ? `DC=${domain.split(".").join(",DC=")}` : "");
  const bindDn = process.env.LDAP_BIND_DN || "";
  const bindPassword = process.env.LDAP_BIND_PASSWORD || "";
  const usernameAttribute = process.env.LDAP_USERNAME_ATTRIBUTE || "sAMAccountName";

  const baseOpts: Record<string, any> = {
    ldapOpts: { url: ldapUrl },
    userPassword: passwordInput,
    userSearchBase: baseDn,
    usernameAttribute,
    username: sAMAccountName,
  };

  let lastError: any = null;

  if (bindDn && bindPassword) {
    // Flux avec compte de service (recommandé)
    try {
      const result = await tryAuthenticate({ ...baseOpts, adminDn: bindDn, adminPassword: bindPassword });
      const email = result?.mail || result?.userPrincipalName || upn;
      const name = result?.displayName || result?.cn || result?.name || sAMAccountName;
      return { email, name };
    } catch (err: any) {
      lastError = err;
      console.error("[LDAP] Bind avec compte de service échoué:", err?.message);
    }
  } else {
    // Flux sans compte de service : on essaie UPN puis NETBIOS\user
    const userDnVariants = [upn, netbios];
    for (const userDn of userDnVariants) {
      try {
        const result = await tryAuthenticate({ ...baseOpts, userDn });
        const email = result?.mail || result?.userPrincipalName || upn;
        const name = result?.displayName || result?.cn || result?.name || sAMAccountName;
        return { email, name };
      } catch (err: any) {
        lastError = err;
        console.error(`[LDAP] Bind direct avec userDn="${userDn}" échoué:`, err?.message);
      }
    }
  }

  throw new Error(parseLdapError(lastError));
}


import bcrypt from "bcryptjs";

const oidcIssuer = process.env.OIDC_ISSUER;
const oidcClientId = process.env.OIDC_CLIENT_ID;
const oidcClientSecret = process.env.OIDC_CLIENT_SECRET || "";
const oidcClientName = process.env.OIDC_CLIENT_NAME || "Authentik";

const oidcProvider = (oidcIssuer && oidcClientId) ? {
  id: "authentik",
  name: oidcClientName,
  type: "oauth" as const,
  wellKnown: oidcIssuer.endsWith("/") ? `${oidcIssuer}.well-known/openid-configuration` : `${oidcIssuer}/.well-known/openid-configuration`,
  authorization: { params: { scope: "openid email profile" } },
  idToken: true,
  checks: ["pkce" as const, "state" as const],
  clientId: oidcClientId,
  clientSecret: oidcClientSecret,
  profile(profile: any) {
    const adminGroups = (process.env.OIDC_ADMIN_GROUP || "mywallet_admins,admins,authentik Admins")
      .toLowerCase()
      .split(",")
      .map((g) => g.trim())
      .filter(Boolean);

    const rawGroups: string[] = Array.isArray(profile.groups)
      ? profile.groups
      : Array.isArray(profile["authentik:groups"])
      ? profile["authentik:groups"]
      : Array.isArray(profile.roles)
      ? profile.roles
      : [];

    const isAdminGroup = rawGroups.some((g: string) => adminGroups.includes(String(g).toLowerCase()));

    return {
      id: profile.sub,
      name: profile.name || profile.preferred_username || profile.nickname || profile.email?.split("@")[0],
      email: profile.email,
      image: profile.picture,
      isAdminGroup,
    };
  },
} : null;

export const authOptions: NextAuthOptions = {
  providers: [
    ...(oidcProvider ? [oidcProvider] : []),
    CredentialsProvider({
      id: "active-directory",
      name: "Connexion (LDAP ou Compte Local)",
      credentials: {
        username: { label: "Identifiant / E-mail", type: "text", placeholder: "utilisateur@domaine.local ou email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const usernameInput = credentials.username.trim();
        const passwordInput = credentials.password;
        const ldapUrl = process.env.LDAP_URL;
        const isLdapEnabled = process.env.NEXT_PUBLIC_LDAP_ENABLED === "true" || process.env.LDAP_ENABLED === "true" || Boolean(ldapUrl && ldapUrl.trim() !== "");

        // 1. Essayer d'abord l'authentification Active Directory / LDAP si configuré
        if (isLdapEnabled && ldapUrl) {
          try {
            const adUser = await authenticateAD(usernameInput, passwordInput);
            if (adUser) {
              let user = await db.user.findUnique({
                where: { email: adUser.email },
              });

              if (!user) {
                user = await db.user.create({
                  data: {
                    email: adUser.email,
                    name: adUser.name,
                    role: "USER",
                  },
                });
              }

              return {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
              };
            }
          } catch (err: any) {
            console.log("[AUTH] Tentative LDAP échouée, bascule vers vérification du compte local...", err?.message);
          }
        }

        // 2. Si LDAP est désactivé ou a échoué, vérifier le compte local dans PostgreSQL
        const localUser = await db.user.findUnique({
          where: { email: usernameInput.toLowerCase() },
        });

        if (localUser && localUser.password) {
          const isValid = await bcrypt.compare(passwordInput, localUser.password);
          if (isValid) {
            return {
              id: localUser.id,
              name: localUser.name,
              email: localUser.email,
              role: localUser.role,
            };
          }
        }

        // 3. Si aucun compte ne correspond
        throw new Error("Identifiant ou mot de passe incorrect.");
      },
    }),
    // Provider Passkey (WebAuthn)
    CredentialsProvider({
      id: "passkey",
      name: "Passkey",
      credentials: {
        credentialResponse: { label: "Credential Response", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.credentialResponse) return null;
        try {
          const parsed = JSON.parse(credentials.credentialResponse);
          const { verifyPasskeyAuthenticationServer } = await import("@/lib/actions/passkey");
          const result = await verifyPasskeyAuthenticationServer(parsed);
          if (result.success && result.user) {
            return {
              id: result.user.id,
              name: result.user.name,
              email: result.user.email,
              role: result.user.role,
            };
          }
          throw new Error(result.error || "Authentification Passkey échouée.");
        } catch (err: any) {
          throw new Error(err?.message || "Erreur de connexion par Passkey.");
        }
      },
    }),
    // Mode développement local : connexion rapide sans serveur LDAP
    CredentialsProvider({
      id: "dev-login",
      name: "Dev Login (local)",
      credentials: {
        email: { label: "Email", type: "email" },
        name: { label: "Nom", type: "text" },
        role: { label: "Role", type: "text" },
      },
      async authorize(credentials) {
        const isDevLoginEnabled =
          process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN !== undefined && process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN !== ""
            ? process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === "true"
            : process.env.NODE_ENV === "development";

        if (!isDevLoginEnabled) {
          throw new Error("Mode de connexion de développement désactivé.");
        }
        if (!credentials?.email) return null;

        let user = await db.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          user = await db.user.create({
            data: {
              email: credentials.email,
              name: credentials.name || credentials.email.split("@")[0],
              role: credentials.role || "USER",
            },
          });
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account && (account.provider === "authentik" || account.provider === "oidc")) {
        if (!user.email) return false;
        const emailLower = user.email.toLowerCase();
        const isAdminGroup = (profile as any)?.isAdminGroup || (user as any)?.isAdminGroup || false;

        let dbUser = await db.user.findUnique({
          where: { email: emailLower },
        });

        if (!dbUser) {
          dbUser = await db.user.create({
            data: {
              email: emailLower,
              name: user.name || emailLower.split("@")[0],
              role: isAdminGroup ? "ADMIN" : "USER",
            },
          });
        } else {
          const updates: { role?: "ADMIN" | "USER"; name?: string } = {};
          if (isAdminGroup && dbUser.role !== "ADMIN") {
            updates.role = "ADMIN";
          }
          if (user.name && user.name.trim() !== "" && user.name !== dbUser.name) {
            updates.name = user.name.trim();
          }
          if (Object.keys(updates).length > 0) {
            dbUser = await db.user.update({
              where: { id: dbUser.id },
              data: updates,
            });
          }
        }

        try {
          const existingAccount = await db.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            },
          });

          if (!existingAccount) {
            await db.account.create({
              data: {
                userId: dbUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                refresh_token: account.refresh_token,
                access_token: account.access_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: account.session_state as string | null,
              },
            });
          }
        } catch (e) {
          console.error("[OIDC] Erreur lors de la liaison du compte:", e);
        }

        user.id = dbUser.id;
        user.name = dbUser.name;
        user.email = dbUser.email;
        // @ts-ignore
        user.role = dbUser.role;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // @ts-ignore
        token.role = user.role || "USER";

        const userWallets = await db.walletUser.findMany({
          where: { userId: user.id },
          include: { wallet: true },
        });

        // @ts-ignore
        token.wallets = userWallets.map((uw) => ({
          id: uw.wallet.id,
          name: uw.wallet.name,
          role: uw.role,
        }));

        const ownerWallet = userWallets.find((uw) => uw.role === "OWNER");
        // @ts-ignore
        token.activeWalletId = ownerWallet ? ownerWallet.walletId : userWallets[0]?.walletId || null;
      }
      return token;
    },
    async session({ session, token }) {
      const sessionUser = session.user as any;
      if (sessionUser) {
        sessionUser.id = token.id;
        sessionUser.role = token.role || "USER";
        // @ts-ignore
        sessionUser.wallets = token.wallets || [];
        // @ts-ignore
        sessionUser.activeWalletId = token.activeWalletId || null;
      }

      // Auto-provision : si l'utilisateur LDAP n'a pas encore de portefeuille, on en crée un.
      if (sessionUser?.email && (!sessionUser.wallets || sessionUser.wallets.length === 0)) {
        let user = await db.user.findUnique({
          where: { email: sessionUser.email },
          include: {
            wallets: {
              include: { wallet: true },
            },
          },
        });

        if (user && user.wallets.length > 0) {
          sessionUser.id = user.id;
          sessionUser.role = user.role;
          sessionUser.wallets = user.wallets.map((uw) => ({
            id: uw.wallet.id,
            name: uw.wallet.name,
            role: uw.role,
          }));
          const ownerWallet = user.wallets.find((uw) => uw.role === "OWNER");
          sessionUser.activeWalletId = ownerWallet ? ownerWallet.walletId : user.wallets[0]?.walletId || null;
        } else {
          const targetUser =
            user ||
            (await db.user.create({
              data: {
                email: sessionUser.email,
                name: sessionUser.name || sessionUser.email.split("@")[0],
                role: "USER",
              },
            }));

          const newWallet = await db.wallet.create({
            data: {
              name: "Portefeuille Personnel",
              isPersonal: true,
              ownerId: targetUser.id,
              users: {
                create: {
                  userId: targetUser.id,
                  role: "OWNER",
                },
              },
            },
          });
          sessionUser.id = targetUser.id;
          sessionUser.role = targetUser.role;
          sessionUser.wallets = [{ id: newWallet.id, name: newWallet.name, role: "OWNER", isPersonal: true }];
          sessionUser.activeWalletId = newWallet.id;
        }
      }

      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "super-secret-key-mywallet-2026",
};
