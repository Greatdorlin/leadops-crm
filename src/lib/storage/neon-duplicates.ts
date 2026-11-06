import { and, desc, eq, isNull, ne, or, type SQL } from "drizzle-orm";
import {
  normalizeEmail,
  normalizePhone,
  normalizeText,
} from "@/lib/crm/value-normalization";
import type { DatabaseExecutor } from "@/lib/db/client";
import { leads } from "@/lib/db/schema";
import type {
  LeadDuplicateLookupInput,
  LeadDuplicateListInput,
  LeadStorage,
} from "./types";
import { mapLeadRecord } from "./mappers";
import { buildLeadAssigneeFilterCondition } from "./filters";

import { findLeadByWhere, emailEquals, phoneEquals } from "./record-queries";

export async function findDuplicateLead(
  this: LeadStorage,
  getDatabase: () => DatabaseExecutor,
  input: LeadDuplicateLookupInput,
) {
  const source = input.source ?? null;
  const externalLeadId = normalizeText(input.externalLeadId);
  const byFacebookLeadgenId = normalizeText(input.facebookLeadgenId);
  const googleClickId = normalizeText(input.googleClickId);
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.whatsappNumber);

  if (source && externalLeadId) {
    const match = await findLeadByWhere(
      getDatabase,
      and(eq(leads.source, source), eq(leads.externalLeadId, externalLeadId)),
    );
    if (match) {
      return match;
    }
  }

  if (byFacebookLeadgenId) {
    const match = await findLeadByWhere(
      getDatabase,
      eq(leads.facebookLeadgenId, byFacebookLeadgenId),
    );
    if (match) {
      return match;
    }
  }

  if (googleClickId && email) {
    const match = await findLeadByWhere(
      getDatabase,
      and(eq(leads.googleClickId, googleClickId), emailEquals(email)),
    );
    if (match) {
      return match;
    }
  }

  if (googleClickId && phone) {
    const match = await findLeadByWhere(
      getDatabase,
      and(eq(leads.googleClickId, googleClickId), phoneEquals(phone)),
    );
    if (match) {
      return match;
    }
  }

  if (email && phone) {
    const match = await findLeadByWhere(
      getDatabase,
      and(emailEquals(email), phoneEquals(phone)),
    );
    if (match) {
      return match;
    }
  }

  if (phone) {
    const match = await findLeadByWhere(getDatabase, phoneEquals(phone));
    if (match) {
      return match;
    }
  }

  if (email) {
    const match = await findLeadByWhere(getDatabase, emailEquals(email));
    if (match) {
      return match;
    }
  }

  return null;
}

export async function listDuplicateLeads(
  this: LeadStorage,
  getDatabase: () => DatabaseExecutor,
  input: LeadDuplicateListInput,
) {
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.whatsappNumber);
  const matches: SQL[] = [];

  if (email) {
    matches.push(emailEquals(email));
  }
  if (phone) {
    matches.push(phoneEquals(phone));
  }
  if (matches.length === 0) {
    return [];
  }

  const conditions: SQL[] = [
    isNull(leads.deletedAt),
    ne(leads.id, input.excludeId),
    or(...matches) as SQL,
  ];
  if (input.assignedTo?.trim()) {
    const assignmentCondition = buildLeadAssigneeFilterCondition(
      input.assignedTo.trim(),
    );
    if (assignmentCondition) {
      conditions.push(assignmentCondition);
    }
  }

  const db = getDatabase();
  const records = await db.query.leads.findMany({
    where: and(...conditions),
    orderBy: [desc(leads.updatedAt), desc(leads.id)],
    limit: Math.min(Math.max(input.limit ?? 10, 1), 25),
  });

  return records.map(mapLeadRecord);
}
