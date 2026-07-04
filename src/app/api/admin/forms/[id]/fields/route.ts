import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageFormSources } from "@/lib/crm/authz";
import {
  listFormFields,
  createFormField,
  reorderFormFields,
} from "@/lib/crm/form-builder-store";

function validateOptions(raw: unknown): { label: string; value: string }[] | null {
  if (!Array.isArray(raw)) return null;
  const valid = raw.filter((item): item is { label: string; value: string } => {
    if (typeof item !== "object" || item === null) return false;
    const obj = item as Record<string, unknown>;
    return typeof obj.label === "string" && typeof obj.value === "string";
  });
  return valid.length > 0 ? valid : null;
}

function validateValidationRules(raw: unknown): Record<string, unknown> | null {
  if (typeof raw !== "object" || raw === null) return null;
  return raw as Record<string, unknown>;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
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

  if (!canManageFormSources(context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;
  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!payload) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const label = typeof payload.label === "string" ? payload.label.trim() : "";
  const fieldType = typeof payload.fieldType === "string" ? payload.fieldType.trim() : "";

  if (!label) {
    return NextResponse.json({ error: "Field label is required." }, { status: 400 });
  }
  if (!fieldType) {
    return NextResponse.json({ error: "Field type is required." }, { status: 400 });
  }

  const options = validateOptions(payload.options);
  const validationRules = validateValidationRules(payload.validationRules);

  try {
    const field = await createFormField({
      formId: id,
      fieldType,
      label,
      placeholder: typeof payload.placeholder === "string" ? payload.placeholder.trim() : null,
      helpText: typeof payload.helpText === "string" ? payload.helpText.trim() : null,
      isRequired: payload.isRequired === true,
      isVisible: payload.isVisible !== false,
      order: typeof payload.order === "number" ? payload.order : 0,
      options: options as unknown as { label: string; value: string }[] | null,
      validationRules: validationRules as unknown as Record<string, unknown> | null,
      mapsToLeadField: typeof payload.mapsToLeadField === "string" ? payload.mapsToLeadField.trim() : null,
      showWhen: (payload.showWhen as Record<string, unknown> | null) ?? null,
      defaultValue: typeof payload.defaultValue === "string" ? payload.defaultValue : null,
    });
    return NextResponse.json({ field }, { status: 201 });
  } catch (error) {
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

  if (!canManageFormSources(context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;
  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!payload || !Array.isArray(payload.orderedIds)) {
    return NextResponse.json({ error: "orderedIds array is required." }, { status: 400 });
  }

  try {
    await reorderFormFields(id, payload.orderedIds.filter((id): id is string => typeof id === "string"));
    const fields = await listFormFields(id);
    return NextResponse.json({ fields });
  } catch (error) {
    console.error("[form-fields:reorder]", error);
    return NextResponse.json(
      { error: "We couldn't reorder fields right now." },
      { status: 500 },
    );
  }
}
