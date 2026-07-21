import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageForms } from "@/lib/crm/authz";
import {
  getFormById,
  listFormFields,
  updateForm,
  deleteForm,
} from "@/lib/crm/form-builder-store";
import { formSettingsPayloadSchema } from "@/lib/crm/form-settings-contract";
import { listLeadStages } from "@/lib/crm/lead-stages-admin";
import { leadStore } from "@/lib/storage";

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

  if (!canManageForms(context)) {
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

  const parsed = formSettingsPayloadSchema.safeParse({
    name: existing.name,
    slug: existing.slug,
    description: existing.description,
    status: existing.status,
    isActive: existing.isActive,
    isPublic: existing.isPublic,
    successMessage: existing.successMessage,
    redirectUrl: existing.redirectUrl,
    primaryColor: existing.primaryColor,
    accentColor: existing.accentColor,
    logoUrl: existing.logoUrl,
    enableAutoQualify: existing.enableAutoQualify,
    autoQualifyRules: existing.autoQualifyRules,
    defaultStatus: existing.defaultStatus,
    defaultPriority: existing.defaultPriority,
    defaultSource: existing.defaultSource,
    defaultOwnerId: existing.defaultOwnerId,
    ...payload,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid form settings." },
      { status: 400 },
    );
  }

  try {
    let defaultStageKey = parsed.data.defaultStatus;
    const routingKeys = [
      "defaultStatus",
      "defaultOwnerId",
      "autoQualifyRules",
      "enableAutoQualify",
    ];
    if (routingKeys.some((key) => Object.hasOwn(payload, key))) {
      const [fields, stages, owner] = await Promise.all([
        listFormFields(id),
        listLeadStages(),
        parsed.data.defaultOwnerId
          ? leadStore.getCrmUserById(parsed.data.defaultOwnerId)
          : Promise.resolve(null),
      ]);
      const activeStages = stages.filter((stage) => !stage.archived);
      const defaultStage = activeStages.find(
        (stage) => stage.id === parsed.data.defaultStatus || stage.key === parsed.data.defaultStatus,
      );
      if (!defaultStage) {
        return NextResponse.json({ error: "Choose an active default stage." }, { status: 400 });
      }
      defaultStageKey = defaultStage.key;
      if (parsed.data.defaultOwnerId && !owner?.isActive) {
        return NextResponse.json({ error: "Choose an active default owner." }, { status: 400 });
      }

      const fieldIds = new Set(fields.map((field) => field.id));
      const stageKeys = new Set(activeStages.map((stage) => stage.key));
      for (const rule of parsed.data.autoQualifyRules ?? []) {
        if (!fieldIds.has(rule.fieldId)) {
          return NextResponse.json({ error: "Each qualification rule must use a field from this form." }, { status: 400 });
        }
        if (!stageKeys.has(rule.stageKey)) {
          return NextResponse.json({ error: "Each qualification rule must use an active stage." }, { status: 400 });
        }
      }
    }

    const form = await updateForm(id, {
      ...parsed.data,
      defaultStatus: defaultStageKey,
      autoQualifyRules: parsed.data.autoQualifyRules,
      ...(parsed.data.status === "archived"
        ? { isActive: false, isPublic: false }
        : {}),
    });
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
  const payload = (await request.json().catch(() => null)) as { confirmation?: unknown } | null;
  if (payload?.confirmation !== "DELETE FORM") {
    return NextResponse.json({ error: "Type DELETE FORM to permanently delete this form." }, { status: 400 });
  }
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
