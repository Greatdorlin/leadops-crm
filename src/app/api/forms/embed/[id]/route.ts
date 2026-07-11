import { NextResponse } from "next/server";
import { getPublicFormById } from "@/lib/crm/form-builder-store";
import { buildPublicFormDefinition, buildPublicFormFields } from "@/lib/crm/public-form";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await getPublicFormById(id);

  if (!result) {
    return NextResponse.json({ error: "Form not found or not active." }, { status: 404 });
  }

  const { form, fields } = result;

  return NextResponse.json({
    form: buildPublicFormDefinition(form),
    fields: buildPublicFormFields(fields),
  });
}
