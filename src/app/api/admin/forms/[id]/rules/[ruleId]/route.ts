import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageForms } from "@/lib/crm/authz";
import {
  getFormRuleById,
  listFormFields,
  updateFormRule,
  deleteFormRule,
} from "@/lib/crm/form-builder-store";
import { submissionRulePayloadSchema } from "@/lib/crm/form-submission-routing";
import {
  FormRuleAdminError,
  resolveFormRuleActionValue,
} from "@/lib/crm/form-rule-admin";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; ruleId: string }> },
) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageForms(context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id, ruleId } = await params;
  const existing = await getFormRuleById(ruleId);
  if (!existing || existing.formId !== id) {
    return NextResponse.json({ error: "Rule not found." }, { status: 404 });
  }

  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!payload) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = submissionRulePayloadSchema.safeParse({
    name: existing.name,
    conditionFieldId: existing.conditionFieldId,
    conditionOperator: existing.conditionOperator,
    conditionValue: existing.conditionValue,
    actionType: existing.actionType,
    actionTarget: existing.actionTarget,
    actionValue: existing.actionValue,
    isActive: existing.isActive,
    order: existing.order,
    ...payload,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid rule." },
      { status: 400 },
    );
  }

  const fields = await listFormFields(id);
  if (!fields.some((field) => field.id === parsed.data.conditionFieldId)) {
    return NextResponse.json({ error: "Choose a field from this form." }, { status: 400 });
  }

  try {
    const actionValue = await resolveFormRuleActionValue(
      parsed.data.actionType,
      parsed.data.actionValue,
    );
    const rule = await updateFormRule(ruleId, {
      ...parsed.data,
      conditionValue: parsed.data.conditionValue ?? null,
      actionTarget: parsed.data.actionTarget ?? null,
      actionValue,
    });
    return NextResponse.json({ rule });
  } catch (error) {
    if (error instanceof FormRuleAdminError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[form-rule:update]", error);
    return NextResponse.json(
      { error: "We couldn't update this rule right now." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; ruleId: string }> },
) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageForms(context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id, ruleId } = await params;
  const existing = await getFormRuleById(ruleId);
  if (!existing || existing.formId !== id) {
    return NextResponse.json({ error: "Rule not found." }, { status: 404 });
  }

  try {
    await deleteFormRule(ruleId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[form-rule:delete]", error);
    return NextResponse.json(
      { error: "We couldn't delete this rule right now." },
      { status: 500 },
    );
  }
}
