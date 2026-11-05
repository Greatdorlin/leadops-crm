import { asc, desc, eq } from "drizzle-orm";
import { normalizeEmail } from "@/lib/crm/value-normalization";
import type { DatabaseExecutor } from "@/lib/db/client";
import { crmUsers } from "@/lib/db/schema";
import type { CrmUserUpsertInput, LeadStorage } from "./types";
import { mapCrmUserRecord } from "./mappers";

export async function listCrmUsers(
  this: LeadStorage,
  getDatabase: () => DatabaseExecutor,
) {
  const db = getDatabase();
  const records = await db.query.crmUsers.findMany({
    orderBy: [desc(crmUsers.isActive), asc(crmUsers.fullName)],
  });

  return records.map(mapCrmUserRecord);
}

export async function getCrmUserByEmail(
  this: LeadStorage,
  getDatabase: () => DatabaseExecutor,
  email: string,
) {
  const db = getDatabase();
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return null;
  }
  const record = await db.query.crmUsers.findFirst({
    where: eq(crmUsers.email, normalizedEmail),
  });

  return record ? mapCrmUserRecord(record) : null;
}

export async function getCrmUserById(
  this: LeadStorage,
  getDatabase: () => DatabaseExecutor,
  id: string,
) {
  const db = getDatabase();
  const record = await db.query.crmUsers.findFirst({
    where: eq(crmUsers.id, id),
  });

  return record ? mapCrmUserRecord(record) : null;
}

export async function upsertCrmUser(
  this: LeadStorage,
  getDatabase: () => DatabaseExecutor,
  input: CrmUserUpsertInput,
) {
  const db = getDatabase();
  const email = normalizeEmail(input.email);

  if (!email) {
    throw new Error("CRM user email is required.");
  }

  const defaultScope =
    input.role === "admin" ? "all" : input.role === "manager" ? "team" : "own";
  const [record] = await db
    .insert(crmUsers)
    .values({
      email,
      fullName: input.fullName.trim(),
      role: input.role,
      isActive: input.isActive ?? true,
      avatarUrl: input.avatarUrl ?? null,
      accessScope: input.accessScope ?? defaultScope,
      branchId: input.branchId ?? null,
      departmentId: input.departmentId ?? null,
      teamId: input.teamId ?? null,
    })
    .onConflictDoUpdate({
      target: crmUsers.email,
      set: {
        fullName: input.fullName.trim(),
        role: input.role,
        isActive: input.isActive ?? true,
        avatarUrl: input.avatarUrl ?? null,
        ...(input.accessScope !== undefined
          ? { accessScope: input.accessScope }
          : {}),
        ...(input.branchId !== undefined ? { branchId: input.branchId } : {}),
        ...(input.departmentId !== undefined
          ? { departmentId: input.departmentId }
          : {}),
        ...(input.teamId !== undefined ? { teamId: input.teamId } : {}),
        updatedAt: new Date(),
      },
    })
    .returning();

  return mapCrmUserRecord(record);
}

export async function setCrmUserActive(
  this: LeadStorage,
  getDatabase: () => DatabaseExecutor,
  id: string,
  isActive: boolean,
) {
  const db = getDatabase();
  const [updated] = await db
    .update(crmUsers)
    .set({
      isActive,
      updatedAt: new Date(),
    })
    .where(eq(crmUsers.id, id))
    .returning();

  return updated ? mapCrmUserRecord(updated) : null;
}
