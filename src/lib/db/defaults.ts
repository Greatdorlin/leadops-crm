import type { CrmStatus, LeadSource } from "@/lib/pathway-engine/types";

export const DEFAULT_LEADS_DESK_STAGE_ROWS = [
  { key: "new", name: "New", color: "#2563eb", sortOrder: 0, isWon: false, isLost: false },
  { key: "contacted", name: "Contacted", color: "#0f766e", sortOrder: 1, isWon: false, isLost: false },
  { key: "follow_up", name: "Follow-up", color: "#d97706", sortOrder: 2, isWon: false, isLost: false },
  { key: "qualified", name: "Qualified", color: "#7c3aed", sortOrder: 3, isWon: false, isLost: false },
  { key: "proposal", name: "Proposal", color: "#4f46e5", sortOrder: 4, isWon: false, isLost: false },
  { key: "won", name: "Won", color: "#15803d", sortOrder: 5, isWon: true, isLost: false },
  { key: "lost", name: "Lost", color: "#dc2626", sortOrder: 6, isWon: false, isLost: true },
] as const;

export const DEFAULT_LEADS_DESK_SOURCE_ROWS = [
  { key: "website", name: "Website", type: "website", color: "#2563eb" },
  { key: "wordpress_form", name: "WordPress Form", type: "wordpress", color: "#0f766e" },
  { key: "facebook_ads", name: "Facebook Ads", type: "ads", color: "#1d4ed8" },
  { key: "google_ads", name: "Google Ads", type: "ads", color: "#ea580c" },
  { key: "tiktok_ads", name: "TikTok Ads", type: "ads", color: "#111827" },
  { key: "instagram", name: "Instagram", type: "social", color: "#db2777" },
  { key: "referral", name: "Referral", type: "referral", color: "#16a34a" },
  { key: "call", name: "Call", type: "call", color: "#0891b2" },
  { key: "walk_in", name: "Walk-in", type: "walk_in", color: "#7c2d12" },
  { key: "csv_import", name: "CSV Import", type: "import", color: "#475569" },
  { key: "manual_entry", name: "Manual Entry", type: "manual", color: "#6d28d9" },
  { key: "other", name: "Other", type: "other", color: "#64748b" },
] as const;

export const LEADS_DESK_STAGE_BACKFILL_PLAN: Record<CrmStatus, string> = {
  new: "new",
  contacted: "contacted",
  qualified: "qualified",
  consultation_booked: "qualified",
  application_started: "proposal",
  documents_pending: "follow_up",
  payment_pending: "proposal",
  converted: "won",
  lost: "lost",
  unresponsive: "follow_up",
  unqualified: "lost",
  closed: "lost",
};

export const LEADS_DESK_SOURCE_BACKFILL_PLAN: Record<LeadSource, string> = {
  pathway_finder: "other",
  website_form: "website",
  facebook_lead_ads: "facebook_ads",
  google_ads: "google_ads",
  tiktok_lead_ads: "tiktok_ads",
  linkedin_lead_gen_forms: "other",
  google_sheets: "csv_import",
  whatsapp_inquiry: "call",
  manual_entry: "manual_entry",
  agent: "other",
  referral: "referral",
};

export const LEADS_DESK_ASSIGNED_USER_BACKFILL_RULES = {
  legacyField: "assignedTo",
  futureField: "assignedUserId",
  strategy: "Resolve by crm_users email match where possible and leave null when no safe match exists.",
} as const;

export const RECOMMENDED_GENERAL_CUSTOM_FIELDS = [
  { key: "budget", label: "Budget", type: "currency" },
  { key: "interest", label: "Interest", type: "text" },
  { key: "preferred_contact_time", label: "Preferred Contact Time", type: "text" },
  { key: "urgency", label: "Urgency", type: "select" },
  { key: "location", label: "Location", type: "text" },
  { key: "form_notes", label: "Notes from Form", type: "textarea" },
] as const;
