import { NextResponse } from "next/server";
import { and, eq, or } from "drizzle-orm";
import {
  getFormById,
  listFormFields,
  createFormSubmission,
  updateFormSubmission,
  createLeadFromFormSubmission,
  listFormRules,
} from "@/lib/crm/form-builder-store";
import { listLeadStages } from "@/lib/crm/lead-stages-admin";
import { notifyLeadOffersQualified } from "@/lib/crm/notification-events";
import { listCustomFields } from "@/lib/crm/custom-fields-admin";
import { validateCustomFieldValues } from "@/lib/crm/custom-field-values";
import {
  MAX_FORM_SUBMISSION_BODY_BYTES,
  validateFormSubmissionData,
} from "@/lib/crm/form-submission-validation";
import {
  applySubmissionRules,
  mergeSubmissionRuleEvaluations,
  normalizeAutoQualifyRules,
  normalizeStageLookupValue,
} from "@/lib/crm/form-submission-routing";
import { resolveQuickScheduleDate } from "@/lib/crm/schedule-presets";
import { getDb } from "@/lib/db/client";
import { crmUsers } from "@/lib/db/schema";

function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }
  return null;
}

async function resolveStageId(
  stageValue: string | null | undefined,
  stages: Awaited<ReturnType<typeof listLeadStages>>,
) {
  if (!stageValue) {
    return null;
  }

  const normalizedLookupValue = normalizeStageLookupValue(stageValue);
  if (!normalizedLookupValue) {
    return null;
  }

  const exactMatch = stages.find(
    (stage) => stage.id === stageValue || stage.key === stageValue,
  );
  if (exactMatch) {
    return exactMatch.id;
  }

  const normalizedMatch = stages.find(
    (stage) =>
      stage.id === normalizedLookupValue || stage.key === normalizedLookupValue,
  );

  return normalizedMatch?.id ?? null;
}

async function resolveLeadAssignment(assignmentValue?: string | null) {
  const normalizedValue = assignmentValue?.trim() ?? "";
  if (!normalizedValue) {
    return { assignedTo: null, assignedUserId: null };
  }

  const db = getDb();
  const [user] = await db
    .select({ id: crmUsers.id, email: crmUsers.email })
    .from(crmUsers)
    .where(
      and(
        eq(crmUsers.isActive, true),
        or(eq(crmUsers.id, normalizedValue), eq(crmUsers.email, normalizedValue)),
      ),
    )
    .limit(1);

  if (user) {
    return {
      assignedTo: user.email,
      assignedUserId: user.id,
    };
  }

  return { assignedTo: null, assignedUserId: null };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const form = await getFormById(id);
  if (!form || !form.isPublic || !form.isActive || form.status !== "active") {
    return NextResponse.json({ error: "Form not found or not active." }, { status: 404 });
  }

  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return NextResponse.json({ error: "Submit this form as JSON." }, { status: 415 });
  }
  const declaredLength = Number.parseInt(request.headers.get("content-length") ?? "0", 10);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_FORM_SUBMISSION_BODY_BYTES) {
    return NextResponse.json({ error: "This submission is too large." }, { status: 413 });
  }
  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_FORM_SUBMISSION_BODY_BYTES) {
    return NextResponse.json({ error: "This submission is too large." }, { status: 413 });
  }
  let payload: Record<string, unknown> | null = null;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    payload = null;
  }
  if (!payload || typeof payload.data !== "object" || payload.data === null || Array.isArray(payload.data)) {
    return NextResponse.json({ error: "Invalid submission data." }, { status: 400 });
  }

  const [fields, rules, customFieldDefinitions] = await Promise.all([
    listFormFields(id),
    listFormRules(id),
    listCustomFields(),
  ]);
  const validation = validateFormSubmissionData(
    fields,
    payload.data as Record<string, unknown>,
  );
  if (!validation.success) {
    return NextResponse.json(
      {
        error: "Review the highlighted form fields and try again.",
        fieldErrors: validation.fieldErrors,
      },
      { status: 400 },
    );
  }
  const data = validation.data;

  const availableFieldIds = new Set(fields.map((field) => field.id));
  const autoQualifyRules = form.enableAutoQualify
    ? normalizeAutoQualifyRules(form.autoQualifyRules)
    : [];
  const autoQualifyEvaluation = applySubmissionRules(
    autoQualifyRules,
    data,
    availableFieldIds,
  );
  const ruleEvaluation = applySubmissionRules(rules, data, availableFieldIds);
  const {
    appliedRules,
    leadOverrides,
    opportunityOverrides,
    taskOverrides,
  } = mergeSubmissionRuleEvaluations(autoQualifyEvaluation, ruleEvaluation);
  const stages = await listLeadStages();
  const resolvedStageId =
    (await resolveStageId(leadOverrides.stageValue, stages)) ??
    (await resolveStageId(form.defaultStatus, stages));

  let firstName: string | null = null;
  let lastName: string | null = null;
  let email: string | null = null;
  let phone: string | null = null;
  let companyName: string | null = null;
  let state: string | null = null;
  let country: string | null = null;
  let region: string | null = null;
  let city: string | null = null;
  let address: string | null = null;
  let postalCode: string | null = null;
  const customFields: Record<string, unknown> = {};
  const customFieldValues: Record<string, unknown> = {};
  const mappedCustomFieldIds = new Set<string>();
  const customFieldByReference = new Map(
    customFieldDefinitions.flatMap((definition) => [
      [definition.id, definition] as const,
      [definition.key, definition] as const,
    ]),
  );

  for (const field of fields) {
    const value = data[field.id];
    if (value === undefined || value === null) continue;

    const target = field.mapsToLeadField;
    if (target) {
      switch (target) {
        case "firstName":
          firstName = String(value);
          break;
        case "lastName":
          lastName = String(value);
          break;
        case "email":
          email = String(value);
          break;
        case "phone":
        case "whatsappNumber":
          phone = String(value);
          break;
        case "companyName":
          companyName = String(value);
          break;
        case "state":
          state = String(value);
          break;
        case "region":
          region = String(value);
          break;
        case "country":
          country = String(value);
          break;
        case "city":
          city = String(value);
          break;
        case "address":
          address = String(value);
          break;
        case "postalCode":
          postalCode = String(value);
          break;
        default:
          if (target.startsWith("customField_")) {
            const reference = target.slice("customField_".length);
            const definition = customFieldByReference.get(reference);
            customFields[reference] = value;
            if (definition) {
              customFieldValues[definition.id] = value;
              mappedCustomFieldIds.add(definition.id);
            }
          }
          break;
      }
    }
  }

  const resolvedAssignment = await resolveLeadAssignment(
    leadOverrides.assignedTo ?? form.defaultOwnerId ?? null,
  );

  const mappedCustomFieldDefinitions = customFieldDefinitions.filter((definition) =>
    mappedCustomFieldIds.has(definition.id),
  );
  const customFieldValidation = validateCustomFieldValues(
    mappedCustomFieldDefinitions,
    customFieldValues,
  );
  if (!customFieldValidation.success) {
    return NextResponse.json(
      {
        error: "Review the custom field values and try again.",
        fieldErrors: customFieldValidation.fieldErrors,
      },
      { status: 400 },
    );
  }

  const submission = await createFormSubmission({
    formId: id,
    leadId: null,
    data,
    ipAddress: getClientIp(request)?.slice(0, 128) ?? null,
    userAgent: request.headers.get("user-agent")?.slice(0, 1_000) ?? null,
    referrer: request.headers.get("referer")?.slice(0, 2_000) ?? null,
    status: "pending",
    appliedRules: appliedRules.length > 0 ? appliedRules : null,
    createdLeadId: null,
  });

  let leadResult: { leadId: string } | null = null;
  try {
    leadResult = await createLeadFromFormSubmission(submission.id, {
      firstName: firstName ?? "",
      lastName: lastName ?? "",
      email: email ?? "",
      whatsappNumber: phone ?? "",
      companyName,
      state,
      country,
      region,
      city,
      address,
      postalCode,
      source: (leadOverrides.source as string) ?? form.defaultSource ?? "website_form",
      sourceDetail: `form:${form.slug}`,
      priority: (leadOverrides.priority as string) ?? form.defaultPriority ?? "medium",
      assignedTo: resolvedAssignment.assignedTo,
      assignedUserId: resolvedAssignment.assignedUserId,
      stageId: resolvedStageId,
      customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
      customFieldValues: customFieldValidation.values,
      opportunities: opportunityOverrides.map((opportunity) => ({
        offerLabel: opportunity.offerLabel,
        status: opportunity.status ?? "active",
        estimatedValue: opportunity.estimatedValue,
        reason: opportunity.reason,
      })),
      tasks: taskOverrides.map((task) => ({
        title: task.title,
        dueAt:
          task.duePreset === "none"
            ? null
            : resolveQuickScheduleDate(task.duePreset).toISOString(),
        assignedTo: resolvedAssignment.assignedTo,
        sourceRuleId: task.sourceRuleId,
      })),
    });
  } catch (error) {
    console.error("[public-form:submit]", error);
    await updateFormSubmission(submission.id, {
      status: "failed",
    });
    return NextResponse.json(
      { error: "We couldn't create the lead right now. Please try again." },
      { status: 500 },
    );
  }

  if (!leadResult) {
    await updateFormSubmission(submission.id, { status: "failed" });
    return NextResponse.json(
      { error: "We couldn't create the lead right now. Please try again." },
      { status: 500 },
    );
  }

  const qualifiedOffers = opportunityOverrides
    .filter((opportunity) => opportunity.status === "qualified")
    .map((opportunity) => opportunity.offerLabel);
  if (qualifiedOffers.length > 0) {
    try {
      await notifyLeadOffersQualified({
        recipientUserId: resolvedAssignment.assignedUserId,
        leadId: leadResult.leadId,
        leadName: `${firstName || "Lead"} ${lastName || ""}`.trim(),
        offerLabels: qualifiedOffers,
      });
    } catch (notificationError) {
      console.error("[public-form:qualification-notification]", notificationError);
    }
  }

  return NextResponse.json({
    success: true,
    submissionId: submission.id,
    leadId: leadResult.leadId,
    message: form.successMessage,
    redirectUrl: form.redirectUrl,
  });
}
