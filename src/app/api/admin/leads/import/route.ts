import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminRequestContext } from "@/lib/admin";
import { normalizeAdminEmail } from "@/lib/admin-access";
import { canImportLeadRecords } from "@/lib/admin-permissions";
import { CRM_STATUSES, LEAD_PRIORITIES, LEAD_SOURCES } from "@/lib/crm/constants";
import { listCustomFields } from "@/lib/crm/custom-fields-admin";
import {
  listLeadCustomFieldValues,
  upsertLeadCustomFieldValues,
} from "@/lib/crm/custom-field-values-store";
import { validateCustomFieldValues } from "@/lib/crm/custom-field-values";
import { analyzeLeadImportCsv } from "@/lib/crm/csv";
import { normalizeAdminLeadImportPayload } from "@/lib/crm/form-contracts";
import { createNotificationEvent } from "@/lib/crm/notification-events";
import {
  resolveCrmUserIdByEmail,
  resolveLeadSourceIdByLegacySource,
  resolveLeadStageIdByLegacyStatus,
  updateLeadSalesCommandFields,
} from "@/lib/crm/sales-command";
import {
  claimDataImportRecord,
  getDataImport,
  listDataImportRecords,
  markDataImportRecordFailedIfUnclaimed,
  runDataImportRecordTransaction,
  stageDataImport,
  summarizeDataImportRecords,
  updateDataImport,
  updateDataImportRecord,
} from "@/lib/migrations/data-import-store";
import { leadStore } from "@/lib/storage";

const INTERACTIVE_VALIDATION_LIMIT = 10_000;

function getInteractiveCommitBatchSize() {
  const configured = Number.parseInt(process.env.CRM_IMPORT_COMMIT_BATCH_SIZE ?? "", 10);
  if (!Number.isFinite(configured)) {
    return 50;
  }

  return Math.min(Math.max(configured, 25), 250);
}

const stagedLeadRowSchema = z
  .object({
    rowNumber: z.number().int().positive(),
    firstName: z.string().trim().min(1),
    lastName: z.string(),
    email: z.string().email().nullable(),
    whatsappNumber: z.string().nullable(),
    state: z.string().nullable(),
    category: z.string().nullable(),
    stage: z.enum(CRM_STATUSES),
    priority: z.enum(LEAD_PRIORITIES),
    assignedTo: z.string().nullable(),
    source: z.enum(LEAD_SOURCES),
    sourceDetail: z.string().nullable(),
    customFieldValues: z.record(z.string(), z.unknown()).optional(),
    companyName: z.string().optional(),
    country: z.string().optional(),
    region: z.string().optional(),
    city: z.string().optional(),
    address: z.string().optional(),
    postalCode: z.string().optional(),
    estimatedValue: z.number().nonnegative().optional(),
  })
  .superRefine((value, context) => {
    if (!value.email && !value.whatsappNumber) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A staged lead needs an email or WhatsApp number.",
      });
    }
  });

function toSnapshot(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

async function validateImport(input: {
  csvText: string;
  sourceSystem: Parameters<typeof stageDataImport>[0]["sourceSystem"];
  sourceFileName?: string | null;
  createdBy?: string | null;
}) {
  const activeCustomFieldDefinitions = (await listCustomFields()).filter((field) => !field.archived);
  const analysis = analyzeLeadImportCsv(input.csvText, {
    customFieldDefinitions: activeCustomFieldDefinitions,
  });

  if (analysis.rows.length === 0) {
    throw new Error("No lead rows were found in the import.");
  }
  if (analysis.rows.length > INTERACTIVE_VALIDATION_LIMIT) {
    throw new Error(
      `This file has more than ${INTERACTIVE_VALIDATION_LIMIT.toLocaleString()} rows. Use a background migration worker for this batch.`,
    );
  }

  const staged = await stageDataImport({
    sourceSystem: input.sourceSystem,
    sourceFileName: input.sourceFileName,
    sourceText: input.csvText,
    createdBy: input.createdBy,
    fieldMapping: { headers: analysis.headers },
    records: analysis.rows.map((row) => ({
      rowNumber: row.rowNumber,
      sourceRecordId: row.sourceRecordId,
      sourceUpdatedAt: row.sourceUpdatedAt,
      rawPayload: row.rawPayload,
      normalizedPayload: row.parsedRow ? toSnapshot(row.parsedRow) : null,
      status: row.parsedRow ? "valid" : "failed",
      errorCode: row.error ? "ROW_VALIDATION_FAILED" : null,
      errorMessage: row.error,
    })),
  });
  const failedRows = analysis.rows
    .filter((row) => row.error)
    .slice(0, 100)
    .map((row) => ({ rowNumber: row.rowNumber, error: row.error ?? "Invalid row." }));

  return {
    importId: staged.id,
    total: analysis.rows.length,
    valid: analysis.rows.filter((row) => row.parsedRow).length,
    failed: analysis.rows.filter((row) => row.error).length,
    failedRows,
  };
}

async function commitImport(input: {
  importId: string;
  actorEmail: string;
  actorUserId?: string | null;
  defaultAssignedTo?: string | null;
  sourceDetail?: string | null;
}) {
  const dataImport = await getDataImport(input.importId);
  if (!dataImport) {
    throw new Error("The staged import was not found.");
  }
  if (
    dataImport.createdBy &&
    normalizeAdminEmail(dataImport.createdBy) !== normalizeAdminEmail(input.actorEmail)
  ) {
    throw new Error("Only the user who validated this file can commit it.");
  }
  if (["completed", "completed_with_errors"].includes(dataImport.status)) {
    const summary = await summarizeDataImportRecords(input.importId);
    return {
      ...summary,
      remaining: 0,
      complete: true,
      failedRows: [] as Array<{ rowNumber: number; error: string }>,
    };
  }
  if (!["validated", "importing"].includes(dataImport.status)) {
    throw new Error("This import is not ready to commit.");
  }

  const batchSize = getInteractiveCommitBatchSize();
  const records = await listDataImportRecords(input.importId, {
    statuses: ["valid"],
    limit: batchSize,
  });

  await updateDataImport(input.importId, {
    status: "importing",
    mode: "commit",
    completedAt: null,
  });

  const [activeCustomFieldDefinitions, crmUsers] = await Promise.all([
    listCustomFields().then((fields) => fields.filter((field) => !field.archived)),
    leadStore.listCrmUsers(),
  ]);
  const activeOwners = new Map(
    crmUsers
      .filter((user) => user.isActive)
      .map((user) => [normalizeAdminEmail(user.email), user]),
  );
  const defaultOwner = input.defaultAssignedTo
    ? activeOwners.get(normalizeAdminEmail(input.defaultAssignedTo)) ?? null
    : null;
  const failedRows: Array<{ rowNumber: number; error: string }> = [];

  for (const record of records) {
    try {
      const parsedRow = stagedLeadRowSchema.safeParse(record.normalizedPayload);
      if (!parsedRow.success) {
        throw new Error("The staged row no longer matches the import contract.");
      }
      const row = parsedRow.data;
      const customFieldValidation = validateCustomFieldValues(
        activeCustomFieldDefinitions,
        row.customFieldValues ?? {},
      );
      if (!customFieldValidation.success) {
        throw new Error(
          Object.values(customFieldValidation.fieldErrors)[0] ?? "Custom field values are invalid.",
        );
      }

      const importedOwner = row.assignedTo
        ? activeOwners.get(normalizeAdminEmail(row.assignedTo)) ?? null
        : null;
      const ownerWasUnresolved = Boolean(row.assignedTo && !importedOwner);
      const owner = importedOwner ?? defaultOwner;
      const assignedTo = owner?.email ?? null;
      const stageId = await resolveLeadStageIdByLegacyStatus(row.stage);
      const sourceId = await resolveLeadSourceIdByLegacySource(row.source);
      const assignedUserId = owner?.id ?? (await resolveCrmUserIdByEmail(assignedTo));
      const nowIso = new Date().toISOString();
      const wonAt = row.stage === "converted" ? nowIso : null;
      const lostAt = row.stage === "lost" ? nowIso : null;
      const externalLeadId = record.sourceRecordId
        ? `${dataImport.sourceSystem}:${record.sourceRecordId}`
        : null;
      const result = await runDataImportRecordTransaction(async ({ db, leadStore: rowLeadStore }) => {
        const claim = await claimDataImportRecord(record.id, db);
        if (!claim) {
          return null;
        }

        const duplicateLookup = {
          source: row.source,
          externalLeadId,
          email: row.email,
          whatsappNumber: row.whatsappNumber,
        };
        const existingLead = await rowLeadStore.findDuplicateLead(duplicateLookup);
        const previousCustomFieldValues = existingLead
          ? await listLeadCustomFieldValues(existingLead.id, db)
          : [];
        const upsertResult = await rowLeadStore.upsertExternalLead({
          source: row.source,
          sourceId,
          stageId,
          externalLeadId,
          sourceDetail:
            row.sourceDetail ?? input.sourceDetail ?? `migration:${dataImport.sourceSystem}`,
          firstName: row.firstName,
          lastName: row.lastName || null,
          email: row.email,
          whatsappNumber: row.whatsappNumber,
          state: row.region ?? row.state,
          country: row.country ?? null,
          region: row.region ?? null,
          city: row.city ?? null,
          address: row.address ?? null,
          postalCode: row.postalCode ?? null,
          companyName: row.companyName ?? null,
          leadCustomerType: row.companyName ? "business" : "direct",
          estimatedValue: row.estimatedValue ?? null,
          assignedUserId,
          assignedTo,
          priority: row.priority,
          wonAt,
          lostAt,
        });
        let lead = upsertResult.lead;

        if (normalizeAdminEmail(lead.assignedTo ?? "") !== normalizeAdminEmail(assignedTo ?? "")) {
          lead = (await rowLeadStore.assignLead(lead.id, assignedTo, input.actorEmail)) ?? lead;
        }
        if (lead.priority !== row.priority) {
          lead = (await rowLeadStore.updateLeadPriority(lead.id, row.priority, input.actorEmail)) ?? lead;
        }

        await updateLeadSalesCommandFields(
          lead.id,
          {
            assignedUserId,
            sourceId,
            stageId,
            companyName: row.companyName ?? null,
            estimatedValue: row.estimatedValue ?? null,
            wonAt: wonAt ?? undefined,
            lostAt: lostAt ?? undefined,
          },
          db,
        );
        await upsertLeadCustomFieldValues(lead.id, customFieldValidation.values, db);
        await updateDataImportRecord(
          record.id,
          {
            status: upsertResult.created ? "imported" : "updated",
            leadId: lead.id,
            resultAction: upsertResult.created ? "created" : "updated",
            previousLeadSnapshot: existingLead
              ? toSnapshot({
                  lead: existingLead,
                  customFieldValues: previousCustomFieldValues,
                })
              : null,
            errorCode: ownerWasUnresolved ? "OWNER_NOT_FOUND" : null,
            errorMessage: ownerWasUnresolved
              ? defaultOwner
                ? `Owner ${row.assignedTo} was not found. The default owner was used instead.`
                : `Owner ${row.assignedTo} was not found. The lead was left unassigned.`
              : null,
          },
          db,
        );

        return upsertResult;
      });

      if (!result) {
        continue;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "This row could not be imported.";
      const markedFailed = await markDataImportRecordFailedIfUnclaimed(record.id, {
        errorCode: "IMPORT_PROCESSING_FAILED",
        errorMessage: message,
      });
      if (markedFailed) {
        failedRows.push({ rowNumber: record.rowNumber, error: message });
      }
    }
  }

  const ledgerSummary = await summarizeDataImportRecords(input.importId);
  const isComplete = ledgerSummary.valid === 0;
  const summary = { ...ledgerSummary, remaining: ledgerSummary.valid };
  await updateDataImport(input.importId, {
    status: !isComplete
      ? "importing"
      : ledgerSummary.failed > 0
        ? "completed_with_errors"
        : "completed",
    mode: "commit",
    summary,
    completedAt: isComplete ? new Date() : null,
  });

  if (input.actorUserId && isComplete) {
    await createNotificationEvent({
      type: "import_completed",
      recipientUserId: input.actorUserId,
      title: "Lead import completed",
      message: `${ledgerSummary.created} created, ${ledgerSummary.updated} updated, ${ledgerSummary.failed} failed.`,
    });
  }

  return { ...summary, complete: isComplete, failedRows: failedRows.slice(0, 100) };
}

export async function POST(request: Request) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!canImportLeadRecords(context.accessLevel, context.permissions)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const parsed = payload ? normalizeAdminLeadImportPayload(payload) : { success: false as const };
  if (!parsed.success) {
    const error = "error" in parsed
      ? parsed.error.issues[0]?.message ?? "Invalid import payload."
      : "Invalid import payload.";
    return NextResponse.json({ error }, { status: 400 });
  }

  const actorEmail = context.session.user?.email ?? "";

  try {
    if (parsed.data.action === "validate") {
      const result = await validateImport({
        csvText: parsed.data.csvText,
        sourceSystem: parsed.data.sourceSystem,
        sourceFileName: parsed.data.sourceFileName,
        createdBy: actorEmail || null,
      });
      return NextResponse.json({ phase: "validated", ...result });
    }

    const result = await commitImport({
      importId: parsed.data.importId!,
      actorEmail,
      actorUserId: context.crmUser?.id,
      defaultAssignedTo: parsed.data.assignedTo,
      sourceDetail: parsed.data.sourceDetail,
    });
    return NextResponse.json({ phase: result.complete ? "completed" : "processing", ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The import could not be completed." },
      { status: 422 },
    );
  }
}
