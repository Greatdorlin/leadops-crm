import { and, desc, eq, type SQL } from "drizzle-orm";
import { normalizeText } from "@/lib/crm/value-normalization";
import type { DatabaseExecutor } from "@/lib/db/client";
import { leadSourcePayloads } from "@/lib/db/schema";
import type { LeadSourcePayloadCreateInput, LeadStorage } from "./types";
import { mapLeadSourcePayloadRecord } from "./mappers";

export async function saveSourcePayload(
  this: LeadStorage,
  getDatabase: () => DatabaseExecutor,
  input: LeadSourcePayloadCreateInput,
) {
  const db = getDatabase();
  const [created] = await db
    .insert(leadSourcePayloads)
    .values({
      source: input.source,
      externalId: normalizeText(input.externalId),
      payload: input.payload,
      processingStatus: input.processingStatus ?? "pending",
      processedAt: input.processedAt ? new Date(input.processedAt) : null,
      errorMessage: normalizeText(input.errorMessage),
      retryCount: input.retryCount ?? 0,
    })
    .returning();

  return mapLeadSourcePayloadRecord(created);
}

export async function markPayloadProcessing(
  this: LeadStorage,
  getDatabase: () => DatabaseExecutor,
  id: string,
) {
  const db = getDatabase();
  const [updated] = await db
    .update(leadSourcePayloads)
    .set({
      processingStatus: "processing",
      errorMessage: null,
    })
    .where(eq(leadSourcePayloads.id, id))
    .returning();

  return updated ? mapLeadSourcePayloadRecord(updated) : null;
}

export async function markPayloadProcessed(
  this: LeadStorage,
  getDatabase: () => DatabaseExecutor,
  id: string,
) {
  const db = getDatabase();
  const [updated] = await db
    .update(leadSourcePayloads)
    .set({
      processingStatus: "processed",
      processedAt: new Date(),
      errorMessage: null,
    })
    .where(eq(leadSourcePayloads.id, id))
    .returning();

  return updated ? mapLeadSourcePayloadRecord(updated) : null;
}

export async function markPayloadFailed(
  this: LeadStorage,
  getDatabase: () => DatabaseExecutor,
  id: string,
  errorMessage: string,
) {
  const db = getDatabase();
  const [updated] = await db
    .update(leadSourcePayloads)
    .set({
      processingStatus: "failed",
      errorMessage,
    })
    .where(eq(leadSourcePayloads.id, id))
    .returning();

  return updated ? mapLeadSourcePayloadRecord(updated) : null;
}

export async function listFailedPayloads(
  this: LeadStorage,
  getDatabase: () => DatabaseExecutor,
  source?: string,
) {
  const db = getDatabase();
  const conditions: SQL[] = [eq(leadSourcePayloads.processingStatus, "failed")];

  if (source?.trim()) {
    conditions.push(eq(leadSourcePayloads.source, source.trim()));
  }

  const records = await db.query.leadSourcePayloads.findMany({
    where: and(...conditions),
    orderBy: [desc(leadSourcePayloads.createdAt)],
  });

  return records.map(mapLeadSourcePayloadRecord);
}

export async function retrySourcePayload(
  this: LeadStorage,
  getDatabase: () => DatabaseExecutor,
  id: string,
) {
  const db = getDatabase();
  const existing = await db.query.leadSourcePayloads.findFirst({
    where: eq(leadSourcePayloads.id, id),
  });

  if (!existing) {
    return null;
  }

  const [updated] = await db
    .update(leadSourcePayloads)
    .set({
      processingStatus: "pending",
      processedAt: null,
      errorMessage: null,
      retryCount: existing.retryCount + 1,
    })
    .where(eq(leadSourcePayloads.id, id))
    .returning();

  return updated ? mapLeadSourcePayloadRecord(updated) : null;
}
