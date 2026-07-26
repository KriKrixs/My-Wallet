"use server";

export async function checkLdapEnabled(): Promise<boolean> {
  const isEnabledFlag =
    process.env.NEXT_PUBLIC_LDAP_ENABLED === "true" ||
    process.env.LDAP_ENABLED === "true";
  const hasLdapUrl = Boolean(process.env.LDAP_URL && process.env.LDAP_URL.trim() !== "");

  return isEnabledFlag || hasLdapUrl;
}
