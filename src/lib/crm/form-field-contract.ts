import { z } from "zod";
import { SUBMISSION_RULE_OPERATORS } from "@/lib/crm/form-submission-routing";

export const FORM_FIELD_TYPES = [
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

const CORE_LEAD_FIELD_MAPPINGS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "whatsappNumber",
  "companyName",
  "state",
  "region",
  "country",
  "city",
  "address",
  "postalCode",
] as const;

const fieldOptionSchema = z.object({
  label: z.string().trim().min(1, "Option label is required.").max(120),
  value: z.string().trim().min(1, "Option value is required.").max(120),
}).strict();

const validationRulesSchema = z
  .object({
    minLength: z.number().int().min(0).max(10_000).optional(),
    maxLength: z.number().int().min(1).max(10_000).optional(),
    pattern: z.string().max(256).optional(),
    patternMessage: z.string().trim().max(240).optional(),
    min: z.number().finite().optional(),
    max: z.number().finite().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.minLength !== undefined &&
      value.maxLength !== undefined &&
      value.minLength > value.maxLength
    ) {
      context.addIssue({ code: "custom", message: "Minimum length cannot exceed maximum length." });
    }
    if (value.min !== undefined && value.max !== undefined && value.min > value.max) {
      context.addIssue({ code: "custom", message: "Minimum value cannot exceed maximum value." });
    }
    if (value.pattern) {
      try {
        new RegExp(value.pattern);
      } catch {
        context.addIssue({ code: "custom", message: "Use a valid validation pattern." });
      }
    }
  });

const fieldVisibilitySchema = z.object({
  fieldId: z.string().uuid("Choose a valid controlling field."),
  operator: z.enum(SUBMISSION_RULE_OPERATORS),
  value: z.string().max(2_000).nullable().optional(),
}).strict();

const leadFieldMappingSchema = z
  .string()
  .trim()
  .max(160)
  .refine(
    (value) =>
      (CORE_LEAD_FIELD_MAPPINGS as readonly string[]).includes(value) ||
      /^customField_(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|[a-z0-9_]+)$/i.test(value),
    "Choose a supported lead field mapping.",
  );

export const formFieldPayloadSchema = z
  .object({
    fieldType: z.enum(FORM_FIELD_TYPES),
    label: z.string().trim().min(1, "Field label is required.").max(120),
    placeholder: z.string().trim().max(240).nullable().default(null),
    helpText: z.string().trim().max(500).nullable().default(null),
    isRequired: z.boolean().default(false),
    isVisible: z.boolean().default(true),
    order: z.number().int().min(0).max(1_000).default(0),
    options: z.array(fieldOptionSchema).max(100).nullable().default(null),
    validationRules: validationRulesSchema.nullable().default(null),
    mapsToLeadField: leadFieldMappingSchema.nullable().default(null),
    showWhen: fieldVisibilitySchema.nullable().default(null),
    defaultValue: z.string().max(2_000).nullable().default(null),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      ["select", "checkbox", "radio"].includes(value.fieldType) &&
      (!value.options || value.options.length === 0)
    ) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "Add at least one option for this field type.",
      });
    }
    const optionValues = value.options?.map((option) => option.value) ?? [];
    if (new Set(optionValues).size !== optionValues.length) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "Each option value must be unique.",
      });
    }
  });

export const formFieldOrderPayloadSchema = z.object({
  orderedIds: z.array(z.string().uuid()).max(200),
}).strict();
