import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageFormSources } from "@/lib/crm/authz";
import {
  listForms,
  createForm,
} from "@/lib/crm/form-builder-store";

function validateAutoQualifyRules(raw: unknown): Record<string, unknown>[] | null {
  if (!Array.isArray(raw)) return null;
  const valid = raw.filter((item): item is Record<string, unknown> => {
    return typeof item === "object" && item !== null;
  });
  return valid.length > 0 ? valid : null;
}

export async function GET() {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const forms = await listForms();
  return NextResponse.json({ forms });
}

export async function POST(request: Request) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageFormSources(context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!payload) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const slug = typeof payload.slug === "string" ? payload.slug.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Form name is required." }, { status: 400 });
  }
  if (!slug) {
    return NextResponse.json({ error: "Form slug is required." }, { status: 400 });
  }

  try {
    const form = await createForm({
      name,
      slug,
      description: typeof payload.description === "string" ? payload.description.trim() : null,
      status: "draft",
      isActive: true,
      isPublic: payload.isPublic === true,
      successMessage:
        typeof payload.successMessage === "string"
          ? payload.successMessage
          : "Thank you for your submission.",
      redirectUrl: typeof payload.redirectUrl === "string" ? payload.redirectUrl.trim() : null,
      primaryColor: typeof payload.primaryColor === "string" ? payload.primaryColor.trim() : null,
      accentColor: typeof payload.accentColor === "string" ? payload.accentColor.trim() : null,
      logoUrl: typeof payload.logoUrl === "string" ? payload.logoUrl.trim() : null,
      enableAutoQualify: payload.enableAutoQualify === true,
      autoQualifyRules: validateAutoQualifyRules(payload.autoQualifyRules),
      defaultStatus: typeof payload.defaultStatus === "string" ? payload.defaultStatus : "new",
      defaultPriority: typeof payload.defaultPriority === "string" ? payload.defaultPriority : "medium",
      defaultSource: typeof payload.defaultSource === "string" ? payload.defaultSource : "website_form",
      defaultOwnerId: typeof payload.defaultOwnerId === "string" ? payload.defaultOwnerId.trim() : null,
    });
    return NextResponse.json({ form }, { status: 201 });
  } catch (error) {
    console.error("[forms:create]", error);
    return NextResponse.json(
      { error: "We couldn't create this form right now." },
      { status: 500 },
    );
  }
}
