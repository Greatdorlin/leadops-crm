import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { leadNotes, leads } from "@/lib/db/schema";
import { buildLeadListConditions } from "@/lib/storage/filters";
import { scoped, type Actor } from "./access";
import { AssistantError } from "./contracts";
import { analyzeObjectionNotes } from "./objection-analysis";
export async function objections(actor: Actor) {
  if (!actor.enabled || !actor.permissions.includes("canViewLeads"))
    throw new AssistantError("You cannot view sales notes.", 403);
  // Apply CRM scope in SQL before reading any note content; no workspace-wide fetch.
  const rows = await getDb()
    .select({
      id: leadNotes.id,
      leadId: leads.id,
      name: sql<string>`concat_ws(' ', ${leads.firstName}, ${leads.lastName})`,
      note: leadNotes.note,
      createdAt: leadNotes.createdAt,
    })
    .from(leadNotes)
    .innerJoin(leads, eq(leads.id, leadNotes.leadId))
    .where(and(...buildLeadListConditions(scoped(actor))))
    .orderBy(desc(leadNotes.createdAt), desc(leadNotes.id))
    .limit(1001);
  const sample = rows.slice(0, 1000);
  return {
    scope: "Only notes on leads you can currently access",
    method:
      "Recognizable objection phrases in the latest 1,000 notes, ranked by distinct leads. These are indicators, not a complete interpretation of every note.",
    scannedNotes: sample.length,
    sampled: rows.length > 1000,
    themes: analyzeObjectionNotes(sample),
  };
}
