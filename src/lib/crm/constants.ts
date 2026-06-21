export const LEAD_COMPLETION_STATES = ["incomplete", "complete"] as const;
export const COMPLETION_STATUSES = LEAD_COMPLETION_STATES;

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "consultation_booked",
  "application_started",
  "documents_pending",
  "payment_pending",
  "converted",
  "lost",
  "unresponsive",
  "unqualified",
  "closed",
] as const;
export const CRM_STATUSES = LEAD_STATUSES;

export const LEAD_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export const LEAD_PRIORITY_LEVELS = LEAD_PRIORITIES;

export const LEAD_SOURCES = [
  "pathway_finder",
  "website_form",
  "facebook_lead_ads",
  "google_ads",
  "tiktok_lead_ads",
  "linkedin_lead_gen_forms",
  "google_sheets",
  "whatsapp_inquiry",
  "manual_entry",
  "agent",
  "referral",
] as const;
export const LEAD_CHANNELS = LEAD_SOURCES;

export const LEGACY_LEAD_CATEGORIES = [
  "study_abroad",
  "work_and_relocate",
  "business_abroad",
  "visit_or_tour",
  "event_travel",
  "family_relocation",
  "not_sure_yet",
] as const;
export const PRIMARY_GOALS = LEGACY_LEAD_CATEGORIES;

export const CRM_USER_ROLES = [
  "admin",
  "manager",
  "sales_agent",
  "ad_manager",
  "consultant",
  "finance",
] as const;

export const INTEGRATION_PROVIDERS = [
  "facebook",
  "google_sheets",
  "google_ads",
  "tiktok",
  "linkedin",
  "sender",
  "website",
] as const;

export const INTEGRATION_STATUSES = [
  "healthy",
  "pending_sync",
  "failed",
  "not_configured",
  "disabled",
] as const;

export const SYNC_STATES = [
  "pending",
  "success",
  "failed",
  "not_configured",
  "skipped",
] as const;

export const SYNC_JOB_STATUSES = [
  "pending",
  "running",
  "success",
  "failed",
  "partial",
] as const;

export const SOURCE_PAYLOAD_PROCESSING_STATUSES = [
  "pending",
  "processing",
  "processed",
  "failed",
  "duplicate",
  "skipped",
] as const;
