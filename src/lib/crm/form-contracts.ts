import { z } from "zod";
import { CRM_STATUSES, LEAD_PRIORITIES, LEAD_SOURCES, PRIMARY_GOALS } from "@/lib/crm/constants";
import type { CrmStatus, LeadPriority, LeadSource, PrimaryGoal } from "@/lib/crm/types";

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
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().nullable().optional(),
  email: z.string().trim().email().nullable().optional().or(z.literal("").transform(() => null)),
  whatsappNumber: z.string().trim().nullable().optional(),
  state: z.string().trim().nullable().optional(),
  companyName: z.string().trim().nullable().optional(),
  estimatedValue: z.coerce.number().nonnegative().nullable().optional(),
  closeProbability: z.coerce.number().min(0).max(100).nullable().optional(),
  expectedCloseDate: z.string().trim().nullable().optional(),
  nextFollowUpAt: z.string().trim().nullable().optional(),
  wonValue: z.coerce.number().nonnegative().nullable().optional(),
  lostReason: z.string().trim().nullable().optional(),
  customFieldValues: z.record(z.string(), z.unknown()).optional().default({}),
};

export const adminLeadCaptureInputSchema = z
  .object({
    ...baseLeadAdminInputShape,
    category: z.enum(PRIMARY_GOALS).nullable().optional(),
    stage: z.enum(CRM_STATUSES).default("new"),
    priority: z.enum(LEAD_PRIORITIES).default("medium"),
    assignedTo: z.string().trim().email().nullable().optional().or(z.literal("").transform(() => null)),
    source: z.enum(LEAD_SOURCES).default("manual_entry"),
    sourceDetail: z.string().trim().nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.email && !value.whatsappNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add an email or WhatsApp number before saving.",
        path: ["email"],
      });
    }
  });

export type AdminLeadCaptureInput = z.infer<typeof adminLeadCaptureInputSchema>;

export const adminLeadProfileInputSchema = z
  .object({
    ...baseLeadAdminInputShape,
    category: z.enum(PRIMARY_GOALS).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.email && !value.whatsappNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add an email or WhatsApp number before saving.",
        path: ["email"],
      });
    }
  });

export type AdminLeadProfileInput = z.infer<typeof adminLeadProfileInputSchema>;

export const adminLeadFilterInputSchema = z.object({
  completionStatus: z.string().optional(),
  crmStatus: z.string().optional(),
  category: z.string().optional(),
  source: z.string().optional(),
  priority: z.string().optional(),
  assignedTo: z.string().optional(),
  search: z.string().optional(),
});

export type AdminLeadFilterInput = z.infer<typeof adminLeadFilterInputSchema>;

export const adminLeadImportInputSchema = z.object({
  csvText: z.string().min(1, "CSV text is required."),
  assignedTo: z.string().trim().email().nullable().optional().or(z.literal("").transform(() => null)),
  sourceDetail: z.string().trim().nullable().optional(),
});

export type AdminLeadImportInput = z.infer<typeof adminLeadImportInputSchema>;

export interface AdminLeadExportOptions {
  format: "csv" | "xlsx";
  category?: PrimaryGoal | "all";
  crmStatus?: CrmStatus | "all";
  priority?: LeadPriority | "all";
  source?: LeadSource | "all";
  assignedTo?: string;
  search?: string;
}

export function normalizeAdminLeadCapturePayload(payload: Record<string, unknown>) {
  return adminLeadCaptureInputSchema.safeParse({
    firstName: normalizeOptionalString(payload.firstName) ?? "",
    lastName: pickAliasString(payload, ["lastName"]),
    email: pickAliasString(payload, ["email"]),
    whatsappNumber: pickAliasString(payload, ["whatsappNumber"]),
    state: pickAliasString(payload, ["state"]),
    companyName: pickAliasString(payload, ["companyName", "company"]),
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
    category: pickAliasEnum(payload, ["category", "primaryGoal"], PRIMARY_GOALS),
    stage: pickAliasEnum(payload, ["stage", "crmStatus"], CRM_STATUSES) ?? "new",
    priority: pickAliasEnum(payload, ["priority"], LEAD_PRIORITIES) ?? "medium",
    assignedTo: pickAliasString(payload, ["assignedTo"]),
    source: pickAliasEnum(payload, ["source"], LEAD_SOURCES) ?? "manual_entry",
    sourceDetail: pickAliasString(payload, ["sourceDetail"]),
  });
}

export function normalizeAdminLeadProfilePayload(payload: Record<string, unknown>) {
  return adminLeadProfileInputSchema.safeParse({
    firstName: normalizeOptionalString(payload.firstName) ?? "",
    lastName: pickAliasString(payload, ["lastName"]),
    email: pickAliasString(payload, ["email"]),
    whatsappNumber: pickAliasString(payload, ["whatsappNumber"]),
    state: pickAliasString(payload, ["state"]),
    companyName: pickAliasString(payload, ["companyName", "company"]),
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
    category: pickAliasEnum(payload, ["category", "primaryGoal"], PRIMARY_GOALS),
  });
}

export function normalizeAdminLeadImportPayload(payload: Record<string, unknown>) {
  return adminLeadImportInputSchema.safeParse({
    csvText: typeof payload.csvText === "string" ? payload.csvText : "",
    assignedTo: pickAliasString(payload, ["assignedTo"]),
    sourceDetail: pickAliasString(payload, ["sourceDetail"]),
  });
}
