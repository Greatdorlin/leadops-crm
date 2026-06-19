import { and, asc, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { leadSources } from "@/lib/db/schema";

export class LeadSourceAdminError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "LeadSourceAdminError";
  }
}

export interface AdminLeadSourceInput {
  name: string;
  key?: string | null;
  type?: string | null;
  color?: string | null;
}

export interface AdminLeadSourceRecord {
  id: string;
  name: string;
  key: string;
  type: string | null;
  color: string | null;
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

export function generateLeadSourceKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_");
}

export const adminLeadSourceSchema = z
  .object({
    name: z.string().trim().min(1, "Source name is required."),
    key: z.string().trim().optional().nullable(),
    type: z.string().trim().optional().nullable(),
    color: z.string().trim().optional().nullable(),
  })
  .superRefine((value, ctx) => {
    const key = generateLeadSourceKey(value.key || value.name);
    if (!key) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Source key is required.",
        path: ["key"],
      });
    }
  });

export function normalizeAdminLeadSourcePayload(payload: Record<string, unknown>) {
  return adminLeadSourceSchema.safeParse({
    name: normalizeOptionalString(payload.name) ?? "",
    key: normalizeOptionalString(payload.key),
    type: normalizeOptionalString(payload.type),
    color: normalizeOptionalString(payload.color),
  });
}

function mapLeadSource(row: typeof leadSources.$inferSelect): AdminLeadSourceRecord {
  return {
    id: row.id,
    name: row.name,
    key: row.key,
    type: row.type,
    color: row.color,
    archived: row.archived,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function assertLeadSourceKeyAvailable(key: string, currentId?: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: leadSources.id })
    .from(leadSources)
    .where(currentId ? and(eq(leadSources.key, key), ne(leadSources.id, currentId)) : eq(leadSources.key, key))
    .limit(1);

  if (row) {
    throw new LeadSourceAdminError("Source key already exists.");
  }
}

export async function listLeadSources(options: { includeArchived?: boolean } = {}) {
  const db = getDb();
  const rows = await db
    .select()
    .from(leadSources)
    .where(options.includeArchived ? undefined : eq(leadSources.archived, false))
    .orderBy(asc(leadSources.name));

  return rows.map(mapLeadSource);
}

export async function createLeadSource(input: AdminLeadSourceInput) {
  const db = getDb();
  const key = generateLeadSourceKey(input.key || input.name);
  await assertLeadSourceKeyAvailable(key);
  const [created] = await db
    .insert(leadSources)
    .values({
      name: input.name.trim(),
      key,
      type: input.type ?? null,
      color: input.color ?? null,
      archived: false,
    })
    .returning();

  return created ? mapLeadSource(created) : null;
}

export async function updateLeadSource(id: string, input: AdminLeadSourceInput) {
  const db = getDb();
  const key = generateLeadSourceKey(input.key || input.name);
  await assertLeadSourceKeyAvailable(key, id);
  const [updated] = await db
    .update(leadSources)
    .set({
      name: input.name.trim(),
      key,
      type: input.type ?? null,
      color: input.color ?? null,
      updatedAt: new Date(),
    })
    .where(eq(leadSources.id, id))
    .returning();

  if (!updated) {
    throw new LeadSourceAdminError("Lead source not found.", 404);
  }

  return mapLeadSource(updated);
}

export async function archiveLeadSource(id: string) {
  const db = getDb();
  const [updated] = await db
    .update(leadSources)
    .set({ archived: true, updatedAt: new Date() })
    .where(eq(leadSources.id, id))
    .returning();

  if (!updated) {
    throw new LeadSourceAdminError("Lead source not found.", 404);
  }

  return mapLeadSource(updated);
}

export async function restoreLeadSource(id: string) {
  const db = getDb();
  const [updated] = await db
    .update(leadSources)
    .set({ archived: false, updatedAt: new Date() })
    .where(eq(leadSources.id, id))
    .returning();

  if (!updated) {
    throw new LeadSourceAdminError("Lead source not found.", 404);
  }

  return mapLeadSource(updated);
}
