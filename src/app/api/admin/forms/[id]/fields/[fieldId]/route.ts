import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageFormSources } from "@/lib/crm/authz";
import {
  getFormFieldById,
  updateFormField,
  deleteFormField,
} from "@/lib/crm/form-builder-store";

function validateOptions(raw: unknown): { label: string; value: string }[] | null | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) return null;
  const valid = raw.filter((item): item is { label: string; value: string } => {
    if (typeof item !== "object" || item === null) return false;
    const obj = item as Record<string, unknown>;
    return typeof obj.label === "string" && typeof obj.value === "string";
  });
  return valid.length > 0 ? valid : null;
}

function validateValidationRules(raw: unknown): Record<string, unknown> | null | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw !== "object" || raw === null) return null;
  return raw as Record<string, unknown>;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; fieldId: string }> },
) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageFormSources(context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { fieldId } = await params;
  const existing = await getFormFieldById(fieldId);
  if (!existing) {
    return NextResponse.json({ error: "Field not found." }, { status: 404 });
  }

  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!payload) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const updates: Partial<Record<string, unknown>> = {};
  if (typeof payload.label === "string") updates.label = payload.label.trim();
  if (typeof payload.fieldType === "string") updates.fieldType = payload.fieldType.trim();
  if (typeof payload.placeholder === "string") updates.placeholder = payload.placeholder.trim() || null;
  if (typeof payload.helpText === "string") updates.helpText = payload.helpText.trim() || null;
  if (typeof payload.isRequired === "boolean") updates.isRequired = payload.isRequired;
  if (typeof payload.isVisible === "boolean") updates.isVisible = payload.isVisible;
  if (typeof payload.order === "number") updates.order = payload.order;
  if (payload.options !== undefined) updates.options = validateOptions(payload.options) as unknown;
  if (payload.validationRules !== undefined) updates.validationRules = validateValidationRules(payload.validationRules) as unknown;
  if (typeof payload.mapsToLeadField === "string") updates.mapsToLeadField = payload.mapsToLeadField.trim() || null;
  if (payload.showWhen !== undefined) updates.showWhen = payload.showWhen as Record<string, unknown> | null;
  if (typeof payload.defaultValue === "string") updates.defaultValue = payload.defaultValue;

  try {
    const field = await updateFormField(fieldId, updates);
    return NextResponse.json({ field });
  } catch (error) {
    console.error("[form-field:update]", error);
    return NextResponse.json(
      { error: "We couldn't update this field right now." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; fieldId: string }> },
) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageFormSources(context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { fieldId } = await params;
  const existing = await getFormFieldById(fieldId);
  if (!existing) {
    return NextResponse.json({ error: "Field not found." }, { status: 404 });
  }

  try {
    await deleteFormField(fieldId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[form-field:delete]", error);
    return NextResponse.json(
      { error: "We couldn't delete this field right now." },
      { status: 500 },
    );
  }
}
