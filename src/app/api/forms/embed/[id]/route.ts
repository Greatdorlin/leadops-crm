import { NextResponse } from "next/server";
import { getPublicFormById } from "@/lib/crm/form-builder-store";

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
    form: {
      id: form.id,
      name: form.name,
      slug: form.slug,
      description: form.description,
      successMessage: form.successMessage,
      redirectUrl: form.redirectUrl,
      primaryColor: form.primaryColor,
      accentColor: form.accentColor,
      logoUrl: form.logoUrl,
    },
    fields: fields
      .filter((f) => f.isVisible)
      .map((f) => ({
        id: f.id,
        fieldType: f.fieldType,
        label: f.label,
        placeholder: f.placeholder,
        helpText: f.helpText,
        isRequired: f.isRequired,
        order: f.order,
        options: f.options,
        validationRules: f.validationRules,
        showWhen: f.showWhen,
        defaultValue: f.defaultValue,
      })),
  });
}
