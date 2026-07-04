import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageFormSources } from "@/lib/crm/authz";
import {
  listFormRules,
  createFormRule,
} from "@/lib/crm/form-builder-store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
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

  if (!canManageFormSources(context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;
  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!payload) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const conditionFieldId = typeof payload.conditionFieldId === "string" ? payload.conditionFieldId.trim() : "";
  const actionType = typeof payload.actionType === "string" ? payload.actionType.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Rule name is required." }, { status: 400 });
  }
  if (!conditionFieldId) {
    return NextResponse.json({ error: "Condition field ID is required." }, { status: 400 });
  }
  if (!actionType) {
    return NextResponse.json({ error: "Action type is required." }, { status: 400 });
  }

  try {
    const rule = await createFormRule({
      formId: id,
      name,
      conditionFieldId,
      conditionOperator:
        typeof payload.conditionOperator === "string" ? payload.conditionOperator : "equals",
      conditionValue: typeof payload.conditionValue === "string" ? payload.conditionValue : null,
      actionType,
      actionTarget: typeof payload.actionTarget === "string" ? payload.actionTarget.trim() : null,
      actionValue: typeof payload.actionValue === "string" ? payload.actionValue : null,
      isActive: payload.isActive !== false,
      order: typeof payload.order === "number" ? payload.order : 0,
    } as unknown as Parameters<typeof createFormRule>[0]);
    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    console.error("[form-rules:create]", error);
    return NextResponse.json(
      { error: "We couldn't create this rule right now." },
      { status: 500 },
    );
  }
}
