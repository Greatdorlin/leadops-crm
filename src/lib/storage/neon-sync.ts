import { and, desc, eq, type SQL } from "drizzle-orm";
import { normalizeText } from "@/lib/crm/value-normalization";
import type { DatabaseExecutor } from "@/lib/db/client";
import { syncJobs } from "@/lib/db/schema";
import type {
  LeadStorage,
  SyncJobCreateInput,
  SyncJobListFilters,
  SyncJobUpdateInput,
} from "./types";
import { mapSyncJobRecord } from "./mappers";

export async function createSyncJob(
  this: LeadStorage,
  getDatabase: () => DatabaseExecutor,
  input: SyncJobCreateInput,
) {
  const db = getDatabase();
  const [created] = await db
    .insert(syncJobs)
    .values({
      provider: input.provider,
      jobType: input.jobType,
      status: input.status ?? "pending",
      startedAt: input.startedAt ? new Date(input.startedAt) : null,
      finishedAt: input.finishedAt ? new Date(input.finishedAt) : null,
      errorMessage: normalizeText(input.errorMessage),
      metadata: input.metadata ?? null,
    })
    .returning();

  return mapSyncJobRecord(created);
}

export async function updateSyncJob(
  this: LeadStorage,
  getDatabase: () => DatabaseExecutor,
  id: string,
  input: SyncJobUpdateInput,
) {
  const db = getDatabase();
  const [updated] = await db
    .update(syncJobs)
    .set({
      status: input.status,
      startedAt: input.startedAt ? new Date(input.startedAt) : undefined,
      finishedAt: input.finishedAt ? new Date(input.finishedAt) : undefined,
      errorMessage:
        input.errorMessage === undefined
          ? undefined
          : normalizeText(input.errorMessage),
      metadata: input.metadata,
    })
    .where(eq(syncJobs.id, id))
    .returning();

  return updated ? mapSyncJobRecord(updated) : null;
}

export async function listSyncJobs(
  this: LeadStorage,
  getDatabase: () => DatabaseExecutor,
  filters: SyncJobListFilters = {},
) {
  const db = getDatabase();
  const conditions: SQL[] = [];

  if (filters.provider) {
    conditions.push(eq(syncJobs.provider, filters.provider));
  }

  if (filters.status) {
    conditions.push(eq(syncJobs.status, filters.status));
  }

  const records = await db.query.syncJobs.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: [desc(syncJobs.createdAt)],
    limit: filters.limit,
  });

  return records.map(mapSyncJobRecord);
}
