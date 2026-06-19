import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import type { FormFieldCoreTarget, LeadIntakeEventStatus } from "@/lib/crm/domain";
import {
  type CustomFieldDefinitionWithOptions,
  validateCustomFieldValues,
} from "@/lib/crm/custom-field-values";
import { listCustomFields } from "@/lib/crm/custom-fields-admin";
import { notifyNewLeadAssigned, notifyWebhookLeadCaptured } from "@/lib/crm/notification-events";
import { mapFormSourceTypeToLegacyLeadSource, updateLeadSalesCommandFields } from "@/lib/crm/sales-command";
import { getDb } from "@/lib/db/client";
import {
  crmUsers,
  formFieldMappings,
  formSources,
  leadIntakeEvents,
  leadSources,
  leads,
} from "@/lib/db/schema";
import { leadStore } from "@/lib/storage";
import { upsertLeadCustomFieldValues } from "./custom-field-values-store";

type RuntimeFormFieldMapping = typeof formFieldMappings.$inferSelect;

export interface IntakeProcessingResult {
  success: boolean;
  leadId: string | null;
  intakeEventId: string | null;
  message: string;
  validationErrors?: string[];
}

export interface IntakeEventAdminRow {
  id: string;
  status: LeadIntakeEventStatus;
  sourceName: string | null;
  leadId: string | null;
  leadName: string | null;
  errorMessage: string | null;
  normalizedSummary: Array<{ label: string; value: string }>;
  rawPayload: Record<string, unknown> | null;
  createdAt: string;
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function splitLeadName(value: string | null) {
  if (!value) {
    return {
      firstName: "Lead",
      lastName: "",
      fullName: "Lead",
    };
  }

  const normalized = value.trim();
  const [firstName, ...rest] = normalized.split(/\s+/);
  return {
    firstName: firstName || "Lead",
    lastName: rest.join(" "),
    fullName: normalized,
  };
}

function serializePayloadValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function normalizePayloadKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizePayloadKeys(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => [
        normalizeKey(key),
        normalizePayloadKeys(entryValue),
      ]),
    );
  }

  return value;
}

function getNestedPayloadValue(payload: Record<string, unknown>, externalFieldName: string) {
  const path = externalFieldName.split(".").map(normalizeKey).filter(Boolean);
  let current: unknown = payload;

  for (const segment of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function toIsoDateTimeValue(value: unknown) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  const appended = new Date(`${normalized}T00:00:00.000Z`);
  return Number.isNaN(appended.getTime()) ? null : appended.toISOString();
}

function toNormalizedPriority(value: unknown) {
  const normalized = normalizeOptionalString(value)?.toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized === "medium") {
    return "normal";
  }

  if (["low", "normal", "high", "urgent"].includes(normalized)) {
    return normalized as "low" | "normal" | "high" | "urgent";
  }

  return null;
}

function toLegacyPriority(value: "low" | "normal" | "high" | "urgent" | null | undefined) {
  if (!value) {
    return null;
  }

  return value === "normal" ? "medium" : value;
}

function coerceCoreTargetValue(target: FormFieldCoreTarget, value: unknown) {
  switch (target) {
    case "estimatedValue": {
      const parsed = typeof value === "number" ? value : Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    case "expectedCloseDate":
      return toIsoDateTimeValue(value);
    case "priority":
      return toNormalizedPriority(value);
    case "name":
    case "email":
    case "phone":
    case "companyName":
    case "sourceId":
    case "campaignLabel":
    case "notes":
    default:
      return normalizeOptionalString(value);
  }
}

export function buildSamplePayloadFromMappings(mappings: Array<Pick<RuntimeFormFieldMapping, "externalFieldName" | "externalFieldLabel" | "targetField" | "targetType">>) {
  const defaults: Record<FormFieldCoreTarget, unknown> = {
    name: "Ada Okafor",
    email: "lead@example.com",
    phone: "+2348012345678",
    companyName: "Northwind Ventures",
    sourceId: "website",
    campaignLabel: "June Lead Campaign",
    priority: "high",
    estimatedValue: 250000,
    expectedCloseDate: "2026-06-30T10:00:00.000Z",
    notes: "Interested in a priority follow-up this week.",
  };

  return Object.fromEntries(
    mappings.map((mapping, index) => [
      mapping.externalFieldName,
      mapping.targetType === "core" && mapping.targetField
        ? defaults[mapping.targetField]
        : mapping.externalFieldLabel || `Sample value ${index + 1}`,
    ]),
  );
}

export function generateWebhookKey(seed: string) {
  const base = normalizeKey(seed).replace(/[^a-z0-9_]/g, "");
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || "form_source"}_${suffix}`;
}

async function resolveLeadSourceIdByValue(value?: string | null) {
  if (!value) {
    return null;
  }

  const db = getDb();
  const normalizedValue = value.trim().toLowerCase();
  const rows = await db
    .select({ id: leadSources.id, key: leadSources.key, name: leadSources.name })
    .from(leadSources)
    .where(eq(leadSources.archived, false));
  const matched = rows.find(
    (item) =>
      item.key.toLowerCase() === normalizedValue ||
      item.name.trim().toLowerCase() === normalizedValue,
  );

  return matched?.id ?? null;
}

async function resolveAssignedUserEmail(userId?: string | null) {
  if (!userId) {
    return null;
  }

  const db = getDb();
  const [row] = await db
    .select({ email: crmUsers.email })
    .from(crmUsers)
    .where(eq(crmUsers.id, userId))
    .limit(1);

  return row?.email ?? null;
}

async function createIntakeEvent(input: {
  formSourceId: string | null;
  leadId?: string | null;
  rawPayload: Record<string, unknown>;
  normalizedPayload?: Record<string, unknown> | null;
  status: LeadIntakeEventStatus;
  errorMessage?: string | null;
}) {
  const db = getDb();
  const [created] = await db
    .insert(leadIntakeEvents)
    .values({
      formSourceId: input.formSourceId,
      leadId: input.leadId ?? null,
      rawPayload: input.rawPayload,
      normalizedPayload: input.normalizedPayload ?? null,
      status: input.status,
      errorMessage: input.errorMessage ?? null,
    })
    .returning();

  return created;
}

async function updateIntakeEvent(
  intakeEventId: string,
  input: {
    leadId?: string | null;
    normalizedPayload?: Record<string, unknown> | null;
    status: LeadIntakeEventStatus;
    errorMessage?: string | null;
  },
) {
  const db = getDb();
  const [updated] = await db
    .update(leadIntakeEvents)
    .set({
      leadId: input.leadId ?? null,
      normalizedPayload: input.normalizedPayload ?? null,
      status: input.status,
      errorMessage: input.errorMessage ?? null,
    })
    .where(eq(leadIntakeEvents.id, intakeEventId))
    .returning();

  return updated;
}

async function getActiveFormSourceByWebhookKey(webhookKey: string) {
  const db = getDb();
  const [source] = await db
    .select()
    .from(formSources)
    .where(and(eq(formSources.webhookKey, webhookKey), eq(formSources.isActive, true)))
    .limit(1);

  return source ?? null;
}

async function listMappingsForFormSource(formSourceId: string) {
  const db = getDb();
  return db
    .select()
    .from(formFieldMappings)
    .where(eq(formFieldMappings.formSourceId, formSourceId))
    .orderBy(asc(formFieldMappings.externalFieldName), asc(formFieldMappings.createdAt));
}

export function mapWebhookPayloadWithMappings(input: {
  payload: Record<string, unknown>;
  mappings: RuntimeFormFieldMapping[];
  customFields: CustomFieldDefinitionWithOptions[];
}) {
  const coreFields: Record<string, unknown> = {};
  const customFieldSubmittedValues: Record<string, unknown> = {};
  const unmappedFields: Array<{ fieldName: string; value: unknown }> = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  const mappedFieldNames = new Set<string>();

  for (const mapping of input.mappings) {
    const rawValue = getNestedPayloadValue(input.payload, mapping.externalFieldName);
    const fallbackValue = mapping.fallbackValue ?? null;
    const resolvedValue = rawValue ?? fallbackValue;

    if ((resolvedValue === null || resolvedValue === undefined || resolvedValue === "") && mapping.required) {
      errors.push(`${mapping.externalFieldLabel || mapping.externalFieldName} is required.`);
      continue;
    }

    if (resolvedValue === null || resolvedValue === undefined || resolvedValue === "") {
      continue;
    }

    mappedFieldNames.add(normalizeKey(mapping.externalFieldName));

    if (mapping.targetType === "core" && mapping.targetField) {
      const value = coerceCoreTargetValue(mapping.targetField, resolvedValue);
      if (value === null && mapping.required) {
        errors.push(`${mapping.externalFieldLabel || mapping.externalFieldName} has an invalid value.`);
        continue;
      }

      if (value !== null) {
        coreFields[mapping.targetField] = value;
      }
      continue;
    }

    if (mapping.targetType === "custom" && mapping.customFieldId) {
      customFieldSubmittedValues[mapping.customFieldId] = resolvedValue;
    }
  }

  for (const [fieldName, value] of Object.entries(input.payload)) {
    if (mappedFieldNames.has(normalizeKey(fieldName))) {
      continue;
    }

    unmappedFields.push({ fieldName, value });
  }

  const relevantCustomFields = input.customFields.filter((field) =>
    Object.prototype.hasOwnProperty.call(customFieldSubmittedValues, field.id),
  );
  const customValidation = validateCustomFieldValues(relevantCustomFields, customFieldSubmittedValues);

  if (!customValidation.success) {
    errors.push(...Object.values(customValidation.fieldErrors));
  }

  return {
    coreFields,
    customFieldValues: customValidation.values,
    unmappedFields,
    warnings,
    errors,
  };
}

export async function processWebhookIntake(input: {
  webhookKey: string;
  payload: unknown;
}) {
  const normalizedKey = normalizeKey(input.webhookKey);
  const formSource = await getActiveFormSourceByWebhookKey(normalizedKey);

  if (!formSource) {
    return {
      status: 404,
      body: {
        success: false,
        leadId: null,
        intakeEventId: null,
        message: "Webhook source not found.",
      } satisfies IntakeProcessingResult,
    };
  }

  if (!input.payload || typeof input.payload !== "object" || Array.isArray(input.payload)) {
    const rawPayload = { invalidPayload: true } as Record<string, unknown>;
    const event = await createIntakeEvent({
      formSourceId: formSource.id,
      rawPayload,
      status: "failed",
      errorMessage: "Webhook payload must be a JSON object.",
    });

    return {
      status: 400,
      body: {
        success: false,
        leadId: null,
        intakeEventId: event.id,
        message: "Webhook payload must be a JSON object.",
      } satisfies IntakeProcessingResult,
    };
  }

  const rawPayload = input.payload as Record<string, unknown>;
  const normalizedPayload = normalizePayloadKeys(rawPayload) as Record<string, unknown>;
  const intakeEvent = await createIntakeEvent({
    formSourceId: formSource.id,
    rawPayload,
    normalizedPayload,
    status: "received",
  });

  try {
    const mappings = await listMappingsForFormSource(formSource.id);
    const customFields = (await listCustomFields()).filter((field) => !field.archived);
    const mappingResult = mapWebhookPayloadWithMappings({
      payload: normalizedPayload,
      mappings,
      customFields,
    });

    if (mappingResult.errors.length > 0) {
      await updateIntakeEvent(intakeEvent.id, {
        normalizedPayload,
        status: "failed",
        errorMessage: mappingResult.errors.join(" "),
      });

      return {
        status: 400,
        body: {
          success: false,
          leadId: null,
          intakeEventId: intakeEvent.id,
          message: "Webhook intake validation failed.",
          validationErrors: mappingResult.errors,
        } satisfies IntakeProcessingResult,
      };
    }

    const fullName = normalizeOptionalString(mappingResult.coreFields.name);
    const email = normalizeOptionalString(mappingResult.coreFields.email);
    const phone = normalizeOptionalString(mappingResult.coreFields.phone);

    if (!email && !phone) {
      const errorMessage = "Email or phone is required to create a lead.";
      await updateIntakeEvent(intakeEvent.id, {
        normalizedPayload,
        status: "failed",
        errorMessage,
      });

      return {
        status: 400,
        body: {
          success: false,
          leadId: null,
          intakeEventId: intakeEvent.id,
          message: errorMessage,
          validationErrors: [errorMessage],
        } satisfies IntakeProcessingResult,
      };
    }

    await updateIntakeEvent(intakeEvent.id, {
      normalizedPayload,
      status: "mapped",
    });

    const nameParts = splitLeadName(fullName ?? email ?? phone ?? "Lead");
    const assignedToEmail = await resolveAssignedUserEmail(formSource.defaultAssignedUserId);
    const normalizedPriority =
      toNormalizedPriority(mappingResult.coreFields.priority) ??
      (formSource.defaultPriority === "medium" ? "normal" : formSource.defaultPriority ?? null);
    const sourceRelationId =
      (await resolveLeadSourceIdByValue(normalizeOptionalString(mappingResult.coreFields.sourceId))) ?? null;
    const legacySource = mapFormSourceTypeToLegacyLeadSource(formSource.type);

    const upsertResult = await leadStore.upsertExternalLead({
      source: legacySource,
      sourceDetail:
        normalizeOptionalString(mappingResult.coreFields.notes) ?? `${formSource.name} webhook`,
      alwaysCreateNewRecord: false,
      firstName: nameParts.firstName,
      lastName: nameParts.lastName || null,
      email,
      whatsappNumber: phone,
      priority: toLegacyPriority(normalizedPriority) ?? "medium",
      assignedTo: assignedToEmail,
      assignedToList: assignedToEmail ? [assignedToEmail] : null,
      crmStatus: "new",
      sourcePayload: rawPayload,
    });

    await updateLeadSalesCommandFields(upsertResult.lead.id, {
      companyName: normalizeOptionalString(mappingResult.coreFields.companyName),
      sourceId: sourceRelationId,
      stageId: formSource.defaultStageId ?? null,
      campaignLabel: normalizeOptionalString(mappingResult.coreFields.campaignLabel),
      assignedUserId: formSource.defaultAssignedUserId ?? null,
      teamId: formSource.defaultTeamId ?? null,
      branchId: formSource.defaultBranchId ?? null,
      departmentId: formSource.defaultDepartmentId ?? null,
      estimatedValue:
        typeof mappingResult.coreFields.estimatedValue === "number"
          ? mappingResult.coreFields.estimatedValue
          : null,
      expectedCloseDate:
        typeof mappingResult.coreFields.expectedCloseDate === "string"
          ? mappingResult.coreFields.expectedCloseDate
          : null,
    });

    await upsertLeadCustomFieldValues(upsertResult.lead.id, mappingResult.customFieldValues);

    if (normalizeOptionalString(mappingResult.coreFields.notes)) {
      await leadStore.addLeadNote({
        leadId: upsertResult.lead.id,
        note: normalizeOptionalString(mappingResult.coreFields.notes) ?? "",
        createdBy: `Webhook • ${formSource.name}`,
      });
    }

    await leadStore.addLeadEvent({
      leadId: upsertResult.lead.id,
      eventType: "intake_received",
      eventData: {
        formSourceId: formSource.id,
        formSourceName: formSource.name,
        intakeEventId: intakeEvent.id,
        created: upsertResult.created,
      },
      createdBy: `Webhook • ${formSource.name}`,
    });

    await updateIntakeEvent(intakeEvent.id, {
      leadId: upsertResult.lead.id,
      normalizedPayload,
      status: "lead_created",
    });

    await notifyWebhookLeadCaptured({
      leadId: upsertResult.lead.id,
      formSourceName: formSource.name,
      leadName: nameParts.fullName,
    });
    await notifyNewLeadAssigned({
      leadId: upsertResult.lead.id,
      recipientUserId: formSource.defaultAssignedUserId ?? null,
      leadName: nameParts.fullName,
    });

    return {
      status: 200,
      body: {
        success: true,
        leadId: upsertResult.lead.id,
        intakeEventId: intakeEvent.id,
        message: upsertResult.created ? "Lead created from webhook." : "Lead updated from webhook.",
      } satisfies IntakeProcessingResult,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook intake could not be processed right now.";

    await updateIntakeEvent(intakeEvent.id, {
      normalizedPayload,
      status: "failed",
      errorMessage: message,
    });

    return {
      status: 500,
      body: {
        success: false,
        leadId: null,
        intakeEventId: intakeEvent.id,
        message: "Webhook intake could not be processed right now.",
        validationErrors: process.env.NODE_ENV === "development" ? [message] : undefined,
      } satisfies IntakeProcessingResult,
    };
  }
}

export async function listLeadIntakeEvents(options: {
  status?: LeadIntakeEventStatus | "all";
  formSourceId?: string;
  dateFrom?: string | null;
  dateTo?: string | null;
  limit?: number;
} = {}) {
  const db = getDb();
  const predicates = [];

  if (options.status && options.status !== "all") {
    predicates.push(eq(leadIntakeEvents.status, options.status));
  }

  if (options.formSourceId) {
    predicates.push(eq(leadIntakeEvents.formSourceId, options.formSourceId));
  }

  if (options.dateFrom) {
    const parsed = new Date(options.dateFrom);
    if (!Number.isNaN(parsed.getTime())) {
      predicates.push(gte(leadIntakeEvents.createdAt, parsed));
    }
  }

  if (options.dateTo) {
    const parsed = new Date(options.dateTo);
    if (!Number.isNaN(parsed.getTime())) {
      predicates.push(lte(leadIntakeEvents.createdAt, parsed));
    }
  }

  const rows = await db
    .select({
      id: leadIntakeEvents.id,
      status: leadIntakeEvents.status,
      formSourceId: leadIntakeEvents.formSourceId,
      leadId: leadIntakeEvents.leadId,
      rawPayload: leadIntakeEvents.rawPayload,
      normalizedPayload: leadIntakeEvents.normalizedPayload,
      errorMessage: leadIntakeEvents.errorMessage,
      createdAt: leadIntakeEvents.createdAt,
      sourceName: formSources.name,
      leadFirstName: leads.firstName,
      leadLastName: leads.lastName,
    })
    .from(leadIntakeEvents)
    .leftJoin(formSources, eq(formSources.id, leadIntakeEvents.formSourceId))
    .leftJoin(leads, eq(leads.id, leadIntakeEvents.leadId))
    .where(predicates.length > 0 ? and(...predicates) : undefined)
    .orderBy(desc(leadIntakeEvents.createdAt))
    .limit(options.limit ?? 100);

  return rows.map<IntakeEventAdminRow>((row) => ({
    id: row.id,
    status: row.status,
    sourceName: row.sourceName ?? null,
    leadId: row.leadId ?? null,
    leadName:
      row.leadId && (row.leadFirstName || row.leadLastName)
        ? `${row.leadFirstName || "Lead"} ${row.leadLastName || ""}`.trim()
        : null,
    errorMessage: row.errorMessage ?? null,
    normalizedSummary: Object.entries(row.normalizedPayload ?? {})
      .slice(0, 6)
      .map(([label, value]) => ({
        label,
        value: serializePayloadValue(value),
      })),
    rawPayload: (row.rawPayload as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
}
