import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import type { DatabaseExecutor } from "@/lib/db/client";
import { leadCustomFieldValues } from "@/lib/db/schema";
import type { LeadCustomFieldValueInputRecord } from "./custom-field-values";

export async function listLeadCustomFieldValues(
  leadId: string,
  db: DatabaseExecutor = getDb(),
) {
  return db
    .select({
      id: leadCustomFieldValues.id,
      leadId: leadCustomFieldValues.leadId,
      customFieldId: leadCustomFieldValues.customFieldId,
      value: leadCustomFieldValues.value,
      displayValue: leadCustomFieldValues.displayValue,
      createdAt: leadCustomFieldValues.createdAt,
      updatedAt: leadCustomFieldValues.updatedAt,
    })
    .from(leadCustomFieldValues)
    .where(eq(leadCustomFieldValues.leadId, leadId));
}

export async function upsertLeadCustomFieldValues(
  leadId: string,
  values: LeadCustomFieldValueInputRecord[],
  db: DatabaseExecutor = getDb(),
) {
  const fieldIds = values.map((value) => value.customFieldId);

  if (fieldIds.length === 0) {
    return [];
  }

  const existingRows = await db
    .select({
      id: leadCustomFieldValues.id,
      customFieldId: leadCustomFieldValues.customFieldId,
    })
    .from(leadCustomFieldValues)
    .where(
      and(
        eq(leadCustomFieldValues.leadId, leadId),
        inArray(leadCustomFieldValues.customFieldId, fieldIds),
      ),
    );
  const existingByFieldId = new Map(existingRows.map((row) => [row.customFieldId, row.id]));

  for (const value of values) {
    const existingId = existingByFieldId.get(value.customFieldId);

    if (value.value === null) {
      if (existingId) {
        await db
          .delete(leadCustomFieldValues)
          .where(eq(leadCustomFieldValues.id, existingId));
      }
      continue;
    }

    if (existingId) {
      await db
        .update(leadCustomFieldValues)
        .set({
          value: value.value,
          displayValue: value.displayValue,
          updatedAt: new Date(),
        })
        .where(eq(leadCustomFieldValues.id, existingId));
      continue;
    }

    await db.insert(leadCustomFieldValues).values({
      leadId,
      customFieldId: value.customFieldId,
      value: value.value,
      displayValue: value.displayValue,
    });
  }

  return listLeadCustomFieldValues(leadId, db);
}
