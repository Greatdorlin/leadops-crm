import { asc, desc, eq } from "drizzle-orm";
import { normalizeText } from "@/lib/crm/value-normalization";
import type { DatabaseExecutor } from "@/lib/db/client";
import { integrations } from "@/lib/db/schema";
import type { IntegrationProvider } from "@/lib/crm/types";
import type { IntegrationUpsertInput, LeadStorage } from "./types";
import { mapIntegrationRecord } from "./mappers";

export async function listIntegrations(
  this: LeadStorage,
  getDatabase: () => DatabaseExecutor,
) {
  const db = getDatabase();
  const records = await db.query.integrations.findMany({
    orderBy: [asc(integrations.provider), desc(integrations.updatedAt)],
  });

  return records.map(mapIntegrationRecord);
}

export async function getIntegration(
  this: LeadStorage,
  getDatabase: () => DatabaseExecutor,
  provider: IntegrationProvider,
) {
  const db = getDatabase();
  const record = await db.query.integrations.findFirst({
    where: eq(integrations.provider, provider),
    orderBy: [desc(integrations.updatedAt)],
  });

  return record ? mapIntegrationRecord(record) : null;
}

export async function upsertIntegration(
  this: LeadStorage,
  getDatabase: () => DatabaseExecutor,
  input: IntegrationUpsertInput,
) {
  const db = getDatabase();
  const existing = await db.query.integrations.findFirst({
    where: eq(integrations.provider, input.provider),
    orderBy: [desc(integrations.updatedAt)],
  });

  if (existing) {
    const [updated] = await db
      .update(integrations)
      .set({
        accountName:
          input.accountName === undefined
            ? existing.accountName
            : normalizeText(input.accountName),
        externalAccountId:
          input.externalAccountId === undefined
            ? existing.externalAccountId
            : normalizeText(input.externalAccountId),
        status: input.status ?? existing.status,
        accessTokenEncrypted:
          input.accessTokenEncrypted === undefined
            ? existing.accessTokenEncrypted
            : input.accessTokenEncrypted,
        refreshTokenEncrypted:
          input.refreshTokenEncrypted === undefined
            ? existing.refreshTokenEncrypted
            : input.refreshTokenEncrypted,
        config: input.config === undefined ? existing.config : input.config,
        lastSyncAt:
          input.lastSyncAt === undefined
            ? existing.lastSyncAt
            : input.lastSyncAt
              ? new Date(input.lastSyncAt)
              : null,
        lastError:
          input.lastError === undefined
            ? existing.lastError
            : normalizeText(input.lastError),
        updatedAt: new Date(),
      })
      .where(eq(integrations.id, existing.id))
      .returning();

    return mapIntegrationRecord(updated);
  }

  const [created] = await db
    .insert(integrations)
    .values({
      provider: input.provider,
      accountName: normalizeText(input.accountName),
      externalAccountId: normalizeText(input.externalAccountId),
      status: input.status ?? "not_configured",
      accessTokenEncrypted: input.accessTokenEncrypted ?? null,
      refreshTokenEncrypted: input.refreshTokenEncrypted ?? null,
      config: input.config ?? null,
      lastSyncAt: input.lastSyncAt ? new Date(input.lastSyncAt) : null,
      lastError: normalizeText(input.lastError),
    })
    .returning();

  return mapIntegrationRecord(created);
}
