import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";
import type { CustomFieldDefinition, CustomFieldOption, CustomFieldType } from "@/lib/crm/domain";
import { CUSTOM_FIELD_TYPES } from "@/lib/crm/domain";
import { getDb } from "@/lib/db/client";
import {
  customFieldOptions,
  customFields,
  leadCustomFieldValues,
} from "@/lib/db/schema";

const SELECT_LIKE_TYPES = new Set<CustomFieldType>(["select", "multi_select"]);

export class CustomFieldAdminError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "CustomFieldAdminError";
  }
}

export interface AdminCustomFieldOptionInput {
  id?: string;
  label: string;
  value?: string | null;
  color?: string | null;
  sortOrder?: number;
  archived?: boolean;
}

export interface AdminCustomFieldInput {
  label: string;
  key?: string | null;
  type: CustomFieldType;
  description?: string | null;
  placeholder?: string | null;
  required?: boolean;
  showInTable?: boolean;
  showInForm?: boolean;
  showInDetails?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  sortOrder?: number;
  options?: AdminCustomFieldOptionInput[];
}

export interface AdminCustomFieldRecord extends CustomFieldDefinition {
  options: CustomFieldOption[];
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeOptionalNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

export function generateCustomFieldKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_");
}

export function isSelectLikeCustomFieldType(type: CustomFieldType) {
  return SELECT_LIKE_TYPES.has(type);
}

export const adminCustomFieldOptionSchema = z.object({
  id: z.string().trim().optional(),
  label: z.string().trim().min(1, "Option label is required."),
  value: z.string().trim().optional().nullable(),
  color: z.string().trim().optional().nullable(),
  sortOrder: z.coerce.number().int().default(0),
  archived: z.boolean().optional().default(false),
});

export const adminCustomFieldSchema = z
  .object({
    label: z.string().trim().min(1, "Field name is required."),
    key: z.string().trim().optional().nullable(),
    type: z.enum(CUSTOM_FIELD_TYPES),
    description: z.string().trim().optional().nullable(),
    placeholder: z.string().trim().optional().nullable(),
    required: z.boolean().optional().default(false),
    showInTable: z.boolean().optional().default(false),
    showInForm: z.boolean().optional().default(true),
    showInDetails: z.boolean().optional().default(true),
    searchable: z.boolean().optional().default(false),
    filterable: z.boolean().optional().default(false),
    sortOrder: z.coerce.number().int().default(0),
    options: z.array(adminCustomFieldOptionSchema).optional().default([]),
  })
  .superRefine((value, ctx) => {
    const nextKey = generateCustomFieldKey(value.key || value.label);

    if (!nextKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add a field name before saving.",
        path: ["label"],
      });
    }

    if (!/^[a-z0-9_]+$/.test(nextKey)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Field key must use letters, numbers, and underscores only.",
        path: ["key"],
      });
    }

    if (isSelectLikeCustomFieldType(value.type)) {
      const activeOptions = value.options.filter((option) => !option.archived);
      if (activeOptions.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Add at least one option for this field type.",
          path: ["options"],
        });
      }
    }
  });

export function normalizeAdminCustomFieldPayload(payload: Record<string, unknown>) {
  return adminCustomFieldSchema.safeParse({
    label: normalizeOptionalString(payload.label) ?? "",
    key: normalizeOptionalString(payload.key),
    type: payload.type,
    description: normalizeOptionalString(payload.description),
    placeholder: normalizeOptionalString(payload.placeholder),
    required: Boolean(payload.required),
    showInTable: Boolean(payload.showInTable),
    showInForm: payload.showInForm === undefined ? true : Boolean(payload.showInForm),
    showInDetails: payload.showInDetails === undefined ? true : Boolean(payload.showInDetails),
    searchable: Boolean(payload.searchable),
    filterable: Boolean(payload.filterable),
    sortOrder: normalizeOptionalNumber(payload.sortOrder, 0),
    options: Array.isArray(payload.options)
      ? payload.options.map((option, index) => {
          const record = typeof option === "object" && option ? option : {};
          return {
            id: typeof record.id === "string" ? record.id : undefined,
            label: normalizeOptionalString(record.label) ?? "",
            value: normalizeOptionalString(record.value),
            color: normalizeOptionalString(record.color),
            sortOrder: normalizeOptionalNumber(record.sortOrder, index),
            archived: Boolean(record.archived),
          };
        })
      : [],
  });
}

function mapCustomFieldDefinition(row: typeof customFields.$inferSelect): CustomFieldDefinition {
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    type: row.type,
    description: row.description,
    placeholder: row.placeholder,
    required: row.required,
    archived: row.archived,
    showInTable: row.showInTable,
    showInForm: row.showInForm,
    showInDetails: row.showInDetails,
    searchable: row.searchable,
    filterable: row.filterable,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapCustomFieldOption(row: typeof customFieldOptions.$inferSelect): CustomFieldOption {
  return {
    id: row.id,
    customFieldId: row.customFieldId,
    label: row.label,
    value: row.value,
    color: row.color,
    sortOrder: row.sortOrder,
    archived: row.archived,
  };
}

export function filterVisibleCustomFields<T extends { archived: boolean }>(
  fields: T[],
  includeArchived = false,
) {
  return includeArchived ? fields : fields.filter((field) => !field.archived);
}

export function buildCustomFieldOptionOperations(
  existingOptions: CustomFieldOption[],
  nextOptions: AdminCustomFieldOptionInput[],
) {
  const existingById = new Map(existingOptions.map((option) => [option.id, option]));
  const seenIds = new Set<string>();
  const toCreate: Array<Omit<CustomFieldOption, "id" | "customFieldId">> = [];
  const toUpdate: CustomFieldOption[] = [];
  const toArchive: CustomFieldOption[] = [];

  for (const [index, option] of nextOptions.entries()) {
    const normalizedValue = generateCustomFieldKey(option.value || option.label);
    const normalizedOption = {
      label: option.label.trim(),
      value: normalizedValue || generateCustomFieldKey(`option_${index + 1}`),
      color: normalizeOptionalString(option.color),
      sortOrder: option.sortOrder ?? index,
      archived: option.archived ?? false,
    };

    if (option.id && existingById.has(option.id)) {
      seenIds.add(option.id);
      const existing = existingById.get(option.id)!;
      toUpdate.push({
        ...existing,
        ...normalizedOption,
      });
      continue;
    }

    toCreate.push(normalizedOption);
  }

  for (const option of existingOptions) {
    if (!seenIds.has(option.id) && !option.archived) {
      toArchive.push({
        ...option,
        archived: true,
      });
    }
  }

  return {
    toCreate,
    toUpdate,
    toArchive,
  };
}

async function assertCustomFieldKeyAvailable(key: string, currentId?: string) {
  const db = getDb();
  const existing = await db
    .select({ id: customFields.id })
    .from(customFields)
    .where(
      currentId
        ? and(eq(customFields.key, key), ne(customFields.id, currentId))
        : eq(customFields.key, key),
    )
    .limit(1);

  if (existing.length > 0) {
    throw new CustomFieldAdminError("Field key already exists. Choose a different field name or key.");
  }
}

async function assertTypeChangeIsAllowed(fieldId: string, nextType: CustomFieldType, currentType: CustomFieldType) {
  if (nextType === currentType) {
    return;
  }

  const db = getDb();
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(leadCustomFieldValues)
    .where(eq(leadCustomFieldValues.customFieldId, fieldId));

  if ((result[0]?.count ?? 0) > 0) {
    throw new CustomFieldAdminError(
      "This field already has saved values, so its field type cannot change yet.",
    );
  }
}

export async function listCustomFields(options: { includeArchived?: boolean } = {}) {
  const db = getDb();
  const rows = await db
    .select()
    .from(customFields)
    .where(options.includeArchived ? undefined : eq(customFields.archived, false))
    .orderBy(asc(customFields.sortOrder), asc(customFields.label));
  const fieldRecords = rows.map(mapCustomFieldDefinition);

  if (fieldRecords.length === 0) {
    return [] as AdminCustomFieldRecord[];
  }

  const optionRows = await db
    .select()
    .from(customFieldOptions)
    .where(inArray(customFieldOptions.customFieldId, fieldRecords.map((field) => field.id)))
    .orderBy(asc(customFieldOptions.sortOrder), asc(customFieldOptions.label));
  const optionsByFieldId = new Map<string, CustomFieldOption[]>();

  for (const row of optionRows.map(mapCustomFieldOption)) {
    const list = optionsByFieldId.get(row.customFieldId) ?? [];
    list.push(row);
    optionsByFieldId.set(row.customFieldId, list);
  }

  return fieldRecords.map((field) => ({
    ...field,
    options: optionsByFieldId.get(field.id) ?? [],
  }));
}

export async function getCustomField(id: string) {
  const fields = await listCustomFields({ includeArchived: true });
  return fields.find((field) => field.id === id) ?? null;
}

export async function listCustomFieldOptions(fieldId: string, options: { includeArchived?: boolean } = {}) {
  const db = getDb();
  const rows = await db
    .select()
    .from(customFieldOptions)
    .where(eq(customFieldOptions.customFieldId, fieldId))
    .orderBy(asc(customFieldOptions.sortOrder), asc(customFieldOptions.label));

  return filterVisibleCustomFields(rows.map(mapCustomFieldOption), options.includeArchived ?? true);
}

export async function upsertCustomFieldOptions(fieldId: string, nextOptions: AdminCustomFieldOptionInput[]) {
  const db = getDb();
  const existingOptions = await listCustomFieldOptions(fieldId, { includeArchived: true });
  const operations = buildCustomFieldOptionOperations(existingOptions, nextOptions);

  if (operations.toCreate.length > 0) {
    await db.insert(customFieldOptions).values(
      operations.toCreate.map((option) => ({
        customFieldId: fieldId,
        label: option.label,
        value: option.value,
        color: option.color,
        sortOrder: option.sortOrder,
        archived: option.archived,
      })),
    );
  }

  for (const option of [...operations.toUpdate, ...operations.toArchive]) {
    await db
      .update(customFieldOptions)
      .set({
        label: option.label,
        value: option.value,
        color: option.color,
        sortOrder: option.sortOrder,
        archived: option.archived,
        updatedAt: new Date(),
      })
      .where(eq(customFieldOptions.id, option.id));
  }
}

export async function createCustomField(input: AdminCustomFieldInput) {
  const key = generateCustomFieldKey(input.key || input.label);
  await assertCustomFieldKeyAvailable(key);
  const db = getDb();
  const [created] = await db
    .insert(customFields)
    .values({
      key,
      label: input.label.trim(),
      type: input.type,
      description: normalizeOptionalString(input.description),
      placeholder: normalizeOptionalString(input.placeholder),
      required: input.required ?? false,
      archived: false,
      showInTable: input.showInTable ?? false,
      showInForm: input.showInForm ?? true,
      showInDetails: input.showInDetails ?? true,
      searchable: input.searchable ?? false,
      filterable: input.filterable ?? false,
      sortOrder: input.sortOrder ?? 0,
    })
    .returning();

  if (isSelectLikeCustomFieldType(input.type) && input.options?.length) {
    await upsertCustomFieldOptions(created.id, input.options);
  }

  return getCustomField(created.id);
}

export async function updateCustomField(id: string, input: AdminCustomFieldInput) {
  const db = getDb();
  const existing = await db.query.customFields.findFirst({
    where: eq(customFields.id, id),
  });

  if (!existing) {
    throw new CustomFieldAdminError("Custom field not found.", 404);
  }

  const key = generateCustomFieldKey(input.key || input.label);
  await assertCustomFieldKeyAvailable(key, id);
  await assertTypeChangeIsAllowed(id, input.type, existing.type);

  await db
    .update(customFields)
    .set({
      key,
      label: input.label.trim(),
      type: input.type,
      description: normalizeOptionalString(input.description),
      placeholder: normalizeOptionalString(input.placeholder),
      required: input.required ?? false,
      showInTable: input.showInTable ?? false,
      showInForm: input.showInForm ?? true,
      showInDetails: input.showInDetails ?? true,
      searchable: input.searchable ?? false,
      filterable: input.filterable ?? false,
      sortOrder: input.sortOrder ?? 0,
      updatedAt: new Date(),
    })
    .where(eq(customFields.id, id));

  if (isSelectLikeCustomFieldType(input.type)) {
    await upsertCustomFieldOptions(id, input.options ?? []);
  } else {
    const existingOptions = await listCustomFieldOptions(id, { includeArchived: true });
    if (existingOptions.length > 0) {
      await upsertCustomFieldOptions(
        id,
        existingOptions.map((option) => ({ ...option, archived: true })),
      );
    }
  }

  return getCustomField(id);
}

export async function archiveCustomField(id: string) {
  const db = getDb();
  const [updated] = await db
    .update(customFields)
    .set({
      archived: true,
      updatedAt: new Date(),
    })
    .where(eq(customFields.id, id))
    .returning();

  if (!updated) {
    throw new CustomFieldAdminError("Custom field not found.", 404);
  }

  return getCustomField(id);
}

export async function restoreCustomField(id: string) {
  const db = getDb();
  const [updated] = await db
    .update(customFields)
    .set({
      archived: false,
      updatedAt: new Date(),
    })
    .where(eq(customFields.id, id))
    .returning();

  if (!updated) {
    throw new CustomFieldAdminError("Custom field not found.", 404);
  }

  return getCustomField(id);
}
