import { asc, eq, ne, and } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { leadStages } from "@/lib/db/schema";

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
    color: z.string().trim().optional().nullable(),
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
