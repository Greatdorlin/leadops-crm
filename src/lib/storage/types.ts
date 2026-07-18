import type {
  AdCampaignMetricRecord,
  CrmUserRecord,
  IntegrationProvider,
  IntegrationRecord,
  LeadEventRecord,
  LeadCustomerType,
  LeadNoteRecord,
  LeadPriority,
  LeadRecord,
  CrmStatus,
  LeadSource,
  LeadSourcePayloadRecord,
  LeadTaskRecord,
  SourcePayloadProcessingStatus,
  SyncJobRecord,
  SyncJobStatus,
} from "../crm/types";
import type { SalesPipelineAggregate } from "../crm/sales-metrics";
import type { TeamPerformanceRow } from "../admin-insights";

export interface LeadListFilters {
  stageId?: string | "all";
  status?: "all" | CrmStatus;
  sourceId?: string | "all";
  source?: "all" | LeadSource;
  priority?: "all" | LeadPriority;
  leadCustomerType?: "all" | LeadCustomerType;
  assignment?: "unassigned";
  assignedTo?: string;
  affiliateReferrerId?: string;
  assignedUserId?: string;
  branchId?: string;
  departmentId?: string;
  teamId?: string;
  scopeDenied?: boolean;
  search?: string;
  createdFrom?: string | Date;
  createdTo?: string | Date;
  recordState?: "active" | "trashed" | "all";
  limit?: number;
  offset?: number;
  /** Cursor-based pagination: base64-encoded `updatedAt|id` string. Prefer over offset for large tables. */
  cursor?: string;
  /** Cursor direction: "next" (default) or "prev" for bidirectional pagination. */
  cursorDirection?: "next" | "prev";
}

export interface ExternalLeadUpsertInput {
  source: LeadSource;
  sourceId?: string | null;
  stageId?: string | null;
  sourceDetail?: string | null;
  alwaysCreateNewRecord?: boolean;
  externalLeadId?: string | null;
  externalFormId?: string | null;
  priority?: LeadPriority;
  assignedTo?: string | null;
  assignedToList?: string[] | null;
  affiliateReferrerId?: string | null;
  assignedUserId?: string | null;
  teamId?: string | null;
  branchId?: string | null;
  departmentId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  whatsappNumber?: string | null;
  state?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  address?: string | null;
  postalCode?: string | null;
  companyName?: string | null;
  leadCustomerType?: LeadCustomerType | null;
  campaignId?: string | null;
  campaignLabel?: string | null;
  estimatedValue?: string | number | null;
  expectedValue?: string | number | null;
  wonValue?: string | number | null;
  closeProbability?: number | null;
  expectedCloseDate?: string | Date | null;
  wonAt?: string | Date | null;
  lostAt?: string | Date | null;
  lostReason?: string | null;
  nextFollowUpAt?: string | Date | null;
  facebookLeadgenId?: string | null;
  facebookFormId?: string | null;
  facebookPageId?: string | null;
  facebookCampaignId?: string | null;
  facebookAdId?: string | null;
  facebookAdsetId?: string | null;
  googleClickId?: string | null;
  googleCampaignId?: string | null;
  googleAdGroupId?: string | null;
  googleAdId?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  landingPage?: string | null;
  sourcePayload?: Record<string, unknown> | null;
}

export interface ExternalLeadUpsertResult {
  lead: LeadRecord;
  created: boolean;
  duplicateOfId: string | null;
}

export interface LeadDuplicateLookupInput {
  source?: LeadSource | null;
  externalLeadId?: string | null;
  facebookLeadgenId?: string | null;
  googleClickId?: string | null;
  email?: string | null;
  whatsappNumber?: string | null;
}

export interface LeadDuplicateListInput extends LeadDuplicateLookupInput {
  excludeId: string;
  assignedTo?: string;
  assignment?: "unassigned";
  limit?: number;
}

export interface LeadEventCreateInput {
  leadId: string;
  eventType: string;
  eventData?: Record<string, unknown> | null;
  createdBy?: string | null;
}

export interface LeadNoteCreateInput {
  leadId: string;
  note: string;
  createdBy?: string | null;
}

export interface LeadTaskCreateInput {
  leadId: string;
  title: string;
  description?: string | null;
  dueAt?: string | Date | null;
  assignedTo?: string | null;
  createdBy?: string | null;
}

export interface LeadTaskListFilters {
  leadId?: string;
  leadIds?: string[];
  assignedTo?: string;
  leadAssignedTo?: string;
  leadAffiliateReferrerId?: string;
  stageId?: string;
  completion?: "all" | "open" | "completed";
  leadRecordState?: "active" | "trashed" | "all";
  dueBefore?: string | Date;
  dueAfter?: string | Date;
  overdueOnly?: boolean;
  limit?: number;
  branchId?: string;
  departmentId?: string;
  teamId?: string;
  scopeDenied?: boolean;
}

export interface LeadTaskQueueLeadRecord {
  id: string;
  firstName: string;
  lastName: string;
  companyName: string | null;
  state: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
}

export interface LeadTaskQueueRecord extends LeadTaskRecord {
  lead: LeadTaskQueueLeadRecord;
}

export interface LeadProfileUpdateInput {
  firstName?: string;
  lastName?: string | null;
  email?: string | null;
  whatsappNumber?: string | null;
  state?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  address?: string | null;
  postalCode?: string | null;
  companyName?: string | null;
  leadCustomerType?: LeadCustomerType | null;
  campaignId?: string | null;
  campaignLabel?: string | null;
  assignedUserId?: string | null;
  teamId?: string | null;
  branchId?: string | null;
  departmentId?: string | null;
  estimatedValue?: string | number | null;
  expectedValue?: string | number | null;
  wonValue?: string | number | null;
  closeProbability?: number | null;
  expectedCloseDate?: string | Date | null;
  wonAt?: string | Date | null;
  lostAt?: string | Date | null;
  lostReason?: string | null;
  nextFollowUpAt?: string | Date | null;
}

export interface LeadEventCountFilters {
  eventType?: string;
  source?: LeadSource;
}

export interface LeadWorkflowUpdateInput {
  stageId?: string | null;
  stageKey?: string | null;
  priority?: LeadPriority;
  assignedToList?: string[];
  assignedUserId?: string | null;
  nextFollowUpAt?: string | Date | null;
  wonAt?: string | Date | null;
  lostAt?: string | Date | null;
  lostReason?: string | null;
}

export interface LeadSourcePayloadCreateInput {
  source: string;
  externalId?: string | null;
  payload: Record<string, unknown>;
  processingStatus?: SourcePayloadProcessingStatus;
  processedAt?: string | Date | null;
  errorMessage?: string | null;
  retryCount?: number;
}

export interface LeadSourcePayloadListFilters {
  source?: string;
  processingStatus?: SourcePayloadProcessingStatus;
  limit?: number;
}

export interface SyncJobCreateInput {
  provider: IntegrationProvider;
  jobType: string;
  status?: SyncJobStatus;
  startedAt?: string | Date | null;
  finishedAt?: string | Date | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface SyncJobUpdateInput {
  status?: SyncJobStatus;
  startedAt?: string | Date | null;
  finishedAt?: string | Date | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface SyncJobListFilters {
  provider?: IntegrationProvider;
  status?: SyncJobStatus;
  limit?: number;
}

export interface AdCampaignMetricUpsertInput {
  provider: IntegrationProvider;
  accountId: string;
  campaignId: string;
  campaignName: string;
  adGroupId?: string | null;
  adGroupName?: string | null;
  adId?: string | null;
  adName?: string | null;
  date: string;
  impressions: number;
  clicks: number;
  spend: string | number;
  leads: number;
  conversions: number;
  rawMetrics?: Record<string, unknown> | null;
}

export interface AdCampaignMetricListFilters {
  provider?: IntegrationProvider;
  campaignId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CrmDashboardStats {
  totalLeads: number;
  newLeadsToday: number;
  unassignedLeads: number;
  followUpsDueToday: number;
  capturedLeads: number;
  consultationReadyLeads: number;
  highPriorityLeads: number;
  failedIntegrations: number;
  facebookLeadsThisWeek: number;
  websiteLeadsThisWeek: number;
  senderSyncStatus: {
    success: number;
    pending: number;
    failed: number;
    notConfigured: number;
    skipped: number;
  };
}

export interface SourceReportItem {
  source: string;
  leadCount: number;
  qualifiedCount: number;
  convertedCount: number;
  highPriorityCount: number;
}

export interface DashboardTrendPoint {
  date: string;
  leads: number;
  wonValue: number;
}

export interface LeadDistributionReport {
  interestReport: Array<{ label: string; value: number }>;
  locationReport: Array<{ label: string; value: number }>;
}

export interface CampaignReportItem {
  provider: IntegrationProvider;
  campaignId: string;
  campaignName: string;
  spend: string;
  clicks: number;
  impressions: number;
  leads: number;
  conversions: number;
  costPerLead: string;
}

export interface CrmUserUpsertInput {
  email: string;
  fullName: string;
  role: CrmUserRecord["role"];
  isActive?: boolean;
  avatarUrl?: string | null;
  accessScope?: CrmUserRecord["accessScope"];
  branchId?: string | null;
  departmentId?: string | null;
  teamId?: string | null;
}

export interface IntegrationUpsertInput {
  provider: IntegrationProvider;
  accountName?: string | null;
  externalAccountId?: string | null;
  status?: IntegrationRecord["status"];
  accessTokenEncrypted?: string | null;
  refreshTokenEncrypted?: string | null;
  config?: Record<string, unknown> | null;
  lastSyncAt?: string | Date | null;
  lastError?: string | null;
}

export interface LeadStorage {
  getById(id: string): Promise<LeadRecord | null>;
  list(filters?: LeadListFilters): Promise<LeadRecord[]>;
  countLeads(filters?: LeadListFilters): Promise<number>;
  upsertExternalLead(input: ExternalLeadUpsertInput): Promise<ExternalLeadUpsertResult>;
  createExternalLead(input: ExternalLeadUpsertInput): Promise<LeadRecord>;
  findDuplicateLead(input: LeadDuplicateLookupInput): Promise<LeadRecord | null>;
  listDuplicateLeads(input: LeadDuplicateListInput): Promise<LeadRecord[]>;
  addLeadEvent(input: LeadEventCreateInput): Promise<LeadEventRecord>;
  listLeadEvents(leadId: string): Promise<LeadEventRecord[]>;
  countLeadEvents(filters?: LeadEventCountFilters): Promise<number>;
  addLeadNote(input: LeadNoteCreateInput): Promise<LeadNoteRecord>;
  listLeadNotes(leadId: string): Promise<LeadNoteRecord[]>;
  getLeadNoteCounts(leadIds: string[]): Promise<Record<string, number>>;
  addLeadTask(input: LeadTaskCreateInput): Promise<LeadTaskRecord>;
  getLeadTaskById(taskId: string): Promise<LeadTaskRecord | null>;
  listLeadTasks(filters?: LeadTaskListFilters): Promise<LeadTaskRecord[]>;
  listLeadTaskQueue(filters?: LeadTaskListFilters): Promise<LeadTaskQueueRecord[]>;
  completeLeadTask(taskId: string, completedBy?: string | null): Promise<LeadTaskRecord | null>;
  assignLead(id: string, assignedTo: string | null, changedBy?: string | null): Promise<LeadRecord | null>;
  assignLeadOwners(
    id: string,
    assignedToList: string[],
    changedBy?: string | null,
  ): Promise<LeadRecord | null>;
  updateLeadWorkflow(
    id: string,
    input: LeadWorkflowUpdateInput,
    changedBy?: string | null,
  ): Promise<LeadRecord | null>;
  updateLeadProfile(
    id: string,
    input: LeadProfileUpdateInput,
    changedBy?: string | null,
  ): Promise<LeadRecord | null>;
  softDeleteLead(id: string, deletedBy?: string | null): Promise<LeadRecord | null>;
  restoreLead(id: string, restoredBy?: string | null): Promise<LeadRecord | null>;
  permanentlyDeleteLead(id: string): Promise<boolean>;
  updateLeadPriority(
    id: string,
    priority: LeadPriority,
    changedBy?: string | null,
  ): Promise<LeadRecord | null>;
  saveSourcePayload(input: LeadSourcePayloadCreateInput): Promise<LeadSourcePayloadRecord>;
  markPayloadProcessing(id: string): Promise<LeadSourcePayloadRecord | null>;
  markPayloadProcessed(id: string): Promise<LeadSourcePayloadRecord | null>;
  markPayloadFailed(id: string, errorMessage: string): Promise<LeadSourcePayloadRecord | null>;
  listFailedPayloads(source?: string): Promise<LeadSourcePayloadRecord[]>;
  retrySourcePayload(id: string): Promise<LeadSourcePayloadRecord | null>;
  createSyncJob(input: SyncJobCreateInput): Promise<SyncJobRecord>;
  updateSyncJob(id: string, input: SyncJobUpdateInput): Promise<SyncJobRecord | null>;
  listSyncJobs(filters?: SyncJobListFilters): Promise<SyncJobRecord[]>;
  upsertAdCampaignMetric(input: AdCampaignMetricUpsertInput): Promise<AdCampaignMetricRecord>;
  listAdCampaignMetrics(filters?: AdCampaignMetricListFilters): Promise<AdCampaignMetricRecord[]>;
  getDashboardStats(filters?: LeadListFilters): Promise<CrmDashboardStats>;
  getDashboardTrend(filters?: LeadListFilters, days?: number): Promise<DashboardTrendPoint[]>;
  getSalesPipelineAggregate(filters?: LeadListFilters): Promise<SalesPipelineAggregate>;
  getTeamPerformance(filters?: LeadListFilters): Promise<TeamPerformanceRow[]>;
  getLeadDistributionReport(filters?: LeadListFilters): Promise<LeadDistributionReport>;
  getSourceReport(filters?: LeadListFilters): Promise<SourceReportItem[]>;
  getCampaignReport(): Promise<CampaignReportItem[]>;
  countGoogleAdsCampaignLeads(input: { campaignId: string; campaignName: string }): Promise<number>;
  listCrmUsers(): Promise<CrmUserRecord[]>;
  getCrmUserById(id: string): Promise<CrmUserRecord | null>;
  getCrmUserByEmail(email: string): Promise<CrmUserRecord | null>;
  upsertCrmUser(input: CrmUserUpsertInput): Promise<CrmUserRecord>;
  setCrmUserActive(id: string, isActive: boolean): Promise<CrmUserRecord | null>;
  listIntegrations(): Promise<IntegrationRecord[]>;
  getIntegration(provider: IntegrationProvider): Promise<IntegrationRecord | null>;
  upsertIntegration(input: IntegrationUpsertInput): Promise<IntegrationRecord>;
}

// Neutral compatibility aliases for future Leads Desk storage work.
export type LeadStore = LeadStorage;
export type LeadListResult = LeadRecord[];
export type LeadDetailResult = LeadRecord | null;
export type LeadCreateInput = ExternalLeadUpsertInput;
export type LeadUpdateInput = LeadProfileUpdateInput;
