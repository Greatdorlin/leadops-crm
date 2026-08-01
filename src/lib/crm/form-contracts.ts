import { z } from "zod";
import { CRM_STATUSES, LEAD_CUSTOMER_TYPES, LEAD_PRIORITIES, LEAD_SOURCES } from "@/lib/crm/constants";
import type { CrmStatus, LeadCustomerType, LeadPriority, LeadSource } from "@/lib/crm/types";
import { CRM_MIGRATION_SOURCES } from "@/lib/migrations/sources";

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function pickAliasString(
  input: Record<string, unknown>,
  keys: string[],
) {
  for (const key of keys) {
    const value = normalizeOptionalString(input[key]);
    if (value !== undefined) {
      return value;
    }
  }

  if (keys.some((key) => Object.prototype.hasOwnProperty.call(input, key))) {
    return null;
  }

  return undefined;
}

function pickAliasEnum<T extends readonly string[]>(
  input: Record<string, unknown>,
  keys: string[],
  values: T,
) {
  const rawValue = pickAliasString(input, keys);
  if (rawValue === undefined || rawValue === null) {
    return rawValue;
  }

  return values.includes(rawValue as T[number]) ? (rawValue as T[number]) : rawValue;
}

const baseLeadAdminInputShape = {
  firstName: z.string().trim().min(1, "First name is required.").optional(),
  lastName: z.string().trim().nullable().optional(),
  email: z.string().trim().email().nullable().optional().or(z.literal("").transform(() => null)),
  whatsappNumber: z.string().trim().nullable().optional(),
  callNumber: z.string().trim().nullable().optional(),
  state: z.string().trim().nullable().optional(),
  country: z.string().trim().nullable().optional(),
  region: z.string().trim().nullable().optional(),
  city: z.string().trim().nullable().optional(),
  address: z.string().trim().nullable().optional(),
  postalCode: z.string().trim().nullable().optional(),
  companyName: z.string().trim().nullable().optional(),
  leadCustomerType: z.enum(LEAD_CUSTOMER_TYPES).nullable().optional(),
  estimatedValue: z.coerce.number().nonnegative().nullable().optional(),
  closeProbability: z.coerce.number().min(0).max(100).nullable().optional(),
  expectedCloseDate: z.string().trim().nullable().optional(),
  nextFollowUpAt: z.string().trim().nullable().optional(),
  wonValue: z.coerce.number().nonnegative().nullable().optional(),
  lostReason: z.string().trim().nullable().optional(),
  customFieldValues: z.record(z.string(), z.unknown()).optional().default({}),
};

const leadBusinessAttributionInputShape = {
  sourceId: z.string().uuid().nullable().optional(),
  sourceDetail: z.string().trim().nullable().optional(),
  campaignLabel: z.string().trim().nullable().optional(),
  utmSource: z.string().trim().nullable().optional(),
  utmMedium: z.string().trim().nullable().optional(),
  utmCampaign: z.string().trim().nullable().optional(),
  utmContent: z.string().trim().nullable().optional(),
  utmTerm: z.string().trim().nullable().optional(),
  landingPage: z.string().trim().nullable().optional(),
};

export const adminLeadCaptureInputSchema = z
  .object({
    ...baseLeadAdminInputShape,
    firstName: z.string().trim().min(1, "First name is required."),
    leadCustomerType: z.enum(LEAD_CUSTOMER_TYPES).default("direct"),
    stage: z.enum(CRM_STATUSES).default("new"),
    stageId: z.string().uuid("Choose a valid lead stage.").nullable().optional(),
    priority: z.enum(LEAD_PRIORITIES).default("medium"),
    assignedTo: z.string().trim().email().nullable().optional().or(z.literal("").transform(() => null)),
    source: z.enum(LEAD_SOURCES).default("manual_entry"),
    sourceDetail: z.string().trim().nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.email && !value.whatsappNumber && !value.callNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add an email, WhatsApp number, or call number before saving.",
        path: ["email"],
      });
    }
  });

export type AdminLeadCaptureInput = z.infer<typeof adminLeadCaptureInputSchema>;

export const adminLeadProfileInputSchema = z
  .object({
    firstName: baseLeadAdminInputShape.firstName,
    lastName: baseLeadAdminInputShape.lastName,
    email: baseLeadAdminInputShape.email,
    whatsappNumber: baseLeadAdminInputShape.whatsappNumber,
    callNumber: baseLeadAdminInputShape.callNumber,
    country: baseLeadAdminInputShape.country,
    region: baseLeadAdminInputShape.region,
    city: baseLeadAdminInputShape.city,
    address: baseLeadAdminInputShape.address,
    postalCode: baseLeadAdminInputShape.postalCode,
    companyName: baseLeadAdminInputShape.companyName,
    leadCustomerType: baseLeadAdminInputShape.leadCustomerType,
    customFieldValues: baseLeadAdminInputShape.customFieldValues,
    ...leadBusinessAttributionInputShape,
  })
  .superRefine((value, ctx) => {
    if (!value.email && !value.whatsappNumber && !value.callNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add an email, WhatsApp number, or call number before saving.",
        path: ["email"],
      });
    }
  });

export type AdminLeadProfileInput = z.infer<typeof adminLeadProfileInputSchema>;

export const adminLeadFilterInputSchema = z.object({
  stage: z.string().optional(),
  source: z.string().optional(),
  priority: z.string().optional(),
  assignedTo: z.string().optional(),
  search: z.string().optional(),
});

export type AdminLeadFilterInput = z.infer<typeof adminLeadFilterInputSchema>;

export const adminLeadImportInputSchema = z
  .object({
    action: z.enum(["validate", "commit"]).default("validate"),
    importId: z.string().uuid("Choose a valid staged import.").optional(),
    csvText: z
      .string()
      .max(5_000_000, "Use the background migration path for files over 5 MB.")
      .default(""),
    sourceSystem: z.enum(CRM_MIGRATION_SOURCES).default("generic_csv"),
    sourceFileName: z.string().trim().max(255).nullable().optional(),
    assignedTo: z.string().trim().email().nullable().optional().or(z.literal("").transform(() => null)),
    sourceDetail: z.string().trim().nullable().optional(),
  })
  .superRefine((value, context) => {
    if (value.action === "validate" && !value.csvText.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "CSV text is required.",
        path: ["csvText"],
      });
    }
    if (value.action === "commit" && !value.importId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Validate the file before importing it.",
        path: ["importId"],
      });
    }
  });

export type AdminLeadImportInput = z.infer<typeof adminLeadImportInputSchema>;

export interface AdminLeadExportOptions {
  format: "csv" | "xlsx";
  stage?: CrmStatus | "all";
  priority?: LeadPriority | "all";
  source?: LeadSource | "all";
  leadCustomerType?: LeadCustomerType | "all";
  assignedTo?: string;
  search?: string;
}

export function normalizeAdminLeadCapturePayload(payload: Record<string, unknown>) {
  return adminLeadCaptureInputSchema.safeParse({
    firstName: normalizeOptionalString(payload.firstName) ?? "",
    lastName: pickAliasString(payload, ["lastName"]),
    email: pickAliasString(payload, ["email"]),
    whatsappNumber: pickAliasString(payload, ["whatsappNumber"]),
    callNumber: pickAliasString(payload, ["callNumber", "phoneNumber"]),
    state: pickAliasString(payload, ["state"]),
    country: pickAliasString(payload, ["country"]),
    region: pickAliasString(payload, ["region", "stateProvinceRegion"]),
    city: pickAliasString(payload, ["city"]),
    address: pickAliasString(payload, ["address"]),
    postalCode: pickAliasString(payload, ["postalCode", "postal_code"]),
    companyName: pickAliasString(payload, ["companyName", "company"]),
    leadCustomerType:
      pickAliasEnum(payload, ["leadCustomerType", "customerType", "leadType"], LEAD_CUSTOMER_TYPES) ??
      "direct",
    estimatedValue:
      payload.estimatedValue === undefined || payload.estimatedValue === null || payload.estimatedValue === ""
        ? null
        : Number(payload.estimatedValue),
    closeProbability:
      payload.closeProbability === undefined || payload.closeProbability === null || payload.closeProbability === ""
        ? null
        : Number(payload.closeProbability),
    expectedCloseDate: pickAliasString(payload, ["expectedCloseDate"]),
    nextFollowUpAt: pickAliasString(payload, ["nextFollowUpAt"]),
    wonValue:
      payload.wonValue === undefined || payload.wonValue === null || payload.wonValue === ""
        ? null
        : Number(payload.wonValue),
    lostReason: pickAliasString(payload, ["lostReason"]),
    customFieldValues:
      typeof payload.customFieldValues === "object" && payload.customFieldValues
        ? (payload.customFieldValues as Record<string, unknown>)
        : {},
    stage: pickAliasEnum(payload, ["stage"], CRM_STATUSES) ?? "new",
    stageId: pickAliasString(payload, ["stageId"]),
    priority: pickAliasEnum(payload, ["priority"], LEAD_PRIORITIES) ?? "medium",
    assignedTo: pickAliasString(payload, ["assignedTo"]),
    source: pickAliasEnum(payload, ["source"], LEAD_SOURCES) ?? "manual_entry",
    sourceDetail: pickAliasString(payload, ["sourceDetail"]),
  });
}

export function normalizeAdminLeadProfilePayload(payload: Record<string, unknown>) {
  const includesFirstName = Object.prototype.hasOwnProperty.call(payload, "firstName");
  const includesLeadCustomerType =
    Object.prototype.hasOwnProperty.call(payload, "leadCustomerType") ||
    Object.prototype.hasOwnProperty.call(payload, "customerType") ||
    Object.prototype.hasOwnProperty.call(payload, "leadType");

  return adminLeadProfileInputSchema.safeParse({
    firstName: includesFirstName ? normalizeOptionalString(payload.firstName) ?? "" : undefined,
    lastName: pickAliasString(payload, ["lastName"]),
    email: pickAliasString(payload, ["email"]),
    whatsappNumber: pickAliasString(payload, ["whatsappNumber"]),
    callNumber: pickAliasString(payload, ["callNumber", "phoneNumber"]),
    country: pickAliasString(payload, ["country"]),
    region: pickAliasString(payload, ["region", "stateProvinceRegion"]),
    city: pickAliasString(payload, ["city"]),
    address: pickAliasString(payload, ["address"]),
    postalCode: pickAliasString(payload, ["postalCode", "postal_code"]),
    companyName: pickAliasString(payload, ["companyName", "company"]),
    leadCustomerType: includesLeadCustomerType
      ? pickAliasEnum(payload, ["leadCustomerType", "customerType", "leadType"], LEAD_CUSTOMER_TYPES)
      : undefined,
    sourceId: pickAliasString(payload, ["sourceId"]),
    sourceDetail: pickAliasString(payload, ["sourceDetail"]),
    campaignLabel: pickAliasString(payload, ["campaignLabel"]),
    utmSource: pickAliasString(payload, ["utmSource"]),
    utmMedium: pickAliasString(payload, ["utmMedium"]),
    utmCampaign: pickAliasString(payload, ["utmCampaign"]),
    utmContent: pickAliasString(payload, ["utmContent"]),
    utmTerm: pickAliasString(payload, ["utmTerm"]),
    landingPage: pickAliasString(payload, ["landingPage"]),
    customFieldValues:
      typeof payload.customFieldValues === "object" && payload.customFieldValues
        ? (payload.customFieldValues as Record<string, unknown>)
        : {},
  });
}

export function normalizeAdminLeadImportPayload(payload: Record<string, unknown>) {
  return adminLeadImportInputSchema.safeParse({
    csvText: typeof payload.csvText === "string" ? payload.csvText : "",
    action: payload.action,
    importId: pickAliasString(payload, ["importId"]),
    sourceSystem: payload.sourceSystem,
    sourceFileName: pickAliasString(payload, ["sourceFileName"]),
    assignedTo: pickAliasString(payload, ["assignedTo"]),
    sourceDetail: pickAliasString(payload, ["sourceDetail"]),
  });
}
