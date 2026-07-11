import { NextResponse } from "next/server";
import { getPublicFormBySlug } from "@/lib/crm/form-builder-store";
import { buildPublicFormDefinition, buildPublicFormFields } from "@/lib/crm/public-form";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const result = await getPublicFormBySlug(slug);

  if (!result) {
    return NextResponse.json({ error: "Form not found." }, { status: 404 });
  }

  const { form, fields } = result;

  return NextResponse.json({
    form: buildPublicFormDefinition(form),
    fields: buildPublicFormFields(fields),
  });
}
