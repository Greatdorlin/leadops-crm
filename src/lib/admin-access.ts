import { hasConfiguredEnvValue, normalizeEnvValue } from "@/lib/env-utils";

export const LOCAL_ADMIN_PREVIEW_EMAIL = "preview@local.leadsdesk.test";
export const LOCAL_ADMIN_PREVIEW_NAME = "Local Preview";

export function normalizeAdminEmail(value: string) {
  return value.trim().toLowerCase();
}

function parseEmailList(value?: string | null) {
  return normalizeEnvValue(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map(normalizeAdminEmail);
}

function parseDomainList(value?: string | null) {
  return normalizeEnvValue(value)
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function getInitialAdminEmail() {
  const [email] = parseEmailList(process.env.INITIAL_ADMIN_EMAIL);
  return email ?? null;
}

export function getInitialAdminName() {
  const value = normalizeEnvValue(process.env.INITIAL_ADMIN_NAME);
  return value || null;
}

export function getAllowedEmailDomains(value = process.env.ALLOWED_EMAIL_DOMAINS) {
  return [...new Set(parseDomainList(value))];
}

export function isEmailDomainAllowed(
  email?: string | null,
  allowedDomainsEnv = process.env.ALLOWED_EMAIL_DOMAINS,
) {
  if (!email) {
    return false;
  }

  const allowedDomains = getAllowedEmailDomains(allowedDomainsEnv);
  if (allowedDomains.length === 0) {
    return true;
  }

  const normalizedEmail = normalizeAdminEmail(email);
  const [, domain = ""] = normalizedEmail.split("@");
  return allowedDomains.includes(domain);
}

export function getAdminAllowedEmails() {
  const initialAdminEmail = getInitialAdminEmail();
  const envEmails = parseEmailList(process.env.ADMIN_ALLOWED_EMAILS);

  return [...new Set([initialAdminEmail, ...envEmails].filter(Boolean) as string[])];
}

export function getLeadExportAllowedEmails() {
  return [...new Set(parseEmailList(process.env.LEAD_EXPORT_ALLOWED_EMAILS))];
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

export function isInitialAdminEmail(email?: string | null) {
  if (!email) {
    return false;
  }

  const initialAdminEmail = getInitialAdminEmail();
  return Boolean(initialAdminEmail && initialAdminEmail === normalizeAdminEmail(email));
}

export function isMasterAdminEmail(email?: string | null) {
  return isInitialAdminEmail(email);
}

export function isAllowedAdminEmail(email?: string | null) {
  if (!email) {
    return false;
  }

  if (!isEmailDomainAllowed(email)) {
    return false;
  }

  return getAdminAllowedEmails().includes(normalizeAdminEmail(email));
}

export function isAdminAuthConfigured() {
  return Boolean(
    hasConfiguredEnvValue(process.env.AUTH_GOOGLE_ID) &&
      hasConfiguredEnvValue(process.env.AUTH_GOOGLE_SECRET) &&
      hasConfiguredEnvValue(process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET) &&
      hasConfiguredEnvValue(process.env.INITIAL_ADMIN_EMAIL) &&
      hasConfiguredEnvValue(process.env.INITIAL_ADMIN_NAME),
  );
}

export function isLocalAdminPreviewEnabled() {
  return process.env.NODE_ENV !== "production";
}
