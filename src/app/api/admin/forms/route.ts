import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageForms } from "@/lib/crm/authz";
import {
  listForms,
  createFormWithFields,
  duplicateForm,
} from "@/lib/crm/form-builder-store";
import {
  formCreatePayloadSchema,
  formDuplicatePayloadSchema,
} from "@/lib/crm/form-settings-contract";
import { listLeadStages } from "@/lib/crm/lead-stages-admin";
import { leadStore } from "@/lib/storage";

function hasDatabaseErrorCode(error: unknown, code: string) {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current && typeof current === "object"; depth += 1) {
    if ((current as { code?: unknown }).code === code) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

export async function GET() {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!canManageForms(context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const forms = await listForms();
  return NextResponse.json({ forms });
}

export async function POST(request: Request) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageForms(context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!payload) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    if (typeof payload.duplicateFromId === "string") {
      const parsedDuplicate = formDuplicatePayloadSchema.safeParse(payload);
      if (!parsedDuplicate.success) {
        return NextResponse.json(
          { error: parsedDuplicate.error.issues[0]?.message ?? "Invalid duplicate request." },
          { status: 400 },
        );
      }
      const form = await duplicateForm(parsedDuplicate.data.duplicateFromId, {
        name: parsedDuplicate.data.name,
        slug: parsedDuplicate.data.slug,
      });
      if (!form) {
        return NextResponse.json({ error: "Form not found." }, { status: 404 });
      }
      return NextResponse.json({ form }, { status: 201 });
    }

    const parsed = formCreatePayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid form." },
        { status: 400 },
      );
    }
    const [stages, owner] = await Promise.all([
      listLeadStages(),
      parsed.data.defaultOwnerId
        ? leadStore.getCrmUserById(parsed.data.defaultOwnerId)
        : Promise.resolve(null),
    ]);
    const defaultStage = stages.find(
      (stage) =>
        !stage.archived &&
        (stage.id === parsed.data.defaultStatus || stage.key === parsed.data.defaultStatus),
    );
    if (!defaultStage) {
      return NextResponse.json({ error: "Choose an active default stage." }, { status: 400 });
    }
    if (parsed.data.defaultOwnerId && !owner?.isActive) {
      return NextResponse.json({ error: "Choose an active default owner." }, { status: 400 });
    }

    const created = await createFormWithFields({
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
      status: "draft",
      isActive: false,
      isPublic: parsed.data.isPublic,
      successMessage: parsed.data.successMessage,
      redirectUrl: null,
      primaryColor: null,
      accentColor: null,
      logoUrl: null,
      enableAutoQualify: false,
      autoQualifyRules: null,
      defaultStatus: defaultStage.key,
      defaultPriority: parsed.data.defaultPriority,
      defaultSource: parsed.data.defaultSource,
      defaultOwnerId: parsed.data.defaultOwnerId,
    }, parsed.data.fields);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (hasDatabaseErrorCode(error, "23505")) {
      return NextResponse.json(
        { error: "That form URL is already in use. Choose a different slug." },
        { status: 409 },
      );
    }
    console.error("[forms:create]", error);
    return NextResponse.json(
      { error: "We couldn't create this form right now." },
      { status: 500 },
    );
  }
}
