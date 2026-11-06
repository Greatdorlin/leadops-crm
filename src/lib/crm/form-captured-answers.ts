import { and, desc, eq, or, asc } from "drizzle-orm";
import { getDb, type DatabaseExecutor } from "@/lib/db/client";
import { formFields, formSubmissions } from "@/lib/db/schema";
import { displaySavedFormAnswers } from "./form-answer-display";

/** Caller must first authorize access to this lead. Only saved form fields are exposed. */
export async function getLeadCapturedFormAnswers(leadId: string, db: DatabaseExecutor = getDb()) {
  const [submission] = await db.select({ formId: formSubmissions.formId, data: formSubmissions.data })
    .from(formSubmissions).where(and(
      eq(formSubmissions.status, "processed"),
      or(eq(formSubmissions.createdLeadId, leadId), eq(formSubmissions.leadId, leadId)),
    )).orderBy(desc(formSubmissions.createdAt), desc(formSubmissions.id)).limit(1);
  if (!submission) return [];
  const fields = await db.select({ id: formFields.id, label: formFields.label }).from(formFields)
    .where(eq(formFields.formId, submission.formId)).orderBy(asc(formFields.order), asc(formFields.createdAt));
  return displaySavedFormAnswers(fields, submission.data);
}
