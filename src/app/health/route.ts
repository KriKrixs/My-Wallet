import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import net from "net";
import tls from "tls";
import { URL } from "url";

export const dynamic = "force-dynamic";

async function checkLdapReachability(ldapUrlStr: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const parsed = new URL(ldapUrlStr);
    const host = parsed.hostname;
    const isLdaps = parsed.protocol === "ldaps:";
    const defaultPort = isLdaps ? 636 : 389;
    const port = parsed.port ? parseInt(parsed.port, 10) : defaultPort;

    return new Promise((resolve) => {
      const timeout = 3000;
      let socket: net.Socket;

      if (isLdaps) {
        socket = tls.connect(port, host, { rejectUnauthorized: false, timeout }, () => {
          socket.destroy();
          resolve({ ok: true });
        });
      } else {
        socket = net.createConnection({ host, port, timeout }, () => {
          socket.destroy();
          resolve({ ok: true });
        });
      }

      socket.on("timeout", () => {
        socket.destroy();
        resolve({ ok: false, error: `Timeout de connexion au serveur AD (${host}:${port})` });
      });

      socket.on("error", (err) => {
        socket.destroy();
        resolve({ ok: false, error: err.message || `Impossible de se connecter au serveur AD (${host}:${port})` });
      });
    });
  } catch (err: any) {
    return { ok: false, error: err.message || "URL LDAP invalide" };
  }
}

async function checkOidcIssuer(issuer: string): Promise<{ ok: boolean; error?: string }> {
  const discoveryUrl = `${issuer.trim().replace(/\/+$/, "")}/.well-known/openid-configuration`;
  const timeout = 3000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(discoveryUrl, {
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (res.status !== 200) {
      return { ok: false, error: `Émetteur OIDC injoignable : HTTP ${res.status} sur ${discoveryUrl}` };
    }

    let body: unknown;
    try {
      body = await res.json();
    } catch {
      return { ok: false, error: `Réponse OIDC invalide (JSON attendu) sur ${discoveryUrl}` };
    }

    if (!body || typeof body !== "object" || !("issuer" in body) || !(body as { issuer?: unknown }).issuer) {
      return { ok: false, error: `Configuration OIDC invalide (champ "issuer" absent) sur ${discoveryUrl}` };
    }

    return { ok: true };
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return { ok: false, error: `Timeout (${timeout} ms) lors de l'appel à l'émetteur OIDC ${discoveryUrl}` };
    }
    const cause = err?.cause?.message || err?.cause?.code || err?.message || "erreur inconnue";
    return { ok: false, error: `Impossible de joindre l'émetteur OIDC ${discoveryUrl} : ${cause}` };
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  const timestamp = new Date().toISOString();
  let dbStatus: { status: "ok" | "error"; error?: string } = { status: "ok" };
  let ldapStatus: { enabled: boolean; status: "ok" | "error" | "disabled"; error?: string } = {
    enabled: false,
    status: "disabled",
  };

  let isHealthy = true;

  // 1. Vérification de la connexion PostgreSQL
  try {
    await db.$queryRaw`SELECT 1`;
  } catch (err: any) {
    isHealthy = false;
    dbStatus = {
      status: "error",
      error: err.message || "Erreur de connexion à la base de données PostgreSQL",
    };
  }

  // 2. Vérification d'Active Directory / LDAP (si activé)
  const isLdapEnabled =
    process.env.NEXT_PUBLIC_LDAP_ENABLED === "true" ||
    process.env.LDAP_ENABLED === "true" ||
    Boolean(process.env.LDAP_URL && process.env.LDAP_URL.trim() !== "");

  if (isLdapEnabled) {
    const ldapUrl = process.env.LDAP_URL;
    if (!ldapUrl) {
      isHealthy = false;
      ldapStatus = {
        enabled: true,
        status: "error",
        error: "LDAP est activé mais LDAP_URL n'est pas renseigné.",
      };
    } else {
      const ldapCheck = await checkLdapReachability(ldapUrl);
      if (!ldapCheck.ok) {
        isHealthy = false;
        ldapStatus = {
          enabled: true,
          status: "error",
          error: ldapCheck.error,
        };
      } else {
        ldapStatus = {
          enabled: true,
          status: "ok",
        };
      }
    }
  }

  // 3. Vérification OIDC / Authentik (si activé)
  const modeEnv = (process.env.AUTH_MODE || process.env.NEXT_PUBLIC_AUTH_MODE || "").trim().toUpperCase();
  const isOidcEnabled =
    modeEnv === "OIDC" ||
    process.env.NEXT_PUBLIC_OIDC_ENABLED === "true" ||
    process.env.OIDC_ENABLED === "true" ||
    Boolean(process.env.OIDC_ISSUER && process.env.OIDC_CLIENT_ID);

  let oidcStatus: { enabled: boolean; status: "ok" | "error" | "disabled"; error?: string } = {
    enabled: false,
    status: "disabled",
  };

  if (isOidcEnabled) {
    const oidcIssuer = process.env.OIDC_ISSUER;
    if (!oidcIssuer) {
      isHealthy = false;
      oidcStatus = {
        enabled: true,
        status: "error",
        error: "OIDC est activé mais OIDC_ISSUER n'est pas renseigné.",
      };
    } else {
      const oidcCheck = await checkOidcIssuer(oidcIssuer);
      if (!oidcCheck.ok) {
        isHealthy = false;
        oidcStatus = {
          enabled: true,
          status: "error",
          error: oidcCheck.error,
        };
      } else {
        oidcStatus = {
          enabled: true,
          status: "ok",
        };
      }
    }
  }

  const responsePayload = {
    status: isHealthy ? "ok" : "error",
    timestamp,
    database: dbStatus,
    ldap: ldapStatus,
    oidc: oidcStatus,
  };

  return NextResponse.json(responsePayload, {
    status: isHealthy ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
