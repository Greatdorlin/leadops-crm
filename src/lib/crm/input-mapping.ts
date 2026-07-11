import type {
  AdminLeadCaptureInput,
  AdminLeadFilterInput,
  AdminLeadProfileInput,
} from "@/lib/crm/form-contracts";
import type { LeadSalesCommandUpdateInput } from "@/lib/crm/sales-command";
import type { ParsedLeadImportRow } from "@/lib/crm/csv";
import type { LeadListFilters, LeadProfileUpdateInput } from "@/lib/storage/types";

export function mapAdminCaptureInputToLegacyLeadPayload(input: AdminLeadCaptureInput) {
  return {
    firstName: input.firstName.trim(),
    lastName: input.lastName ?? null,
    email: input.email ?? null,
    whatsappNumber: input.whatsappNumber ?? null,
    state: input.state ?? null,
    country: input.country ?? null,
    region: input.region ?? null,
    city: input.city ?? null,
    address: input.address ?? null,
    postalCode: input.postalCode ?? null,
    priority: input.priority,
    assignedTo: input.assignedTo ?? null,
    source: input.source,
    sourceDetail: input.sourceDetail ?? null,
  };
}

export function mapAdminProfileInputToLegacyLeadProfile(input: AdminLeadProfileInput): LeadProfileUpdateInput {
  return {
    firstName: input.firstName?.trim(),
    lastName: input.lastName ?? null,
    email: input.email ?? null,
    whatsappNumber: input.whatsappNumber ?? null,
    state: input.state ?? null,
    country: input.country ?? null,
    region: input.region ?? null,
    city: input.city ?? null,
    address: input.address ?? null,
    postalCode: input.postalCode ?? null,
    companyName: input.companyName ?? null,
  };
}

export function mapAdminInputToSalesCommandUpdate(
  input: Pick<
    AdminLeadCaptureInput,
    "companyName" | "estimatedValue" | "closeProbability" | "expectedCloseDate" | "nextFollowUpAt" | "wonValue" | "lostReason"
  > &
    Partial<Pick<AdminLeadCaptureInput, "stage" | "assignedTo">>,
  options: {
    assignedUserId?: string | null;
    stageId?: string | null;
    wonAt?: string | null;
    lostAt?: string | null;
  } = {},
): LeadSalesCommandUpdateInput {
  return {
    companyName: input.companyName ?? null,
    stageId: options.stageId ?? null,
    assignedUserId: options.assignedUserId ?? null,
    estimatedValue: input.estimatedValue ?? null,
    closeProbability: input.closeProbability ?? null,
    expectedCloseDate: input.expectedCloseDate ?? null,
    nextFollowUpAt: input.nextFollowUpAt ?? null,
    wonValue: input.wonValue ?? null,
    lostReason: input.lostReason ?? null,
    wonAt: options.wonAt ?? undefined,
    lostAt: options.lostAt ?? undefined,
  };
}

export function mapAdminLeadFilterInputToLegacyFilters(input: AdminLeadFilterInput): LeadListFilters {
  return {
    status: input.stage as LeadListFilters["status"],
    source: input.source as LeadListFilters["source"],
    priority: input.priority as LeadListFilters["priority"],
    assignedTo: input.assignedTo?.trim() || undefined,
    search: input.search?.trim() || undefined,
  };
}

export function mapAdminImportRowToLegacyLeadPayload(row: ParsedLeadImportRow) {
  return {
    firstName: row.firstName,
    lastName: row.lastName || null,
    email: row.email,
    whatsappNumber: row.whatsappNumber,
    state: row.state,
    priority: row.priority,
    assignedTo: row.assignedTo,
    source: row.source,
    sourceDetail: row.sourceDetail,
  };
}
