import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageForms } from "@/lib/crm/authz";
import {
  getFormById,
  listFormFields,
  listFormRules,
  createFormRule,
} from "@/lib/crm/form-builder-store";
import { submissionRulePayloadSchema } from "@/lib/crm/form-submission-routing";
import {
  FormRuleAdminError,
  resolveFormRuleActionValue,
} from "@/lib/crm/form-rule-admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!canManageForms(context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;
  if (!(await getFormById(id))) {
    return NextResponse.json({ error: "Form not found." }, { status: 404 });
  }
  const rules = await listFormRules(id);
  return NextResponse.json({ rules });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageForms(context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;
  if (!(await getFormById(id))) {
    return NextResponse.json({ error: "Form not found." }, { status: 404 });
  }
  const payload = await request.json().catch(() => null);
  const parsed = submissionRulePayloadSchema.safeParse(payload);
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
    const rule = await createFormRule({
      formId: id,
      ...parsed.data,
      conditionValue: parsed.data.conditionValue ?? null,
      actionTarget: parsed.data.actionTarget ?? null,
      actionValue,
    });
    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    if (error instanceof FormRuleAdminError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[form-rules:create]", error);
    return NextResponse.json(
      { error: "We couldn't create this rule right now." },
      { status: 500 },
    );
  }
}
