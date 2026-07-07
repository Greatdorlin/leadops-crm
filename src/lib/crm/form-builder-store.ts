import { eq, and, desc, asc, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  forms,
  formFields,
  formRules,
  formSubmissions,
  leads,
} from "@/lib/db/schema";
import type {
  FormRow,
  NewFormRow,
  FormFieldRow,
  NewFormFieldRow,
  FormRuleRow,
  NewFormRuleRow,
  FormSubmissionRow,
  NewFormSubmissionRow,
} from "@/lib/db/schema";

/**
 * Check if an error indicates a missing database table.
 * This happens when migrations haven't been run yet.
 */
function isMissingTableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  // Neon driver throws "Failed query: ..." when table doesn't exist
  // pg throws "relation ... does not exist"
  return msg.includes("failed query") || msg.includes("does not exist") || msg.includes("relation") || msg.includes("table");
}

// ===== Forms =====

export async function listForms(options?: { includeArchived?: boolean }): Promise<FormRow[]> {
  const db = getDb();
  const conditions = options?.includeArchived ? undefined : sql`${forms.status} <> 'archived'`;
  try {
    if (conditions) {
      return await db.select().from(forms).where(conditions).orderBy(desc(forms.createdAt));
    }
    return await db.select().from(forms).orderBy(desc(forms.createdAt));
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}

export async function getFormById(id: string): Promise<FormRow | null> {
  try {
    const db = getDb();
    const rows = await db.select().from(forms).where(eq(forms.id, id)).limit(1);
    return rows[0] ?? null;
  } catch (error) {
    if (isMissingTableError(error)) return null;
    throw error;
  }
}

export async function getFormBySlug(slug: string): Promise<FormRow | null> {
  try {
    const db = getDb();
    const rows = await db.select().from(forms).where(eq(forms.slug, slug)).limit(1);
    return rows[0] ?? null;
  } catch (error) {
    if (isMissingTableError(error)) return null;
    throw error;
  }
}

export async function createForm(input: Omit<NewFormRow, "id" | "createdAt" | "updatedAt">): Promise<FormRow> {
  const db = getDb();
  const rows = await db.insert(forms).values(input).returning();
  return rows[0];
}

export async function updateForm(
  id: string,
  input: Partial<Omit<NewFormRow, "id" | "createdAt" | "updatedAt">>,
): Promise<FormRow | null> {
  const db = getDb();
  const rows = await db
    .update(forms)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(forms.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteForm(id: string): Promise<boolean> {
  const db = getDb();
  const rows = await db.delete(forms).where(eq(forms.id, id)).returning({ id: forms.id });
  return rows.length > 0;
}

// ===== Form Fields =====

export async function listFormFields(formId: string): Promise<FormFieldRow[]> {
  try {
    const db = getDb();
    return await db
      .select()
      .from(formFields)
      .where(eq(formFields.formId, formId))
      .orderBy(asc(formFields.order));
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}

export async function getFormFieldById(id: string): Promise<FormFieldRow | null> {
  try {
    const db = getDb();
    const rows = await db.select().from(formFields).where(eq(formFields.id, id)).limit(1);
    return rows[0] ?? null;
  } catch (error) {
    if (isMissingTableError(error)) return null;
    throw error;
  }
}

export async function createFormField(
  input: Omit<NewFormFieldRow, "id" | "createdAt" | "updatedAt">,
): Promise<FormFieldRow> {
  const db = getDb();
  const rows = await db.insert(formFields).values(input).returning();
  return rows[0];
}

export async function updateFormField(
  id: string,
  input: Partial<Omit<NewFormFieldRow, "id" | "createdAt" | "updatedAt">>,
): Promise<FormFieldRow | null> {
  const db = getDb();
  const rows = await db
    .update(formFields)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(formFields.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteFormField(id: string): Promise<boolean> {
  const db = getDb();
  const rows = await db.delete(formFields).where(eq(formFields.id, id)).returning({ id: formFields.id });
  return rows.length > 0;
}

export async function reorderFormFields(
  formId: string,
  orderedIds: string[],
): Promise<void> {
  const db = getDb();
  for (let i = 0; i < orderedIds.length; i++) {
    await db
      .update(formFields)
      .set({ order: i, updatedAt: new Date() })
      .where(and(eq(formFields.id, orderedIds[i]), eq(formFields.formId, formId)));
  }
}

// ===== Form Rules =====

export async function listFormRules(formId: string): Promise<FormRuleRow[]> {
  try {
    const db = getDb();
    return await db
      .select()
      .from(formRules)
      .where(eq(formRules.formId, formId))
      .orderBy(asc(formRules.order));
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}

export async function getFormRuleById(id: string): Promise<FormRuleRow | null> {
  try {
    const db = getDb();
    const rows = await db.select().from(formRules).where(eq(formRules.id, id)).limit(1);
    return rows[0] ?? null;
  } catch (error) {
    if (isMissingTableError(error)) return null;
    throw error;
  }
}

export async function createFormRule(
  input: Omit<NewFormRuleRow, "id" | "createdAt" | "updatedAt">,
): Promise<FormRuleRow> {
  const db = getDb();
  const rows = await db.insert(formRules).values(input).returning();
  return rows[0];
}

export async function updateFormRule(
  id: string,
  input: Partial<Omit<NewFormRuleRow, "id" | "createdAt" | "updatedAt">>,
): Promise<FormRuleRow | null> {
  const db = getDb();
  const rows = await db
    .update(formRules)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(formRules.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteFormRule(id: string): Promise<boolean> {
  const db = getDb();
  const rows = await db.delete(formRules).where(eq(formRules.id, id)).returning({ id: formRules.id });
  return rows.length > 0;
}

// ===== Form Submissions =====

export async function createFormSubmission(
  input: Omit<NewFormSubmissionRow, "id" | "createdAt" | "updatedAt">,
): Promise<FormSubmissionRow> {
  const db = getDb();
  const rows = await db.insert(formSubmissions).values(input).returning();
  return rows[0];
}

export async function updateFormSubmission(
  id: string,
  input: Partial<Omit<NewFormSubmissionRow, "id" | "createdAt" | "updatedAt">>,
): Promise<FormSubmissionRow | null> {
  const db = getDb();
  const rows = await db
    .update(formSubmissions)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(formSubmissions.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function listFormSubmissions(formId: string): Promise<FormSubmissionRow[]> {
  try {
    const db = getDb();
    return await db
      .select()
      .from(formSubmissions)
      .where(eq(formSubmissions.formId, formId))
      .orderBy(desc(formSubmissions.createdAt));
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}

// ===== Lead Creation from Form Submission =====

export interface FormSubmissionLeadInput {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  whatsappNumber?: string | null;
  companyName?: string | null;
  state?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  address?: string | null;
  postalCode?: string | null;
  source?: string;
  sourceDetail?: string | null;
  priority?: string;
  assignedTo?: string | null;
  assignedUserId?: string | null;
  stageId?: string | null;
  customFields?: Record<string, unknown>;
}

export async function createLeadFromFormSubmission(
  submissionId: string,
  leadInput: FormSubmissionLeadInput,
): Promise<{ leadId: string } | null> {
  const db = getDb();

  const result = await db
    .insert(leads)
    .values({
      firstName: leadInput.firstName ?? "",
      lastName: leadInput.lastName ?? "",
      email: leadInput.email ?? "",
      whatsappNumber: leadInput.whatsappNumber ?? "",
      companyName: leadInput.companyName,
      state: leadInput.state ?? leadInput.region ?? null,
      country: leadInput.country,
      region: leadInput.region ?? leadInput.state ?? null,
      city: leadInput.city,
      address: leadInput.address,
      postalCode: leadInput.postalCode,
      source: (leadInput.source as "website_form") ?? "website_form",
      sourceDetail: leadInput.sourceDetail ?? "form_submission",
      priority: (leadInput.priority as "low" | "medium" | "high" | "urgent") ?? "medium",
      assignedTo: leadInput.assignedTo,
      assignedUserId: leadInput.assignedUserId ?? null,
      stageId: leadInput.stageId,
      sourcePayload: leadInput.customFields ? (leadInput.customFields as Record<string, unknown>) : null,
    })
    .returning({ id: leads.id });

  if (result.length === 0) {
    return null;
  }

  const leadId = result[0].id;

  await db
    .update(formSubmissions)
    .set({ leadId, createdLeadId: leadId, updatedAt: new Date() })
    .where(eq(formSubmissions.id, submissionId));

  return { leadId };
}

// ===== Public Form Retrieval =====

export interface PublicFormResult {
  form: FormRow;
  fields: FormFieldRow[];
}

export async function getPublicFormBySlug(slug: string): Promise<PublicFormResult | null> {
  const form = await getFormBySlug(slug);
  if (!form || !form.isPublic || !form.isActive || form.status !== "active") {
    return null;
  }

  const fields = await listFormFields(form.id);
  return { form, fields };
}

export async function getPublicFormById(id: string): Promise<PublicFormResult | null> {
  const form = await getFormById(id);
  if (!form || !form.isPublic || !form.isActive || form.status !== "active") {
    return null;
  }

  const fields = await listFormFields(form.id);
  return { form, fields };
}
