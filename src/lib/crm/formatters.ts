import type {
  CrmUserRole,
  IntegrationProvider,
  IntegrationStatus,
  LeadSource,
  SyncJobStatus,
  SyncState,
} from "@/lib/pathway-engine/types";
import { getAccessLevelFromRole, type AdminAccessLevel } from "@/lib/admin-permissions";
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
  consultation_booked: "Consultation booked",
  application_started: "Application started",
  documents_pending: "Documents pending",
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
  pathway_finder: "Pathway Finder",
  website_form: "Website form",
  facebook_lead_ads: "Facebook Lead Ads",
  google_ads: "Google Ads",
  tiktok_lead_ads: "TikTok Lead Ads",
  linkedin_lead_gen_forms: "LinkedIn Lead Gen Forms",
  google_sheets: "Google Sheets",
  whatsapp_inquiry: "WhatsApp inquiry",
  manual_entry: "Manual entry",
  agent: "Agent",
  referral: "Referral",
  admin: "Master admin",
  manager: "General admin",
  sales_agent: "Sales rep",
  ad_manager: "General admin",
  consultant: "Sales manager",
  finance: "General admin",
  master_admin: "Master admin",
  general_admin: "General admin",
  lead_sales_rep: "Sales manager",
  sales_rep: "Sales rep",
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
  studiedCourse: "Course studied",
  desiredCourse: "Preferred UK course",
  targetField: "Preferred UK course",
  targetIntake: "Target intake",
  assessmentReadiness: "Assessment readiness",
  contactTimeline: "Contact timeline",
  consent: "Consent",
  passportStatus: "Passport status",
  studyFundingReadiness: "Funding readiness",
  fundingReadiness: "Funding readiness",
  primaryGoal: "Primary goal",
  destinationInterest: "Destination",
  whatsappNumber: "WhatsApp number",
};

export const CRM_TIME_ZONE = "Africa/Lagos";

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

  return labelMap[value] ?? titleCase(value);
}

export function formatLeadSourceLabel(source?: LeadSource | string | null) {
  return source ? crmLabelize(source) : "Unknown source";
}

export function formatLeadStateLabel(value?: string | null) {
  if (!value) {
    return "";
  }

  return formatNigeriaStateLabel(value) || crmLabelize(value);
}

export function formatCrmRoleLabel(role?: CrmUserRole | null) {
  return role ? crmLabelize(getAccessLevelFromRole(role)) : "Team member";
}

export function formatAdminAccessLevelLabel(level?: AdminAccessLevel | null) {
  return level ? crmLabelize(level) : "Team member";
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

export function formatCrmDate(value?: string | Date | null) {
  if (!value) {
    return "Not yet";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: CRM_TIME_ZONE,
  }).format(date);
}

export function formatCrmDateTime(value?: string | Date | null) {
  if (!value) {
    return "Not yet";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: CRM_TIME_ZONE,
  }).format(date);
}
