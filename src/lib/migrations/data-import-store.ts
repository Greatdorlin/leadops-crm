import { createHash } from "node:crypto";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import type { DatabaseExecutor } from "@/lib/db/client";
import { dataImportRecords, dataImports } from "@/lib/db/schema";
import type { CrmMigrationSource } from "@/lib/migrations/sources";
import { NeonLeadStore } from "@/lib/storage/neon-store";

export type DataImportStatus =
  | "staged"
  | "validating"
  | "validated"
  | "importing"
  | "completed"
  | "completed_with_errors"
  | "failed"
  | "rolled_back";

export type DataImportRecordStatus =
  | "pending"
  | "valid"
  | "imported"
  | "updated"
  | "failed"
  | "skipped"
  | "rolled_back";

export interface StagedDataImportRecord {
  rowNumber: number;
  objectType?: string;
  sourceRecordId?: string | null;
  sourceUpdatedAt?: string | null;
  rawPayload: Record<string, unknown>;
  normalizedPayload?: Record<string, unknown> | null;
  status: DataImportRecordStatus;
  errorCode?: string | null;
  errorMessage?: string | null;
}

function checksumPayload(payload: Record<string, unknown>) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function fileChecksum(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function stageDataImport(input: {
  sourceSystem: CrmMigrationSource;
  sourceFileName?: string | null;
  sourceText: string;
  createdBy?: string | null;
  fieldMapping?: Record<string, unknown> | null;
  records: StagedDataImportRecord[];
}) {
  const db = getDb();
  const validCount = input.records.filter((record) => record.status === "valid").length;
  const failedCount = input.records.filter((record) => record.status === "failed").length;

  return db.transaction(async (tx) => {
    const [createdImport] = await tx
      .insert(dataImports)
      .values({
        sourceSystem: input.sourceSystem,
        sourceFileName: input.sourceFileName ?? null,
        sourceFileSha256: fileChecksum(input.sourceText),
        status: "validated",
        mode: "validate",
        fieldMapping: input.fieldMapping ?? null,
        summary: {
          total: input.records.length,
          valid: validCount,
          failed: failedCount,
          created: 0,
          updated: 0,
        },
        createdBy: input.createdBy ?? null,
        startedAt: new Date(),
        completedAt: new Date(),
      })
      .returning();

    if (!createdImport) {
      throw new Error("The import could not be staged.");
    }

    for (let offset = 0; offset < input.records.length; offset += 250) {
      const chunk = input.records.slice(offset, offset + 250);
      await tx.insert(dataImportRecords).values(
        chunk.map((record) => ({
          importId: createdImport.id,
          rowNumber: record.rowNumber,
          objectType: record.objectType ?? "lead",
          sourceRecordId: record.sourceRecordId ?? null,
          sourceUpdatedAt: record.sourceUpdatedAt ? new Date(record.sourceUpdatedAt) : null,
          status: record.status,
          checksum: checksumPayload(record.rawPayload),
          rawPayload: record.rawPayload,
          normalizedPayload: record.normalizedPayload ?? null,
          errorCode: record.errorCode ?? null,
          errorMessage: record.errorMessage ?? null,
          processedAt: record.status === "failed" ? new Date() : null,
        })),
      );
    }

    return createdImport;
  });
}

export async function getDataImport(id: string) {
  const db = getDb();
  return db.query.dataImports.findFirst({ where: eq(dataImports.id, id) });
}

export async function listDataImportRecords(
  importId: string,
  options: { statuses?: DataImportRecordStatus[]; limit?: number } = {},
) {
  const db = getDb();
  const predicates = [eq(dataImportRecords.importId, importId)];
  if (options.statuses?.length) {
    predicates.push(inArray(dataImportRecords.status, options.statuses));
  }

  return db.query.dataImportRecords.findMany({
    where: and(...predicates),
    orderBy: [asc(dataImportRecords.rowNumber), asc(dataImportRecords.id)],
    limit: Math.min(Math.max(options.limit ?? 2_000, 1), 2_001),
  });
}

export async function updateDataImport(
  id: string,
  input: {
    status: DataImportStatus;
    mode?: "validate" | "commit";
    summary?: Record<string, unknown>;
    completedAt?: Date | null;
  },
) {
  const db = getDb();
  const [updated] = await db
    .update(dataImports)
    .set({
      status: input.status,
      mode: input.mode,
      summary: input.summary,
      completedAt: input.completedAt,
      updatedAt: new Date(),
    })
    .where(eq(dataImports.id, id))
    .returning();
  return updated ?? null;
}

export async function updateDataImportRecord(
  id: string,
  input: {
    status: DataImportRecordStatus;
    leadId?: string | null;
    resultAction?: string | null;
    previousLeadSnapshot?: Record<string, unknown> | null;
    errorCode?: string | null;
    errorMessage?: string | null;
  },
  db: DatabaseExecutor = getDb(),
) {
  const [updated] = await db
    .update(dataImportRecords)
    .set({
      status: input.status,
      leadId: input.leadId,
      resultAction: input.resultAction,
      previousLeadSnapshot: input.previousLeadSnapshot,
      errorCode: input.errorCode,
      errorMessage: input.errorMessage,
      processedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(dataImportRecords.id, id))
    .returning();
  return updated ?? null;
}

export async function claimDataImportRecord(id: string, db: DatabaseExecutor) {
  const [claimed] = await db
    .update(dataImportRecords)
    .set({
      resultAction: "processing",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(dataImportRecords.id, id),
        eq(dataImportRecords.status, "valid"),
        isNull(dataImportRecords.resultAction),
      ),
    )
    .returning({ id: dataImportRecords.id });

  return claimed ?? null;
}

export async function markDataImportRecordFailedIfUnclaimed(
  id: string,
  input: { errorCode: string; errorMessage: string },
) {
  const db = getDb();
  const [updated] = await db
    .update(dataImportRecords)
    .set({
      status: "failed",
      resultAction: "failed",
      errorCode: input.errorCode,
      errorMessage: input.errorMessage,
      processedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(dataImportRecords.id, id),
        eq(dataImportRecords.status, "valid"),
        isNull(dataImportRecords.resultAction),
      ),
    )
    .returning({ id: dataImportRecords.id });

  return updated ?? null;
}

export async function summarizeDataImportRecords(importId: string) {
  const db = getDb();
  const [summary] = await db
    .select({
      total: sql<number>`count(*)`,
      valid: sql<number>`count(*) filter (where ${dataImportRecords.status} = 'valid')`,
      created: sql<number>`count(*) filter (where ${dataImportRecords.status} = 'imported')`,
      updated: sql<number>`count(*) filter (where ${dataImportRecords.status} = 'updated')`,
      failed: sql<number>`count(*) filter (where ${dataImportRecords.status} = 'failed')`,
      skipped: sql<number>`count(*) filter (where ${dataImportRecords.status} = 'skipped')`,
      unresolvedOwners: sql<number>`count(*) filter (where ${dataImportRecords.errorCode} = 'OWNER_NOT_FOUND')`,
    })
    .from(dataImportRecords)
    .where(eq(dataImportRecords.importId, importId));

  return {
    total: Number(summary?.total ?? 0),
    valid: Number(summary?.valid ?? 0),
    created: Number(summary?.created ?? 0),
    updated: Number(summary?.updated ?? 0),
    failed: Number(summary?.failed ?? 0),
    skipped: Number(summary?.skipped ?? 0),
    unresolvedOwners: Number(summary?.unresolvedOwners ?? 0),
  };
}

export async function runDataImportRecordTransaction<T>(
  callback: (context: {
    db: DatabaseExecutor;
    leadStore: NeonLeadStore;
  }) => Promise<T>,
) {
  const db = getDb();
  return db.transaction(async (transaction) =>
    callback({
      db: transaction,
      leadStore: new NeonLeadStore(() => transaction),
    }),
  );
}
