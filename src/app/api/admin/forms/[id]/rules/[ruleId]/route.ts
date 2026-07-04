import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageFormSources } from "@/lib/crm/authz";
import {
  getFormRuleById,
  updateFormRule,
  deleteFormRule,
} from "@/lib/crm/form-builder-store";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; ruleId: string }> },
) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageFormSources(context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { ruleId } = await params;
  const existing = await getFormRuleById(ruleId);
  if (!existing) {
    return NextResponse.json({ error: "Rule not found." }, { status: 404 });
  }

  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!payload) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof payload.name === "string") updates.name = payload.name.trim();
  if (typeof payload.conditionFieldId === "string") updates.conditionFieldId = payload.conditionFieldId.trim();
  if (typeof payload.conditionOperator === "string") updates.conditionOperator = payload.conditionOperator;
  if (typeof payload.conditionValue === "string") updates.conditionValue = payload.conditionValue;
  if (typeof payload.actionType === "string") updates.actionType = payload.actionType.trim();
  if (typeof payload.actionTarget === "string") updates.actionTarget = payload.actionTarget.trim() || null;
  if (typeof payload.actionValue === "string") updates.actionValue = payload.actionValue;
  if (typeof payload.isActive === "boolean") updates.isActive = payload.isActive;
  if (typeof payload.order === "number") updates.order = payload.order;

  try {
    const rule = await updateFormRule(ruleId, updates as unknown as Parameters<typeof updateFormRule>[1]);
    return NextResponse.json({ rule });
  } catch (error) {
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

  if (!canManageFormSources(context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { ruleId } = await params;
  const existing = await getFormRuleById(ruleId);
  if (!existing) {
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
