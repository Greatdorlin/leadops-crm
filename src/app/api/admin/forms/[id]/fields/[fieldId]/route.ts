import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageForms } from "@/lib/crm/authz";
import {
  getFormFieldById,
  updateFormField,
  deleteFormField,
} from "@/lib/crm/form-builder-store";
import { formFieldPayloadSchema } from "@/lib/crm/form-field-contract";
import {
  FormFieldAdminError,
  validateFormFieldReferences,
} from "@/lib/crm/form-field-admin";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; fieldId: string }> },
) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageForms(context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id, fieldId } = await params;
  const existing = await getFormFieldById(fieldId);
  if (!existing || existing.formId !== id) {
    return NextResponse.json({ error: "Field not found." }, { status: 404 });
  }

  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!payload) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = formFieldPayloadSchema.safeParse({
    fieldType: existing.fieldType,
    label: existing.label,
    placeholder: existing.placeholder,
    helpText: existing.helpText,
    isRequired: existing.isRequired,
    isVisible: existing.isVisible,
    order: existing.order,
    options: existing.options,
    validationRules: existing.validationRules,
    mapsToLeadField: existing.mapsToLeadField,
    showWhen: existing.showWhen,
    defaultValue: existing.defaultValue,
    ...payload,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid form field." },
      { status: 400 },
    );
  }

  try {
    await validateFormFieldReferences(id, parsed.data, fieldId);
    const field = await updateFormField(fieldId, parsed.data);
    return NextResponse.json({ field });
  } catch (error) {
    if (error instanceof FormFieldAdminError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
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

  if (!canManageForms(context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id, fieldId } = await params;
  const existing = await getFormFieldById(fieldId);
  if (!existing || existing.formId !== id) {
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
