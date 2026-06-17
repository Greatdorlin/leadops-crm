import type {
  AdCampaignMetricRecord,
  AnalyticsEventType,
  AssessmentAnswers,
  AssessmentStepKey,
  CrmStatus,
  CrmUserRecord,
  GeneratedReport,
  IntegrationProvider,
  IntegrationRecord,
  LeadEventRecord,
  LeadNoteRecord,
  LeadPriority,
  LeadRecord,
  LeadSource,
  LeadSourcePayloadRecord,
  LeadTaskRecord,
  PrimaryGoal,
  PublicAssessmentResult,
  SourcePayloadProcessingStatus,
  SyncJobRecord,
  SyncJobStatus,
  SyncStatus,
} from "../pathway-engine/types";

export interface LeadListFilters {
  completionStatus?: "all" | LeadRecord["completionStatus"];
  crmStatus?: "all" | CrmStatus;
  primaryGoal?: "all" | PrimaryGoal;
  source?: "all" | LeadSource;
  priority?: "all" | LeadPriority;
  assignedTo?: string;
  search?: string;
  recordState?: "active" | "trashed" | "all";
  limit?: number;
  offset?: number;
}

export interface DraftLeadUpsertInput {
  leadId?: string | null;
  answers: AssessmentAnswers;
  currentStepKey: AssessmentStepKey;
  currentStepIndex: number;
  progressPercent: number;
}

export interface CompleteLeadInput {
  leadId: string;
  answers: AssessmentAnswers;
  report: GeneratedReport;
  publicReport: PublicAssessmentResult;
}

export interface ExternalLeadUpsertInput {
  source: LeadSource;
  sourceDetail?: string | null;
  alwaysCreateNewRecord?: boolean;
  externalLeadId?: string | null;
  externalFormId?: string | null;
  priority?: LeadPriority;
  assignedTo?: string | null;
  assignedToList?: string[] | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  whatsappNumber?: string | null;
  state?: string | null;
  primaryGoal?: PrimaryGoal | null;
  crmStatus?: CrmStatus;
  completionStatus?: LeadRecord["completionStatus"];
  currentStepKey?: AssessmentStepKey;
  currentStepIndex?: number;
  progressPercent?: number;
  readinessLevel?: LeadRecord["readinessLevel"];
  topPathwayTitle?: string | null;
  answers?: Partial<AssessmentAnswers>;
  report?: GeneratedReport | null;
  publicReport?: PublicAssessmentResult | null;
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
  assignedTo?: string;
  crmStatus?: CrmStatus;
  completion?: "all" | "open" | "completed";
  leadRecordState?: "active" | "trashed" | "all";
  dueBefore?: string | Date;
  dueAfter?: string | Date;
  overdueOnly?: boolean;
}

export interface LeadProfileUpdateInput {
  firstName?: string;
  lastName?: string | null;
  email?: string | null;
  whatsappNumber?: string | null;
  state?: string | null;
  primaryGoal?: PrimaryGoal | null;
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
  completedAssessments: number;
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
  upsertDraft(input: DraftLeadUpsertInput): Promise<LeadRecord>;
  completeLead(input: CompleteLeadInput): Promise<LeadRecord>;
  getById(id: string): Promise<LeadRecord | null>;
  getByReportToken(reportToken: string): Promise<LeadRecord | null>;
  list(filters?: LeadListFilters): Promise<LeadRecord[]>;
  countLeads(filters?: LeadListFilters): Promise<number>;
  listCompletedUnsynced(): Promise<LeadRecord[]>;
  trackByReportToken(reportToken: string, event: AnalyticsEventType): Promise<LeadRecord | null>;
  updateCrmStatus(id: string, crmStatus: CrmStatus, changedBy?: string | null): Promise<LeadRecord | null>;
  updateGoogleSheetsSync(id: string, status: SyncStatus): Promise<LeadRecord | null>;
  updateSenderSync(id: string, status: SyncStatus): Promise<LeadRecord | null>;
  upsertExternalLead(input: ExternalLeadUpsertInput): Promise<ExternalLeadUpsertResult>;
  createExternalLead(input: ExternalLeadUpsertInput): Promise<LeadRecord>;
  findDuplicateLead(input: LeadDuplicateLookupInput): Promise<LeadRecord | null>;
  addLeadEvent(input: LeadEventCreateInput): Promise<LeadEventRecord>;
  listLeadEvents(leadId: string): Promise<LeadEventRecord[]>;
  addLeadNote(input: LeadNoteCreateInput): Promise<LeadNoteRecord>;
  listLeadNotes(leadId: string): Promise<LeadNoteRecord[]>;
  addLeadTask(input: LeadTaskCreateInput): Promise<LeadTaskRecord>;
  listLeadTasks(filters?: LeadTaskListFilters): Promise<LeadTaskRecord[]>;
  completeLeadTask(taskId: string, completedBy?: string | null): Promise<LeadTaskRecord | null>;
  assignLead(id: string, assignedTo: string | null, changedBy?: string | null): Promise<LeadRecord | null>;
  assignLeadOwners(
    id: string,
    assignedToList: string[],
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
  getSourceReport(): Promise<SourceReportItem[]>;
  getCampaignReport(): Promise<CampaignReportItem[]>;
  listCrmUsers(): Promise<CrmUserRecord[]>;
  getCrmUserById(id: string): Promise<CrmUserRecord | null>;
  upsertCrmUser(input: CrmUserUpsertInput): Promise<CrmUserRecord>;
  setCrmUserActive(id: string, isActive: boolean): Promise<CrmUserRecord | null>;
  listIntegrations(): Promise<IntegrationRecord[]>;
  getIntegration(provider: IntegrationProvider): Promise<IntegrationRecord | null>;
  upsertIntegration(input: IntegrationUpsertInput): Promise<IntegrationRecord>;
}
