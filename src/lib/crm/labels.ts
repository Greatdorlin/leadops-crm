import type {
  CrmUserRole,
  IntegrationProvider,
  IntegrationStatus,
  LeadRecord,
  LeadSource,
  SyncJobStatus,
  SyncState,
} from "@/lib/crm/types";
import type { AdminAccessLevel } from "@/lib/admin-permissions";
import {
  getRoleLabel,
  mapLegacyAccessLevelToRole,
  mapLegacyCrmRoleToRole,
} from "@/lib/crm/roles";
import { formatNigeriaStateLabel } from "@/lib/nigeria-state-options";

const labelMap: Record<string, string> = {
  all: "All",
  my: "My tasks",
  today: "Due today",
  overdue: "Overdue",
  completed: "Completed",
  complete: "Completed",
  incomplete: "Open",
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  consultation_booked: "Review booked",
  application_started: "In progress",
  documents_pending: "Docs pending",
  payment_pending: "Payment pending",
  converted: "Converted",
  lost: "Lost",
  unresponsive: "Unresponsive",
  unqualified: "Unqualified",
  closed: "Closed",
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
  website_form: "Website form",
  pathway_finder: "Website",
  facebook_lead_ads: "Facebook Lead Ads",
  google_ads: "Google Ads",
  tiktok_lead_ads: "TikTok Lead Ads",
  linkedin_lead_gen_forms: "LinkedIn Lead Gen Forms",
  google_sheets: "Google Sheets",
  whatsapp_inquiry: "WhatsApp inquiry",
  manual_entry: "Manual entry",
  agent: "Agent",
  referral: "Referral",
  admin: "Owner",
  manager: "Manager",
  sales_agent: "Sales rep",
  ad_manager: "Manager",
  consultant: "Team Lead",
  finance: "Finance",
  affiliate: "Affiliate",
  master_admin: "Owner",
  general_admin: "Admin",
  lead_sales_rep: "Team Lead",
  sales_rep: "Sales Rep",
  facebook: "Facebook",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  sender: "Sender",
  website: "Website",
  healthy: "Healthy",
  pending_sync: "Sync scheduled",
  failed: "Needs attention",
  not_configured: "Setup needed",
  disabled: "Paused",
  pending: "Pending",
  processing: "Processing",
  processed: "Processed",
  duplicate: "Duplicate",
  skipped: "Skipped",
  success: "Completed",
  running: "Running",
  partial: "Partially complete",
  import: "Import",
  export: "Export",
  sync: "Sync",
  sync_performance: "Performance sync",
  performance_sync: "Performance sync",
  retry: "Retry",
  lead_created: "Lead created",
  lead_updated_from_source: "Lead details updated",
  lead_profile_updated: "Lead details updated",
  status_changed: "Status changed",
  lead_assigned: "Owner assigned",
  priority_changed: "Priority updated",
  note_added: "Note added",
  task_created: "Task created",
  task_completed: "Task completed",
  website_lead_received: "Website lead received",
  facebook_lead_received: "Facebook lead received",
  google_ads_lead_received: "Google Ads lead received",
  tiktok_lead_received: "TikTok lead received",
  linkedin_lead_received: "LinkedIn lead received",
  google_sheet_imported: "Imported from Google Sheets",
  google_sheet_exported: "Exported to Google Sheets",
  state: "State",
  state_of_residence: "State",
  nigeriaState: "State",
  highestQualification: "Highest qualification",
  highestEducation: "Highest qualification",
  degreeClass: "Grade",
  graduationYear: "Graduation year",
  studiedCourse: "Previous course",
  desiredCourse: "Interest area",
  targetField: "Interest area",
  targetIntake: "Preferred timeline",
  fitSignal: "Fit signal",
  contactTimeline: "Contact timing",
  consent: "Consent",
  passportStatus: "Document status",
  studyFundingReadiness: "Budget status",
  fundingReadiness: "Budget status",
  destinationInterest: "Location interest",
  whatsappNumber: "Phone",
};

function sanitizeLegacyDisplayLabel(value: string) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return "";
  }

  if (normalized === "pathway finder" || normalized === "pathway_finder") {
    return "Website";
  }

  if (normalized === "flyconnect" || normalized === "fly connect") {
    return "Leads Desk";
  }

  return value.trim();
}

function titleCase(value: string) {
  return value
    .trim()
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function crmLabelize(value?: string | null) {
  if (!value) {
    return "";
  }

  return labelMap[value] ?? titleCase(sanitizeLegacyDisplayLabel(value));
}

export function formatLeadSourceLabel(source?: LeadSource | string | null) {
  return source ? crmLabelize(source) : "Unknown source";
}

export function formatDisplayLabel(value?: string | null, emptyLabel = "") {
  if (!value) {
    return emptyLabel;
  }

  const sanitized = sanitizeLegacyDisplayLabel(value);
  return sanitized || emptyLabel;
}

export function formatLeadStateLabel(value?: string | null) {
  if (!value) {
    return "";
  }

  return formatNigeriaStateLabel(value) || crmLabelize(value);
}

export function formatLeadInterestLabel(
  lead: Pick<LeadRecord, "sourceDetail" | "campaignLabel" | "companyName">,
) {
  return (
    lead.sourceDetail?.trim() ||
    lead.campaignLabel?.trim() ||
    lead.companyName?.trim() ||
    "Not set"
  );
}

export function formatCrmRoleLabel(role?: CrmUserRole | null) {
  return role ? getRoleLabel(mapLegacyCrmRoleToRole(role)) : "Team member";
}

export function formatAdminAccessLevelLabel(level?: AdminAccessLevel | null) {
  return level ? getRoleLabel(mapLegacyAccessLevelToRole(level)) : "Team member";
}

export function formatIntegrationProviderLabel(provider?: IntegrationProvider | null) {
  return provider ? crmLabelize(provider) : "Connection";
}

export function formatIntegrationStatusLabel(status?: IntegrationStatus | null) {
  return status ? crmLabelize(status) : "Setup needed";
}

export function formatSyncStateLabel(status?: SyncState | null) {
  return status ? crmLabelize(status) : "Pending";
}

export function formatSyncJobStatusLabel(status?: SyncJobStatus | null) {
  return status ? crmLabelize(status) : "Pending";
}

export function formatSyncJobTypeLabel(jobType?: string | null) {
  return jobType ? crmLabelize(jobType) : "Activity";
}

export function formatLeadEventLabel(eventType?: string | null) {
  return eventType ? crmLabelize(eventType) : "Activity";
}
