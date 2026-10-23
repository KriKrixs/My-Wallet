"use server";

export type AuthMode = "OIDC" | "LDAP" | "LOCAL";

export async function getAuthModeServerAction(): Promise<{
  mode: AuthMode;
  oidcClientName: string;
  isOidcEnabled: boolean;
  isLdapEnabled: boolean;
}> {
  const modeEnv = (process.env.AUTH_MODE || process.env.NEXT_PUBLIC_AUTH_MODE || "").trim().toUpperCase();

  const isOidcEnabled =
    modeEnv === "OIDC" ||
    process.env.NEXT_PUBLIC_OIDC_ENABLED === "true" ||
    process.env.OIDC_ENABLED === "true" ||
    Boolean(process.env.OIDC_ISSUER && process.env.OIDC_CLIENT_ID);

  const isLdapEnabled =
    modeEnv === "LDAP" ||
    process.env.NEXT_PUBLIC_LDAP_ENABLED === "true" ||
    process.env.LDAP_ENABLED === "true" ||
    Boolean(process.env.LDAP_URL && process.env.LDAP_URL.trim() !== "");

  let mode: AuthMode = "LOCAL";
  if (modeEnv === "OIDC") {
    mode = "OIDC";
  } else if (modeEnv === "LDAP") {
    mode = "LDAP";
  } else if (isOidcEnabled) {
    mode = "OIDC";
  } else if (isLdapEnabled) {
    mode = "LDAP";
  }

  const oidcClientName = process.env.OIDC_CLIENT_NAME || "Authentik";

  return {
    mode,
    oidcClientName,
    isOidcEnabled,
    isLdapEnabled,
  };
}

export async function checkLdapEnabled(): Promise<boolean> {
  const config = await getAuthModeServerAction();
  return config.isLdapEnabled;
}
