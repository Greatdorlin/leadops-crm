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

export const LEAD_CUSTOMER_TYPES = ["direct", "business"] as const;

export const LEAD_SOURCES = [
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

export const CRM_USER_ROLES = [
  "admin",
  "manager",
  "sales_agent",
  "ad_manager",
  "consultant",
  "finance",
  "affiliate",
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
