import { and, asc, desc, eq, gt, lt, or, sql, type SQL } from "drizzle-orm";
import { decodeLeadCursor } from "@/lib/crm/lead-pagination";
import type { DatabaseExecutor } from "@/lib/db/client";
import { leads } from "@/lib/db/schema";
import type { LeadListFilters, LeadStorage } from "./types";
import { mapLeadRecord } from './mappers';
import { buildLeadListConditions } from './filters';

export async function getById(this: LeadStorage, getDatabase: () => DatabaseExecutor, id: string) {
    const db = getDatabase();
    const record = await db.query.leads.findFirst({
      where: eq(leads.id, id),
    });

    return record ? mapLeadRecord(record) : null;
  }

export async function list(this: LeadStorage, getDatabase: () => DatabaseExecutor, filters: LeadListFilters = {}) {
    const db = getDatabase();
    const conditions = buildLeadListConditions(filters);

    const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);
    const cursor = decodeLeadCursor(filters.cursor);
    const direction = cursor ? filters.cursorDirection ?? "next" : "next";

    if (cursor) {
      const cursorUpdatedAt = new Date(cursor.updatedAt);
      conditions.push(
        direction === "next"
          ? or(
              lt(leads.updatedAt, cursorUpdatedAt),
              and(eq(leads.updatedAt, cursorUpdatedAt), lt(leads.id, cursor.id)),
            ) as SQL
          : or(
              gt(leads.updatedAt, cursorUpdatedAt),
              and(eq(leads.updatedAt, cursorUpdatedAt), gt(leads.id, cursor.id)),
            ) as SQL,
      );
    }

    const records = await db.query.leads.findMany({
      columns: {
        sourcePayload: false,
      },
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy:
        direction === "prev"
          ? [asc(leads.updatedAt), asc(leads.id)]
          : [desc(leads.updatedAt), desc(leads.id)],
      limit,
      offset: cursor ? undefined : filters.offset,
    });

    const orderedRecords = direction === "prev" ? records.reverse() : records;
    return orderedRecords.map((record) => mapLeadRecord({ ...record, sourcePayload: null }));
  }

export async function countLeads(this: LeadStorage, getDatabase: () => DatabaseExecutor, filters: LeadListFilters = {}) {
    const db = getDatabase();
    const conditions = buildLeadListConditions(filters);
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return Number(row?.count ?? 0);
  }
