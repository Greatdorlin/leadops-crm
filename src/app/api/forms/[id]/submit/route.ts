import { NextResponse } from "next/server";
import {
  getFormById,
  listFormFields,
  createFormSubmission,
  updateFormSubmission,
  createLeadFromFormSubmission,
  listFormRules,
} from "@/lib/crm/form-builder-store";
import type { FormFieldRow } from "@/lib/db/schema";

function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }
  return null;
}

function evaluateCondition(
  fieldValue: unknown,
  operator: string,
  expectedValue: string | null,
): boolean {
  switch (operator) {
    case "equals":
      return String(fieldValue) === (expectedValue ?? "");
    case "not_equals":
      return String(fieldValue) !== (expectedValue ?? "");
    case "contains":
      return String(fieldValue).includes(expectedValue ?? "");
    case "greater_than":
      return Number(fieldValue) > Number(expectedValue);
    case "less_than":
      return Number(fieldValue) < Number(expectedValue);
    case "checked":
      return Boolean(fieldValue) === true;
    case "unchecked":
      return Boolean(fieldValue) === false;
    default:
      return false;
  }
}

function applyRuleActions(
  rules: Array<{
    id: string;
    isActive: boolean;
    conditionFieldId: string;
    conditionOperator: string;
    conditionValue: string | null;
    actionType: string;
    actionTarget: string | null;
    actionValue: string | null;
  }>,
  submissionData: Record<string, unknown>,
  fieldMap: Map<string, FormFieldRow>,
): {
  appliedRules: Array<{ ruleId: string; action: string; result: string }>;
  leadOverrides: Record<string, string | null>;
} {
  const appliedRules: Array<{ ruleId: string; action: string; result: string }> = [];
  const leadOverrides: Record<string, string | null> = {};

  for (const rule of rules) {
    if (!rule.isActive) continue;
    const conditionField = fieldMap.get(rule.conditionFieldId);
    if (!conditionField) continue;

    const fieldValue = submissionData[conditionField.id];
    const matched = evaluateCondition(fieldValue, rule.conditionOperator, rule.conditionValue);

    if (!matched) continue;

    appliedRules.push({
      ruleId: rule.id,
      action: rule.actionType,
      result: `matched: ${rule.actionType}`,
    });

    switch (rule.actionType) {
      case "set_status":
        leadOverrides.status = rule.actionValue;
        break;
      case "set_priority":
        leadOverrides.priority = rule.actionValue;
        break;
      case "set_owner":
        leadOverrides.assignedTo = rule.actionValue;
        break;
      case "set_source":
        leadOverrides.source = rule.actionValue;
        break;
      case "set_stage":
        leadOverrides.stageId = rule.actionValue;
        break;
    }
  }

  return { appliedRules, leadOverrides };
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

  const fields = await listFormFields(id);
  const rules = await listFormRules(id);

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

  // Apply rules
  const fieldMap = new Map(fields.map((f) => [f.id, f]));
  const { appliedRules, leadOverrides } = applyRuleActions(rules, data, fieldMap);

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

  // Create lead from submission
  const leadResult = await createLeadFromFormSubmission(submission.id, {
    firstName: firstName ?? "",
    lastName: lastName ?? "",
    email: email ?? "",
    whatsappNumber: phone ?? "",
    companyName,
    state,
    country,
    city,
    address,
    postalCode,
    source: (leadOverrides.source as string) ?? form.defaultSource ?? "website_form",
    sourceDetail: `form:${form.slug}`,
    priority: (leadOverrides.priority as string) ?? form.defaultPriority ?? "medium",
    assignedTo: leadOverrides.assignedTo ?? form.defaultOwnerId ?? null,
    stageId: leadOverrides.stageId ?? null,
    customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
  });

  if (leadResult) {
    await updateFormSubmission(submission.id, {
      status: "processed",
      leadId: leadResult.leadId,
      createdLeadId: leadResult.leadId,
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
