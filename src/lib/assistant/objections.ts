import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { leadNotes, leads, leadStages } from "@/lib/db/schema";
import { buildLeadListConditions } from "@/lib/storage/filters";
import { scoped, type Actor } from "./access";
import { AssistantError } from "./contracts";
import { parseNoteQuestion } from "./note-query";
import { searchLeads } from "./tools";
import { analyzeObjectionNotes, objectionThemes } from "./objection-analysis";
export async function objections(actor: Actor, question = "") {
  if (!actor.enabled || !actor.permissions.includes("canViewLeads"))
    throw new AssistantError("You cannot view sales notes.", 403);
  const filter = parseNoteQuestion(question);
  const identities = filter.leadQuery ? await searchLeads(actor, filter.leadQuery) : null;
  if (identities && !identities.length) return {
    scope: "Only notes on leads you can currently access", method: "", period: filter.period,
    scannedNotes: 0, sampled: false, themes: [], evidence: [],
    answer: `No lead matching “${filter.leadQuery}” was found in your access scope.`,
  };
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
    .leftJoin(leadStages, eq(leadStages.id, leads.stageId))
    .where(and(...buildLeadListConditions(scoped(actor)), filter.since ? gte(leadNotes.createdAt, filter.since) : undefined, filter.stageKey ? eq(leadStages.key, filter.stageKey) : undefined, identities ? inArray(leads.id, identities.map(l=>l.id)) : undefined))
    .orderBy(desc(leadNotes.createdAt), desc(leadNotes.id))
    .limit(1001);
  const sample = rows.slice(0, 1000);
  const topicPattern = filter.topic ? objectionThemes.find(t=>t.key === filter.topic)?.pattern : null;
  const evidence = sample.filter(n=> (!filter.phrase || n.note.toLowerCase().includes(filter.phrase.toLowerCase())) && (!topicPattern || topicPattern.test(n.note) || (filter.topic === "price" && /\b(?:budget|price|pricing|cost|payment|afford)\b/i.test(n.note))));
  const themes = analyzeObjectionNotes(evidence).filter(t=>!filter.topic || t.key === filter.topic);
  const top = themes[0];
  const tied = top ? themes.filter(t => t.leadCount === top.leadCount) : [];
  const answer = top ? tied.length > 1 ? `${tied.map(t=>t.label).join(", ")} are tied at ${top.leadCount} lead${top.leadCount === 1 ? "" : "s"} each.` : `${top.label} appears on ${top.leadCount} lead${top.leadCount === 1 ? "" : "s"} in these notes.`
    : evidence.length ? "These are the matching sales notes. No common objection theme was identified in their wording."
    : "No sales notes match this question in your access scope and selected period.";
  return {
    scope: "Only notes on leads you can currently access",
    method:
      "Recognizable objection phrases in the latest 1,000 notes, ranked by distinct leads. These are indicators, not a complete interpretation of every note.",
    scannedNotes: sample.length,
    sampled: rows.length > 1000,
    period: filter.period,
    answer,
    themes,
    evidence: evidence.slice(0, 12).map(n=>({id:n.id,leadId:n.leadId,name:n.name,excerpt:n.note.slice(0,700),createdAt:n.createdAt.toISOString()})),
  };
}
