import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageForms } from "@/lib/crm/authz";
import { getFormById } from "@/lib/crm/form-builder-store";
import { buildFormEmbedCodes } from "@/lib/crm/form-embed-code";

export async function GET(
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
  const form = await getFormById(id);
  if (!form) {
    return NextResponse.json({ error: "Form not found." }, { status: 404 });
  }

  const configuredBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  const baseUrl = configuredBaseUrl || new URL(request.url).origin;
  const codes = buildFormEmbedCodes({
    formId: form.id,
    formName: form.name,
    formSlug: form.slug,
    baseUrl,
  });

  return NextResponse.json({
    formId: id,
    formSlug: form.slug,
    ...codes,
  });
}
