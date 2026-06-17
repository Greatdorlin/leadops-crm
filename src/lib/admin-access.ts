import { hasConfiguredEnvValue, normalizeEnvValue } from "@/lib/env-utils";

export const MASTER_ADMIN_EMAILS = ["greatdorlinwisdom@gmail.com"] as const;

export function normalizeAdminEmail(value: string) {
  return value.trim().toLowerCase();
}

export function getAdminAllowedEmails() {
  const envEmails = normalizeEnvValue(process.env.ADMIN_ALLOWED_EMAILS)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map(normalizeAdminEmail);

  return [...new Set([...MASTER_ADMIN_EMAILS, ...envEmails])];
}

export function getLeadExportAllowedEmails() {
  const envEmails = normalizeEnvValue(process.env.LEAD_EXPORT_ALLOWED_EMAILS)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map(normalizeAdminEmail);

  return envEmails.length > 0 ? envEmails : ["flyconnect102@gmail.com"];
}

export function canExportLeadData(email?: string | null) {
  if (!email) {
    return false;
  }

  if (isMasterAdminEmail(email)) {
    return true;
  }

  return getLeadExportAllowedEmails().includes(normalizeAdminEmail(email));
}

export function isMasterAdminEmail(email?: string | null) {
  if (!email) {
    return false;
  }

  return MASTER_ADMIN_EMAILS.some((candidate) => candidate === normalizeAdminEmail(email));
}

export function isAllowedAdminEmail(email?: string | null) {
  if (!email) {
    return false;
  }

  return getAdminAllowedEmails().includes(normalizeAdminEmail(email));
}

export function isAdminAuthConfigured() {
  return Boolean(
    hasConfiguredEnvValue(process.env.AUTH_GOOGLE_ID) &&
      hasConfiguredEnvValue(process.env.AUTH_GOOGLE_SECRET) &&
      hasConfiguredEnvValue(process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET),
  );
}
