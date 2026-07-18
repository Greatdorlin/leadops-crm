import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import type { SalesTarget, SalesTargetPeriod, SalesTargetScope } from "@/lib/crm/domain";
import { SALES_TARGET_PERIODS, SALES_TARGET_SCOPES } from "@/lib/crm/domain";
import { getDb } from "@/lib/db/client";
import { branches, crmUsers, departments, salesTargets, teams } from "@/lib/db/schema";

export class SalesTargetAdminError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "SalesTargetAdminError";
  }
}

export interface AdminSalesTargetInput {
  name: string;
  scope: SalesTargetScope;
  scopeId?: string | null;
  period: SalesTargetPeriod;
  targetValue: number;
  currency?: string;
  startDate: string;
  endDate: string;
  isActive?: boolean;
}

export interface AdminSalesTargetRecord extends SalesTarget {
  isActive: boolean;
  archived: boolean;
}

export interface SalesTargetReferenceData {
  teams: Array<{ id: string; name: string }>;
  branches: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string }>;
  users: Array<{ id: string; label: string }>;
}

export type SalesTargetUserScope = Pick<
  typeof crmUsers.$inferSelect,
  "id" | "teamId" | "departmentId" | "branchId"
>;

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export const adminSalesTargetSchema = z
  .object({
    name: z.string().trim().min(1, "Target name is required."),
    scope: z.enum(SALES_TARGET_SCOPES),
    scopeId: z.string().trim().optional().nullable(),
    period: z.enum(SALES_TARGET_PERIODS),
    targetValue: z.coerce.number().positive("Target value must be greater than zero."),
    currency: z.string().trim().min(3).max(8).default("USD"),
    startDate: z.string().trim().min(1, "Start date is required."),
    endDate: z.string().trim().min(1, "End date is required."),
    isActive: z.boolean().optional().default(true),
  })
  .superRefine((value, ctx) => {
    const startDate = new Date(value.startDate);
    const endDate = new Date(value.endDate);

    if (Number.isNaN(startDate.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Start date is invalid.",
        path: ["startDate"],
      });
    }

    if (Number.isNaN(endDate.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date is invalid.",
        path: ["endDate"],
      });
    }

    if (!Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime()) && endDate < startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date must come after the start date.",
        path: ["endDate"],
      });
    }

    if (value.scope !== "global" && !value.scopeId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose a team, branch, department, or user for this target scope.",
        path: ["scopeId"],
      });
    }
  });

export function normalizeAdminSalesTargetPayload(payload: Record<string, unknown>) {
  return adminSalesTargetSchema.safeParse({
    name: normalizeOptionalString(payload.name) ?? "",
    scope: payload.scope,
    scopeId: normalizeOptionalString(payload.scopeId),
    period: payload.period,
    targetValue: payload.targetValue ?? 0,
    currency: normalizeOptionalString(payload.currency) ?? "USD",
    startDate: normalizeOptionalString(payload.startDate) ?? "",
    endDate: normalizeOptionalString(payload.endDate) ?? "",
    isActive: payload.isActive === undefined ? true : Boolean(payload.isActive),
  });
}

function mapSalesTarget(row: typeof salesTargets.$inferSelect): AdminSalesTargetRecord {
  return {
    id: row.id,
    name: row.name,
    scope: row.scope,
    scopeId: row.scopeId,
    period: row.period,
    targetValue: Number.parseFloat(row.targetValue),
    currency: row.currency,
    startDate: row.startDate,
    endDate: row.endDate,
    isActive: row.isActive,
    archived: row.archived,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const SALES_TARGET_SCOPE_PRECEDENCE: Record<SalesTargetScope, number> = {
  user: 0,
  team: 1,
  department: 2,
  branch: 3,
  global: 4,
};

function targetMatchesUser(target: AdminSalesTargetRecord, user: SalesTargetUserScope | null) {
  if (target.scope === "global") {
    return true;
  }

  if (!user || !target.scopeId) {
    return false;
  }

  const scopeIdByType = {
    user: user.id,
    team: user.teamId,
    department: user.departmentId,
    branch: user.branchId,
  };

  return target.scopeId === scopeIdByType[target.scope];
}

export function resolveSalesTargetForUser(
  targets: AdminSalesTargetRecord[],
  user: SalesTargetUserScope | null,
  now = new Date(),
) {
  const today = now.toISOString().slice(0, 10);

  return (
    targets
      .filter(
        (target) =>
          target.isActive &&
          !target.archived &&
          target.startDate <= today &&
          target.endDate >= today &&
          targetMatchesUser(target, user),
      )
      .sort((left, right) => {
        const precedence =
          SALES_TARGET_SCOPE_PRECEDENCE[left.scope] -
          SALES_TARGET_SCOPE_PRECEDENCE[right.scope];
        if (precedence !== 0) {
          return precedence;
        }

        return right.createdAt.localeCompare(left.createdAt);
      })[0] ?? null
  );
}

async function assertSalesTargetScopeExists(input: AdminSalesTargetInput) {
  if (input.scope === "global") {
    return;
  }

  const scopeId = input.scopeId?.trim();
  if (!scopeId) {
    throw new SalesTargetAdminError("Choose a valid target scope.");
  }

  const db = getDb();
  const row =
    input.scope === "user"
      ? await db.query.crmUsers.findFirst({
          columns: { id: true },
          where: and(eq(crmUsers.id, scopeId), eq(crmUsers.isActive, true)),
        })
      : input.scope === "team"
        ? await db.query.teams.findFirst({
            columns: { id: true },
            where: and(eq(teams.id, scopeId), eq(teams.archived, false)),
          })
        : input.scope === "department"
          ? await db.query.departments.findFirst({
              columns: { id: true },
              where: and(eq(departments.id, scopeId), eq(departments.archived, false)),
            })
          : await db.query.branches.findFirst({
              columns: { id: true },
              where: and(eq(branches.id, scopeId), eq(branches.archived, false)),
            });

  if (!row) {
    throw new SalesTargetAdminError("The selected target scope is unavailable.");
  }
}

export async function getSalesTargetReferenceData(): Promise<SalesTargetReferenceData> {
  const db = getDb();
  const [teamRows, branchRows, departmentRows, userRows] = await Promise.all([
    db.select({ id: teams.id, name: teams.name }).from(teams).where(eq(teams.archived, false)).orderBy(asc(teams.name)),
    db.select({ id: branches.id, name: branches.name }).from(branches).where(eq(branches.archived, false)).orderBy(asc(branches.name)),
    db.select({ id: departments.id, name: departments.name }).from(departments).where(eq(departments.archived, false)).orderBy(asc(departments.name)),
    db.select({ id: crmUsers.id, fullName: crmUsers.fullName, email: crmUsers.email }).from(crmUsers).where(eq(crmUsers.isActive, true)).orderBy(asc(crmUsers.fullName), asc(crmUsers.email)),
  ]);

  return {
    teams: teamRows,
    branches: branchRows,
    departments: departmentRows,
    users: userRows.map((row) => ({ id: row.id, label: row.fullName.trim() || row.email })),
  };
}

export async function listSalesTargets(options: { includeArchived?: boolean } = {}) {
  const db = getDb();
  const rows = await db
    .select()
    .from(salesTargets)
    .where(options.includeArchived ? undefined : eq(salesTargets.archived, false))
    .orderBy(desc(salesTargets.startDate), asc(salesTargets.name));

  return rows.map(mapSalesTarget);
}

export async function getSalesTarget(id: string) {
  const targets = await listSalesTargets({ includeArchived: true });
  return targets.find((target) => target.id === id) ?? null;
}

export async function createSalesTarget(input: AdminSalesTargetInput) {
  await assertSalesTargetScopeExists(input);
  const db = getDb();
  const [created] = await db
    .insert(salesTargets)
    .values({
      name: input.name.trim(),
      scope: input.scope,
      scopeId: input.scope === "global" ? null : input.scopeId ?? null,
      period: input.period,
      targetValue: input.targetValue.toFixed(2),
      currency: (input.currency ?? "USD").trim().toUpperCase(),
      startDate: input.startDate,
      endDate: input.endDate,
      isActive: input.isActive ?? true,
      archived: false,
    })
    .returning();

  return created ? mapSalesTarget(created) : null;
}

export async function updateSalesTarget(id: string, input: AdminSalesTargetInput) {
  await assertSalesTargetScopeExists(input);
  const db = getDb();
  const [updated] = await db
    .update(salesTargets)
    .set({
      name: input.name.trim(),
      scope: input.scope,
      scopeId: input.scope === "global" ? null : input.scopeId ?? null,
      period: input.period,
      targetValue: input.targetValue.toFixed(2),
      currency: (input.currency ?? "USD").trim().toUpperCase(),
      startDate: input.startDate,
      endDate: input.endDate,
      isActive: input.isActive ?? true,
      updatedAt: new Date(),
    })
    .where(eq(salesTargets.id, id))
    .returning();

  if (!updated) {
    throw new SalesTargetAdminError("Sales target not found.", 404);
  }

  return mapSalesTarget(updated);
}

export async function archiveSalesTarget(id: string) {
  const db = getDb();
  const [updated] = await db
    .update(salesTargets)
    .set({
      archived: true,
      isActive: false,
      updatedAt: new Date(),
    })
    .where(eq(salesTargets.id, id))
    .returning();

  if (!updated) {
    throw new SalesTargetAdminError("Sales target not found.", 404);
  }

  return mapSalesTarget(updated);
}

export async function restoreSalesTarget(id: string) {
  const db = getDb();
  const [updated] = await db
    .update(salesTargets)
    .set({
      archived: false,
      isActive: true,
      updatedAt: new Date(),
    })
    .where(eq(salesTargets.id, id))
    .returning();

  if (!updated) {
    throw new SalesTargetAdminError("Sales target not found.", 404);
  }

  return mapSalesTarget(updated);
}

export async function getActiveGlobalSalesTarget(now = new Date()) {
  return getResolvedSalesTargetForUser(null, now);
}

export async function getResolvedSalesTargetForUser(
  user: SalesTargetUserScope | null,
  now = new Date(),
) {
  const db = getDb();
  const today = now.toISOString().slice(0, 10);
  const rows = await db
    .select()
    .from(salesTargets)
    .where(
      and(
        eq(salesTargets.archived, false),
        eq(salesTargets.isActive, true),
        lte(salesTargets.startDate, today),
        gte(salesTargets.endDate, today),
      ),
    )
    .orderBy(desc(salesTargets.createdAt));

  return resolveSalesTargetForUser(rows.map(mapSalesTarget), user, now);
}

export function buildSalesTargetProgress(input: {
  targetValue: number;
  wonValue: number;
  expectedPipelineValue: number;
  conversionRate: number;
  periodStart: string;
  periodEnd: string;
}) {
  const remainingValue = Math.max(0, input.targetValue - input.wonValue);
  const progressPercent =
    input.targetValue > 0 ? Math.min(100, Number.parseFloat(((input.wonValue / input.targetValue) * 100).toFixed(2))) : 0;

  return {
    targetValue: input.targetValue,
    wonValue: input.wonValue,
    expectedPipelineValue: input.expectedPipelineValue,
    conversionRate: input.conversionRate,
    progressPercent,
    remainingValue,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
  };
}
