import { asc, eq, sql, type SQL } from "drizzle-orm";
import type { DatabaseExecutor } from "@/lib/db/client";
import { leads } from "@/lib/db/schema";
import { mapLeadRecord } from './mappers';

export async function findLeadByWhere(getDatabase: () => DatabaseExecutor, where: SQL | undefined) {
    if (!where) {
      return null;
    }

    const db = getDatabase();
    const record = await db.query.leads.findFirst({
      where,
      orderBy: [asc(leads.createdAt)],
    });

    return record ? mapLeadRecord(record) : null;
  }

export function emailEquals(value: string) {
    return sql`lower(trim(${leads.email})) = ${value}`;
  }

export function phoneEquals(value: string) {
    return sql`regexp_replace(coalesce(${leads.whatsappNumber}, ''), '[^0-9+]', '', 'g') = ${value}`;
  }

export async function touchLead(getDatabase: () => DatabaseExecutor, leadId: string) {
    const db = getDatabase();
    await db
      .update(leads)
      .set({
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(leads.id, leadId));
  }
