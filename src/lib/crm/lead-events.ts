export const leadEventTypes = {
  leadCreated: "lead_created",
  leadUpdatedFromSource: "lead_updated_from_source",
  leadProfileUpdated: "lead_profile_updated",
  leadTrashed: "lead_trashed",
  leadRestored: "lead_restored",
  statusChanged: "status_changed",
  leadAssigned: "lead_assigned",
  priorityChanged: "priority_changed",
  followUpChanged: "follow_up_changed",
  noteAdded: "note_added",
  taskCreated: "task_created",
  taskCompleted: "task_completed",
  websiteLeadReceived: "website_lead_received",
  facebookLeadReceived: "facebook_lead_received",
  googleAdsLeadReceived: "google_ads_lead_received",
  tiktokLeadReceived: "tiktok_lead_received",
  linkedinLeadReceived: "linkedin_lead_received",
  googleSheetImported: "google_sheet_imported",
  googleSheetExported: "google_sheet_exported",
} as const;

export type LeadEventType = (typeof leadEventTypes)[keyof typeof leadEventTypes];
