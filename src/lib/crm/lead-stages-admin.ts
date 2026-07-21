import { asc, count, eq, ne, and, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { formRules, forms, formSources, leads, leadStages } from "@/lib/db/schema";

const STAGE_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

export class LeadStageAdminError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "LeadStageAdminError";
  }
}

export interface AdminLeadStageInput {
  name: string;
  key?: string | null;
  color?: string | null;
  sortOrder?: number;
  isWon?: boolean;
  isLost?: boolean;
}

export interface AdminLeadStageRecord {
  id: string;
  name: string;
  key: string;
  color: string | null;
  sortOrder: number;
  isWon: boolean;
  isLost: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function generateLeadStageKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_");
}

export const adminLeadStageSchema = z
  .object({
    name: z.string().trim().min(1, "Stage name is required."),
    key: z.string().trim().optional().nullable(),
    color: z
      .string()
      .trim()
      .regex(STAGE_COLOR_PATTERN, "Choose a valid stage color.")
      .optional()
      .nullable(),
    sortOrder: z.coerce.number().int().default(0),
    isWon: z.boolean().optional().default(false),
    isLost: z.boolean().optional().default(false),
  })
  .superRefine((value, ctx) => {
    const key = generateLeadStageKey(value.key || value.name);
    if (!key) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Stage key is required.",
        path: ["key"],
      });
    }
  });

export function normalizeAdminLeadStagePayload(payload: Record<string, unknown>) {
  return adminLeadStageSchema.safeParse({
    name: normalizeOptionalString(payload.name) ?? "",
    key: normalizeOptionalString(payload.key),
    color: normalizeOptionalString(payload.color),
    sortOrder: payload.sortOrder ?? 0,
    isWon: Boolean(payload.isWon),
    isLost: Boolean(payload.isLost),
  });
}

function mapLeadStage(row: typeof leadStages.$inferSelect): AdminLeadStageRecord {
  return {
    id: row.id,
    name: row.name,
    key: row.key,
    color: row.color,
    sortOrder: row.sortOrder,
    isWon: row.isWon,
    isLost: row.isLost,
    archived: row.archived,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function assertLeadStageKeyAvailable(key: string, currentId?: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: leadStages.id })
    .from(leadStages)
    .where(currentId ? and(eq(leadStages.key, key), ne(leadStages.id, currentId)) : eq(leadStages.key, key))
    .limit(1);

  if (row) {
    throw new LeadStageAdminError("Stage key already exists.");
  }
}

export async function listLeadStages(options: { includeArchived?: boolean } = {}) {
  const db = getDb();
  const rows = await db
    .select()
    .from(leadStages)
    .where(options.includeArchived ? undefined : eq(leadStages.archived, false))
    .orderBy(asc(leadStages.sortOrder), asc(leadStages.name));

  return rows.map(mapLeadStage);
}

export async function createLeadStage(input: AdminLeadStageInput) {
  const db = getDb();
  const key = generateLeadStageKey(input.key || input.name);
  await assertLeadStageKeyAvailable(key);
  const [created] = await db
    .insert(leadStages)
    .values({
      name: input.name.trim(),
      key,
      color: input.color ?? null,
      sortOrder: input.sortOrder ?? 0,
      isWon: input.isWon ?? false,
      isLost: input.isLost ?? false,
      archived: false,
    })
    .returning();

  return created ? mapLeadStage(created) : null;
}

export async function updateLeadStage(id: string, input: AdminLeadStageInput) {
  const db = getDb();
  const key = generateLeadStageKey(input.key || input.name);
  await assertLeadStageKeyAvailable(key, id);
  const [updated] = await db
    .update(leadStages)
    .set({
      name: input.name.trim(),
      key,
      color: input.color ?? null,
      sortOrder: input.sortOrder ?? 0,
      isWon: input.isWon ?? false,
      isLost: input.isLost ?? false,
      updatedAt: new Date(),
    })
    .where(eq(leadStages.id, id))
    .returning();

  if (!updated) {
    throw new LeadStageAdminError("Lead stage not found.", 404);
  }

  return mapLeadStage(updated);
}

export async function archiveLeadStage(id: string) {
  const db = getDb();
  const [updated] = await db
    .update(leadStages)
    .set({ archived: true, updatedAt: new Date() })
    .where(eq(leadStages.id, id))
    .returning();

  if (!updated) {
    throw new LeadStageAdminError("Lead stage not found.", 404);
  }

  return mapLeadStage(updated);
}

export async function restoreLeadStage(id: string) {
  const db = getDb();
  const [updated] = await db
    .update(leadStages)
    .set({ archived: false, updatedAt: new Date() })
    .where(eq(leadStages.id, id))
    .returning();

  if (!updated) {
    throw new LeadStageAdminError("Lead stage not found.", 404);
  }

  return mapLeadStage(updated);
}

export interface LeadStageReferenceCounts {
  leads: number;
  formSources: number;
  forms: number;
  formRules: number;
}

function totalReferences(counts: LeadStageReferenceCounts) {
  return counts.leads + counts.formSources + counts.forms + counts.formRules;
}

export function formatLeadStageDeleteConflict(counts: LeadStageReferenceCounts) {
  const references = [
    counts.leads ? `${counts.leads} lead${counts.leads === 1 ? "" : "s"}` : null,
    counts.formSources ? `${counts.formSources} form source${counts.formSources === 1 ? "" : "s"}` : null,
    counts.forms ? `${counts.forms} form${counts.forms === 1 ? "" : "s"}` : null,
    counts.formRules ? `${counts.formRules} automation rule${counts.formRules === 1 ? "" : "s"}` : null,
  ].filter(Boolean);

  return `This stage is still used by ${references.join(", ")}. Reassign or update them, then try again.`;
}

export async function deleteLeadStage(id: string) {
  const db = getDb();

  return db.transaction(async (tx) => {
    const [stage] = await tx
      .select({ id: leadStages.id, key: leadStages.key })
      .from(leadStages)
      .where(eq(leadStages.id, id))
      .for("update")
      .limit(1);

    if (!stage) {
      throw new LeadStageAdminError("Lead stage not found.", 404);
    }

    const [leadCount] = await tx.select({ value: count() }).from(leads).where(eq(leads.stageId, id));
    const [sourceCount] = await tx
      .select({ value: count() })
      .from(formSources)
      .where(eq(formSources.defaultStageId, id));
    const [formCount] = await tx
      .select({ value: count() })
      .from(forms)
      .where(sql`${forms.defaultStatus} = ${stage.key} or ${forms.autoQualifyRules} @> ${JSON.stringify([{ stageKey: stage.key }])}::jsonb`);
    const [ruleCount] = await tx
      .select({ value: count() })
      .from(formRules)
      .where(
        and(
          inArray(formRules.actionType, ["set_stage", "set_status"]),
          eq(formRules.actionValue, stage.key),
        ),
      );

    const references: LeadStageReferenceCounts = {
      leads: Number(leadCount?.value ?? 0),
      formSources: Number(sourceCount?.value ?? 0),
      forms: Number(formCount?.value ?? 0),
      formRules: Number(ruleCount?.value ?? 0),
    };

    if (totalReferences(references) > 0) {
      throw new LeadStageAdminError(formatLeadStageDeleteConflict(references), 409);
    }

    const [deleted] = await tx
      .delete(leadStages)
      .where(eq(leadStages.id, id))
      .returning({ id: leadStages.id });
    if (!deleted) {
      throw new LeadStageAdminError("Lead stage not found.", 404);
    }

    return deleted;
  });
}
