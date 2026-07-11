import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageForms } from "@/lib/crm/authz";
import {
  getFormById,
  listFormFields,
  createFormField,
  reorderFormFields,
} from "@/lib/crm/form-builder-store";
import {
  formFieldOrderPayloadSchema,
  formFieldPayloadSchema,
} from "@/lib/crm/form-field-contract";
import {
  FormFieldAdminError,
  validateFormFieldReferences,
} from "@/lib/crm/form-field-admin";

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
  const fields = await listFormFields(id);
  return NextResponse.json({ fields });
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
  const parsed = formFieldPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid form field." },
      { status: 400 },
    );
  }

  try {
    await validateFormFieldReferences(id, parsed.data);
    const field = await createFormField({
      formId: id,
      ...parsed.data,
    });
    return NextResponse.json({ field }, { status: 201 });
  } catch (error) {
    if (error instanceof FormFieldAdminError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[form-fields:create]", error);
    return NextResponse.json(
      { error: "We couldn't create this field right now." },
      { status: 500 },
    );
  }
}

export async function PUT(
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
  const parsed = formFieldOrderPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid field order." },
      { status: 400 },
    );
  }

  try {
    const fields = await listFormFields(id);
    const expectedIds = new Set(fields.map((field) => field.id));
    if (
      parsed.data.orderedIds.length !== expectedIds.size ||
      new Set(parsed.data.orderedIds).size !== expectedIds.size ||
      parsed.data.orderedIds.some((fieldId) => !expectedIds.has(fieldId))
    ) {
      return NextResponse.json(
        { error: "Include each field from this form exactly once." },
        { status: 400 },
      );
    }
    await reorderFormFields(id, parsed.data.orderedIds);
    const reorderedFields = await listFormFields(id);
    return NextResponse.json({ fields: reorderedFields });
  } catch (error) {
    console.error("[form-fields:reorder]", error);
    return NextResponse.json(
      { error: "We couldn't reorder fields right now." },
      { status: 500 },
    );
  }
}
