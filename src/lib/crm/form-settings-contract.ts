import { z } from "zod";
import { LEAD_PRIORITIES, LEAD_SOURCES } from "@/lib/crm/constants";
import { autoQualifyRulesSchema } from "@/lib/crm/form-submission-routing";
import { isSafeImageSource, isSafeNavigationTarget } from "@/lib/security/url-safety";

const optionalImageSourceSchema = z
  .string()
  .trim()
  .max(2_900_000)
  .nullable()
  .refine((value) => {
    if (!value) {
      return true;
    }
    return isSafeImageSource(value);
  }, "Use a valid URL, image upload, or root-relative path.");

const optionalNavigationTargetSchema = z
  .string()
  .trim()
  .max(2_048)
  .nullable()
  .refine(
    (value) => !value || isSafeNavigationTarget(value),
    "Use a secure HTTP(S) URL or root-relative path.",
  );

const optionalHexSchema = z
  .string()
  .trim()
  .regex(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i, "Use a valid hex color.")
  .nullable();

export const formSettingsPayloadSchema = z.object({
  name: z.string().trim().min(1, "Form name is required.").max(120),
  slug: z
    .string()
    .trim()
    .min(1, "Form slug is required.")
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens for the slug."),
  description: z.string().trim().max(500).nullable(),
  status: z.enum(["draft", "active", "archived"]),
  isActive: z.boolean(),
  isPublic: z.boolean(),
  successMessage: z.string().trim().min(1, "Success message is required.").max(500),
  redirectUrl: optionalNavigationTargetSchema,
  primaryColor: optionalHexSchema,
  accentColor: optionalHexSchema,
  logoUrl: optionalImageSourceSchema,
  enableAutoQualify: z.boolean(),
  autoQualifyRules: autoQualifyRulesSchema.nullable(),
  defaultStatus: z.string().trim().min(1),
  defaultPriority: z.enum(LEAD_PRIORITIES),
  defaultSource: z.enum(LEAD_SOURCES),
  defaultOwnerId: z.string().uuid().nullable(),
});

const formNameSchema = z.string().trim().min(1, "Form name is required.").max(120);
const formSlugSchema = z
  .string()
  .trim()
  .min(1, "Form slug is required.")
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens for the slug.");

export const formCreatePayloadSchema = z.object({
  name: formNameSchema,
  slug: formSlugSchema,
  description: z.string().trim().max(500).nullable().default(null),
  isPublic: z.boolean().default(true),
  successMessage: z
    .string()
    .trim()
    .min(1, "Success message is required.")
    .max(500)
    .default("Thank you for your submission."),
  defaultStatus: z.string().trim().min(1).default("new"),
  defaultPriority: z.enum(LEAD_PRIORITIES).default("medium"),
  defaultSource: z.enum(LEAD_SOURCES).default("website_form"),
  defaultOwnerId: z.string().uuid().nullable().default(null),
});

export const formDuplicatePayloadSchema = z.object({
  duplicateFromId: z.string().uuid("Choose a valid form to duplicate."),
  name: formNameSchema,
  slug: formSlugSchema,
});
