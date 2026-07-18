import { normalizeAdminEmail } from "@/lib/admin-access";

export type DomainRegistrationPolicy = {
  enabled: boolean;
  approvedDomains: string[];
};

export const DEFAULT_DOMAIN_REGISTRATION_POLICY: DomainRegistrationPolicy = {
  enabled: false,
  approvedDomains: [],
};

const DOMAIN_PATTERN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export function normalizeApprovedRegistrationDomains(values: readonly string[]) {
  return [...new Set(
    values
      .map((value) => value.trim().toLowerCase().replace(/^@/, ""))
      .filter((value) => DOMAIN_PATTERN.test(value)),
  )].sort();
}

export function getRegistrationEmailDomain(email: string) {
  const normalizedEmail = normalizeAdminEmail(email);
  const separator = normalizedEmail.lastIndexOf("@");
  if (separator <= 0 || separator === normalizedEmail.length - 1) {
    return null;
  }

  const domain = normalizedEmail.slice(separator + 1);
  return DOMAIN_PATTERN.test(domain) ? domain : null;
}

export function canRegisterWithApprovedDomain(
  policy: DomainRegistrationPolicy,
  email: string,
) {
  if (!policy.enabled) {
    return false;
  }

  const domain = getRegistrationEmailDomain(email);
  return Boolean(domain && policy.approvedDomains.includes(domain));
}
