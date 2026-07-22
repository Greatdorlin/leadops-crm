import { and, asc, desc, eq, gt, inArray, lt, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { decodeFormSubmissionCursor } from "@/lib/crm/form-submission-pagination";
import {
  forms,
  formFields,
  formRules,
  formSubmissions,
  leadCustomFieldValues,
  leadEvents,
  leadOpportunities,
  leadTasks,
  leads,
} from "@/lib/db/schema";
import { leadEventTypes } from "@/lib/crm/lead-events";
import type { LeadCustomFieldValueInputRecord } from "@/lib/crm/custom-field-values";
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

// ===== Forms =====

export async function listForms(options?: { includeArchived?: boolean }): Promise<FormRow[]> {
  const db = getDb();
  const conditions = options?.includeArchived ? undefined : sql`${forms.status} <> 'archived'`;
  if (conditions) {
    return db.select().from(forms).where(conditions).orderBy(desc(forms.createdAt));
  }
  return db.select().from(forms).orderBy(desc(forms.createdAt));
}

export async function getFormById(id: string): Promise<FormRow | null> {
  const db = getDb();
  const rows = await db.select().from(forms).where(eq(forms.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getFormBySlug(slug: string): Promise<FormRow | null> {
  const db = getDb();
  const rows = await db.select().from(forms).where(eq(forms.slug, slug)).limit(1);
  return rows[0] ?? null;
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
  const rows = await db
    .delete(forms)
    .where(eq(forms.id, id))
    .returning({ id: forms.id });
  return rows.length > 0;
}

export async function createFormWithFields(
  input: Omit<NewFormRow, "id" | "createdAt" | "updatedAt">,
  fieldsInput: Array<Omit<NewFormFieldRow, "id" | "formId" | "createdAt" | "updatedAt">>,
): Promise<{ form: FormRow; fields: FormFieldRow[] }> {
  const db = getDb();

  return db.transaction(async (tx) => {
    const [form] = await tx.insert(forms).values(input).returning();
    if (!form) {
      throw new Error("Form creation did not return a record.");
    }

    const fields = fieldsInput.length > 0
      ? await tx
          .insert(formFields)
          .values(fieldsInput.map((field) => ({ ...field, formId: form.id })))
          .returning()
      : [];

    if (fields.length !== fieldsInput.length) {
      throw new Error("Starter fields were not saved completely.");
    }

    return { form, fields };
  });
}

function remapFormFieldReferences(value: unknown, fieldIdMap: Map<string, string>): unknown {
  if (typeof value === "string") {
    return fieldIdMap.get(value) ?? value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => remapFormFieldReferences(item, fieldIdMap));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        remapFormFieldReferences(item, fieldIdMap),
      ]),
    );
  }
  return value;
}

export async function duplicateForm(
  sourceFormId: string,
  input: { name: string; slug: string },
): Promise<FormRow | null> {
  const db = getDb();

  return db.transaction(async (tx) => {
    const [source] = await tx.select().from(forms).where(eq(forms.id, sourceFormId)).limit(1);
    if (!source) {
      return null;
    }

    const [created] = await tx
      .insert(forms)
      .values({
        workspaceId: source.workspaceId,
        name: input.name.trim(),
        slug: input.slug.trim(),
        description: source.description,
        status: "draft",
        isActive: false,
        isPublic: source.isPublic,
        successMessage: source.successMessage,
        submitButtonLabel: source.submitButtonLabel,
        redirectUrl: source.redirectUrl,
        primaryColor: source.primaryColor,
        accentColor: source.accentColor,
        logoUrl: source.logoUrl,
        enableAutoQualify: source.enableAutoQualify,
        autoQualifyRules: null,
        defaultStatus: source.defaultStatus,
        defaultPriority: source.defaultPriority,
        defaultSource: source.defaultSource,
        defaultOwnerId: source.defaultOwnerId,
      })
      .returning();
    if (!created) {
      return null;
    }

    const sourceFields = await tx
      .select()
      .from(formFields)
      .where(eq(formFields.formId, sourceFormId))
      .orderBy(asc(formFields.order));
    const fieldIdMap = new Map<string, string>();
    const copiedFields: Array<{ source: FormFieldRow; id: string }> = [];

    for (const field of sourceFields) {
      const [copy] = await tx
        .insert(formFields)
        .values({
          formId: created.id,
          fieldType: field.fieldType,
          label: field.label,
          placeholder: field.placeholder,
          helpText: field.helpText,
          isRequired: field.isRequired,
          isVisible: field.isVisible,
          order: field.order,
          options: field.options,
          validationRules: field.validationRules,
          mapsToLeadField: field.mapsToLeadField,
          showWhen: null,
          defaultValue: field.defaultValue,
        })
        .returning({ id: formFields.id });
      if (copy) {
        fieldIdMap.set(field.id, copy.id);
        copiedFields.push({ source: field, id: copy.id });
      }
    }

    for (const field of copiedFields) {
      if (!field.source.showWhen) continue;
      await tx
        .update(formFields)
        .set({
          showWhen: remapFormFieldReferences(
            field.source.showWhen,
            fieldIdMap,
          ) as Record<string, unknown>,
        })
        .where(eq(formFields.id, field.id));
    }

    const sourceRules = await tx
      .select()
      .from(formRules)
      .where(eq(formRules.formId, sourceFormId))
      .orderBy(asc(formRules.order));
    for (const rule of sourceRules) {
      const conditionFieldId = fieldIdMap.get(rule.conditionFieldId);
      if (!conditionFieldId) continue;
      await tx.insert(formRules).values({
        formId: created.id,
        name: rule.name,
        conditionFieldId,
        conditionOperator: rule.conditionOperator,
        conditionValue: rule.conditionValue,
        actionType: rule.actionType,
        actionTarget: rule.actionTarget,
        actionValue: rule.actionValue,
        isActive: rule.isActive,
        order: rule.order,
      });
    }

    const autoQualifyRules = source.autoQualifyRules
      ? (remapFormFieldReferences(source.autoQualifyRules, fieldIdMap) as Record<string, unknown>[])
      : null;
    const [completed] = await tx
      .update(forms)
      .set({ autoQualifyRules, updatedAt: new Date() })
      .where(eq(forms.id, created.id))
      .returning();

    return completed ?? created;
  });
}

export interface FormResourceCounts {
  fieldCount: number;
  ruleCount: number;
  submissionCount: number;
}

export async function getFormResourceCounts(formIds: string[]) {
  const counts = new Map<string, FormResourceCounts>(
    formIds.map((formId) => [
      formId,
      { fieldCount: 0, ruleCount: 0, submissionCount: 0 },
    ]),
  );
  if (formIds.length === 0) {
    return counts;
  }

  const db = getDb();
  const [fieldRows, ruleRows, submissionRows] = await Promise.all([
    db
      .select({ formId: formFields.formId, count: sql<number>`count(*)` })
      .from(formFields)
      .where(inArray(formFields.formId, formIds))
      .groupBy(formFields.formId),
    db
      .select({ formId: formRules.formId, count: sql<number>`count(*)` })
      .from(formRules)
      .where(inArray(formRules.formId, formIds))
      .groupBy(formRules.formId),
    db
      .select({ formId: formSubmissions.formId, count: sql<number>`count(*)` })
      .from(formSubmissions)
      .where(inArray(formSubmissions.formId, formIds))
      .groupBy(formSubmissions.formId),
  ]);

  for (const row of fieldRows) {
    const current = counts.get(row.formId);
    if (current) current.fieldCount = Number(row.count);
  }
  for (const row of ruleRows) {
    const current = counts.get(row.formId);
    if (current) current.ruleCount = Number(row.count);
  }
  for (const row of submissionRows) {
    const current = counts.get(row.formId);
    if (current) current.submissionCount = Number(row.count);
  }

  return counts;
}

// ===== Form Fields =====

export async function listFormFields(formId: string): Promise<FormFieldRow[]> {
  const db = getDb();
  return db
    .select()
    .from(formFields)
    .where(eq(formFields.formId, formId))
    .orderBy(asc(formFields.order));
}

export async function getFormFieldById(id: string): Promise<FormFieldRow | null> {
  const db = getDb();
  const rows = await db.select().from(formFields).where(eq(formFields.id, id)).limit(1);
  return rows[0] ?? null;
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
  const db = getDb();
  return db
    .select()
    .from(formRules)
    .where(eq(formRules.formId, formId))
    .orderBy(asc(formRules.order));
}

export async function getFormRuleById(id: string): Promise<FormRuleRow | null> {
  const db = getDb();
  const rows = await db.select().from(formRules).where(eq(formRules.id, id)).limit(1);
  return rows[0] ?? null;
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

export async function listFormSubmissions(
  formId: string,
  options: {
    limit?: number;
    cursor?: string;
    cursorDirection?: "next" | "prev";
  } = {},
): Promise<FormSubmissionRow[]> {
  const db = getDb();
  const conditions = [eq(formSubmissions.formId, formId)];
  const cursor = decodeFormSubmissionCursor(options.cursor);
  const direction = cursor ? options.cursorDirection ?? "next" : "next";

  if (cursor) {
    const cursorCreatedAt = new Date(cursor.createdAt);
    conditions.push(
      direction === "next"
        ? or(
            lt(formSubmissions.createdAt, cursorCreatedAt),
            and(eq(formSubmissions.createdAt, cursorCreatedAt), lt(formSubmissions.id, cursor.id)),
          )!
        : or(
            gt(formSubmissions.createdAt, cursorCreatedAt),
            and(eq(formSubmissions.createdAt, cursorCreatedAt), gt(formSubmissions.id, cursor.id)),
          )!,
    );
  }

  const rows = await db
    .select()
    .from(formSubmissions)
    .where(and(...conditions))
    .orderBy(
      direction === "prev" ? asc(formSubmissions.createdAt) : desc(formSubmissions.createdAt),
      direction === "prev" ? asc(formSubmissions.id) : desc(formSubmissions.id),
    )
    .limit(Math.min(Math.max(options.limit ?? 50, 1), 100));

  return direction === "prev" ? rows.reverse() : rows;
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
  customFieldValues?: LeadCustomFieldValueInputRecord[];
  opportunities?: Array<{
    offerLabel: string;
    status: "active" | "qualified" | "unqualified" | "lost" | "won" | "on_hold";
    estimatedValue?: number | null;
    reason?: string | null;
  }>;
  tasks?: Array<{
    title: string;
    dueAt?: string | null;
    assignedTo?: string | null;
    sourceRuleId?: string | null;
  }>;
}

export async function createLeadFromFormSubmission(
  submissionId: string,
  leadInput: FormSubmissionLeadInput,
): Promise<{ leadId: string } | null> {
  const db = getDb();

  return db.transaction(async (tx) => {
    const opportunityRows = (leadInput.opportunities ?? []).filter(
      (opportunity) => opportunity.offerLabel.trim().length > 0,
    );
    const pipelineStatuses = new Set(["active", "qualified", "on_hold"]);
    const estimatedValue = opportunityRows
      .filter((opportunity) => pipelineStatuses.has(opportunity.status))
      .reduce((sum, opportunity) => sum + (opportunity.estimatedValue ?? 0), 0);
    const wonValue = opportunityRows
      .filter((opportunity) => opportunity.status === "won")
      .reduce((sum, opportunity) => sum + (opportunity.estimatedValue ?? 0), 0);
    const [createdLead] = await tx
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
        estimatedValue: estimatedValue > 0 ? String(estimatedValue) : null,
        expectedValue: estimatedValue > 0 ? String(estimatedValue) : null,
        wonValue: wonValue > 0 ? String(wonValue) : null,
        sourcePayload: leadInput.customFields ?? null,
      })
      .returning({ id: leads.id });

    if (!createdLead) {
      return null;
    }

    const customFieldValues = (leadInput.customFieldValues ?? []).filter(
      (value) => value.value !== null && value.value !== undefined,
    );
    if (customFieldValues.length > 0) {
      await tx.insert(leadCustomFieldValues).values(
        customFieldValues.map((value) => ({
          leadId: createdLead.id,
          customFieldId: value.customFieldId,
          value: value.value,
          displayValue: value.displayValue,
        })),
      );
    }

    if (opportunityRows.length > 0) {
      await tx.insert(leadOpportunities).values(
        opportunityRows.map((opportunity, index) => ({
          leadId: createdLead.id,
          offerLabel: opportunity.offerLabel.trim(),
          status: opportunity.status,
          estimatedValue:
            opportunity.estimatedValue === null || opportunity.estimatedValue === undefined
              ? null
              : String(opportunity.estimatedValue),
          expectedValue:
            opportunity.estimatedValue === null || opportunity.estimatedValue === undefined
              ? null
              : String(opportunity.estimatedValue),
          reason: opportunity.reason ?? null,
          isPrimary: index === 0,
          sortOrder: index,
        })),
      );
    }

    const taskRows = (leadInput.tasks ?? []).filter((task) => task.title.trim().length >= 2);
    if (taskRows.length > 0) {
      await tx.insert(leadTasks).values(
        taskRows.map((task) => ({
          leadId: createdLead.id,
          title: task.title.trim(),
          description: null,
          dueAt: task.dueAt ? new Date(task.dueAt) : null,
          assignedTo: task.assignedTo ?? leadInput.assignedTo ?? null,
          createdBy: null,
        })),
      );
    }

    await tx.insert(leadEvents).values([
      {
        leadId: createdLead.id,
        eventType: leadEventTypes.leadCreated,
        eventData: {
          source: leadInput.source ?? "website_form",
          sourceDetail: leadInput.sourceDetail ?? "form_submission",
        },
        createdBy: null,
      },
      ...taskRows.map((task) => ({
        leadId: createdLead.id,
        eventType: leadEventTypes.taskCreated,
        eventData: {
          title: task.title.trim(),
          dueAt: task.dueAt ?? null,
          assignedTo: task.assignedTo ?? leadInput.assignedTo ?? null,
          automationRuleId: task.sourceRuleId ?? null,
        },
        createdBy: null,
      })),
    ]);

    await tx
      .update(formSubmissions)
      .set({
        status: "processed",
        leadId: createdLead.id,
        createdLeadId: createdLead.id,
        updatedAt: new Date(),
      })
      .where(eq(formSubmissions.id, submissionId));

    return { leadId: createdLead.id };
  });
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
