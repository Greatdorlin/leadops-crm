import {
  CRM_STATUSES,
  CRM_USER_ROLES,
  INTEGRATION_PROVIDERS,
  INTEGRATION_STATUSES,
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  SOURCE_PAYLOAD_PROCESSING_STATUSES,
  SYNC_JOB_STATUSES,
  SYNC_STATES,
} from "@/lib/crm/constants";

export type CrmStatus = (typeof CRM_STATUSES)[number];
export type LeadStatus = CrmStatus;
export type LeadPriority = (typeof LEAD_PRIORITIES)[number];
export type LeadCustomerType = "direct" | "business";
export type LeadSource = (typeof LEAD_SOURCES)[number];
export type LeadOpportunityStatus =
  | "active"
  | "qualified"
  | "unqualified"
  | "lost"
  | "won"
  | "on_hold";
export type CrmUserRole = (typeof CRM_USER_ROLES)[number];
export type LeadAccessScope = "all" | "branch" | "department" | "team" | "own";
export type SyncState = (typeof SYNC_STATES)[number];
export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];
export type IntegrationStatus = (typeof INTEGRATION_STATUSES)[number];
export type SyncJobStatus = (typeof SYNC_JOB_STATUSES)[number];
export type SourcePayloadProcessingStatus =
  (typeof SOURCE_PAYLOAD_PROCESSING_STATUSES)[number];
export type SyncStatus = {
  status: SyncState;
  message?: string;
  lastAttemptAt?: string | null;
  syncedAt?: string | null;
};

export interface LeadRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  deletedAt: string | null;
  deletedBy: string | null;
  crmStatus: CrmStatus;
  source: LeadSource | null;
  sourceDetail: string | null;
  priority: LeadPriority;
  assignedTo: string | null;
  assignedToList: string[];
  affiliateReferrerId: string | null;
  leadCustomerType?: LeadCustomerType | null;
  firstName: string;
  lastName: string;
  email: string;
  whatsappNumber: string;
  callNumber?: string;
  state: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  address?: string | null;
  postalCode?: string | null;
  companyName?: string | null;
  sourceId?: string | null;
  stageId?: string | null;
  campaignId?: string | null;
  campaignLabel?: string | null;
  assignedUserId?: string | null;
  teamId?: string | null;
  branchId?: string | null;
  departmentId?: string | null;
  estimatedValue?: number | null;
  expectedValue?: number | null;
  wonValue?: number | null;
  closeProbability?: number | null;
  expectedCloseDate?: string | null;
  wonAt?: string | null;
  lostAt?: string | null;
  lostReason?: string | null;
  nextFollowUpAt?: string | null;
  archivedAt?: string | null;
  externalLeadId: string | null;
  externalFormId: string | null;
  facebookLeadgenId: string | null;
  facebookFormId: string | null;
  facebookPageId: string | null;
  facebookCampaignId: string | null;
  facebookAdId: string | null;
  facebookAdsetId: string | null;
  googleClickId: string | null;
  googleCampaignId: string | null;
  googleAdGroupId: string | null;
  googleAdId: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  landingPage: string | null;
  sourcePayload: Record<string, unknown> | null;
  sync: {
    googleSheets: SyncStatus;
    sender: SyncStatus;
  };
}

export interface LeadOpportunityRecord {
  id: string;
  leadId: string;
  offerLabel: string;
  status: LeadOpportunityStatus;
  estimatedValue: number | null;
  expectedValue: number | null;
  currency: string | null;
  exchangeRateToGlobal: number | null;
  closeProbability: number | null;
  expectedCloseDate: string | null;
  reason: string | null;
  notes: string | null;
  isPrimary: boolean;
  sortOrder: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CrmUserRecord {
  id: string;
  email: string;
  fullName: string;
  role: CrmUserRole;
  isActive: boolean;
  avatarUrl?: string | null;
  accessScope: LeadAccessScope;
  branchId: string | null;
  departmentId: string | null;
  teamId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadEventRecord {
  id: string;
  leadId: string;
  eventType: string;
  eventData: Record<string, unknown> | null;
  createdBy: string | null;
  createdAt: string;
}

export interface LeadNoteRecord {
  id: string;
  leadId: string;
  note: string;
  createdBy: string | null;
  createdAt: string;
}

export interface LeadTaskRecord {
  id: string;
  leadId: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  completedAt: string | null;
  assignedTo: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface LeadSourcePayloadRecord {
  id: string;
  source: string;
  externalId: string | null;
  payload: Record<string, unknown>;
  processingStatus: SourcePayloadProcessingStatus;
  processedAt: string | null;
  errorMessage: string | null;
  retryCount: number;
  createdAt: string;
}

export interface IntegrationRecord {
  id: string;
  provider: IntegrationProvider;
  accountName: string | null;
  externalAccountId: string | null;
  status: IntegrationStatus;
  accessTokenEncrypted: string | null;
  refreshTokenEncrypted: string | null;
  config: Record<string, unknown> | null;
  lastSyncAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SyncJobRecord {
  id: string;
  provider: IntegrationProvider;
  jobType: string;
  status: SyncJobStatus;
  startedAt: string | null;
  finishedAt: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AdCampaignMetricRecord {
  id: string;
  provider: IntegrationProvider;
  accountId: string;
  campaignId: string;
  campaignName: string;
  adGroupId: string;
  adGroupName: string;
  adId: string;
  adName: string;
  date: string;
  impressions: number;
  clicks: number;
  spend: string;
  leads: number;
  conversions: number;
  rawMetrics: Record<string, unknown> | null;
  createdAt: string;
}
