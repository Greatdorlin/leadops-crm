import "server-only";

import { asc, eq } from "drizzle-orm";
import { normalizeAdminEmail } from "@/lib/admin-access";
import { getActivationBaseUrl, issueUserInvitation } from "@/lib/auth-credentials";
import { getDb } from "@/lib/db/client";
import { companySettings, crmUsers } from "@/lib/db/schema";
import {
  canRegisterWithApprovedDomain,
  DEFAULT_DOMAIN_REGISTRATION_POLICY,
  normalizeApprovedRegistrationDomains,
  type DomainRegistrationPolicy,
} from "@/lib/auth-registration-policy";

export async function getDomainRegistrationPolicy(): Promise<DomainRegistrationPolicy> {
  try {
    const db = getDb();
    const [row] = await db
      .select({
        enabled: companySettings.domainRegistrationEnabled,
        approvedDomains: companySettings.approvedRegistrationDomains,
      })
      .from(companySettings)
      .orderBy(asc(companySettings.createdAt))
      .limit(1);

    const approvedDomains = normalizeApprovedRegistrationDomains(row?.approvedDomains ?? []);
    return {
      enabled: Boolean(row?.enabled && approvedDomains.length > 0),
      approvedDomains,
    };
  } catch {
    return DEFAULT_DOMAIN_REGISTRATION_POLICY;
  }
}

export async function updateDomainRegistrationPolicy(policy: DomainRegistrationPolicy) {
  const approvedDomains = normalizeApprovedRegistrationDomains(policy.approvedDomains);
  if (policy.enabled && approvedDomains.length === 0) {
    throw new Error("At least one approved domain is required before registration can be enabled.");
  }

  const db = getDb();
  const [existing] = await db
    .select({ id: companySettings.id })
    .from(companySettings)
    .orderBy(asc(companySettings.createdAt))
    .limit(1);
  const row = existing ?? (await db.insert(companySettings).values({}).returning({ id: companySettings.id }))[0];

  await db
    .update(companySettings)
    .set({
      domainRegistrationEnabled: policy.enabled,
      approvedRegistrationDomains: approvedDomains,
      updatedAt: new Date(),
    })
    .where(eq(companySettings.id, row.id));

  return { enabled: policy.enabled, approvedDomains } satisfies DomainRegistrationPolicy;
}

export async function registerApprovedDomainUser(input: {
  email: string;
  fullName: string;
  baseUrl?: string | null;
}) {
  const email = normalizeAdminEmail(input.email);
  const policy = await getDomainRegistrationPolicy();
  if (!canRegisterWithApprovedDomain(policy, email)) {
    return { accepted: false, created: false } as const;
  }

  const baseUrl = input.baseUrl ?? getActivationBaseUrl();
  if (!baseUrl) {
    throw new Error("A valid application URL is required for registration activation.");
  }

  const db = getDb();
  const [created] = await db
    .insert(crmUsers)
    .values({
      email,
      fullName: input.fullName.trim(),
      role: "sales_agent",
      accessScope: "own",
      isActive: true,
    })
    .onConflictDoNothing({ target: crmUsers.email })
    .returning({ id: crmUsers.id });

  // Existing invited users remain untouched, including external-domain accounts.
  if (!created) {
    return { accepted: true, created: false } as const;
  }

  try {
    await issueUserInvitation({
      userId: created.id,
      createdBy: `self-registration:${email}`,
      baseUrl,
    });
    return { accepted: true, created: true } as const;
  } catch (error) {
    await db.delete(crmUsers).where(eq(crmUsers.id, created.id));
    throw error;
  }
}
