import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { z } from "zod";
import type {
  CustomFieldDefinition,
  FormFieldCoreTarget,
  FormFieldMapping,
  FormSource,
  FormSourceType,
  LeadPriority,
} from "@/lib/crm/domain";
import {
  FORM_FIELD_CORE_TARGETS,
  FORM_FIELD_TARGET_TYPES,
  FORM_SOURCE_TYPES,
  LEAD_PRIORITIES,
} from "@/lib/crm/domain";
import { getDb } from "@/lib/db/client";
import {
  branches,
  crmUsers,
  customFields,
  departments,
  formFieldMappings,
  formSources,
  leadStages,
  teams,
} from "@/lib/db/schema";
import type { LeadPriority as LegacyLeadPriority } from "@/lib/pathway-engine/types";

export class FormSourceAdminError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "FormSourceAdminError";
  }
}

export interface AdminFormSourceInput {
  name: string;
  type: FormSourceType;
  sourceId?: string | null;
  webhookKey?: string | null;
  isActive?: boolean;
  defaultStageId?: string | null;
  defaultAssignedUserId?: string | null;
  defaultTeamId?: string | null;
  defaultBranchId?: string | null;
  defaultDepartmentId?: string | null;
  defaultPriority?: LeadPriority | null;
}

export interface AdminFormFieldMappingInput {
  id?: string;
  externalFieldName: string;
  externalFieldLabel?: string | null;
  targetType: "core" | "custom";
  targetField?: FormFieldCoreTarget | null;
  customFieldId?: string | null;
  required?: boolean;
  transformRule?: string | null;
  fallbackValue?: string | null;
}

export interface AdminFormSourceRecord extends FormSource {
  mappings: FormFieldMapping[];
}

export interface FormSourceAdminReferenceData {
  stages: Array<{ id: string; name: string }>;
  users: Array<{ id: string; label: string }>;
  teams: Array<{ id: string; name: string }>;
  branches: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string }>;
  customFields: Array<Pick<CustomFieldDefinition, "id" | "key" | "label" | "type">>;
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeWebhookKey(value: unknown) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return null;
  }

  return normalized.toLowerCase().replace(/\s+/g, "_");
}

function normalizeFieldName(value: unknown) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return "";
  }

  return normalized;
}

function toDomainPriority(value: LegacyLeadPriority | null): LeadPriority | null {
  if (!value) {
    return null;
  }

  if (value === "medium") {
    return "normal";
  }

  return value;
}

function toStoragePriority(value: LeadPriority | null | undefined): LegacyLeadPriority | null {
  if (!value) {
    return null;
  }

  if (value === "normal") {
    return "medium";
  }

  return value;
}

export function filterSelectableCustomMappingFields<T extends { archived: boolean }>(fields: T[]) {
  return fields.filter((field) => !field.archived);
}

export const adminFormSourceSchema = z.object({
  name: z.string().trim().min(1, "Source name is required."),
  type: z.enum(FORM_SOURCE_TYPES),
  sourceId: z.string().trim().optional().nullable(),
  webhookKey: z.string().trim().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  defaultStageId: z.string().trim().optional().nullable(),
  defaultAssignedUserId: z.string().trim().optional().nullable(),
  defaultTeamId: z.string().trim().optional().nullable(),
  defaultBranchId: z.string().trim().optional().nullable(),
  defaultDepartmentId: z.string().trim().optional().nullable(),
  defaultPriority: z.enum(LEAD_PRIORITIES).optional().nullable(),
});

export const adminFormFieldMappingSchema = z
  .object({
    id: z.string().trim().optional(),
    externalFieldName: z.string().trim().min(1, "External field is required."),
    externalFieldLabel: z.string().trim().optional().nullable(),
    targetType: z.enum(FORM_FIELD_TARGET_TYPES),
    targetField: z.enum(FORM_FIELD_CORE_TARGETS).optional().nullable(),
    customFieldId: z.string().trim().optional().nullable(),
    required: z.boolean().optional().default(false),
    transformRule: z.string().trim().optional().nullable(),
    fallbackValue: z.string().trim().optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (!/^[A-Za-z0-9_.-]+$/.test(value.externalFieldName)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "External field names can use letters, numbers, dots, dashes, and underscores only.",
        path: ["externalFieldName"],
      });
    }

    if (value.targetType === "core" && !value.targetField) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose a core field to map to.",
        path: ["targetField"],
      });
    }

    if (value.targetType === "custom" && !value.customFieldId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose a custom field to map to.",
        path: ["customFieldId"],
      });
    }
  });

export const adminFormFieldMappingsSchema = z
  .array(adminFormFieldMappingSchema)
  .superRefine((value, ctx) => {
    const seen = new Set<string>();

    for (const [index, mapping] of value.entries()) {
      const normalizedName = mapping.externalFieldName.trim().toLowerCase();
      if (seen.has(normalizedName)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Each external field can only be mapped once per source.",
          path: [index, "externalFieldName"],
        });
      }
      seen.add(normalizedName);
    }
  });

export function normalizeAdminFormSourcePayload(payload: Record<string, unknown>) {
  return adminFormSourceSchema.safeParse({
    name: normalizeOptionalString(payload.name) ?? "",
    type: payload.type,
    sourceId: normalizeOptionalString(payload.sourceId),
    webhookKey: normalizeWebhookKey(payload.webhookKey),
    isActive: payload.isActive === undefined ? true : Boolean(payload.isActive),
    defaultStageId: normalizeOptionalString(payload.defaultStageId),
    defaultAssignedUserId: normalizeOptionalString(payload.defaultAssignedUserId),
    defaultTeamId: normalizeOptionalString(payload.defaultTeamId),
    defaultBranchId: normalizeOptionalString(payload.defaultBranchId),
    defaultDepartmentId: normalizeOptionalString(payload.defaultDepartmentId),
    defaultPriority: normalizeOptionalString(payload.defaultPriority),
  });
}

export function normalizeAdminFormFieldMappingsPayload(payload: unknown) {
  const mappings = Array.isArray(payload) ? payload : [];

  return adminFormFieldMappingsSchema.safeParse(
    mappings.map((mapping) => {
      const record = typeof mapping === "object" && mapping ? mapping : {};
      return {
        id: typeof record.id === "string" ? record.id : undefined,
        externalFieldName: normalizeFieldName(record.externalFieldName),
        externalFieldLabel: normalizeOptionalString(record.externalFieldLabel),
        targetType: record.targetType,
        targetField: normalizeOptionalString(record.targetField),
        customFieldId: normalizeOptionalString(record.customFieldId),
        required: Boolean(record.required),
        transformRule: normalizeOptionalString(record.transformRule),
        fallbackValue: normalizeOptionalString(record.fallbackValue),
      };
    }),
  );
}

function mapFormSource(row: typeof formSources.$inferSelect): FormSource {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    sourceId: row.sourceId,
    webhookKey: row.webhookKey,
    isActive: row.isActive,
    defaultStageId: row.defaultStageId,
    defaultAssignedUserId: row.defaultAssignedUserId,
    defaultTeamId: row.defaultTeamId,
    defaultBranchId: row.defaultBranchId,
    defaultDepartmentId: row.defaultDepartmentId,
    defaultPriority: toDomainPriority(row.defaultPriority),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapFormFieldMapping(row: typeof formFieldMappings.$inferSelect): FormFieldMapping {
  return {
    id: row.id,
    formSourceId: row.formSourceId,
    externalFieldName: row.externalFieldName,
    externalFieldLabel: row.externalFieldLabel,
    targetType: row.targetType,
    targetField: row.targetField,
    customFieldId: row.customFieldId,
    required: row.required,
    transformRule: row.transformRule,
    fallbackValue: row.fallbackValue,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function assertWebhookKeyAvailable(webhookKey: string | null, currentId?: string) {
  if (!webhookKey) {
    return;
  }

  const db = getDb();
  const existing = await db
    .select({ id: formSources.id })
    .from(formSources)
    .where(
      currentId
        ? and(eq(formSources.webhookKey, webhookKey), ne(formSources.id, currentId))
        : eq(formSources.webhookKey, webhookKey),
    )
    .limit(1);

  if (existing.length > 0) {
    throw new FormSourceAdminError("Webhook key already exists. Choose a different key.");
  }
}

async function assertActiveCustomFieldIds(customFieldIds: string[]) {
  if (customFieldIds.length === 0) {
    return;
  }

  const db = getDb();
  const rows = await db
    .select({ id: customFields.id })
    .from(customFields)
    .where(
      and(
        inArray(customFields.id, customFieldIds),
        eq(customFields.archived, false),
      ),
    );

  const activeIds = new Set(rows.map((row) => row.id));
  const missingId = customFieldIds.find((id) => !activeIds.has(id));
  if (missingId) {
    throw new FormSourceAdminError("Choose an active custom field for every custom mapping.");
  }
}

export async function getFormSourceAdminReferenceData(): Promise<FormSourceAdminReferenceData> {
  const db = getDb();
  const [stageRows, userRows, teamRows, branchRows, departmentRows, customFieldRows] =
    await Promise.all([
      db
        .select({ id: leadStages.id, name: leadStages.name })
        .from(leadStages)
        .where(eq(leadStages.archived, false))
        .orderBy(asc(leadStages.sortOrder), asc(leadStages.name)),
      db
        .select({ id: crmUsers.id, email: crmUsers.email, fullName: crmUsers.fullName })
        .from(crmUsers)
        .where(eq(crmUsers.isActive, true))
        .orderBy(asc(crmUsers.fullName), asc(crmUsers.email)),
      db
        .select({ id: teams.id, name: teams.name })
        .from(teams)
        .where(eq(teams.archived, false))
        .orderBy(asc(teams.name)),
      db
        .select({ id: branches.id, name: branches.name })
        .from(branches)
        .where(eq(branches.archived, false))
        .orderBy(asc(branches.name)),
      db
        .select({ id: departments.id, name: departments.name })
        .from(departments)
        .where(eq(departments.archived, false))
        .orderBy(asc(departments.name)),
      db
        .select({
          id: customFields.id,
          key: customFields.key,
          label: customFields.label,
          type: customFields.type,
          archived: customFields.archived,
        })
        .from(customFields)
        .where(eq(customFields.archived, false))
        .orderBy(asc(customFields.sortOrder), asc(customFields.label)),
    ]);

  return {
    stages: stageRows,
    users: userRows.map((row) => ({
      id: row.id,
      label: row.fullName.trim() || row.email,
    })),
    teams: teamRows,
    branches: branchRows,
    departments: departmentRows,
    customFields: filterSelectableCustomMappingFields(customFieldRows).map((row) => ({
      id: row.id,
      key: row.key,
      label: row.label,
      type: row.type,
    })),
  };
}

export async function listFormFieldMappings(formSourceId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(formFieldMappings)
    .where(eq(formFieldMappings.formSourceId, formSourceId))
    .orderBy(asc(formFieldMappings.externalFieldName), asc(formFieldMappings.createdAt));

  return rows.map(mapFormFieldMapping);
}

export async function listFormSources(options: {
  includeInactive?: boolean;
  includeMappings?: boolean;
} = {}) {
  const db = getDb();
  const rows = await db
    .select()
    .from(formSources)
    .where(options.includeInactive ? undefined : eq(formSources.isActive, true))
    .orderBy(asc(formSources.name), asc(formSources.createdAt));

  const records = rows.map((row) => ({
    ...mapFormSource(row),
    mappings: [] as FormFieldMapping[],
  }));

  if (!options.includeMappings || records.length === 0) {
    return records satisfies AdminFormSourceRecord[];
  }

  const mappingRows = await db
    .select()
    .from(formFieldMappings)
    .where(inArray(formFieldMappings.formSourceId, records.map((record) => record.id)))
    .orderBy(asc(formFieldMappings.externalFieldName), asc(formFieldMappings.createdAt));

  const mappingsBySourceId = new Map<string, FormFieldMapping[]>();
  for (const mapping of mappingRows.map(mapFormFieldMapping)) {
    const current = mappingsBySourceId.get(mapping.formSourceId) ?? [];
    current.push(mapping);
    mappingsBySourceId.set(mapping.formSourceId, current);
  }

  return records.map((record) => ({
    ...record,
    mappings: mappingsBySourceId.get(record.id) ?? [],
  })) satisfies AdminFormSourceRecord[];
}

export async function getFormSource(id: string) {
  const records = await listFormSources({ includeInactive: true, includeMappings: true });
  return records.find((record) => record.id === id) ?? null;
}

export async function createFormSource(input: AdminFormSourceInput) {
  await assertWebhookKeyAvailable(input.webhookKey ?? null);

  const db = getDb();
  const [created] = await db
    .insert(formSources)
    .values({
      name: input.name.trim(),
      type: input.type,
      sourceId: input.sourceId ?? null,
      webhookKey: input.webhookKey ?? null,
      isActive: input.isActive ?? true,
      defaultStageId: input.defaultStageId ?? null,
      defaultAssignedUserId: input.defaultAssignedUserId ?? null,
      defaultTeamId: input.defaultTeamId ?? null,
      defaultBranchId: input.defaultBranchId ?? null,
      defaultDepartmentId: input.defaultDepartmentId ?? null,
      defaultPriority: toStoragePriority(input.defaultPriority),
    })
    .returning();

  return {
    ...mapFormSource(created),
    mappings: [],
  } satisfies AdminFormSourceRecord;
}

export async function updateFormSource(id: string, input: AdminFormSourceInput) {
  const existing = await getFormSource(id);
  if (!existing) {
    throw new FormSourceAdminError("Form source not found.", 404);
  }

  await assertWebhookKeyAvailable(input.webhookKey ?? null, id);

  const db = getDb();
  const [updated] = await db
    .update(formSources)
    .set({
      name: input.name.trim(),
      type: input.type,
      sourceId: input.sourceId ?? null,
      webhookKey: input.webhookKey ?? null,
      isActive: input.isActive ?? true,
      defaultStageId: input.defaultStageId ?? null,
      defaultAssignedUserId: input.defaultAssignedUserId ?? null,
      defaultTeamId: input.defaultTeamId ?? null,
      defaultBranchId: input.defaultBranchId ?? null,
      defaultDepartmentId: input.defaultDepartmentId ?? null,
      defaultPriority: toStoragePriority(input.defaultPriority),
      updatedAt: new Date(),
    })
    .where(eq(formSources.id, id))
    .returning();

  return {
    ...mapFormSource(updated),
    mappings: existing.mappings,
  } satisfies AdminFormSourceRecord;
}

export async function archiveFormSource(id: string) {
  const existing = await getFormSource(id);
  if (!existing) {
    throw new FormSourceAdminError("Form source not found.", 404);
  }

  const db = getDb();
  const [updated] = await db
    .update(formSources)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(eq(formSources.id, id))
    .returning();

  return {
    ...mapFormSource(updated),
    mappings: existing.mappings,
  } satisfies AdminFormSourceRecord;
}

export async function restoreFormSource(id: string) {
  const existing = await getFormSource(id);
  if (!existing) {
    throw new FormSourceAdminError("Form source not found.", 404);
  }

  const db = getDb();
  const [updated] = await db
    .update(formSources)
    .set({
      isActive: true,
      updatedAt: new Date(),
    })
    .where(eq(formSources.id, id))
    .returning();

  return {
    ...mapFormSource(updated),
    mappings: existing.mappings,
  } satisfies AdminFormSourceRecord;
}

export async function upsertFormFieldMappings(
  formSourceId: string,
  mappings: AdminFormFieldMappingInput[],
) {
  const source = await getFormSource(formSourceId);
  if (!source) {
    throw new FormSourceAdminError("Form source not found.", 404);
  }

  const customFieldIds = mappings
    .filter((mapping) => mapping.targetType === "custom")
    .map((mapping) => mapping.customFieldId)
    .filter((value): value is string => Boolean(value));

  await assertActiveCustomFieldIds(customFieldIds);

  const db = getDb();
  await db.transaction(async (tx) => {
    const existingRows = await tx
      .select({ id: formFieldMappings.id })
      .from(formFieldMappings)
      .where(eq(formFieldMappings.formSourceId, formSourceId));

    const existingIds = new Set(existingRows.map((row) => row.id));
    const nextIds = new Set(mappings.map((mapping) => mapping.id).filter((value): value is string => Boolean(value)));

    const idsToDelete = [...existingIds].filter((id) => !nextIds.has(id));
    if (idsToDelete.length > 0) {
      await tx.delete(formFieldMappings).where(inArray(formFieldMappings.id, idsToDelete));
    }

    for (const mapping of mappings) {
      const values = {
        formSourceId,
        externalFieldName: mapping.externalFieldName.trim(),
        externalFieldLabel: mapping.externalFieldLabel ?? null,
        targetType: mapping.targetType,
        targetField: mapping.targetType === "core" ? mapping.targetField ?? null : null,
        customFieldId: mapping.targetType === "custom" ? mapping.customFieldId ?? null : null,
        required: mapping.required ?? false,
        transformRule: mapping.transformRule ?? null,
        fallbackValue: mapping.fallbackValue ?? null,
        updatedAt: new Date(),
      };

      if (mapping.id && existingIds.has(mapping.id)) {
        await tx
          .update(formFieldMappings)
          .set(values)
          .where(eq(formFieldMappings.id, mapping.id));
      } else {
        await tx.insert(formFieldMappings).values(values);
      }
    }
  });

  return listFormFieldMappings(formSourceId);
}
