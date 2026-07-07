import { NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";
import {
  getFormById,
  listFormFields,
  createFormSubmission,
  updateFormSubmission,
  createLeadFromFormSubmission,
  listFormRules,
} from "@/lib/crm/form-builder-store";
import { listLeadStages } from "@/lib/crm/lead-stages-admin";
import {
  applySubmissionRules,
  normalizeAutoQualifyRules,
  normalizeStageLookupValue,
} from "@/lib/crm/form-submission-routing";
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
    .where(or(eq(crmUsers.id, normalizedValue), eq(crmUsers.email, normalizedValue)))
    .limit(1);

  if (user) {
    return {
      assignedTo: user.email,
      assignedUserId: user.id,
    };
  }

  return {
    assignedTo: normalizedValue,
    assignedUserId: null,
  };
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

  const [fields, rules] = await Promise.all([listFormFields(id), listFormRules(id)]);

  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!payload || typeof payload.data !== "object" || payload.data === null || Array.isArray(payload.data)) {
    return NextResponse.json({ error: "Invalid submission data." }, { status: 400 });
  }

  const data = payload.data as Record<string, unknown>;

  // Validate required fields
  const missingFields: string[] = [];
  for (const field of fields) {
    if (!field.isVisible || !field.isRequired) continue;
    const value = data[field.id];
    if (value === undefined || value === null || value === "") {
      missingFields.push(field.label);
    }
  }

  if (missingFields.length > 0) {
    return NextResponse.json(
      { error: `Missing required fields: ${missingFields.join(", ")}` },
      { status: 400 },
    );
  }

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
  const appliedRules = [
    ...autoQualifyEvaluation.appliedRules,
    ...ruleEvaluation.appliedRules,
  ];
  const leadOverrides = {
    ...autoQualifyEvaluation.leadOverrides,
    ...ruleEvaluation.leadOverrides,
  };
  const stages = await listLeadStages();
  const resolvedStageId =
    (await resolveStageId(leadOverrides.stageValue, stages)) ??
    (await resolveStageId(form.defaultStatus, stages));

  // Create submission record
  const submission = await createFormSubmission({
    formId: id,
    leadId: null,
    data,
    ipAddress: getClientIp(request),
    userAgent: request.headers.get("user-agent") ?? null,
    referrer: request.headers.get("referer") ?? null,
    status: "pending",
    appliedRules: appliedRules.length > 0 ? appliedRules : null,
    createdLeadId: null,
  });

  // Map form data to lead fields
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
            customFields[target] = value;
          }
          break;
      }
    }
  }

  const resolvedAssignment = await resolveLeadAssignment(
    leadOverrides.assignedTo ?? form.defaultOwnerId ?? null,
  );

  // Create lead from submission
  const leadResult = await createLeadFromFormSubmission(submission.id, {
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
  });

  if (leadResult) {
    await updateFormSubmission(submission.id, {
      status: "processed",
      leadId: leadResult.leadId,
      createdLeadId: leadResult.leadId,
    });
  } else {
    await updateFormSubmission(submission.id, {
      status: "failed",
    });
  }

  return NextResponse.json({
    success: true,
    submissionId: submission.id,
    leadId: leadResult?.leadId ?? null,
    message: form.successMessage,
    redirectUrl: form.redirectUrl,
  });
}
