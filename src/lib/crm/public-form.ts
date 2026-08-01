import type { FormFieldRow, FormRow } from "@/lib/db/schema";
import { resolveFormPresentationMode } from "@/lib/crm/form-presentation";

export const PUBLIC_FORM_FIELD_TYPES = [
  "text",
  "email",
  "phone",
  "number",
  "select",
  "checkbox",
  "radio",
  "textarea",
  "date",
] as const;

type PublicFormFieldType = (typeof PUBLIC_FORM_FIELD_TYPES)[number];

function isPublicFormFieldType(value: string): value is PublicFormFieldType {
  return (PUBLIC_FORM_FIELD_TYPES as readonly string[]).includes(value);
}

export function buildPublicFormDefinition(form: FormRow) {
  return {
    id: form.id,
    name: form.name,
    slug: form.slug,
    description: form.description,
    successMessage: form.successMessage,
    submitButtonLabel: form.submitButtonLabel,
    presentationMode: resolveFormPresentationMode(form.presentationMode),
    redirectUrl: form.redirectUrl,
    primaryColor: form.primaryColor,
    accentColor: form.accentColor,
    logoUrl: form.logoUrl,
  };
}

export function buildPublicFormFields(fields: FormFieldRow[]) {
  return fields.flatMap((field) => {
    if (!field.isVisible || !isPublicFormFieldType(field.fieldType)) {
      return [];
    }

    return [{
      id: field.id,
      fieldType: field.fieldType,
      label: field.label,
      placeholder: field.placeholder,
      helpText: field.helpText,
      isRequired: field.isRequired,
      order: field.order,
      options: field.options,
      validationRules: field.validationRules,
      showWhen: field.showWhen,
      defaultValue: field.defaultValue,
    }];
  });
}
