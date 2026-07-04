import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageFormSources } from "@/lib/crm/authz";
import {
  getFormById,
  updateForm,
  deleteForm,
} from "@/lib/crm/form-builder-store";

function validateAutoQualifyRules(raw: unknown): Record<string, unknown>[] | null | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) return null;
  const valid = raw.filter((item): item is Record<string, unknown> => {
    return typeof item === "object" && item !== null;
  });
  return valid.length > 0 ? valid : null;
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
  const form = await getFormById(id);

  if (!form) {
    return NextResponse.json({ error: "Form not found." }, { status: 404 });
  }

  return NextResponse.json({ form });
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
  const existing = await getFormById(id);
  if (!existing) {
    return NextResponse.json({ error: "Form not found." }, { status: 404 });
  }

  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!payload) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (typeof payload.name === "string") updates.name = payload.name.trim();
  if (typeof payload.slug === "string") updates.slug = payload.slug.trim();
  if (typeof payload.description === "string") updates.description = payload.description.trim() || null;
  if (typeof payload.status === "string") updates.status = payload.status;
  if (typeof payload.isActive === "boolean") updates.isActive = payload.isActive;
  if (typeof payload.isPublic === "boolean") updates.isPublic = payload.isPublic;
  if (typeof payload.successMessage === "string") updates.successMessage = payload.successMessage;
  if (typeof payload.redirectUrl === "string") updates.redirectUrl = payload.redirectUrl.trim() || null;
  if (typeof payload.primaryColor === "string") updates.primaryColor = payload.primaryColor.trim() || null;
  if (typeof payload.accentColor === "string") updates.accentColor = payload.accentColor.trim() || null;
  if (typeof payload.logoUrl === "string") updates.logoUrl = payload.logoUrl.trim() || null;
  if (typeof payload.enableAutoQualify === "boolean") updates.enableAutoQualify = payload.enableAutoQualify;
  if (payload.autoQualifyRules !== undefined) updates.autoQualifyRules = validateAutoQualifyRules(payload.autoQualifyRules);
  if (typeof payload.defaultStatus === "string") updates.defaultStatus = payload.defaultStatus;
  if (typeof payload.defaultPriority === "string") updates.defaultPriority = payload.defaultPriority;
  if (typeof payload.defaultSource === "string") updates.defaultSource = payload.defaultSource;
  if (typeof payload.defaultOwnerId === "string") updates.defaultOwnerId = payload.defaultOwnerId.trim() || null;

  try {
    const form = await updateForm(id, updates as Partial<Parameters<typeof updateForm>[1]>);
    return NextResponse.json({ form });
  } catch (error) {
    console.error("[forms:update]", error);
    return NextResponse.json(
      { error: "We couldn't update this form right now." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
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
  const existing = await getFormById(id);
  if (!existing) {
    return NextResponse.json({ error: "Form not found." }, { status: 404 });
  }

  try {
    await deleteForm(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[forms:delete]", error);
    return NextResponse.json(
      { error: "We couldn't delete this form right now." },
      { status: 500 },
    );
  }
}
