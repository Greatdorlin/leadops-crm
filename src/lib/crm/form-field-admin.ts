import "server-only";

import type { z } from "zod";
import { listCustomFields } from "@/lib/crm/custom-fields-admin";
import type { formFieldPayloadSchema } from "@/lib/crm/form-field-contract";
import { listFormFields } from "@/lib/crm/form-builder-store";

type FormFieldPayload = z.infer<typeof formFieldPayloadSchema>;

export class FormFieldAdminError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FormFieldAdminError";
  }
}

export async function validateFormFieldReferences(
  formId: string,
  payload: FormFieldPayload,
  currentFieldId?: string,
) {
  const [fields, customFields] = await Promise.all([
    listFormFields(formId),
    payload.mapsToLeadField?.startsWith("customField_")
      ? listCustomFields()
      : Promise.resolve([]),
  ]);

  if (payload.showWhen) {
    const controllingField = fields.find((field) => field.id === payload.showWhen?.fieldId);
    if (!controllingField || controllingField.id === currentFieldId) {
      throw new FormFieldAdminError("Choose another field from this form for conditional visibility.");
    }
  }

  if (payload.mapsToLeadField?.startsWith("customField_")) {
    const reference = payload.mapsToLeadField.slice("customField_".length);
    if (!customFields.some((field) => field.id === reference || field.key === reference)) {
      throw new FormFieldAdminError("Choose an active custom field mapping.");
    }
  }

  return fields;
}
