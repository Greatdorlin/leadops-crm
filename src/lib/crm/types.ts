import type {
  AdCampaignMetricRecord as LegacyAdCampaignMetricRecord,
  AnalyticsEventType as LegacyAnalyticsEventType,
  AssessmentAnswers as LegacyAssessmentAnswers,
  AssessmentStepKey as LegacyAssessmentStepKey,
  CompletionStatus as LegacyCompletionStatus,
  CrmStatus as LegacyCrmStatus,
  CrmUserRecord as LegacyCrmUserRecord,
  CrmUserRole as LegacyCrmUserRole,
  GeneratedReport as LegacyGeneratedReport,
  IntegrationProvider as LegacyIntegrationProvider,
  IntegrationRecord as LegacyIntegrationRecord,
  IntegrationStatus as LegacyIntegrationStatus,
  LeadEventRecord as LegacyLeadEventRecord,
  LeadNoteRecord as LegacyLeadNoteRecord,
  LeadPriority as LegacyLeadPriority,
  LeadRecord as LegacyLeadRecord,
  LeadSource as LegacyLeadSource,
  LeadSourcePayloadRecord as LegacyLeadSourcePayloadRecord,
  LeadTaskRecord as LegacyLeadTaskRecord,
  PrimaryGoal as LegacyPrimaryGoal,
  PublicAssessmentResult as LegacyPublicAssessmentResult,
  ReadinessLevel as LegacyReadinessLevel,
  SourcePayloadProcessingStatus as LegacySourcePayloadProcessingStatus,
  SyncJobRecord as LegacySyncJobRecord,
  SyncJobStatus as LegacySyncJobStatus,
  SyncState as LegacySyncState,
  SyncStatus as LegacySyncStatus,
} from "@/lib/pathway-engine/types";

export type CompletionStatus = LegacyCompletionStatus;
export type CrmStatus = LegacyCrmStatus;
export type LeadStatus = LegacyCrmStatus;
export type LeadPriority = LegacyLeadPriority;
export type LeadSource = LegacyLeadSource;
export type CrmUserRole = LegacyCrmUserRole;
export type LeadCategory = LegacyPrimaryGoal;
export type PrimaryGoal = LegacyPrimaryGoal;
export type LeadQualificationLevel = LegacyReadinessLevel;
export type AssessmentStepKey = LegacyAssessmentStepKey;
export type AssessmentAnswers = LegacyAssessmentAnswers;
export type GeneratedReport = LegacyGeneratedReport;
export type PublicAssessmentResult = LegacyPublicAssessmentResult;
export type AnalyticsEventType = LegacyAnalyticsEventType;
export type SyncState = LegacySyncState;
export type SyncStatus = LegacySyncStatus;
export type IntegrationProvider = LegacyIntegrationProvider;
export type IntegrationStatus = LegacyIntegrationStatus;
export type SyncJobStatus = LegacySyncJobStatus;
export type SourcePayloadProcessingStatus = LegacySourcePayloadProcessingStatus;
export type LeadRecord = LegacyLeadRecord & {
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
};
export type CrmUserRecord = LegacyCrmUserRecord;
export type LeadEventRecord = LegacyLeadEventRecord;
export type LeadNoteRecord = LegacyLeadNoteRecord;
export type LeadTaskRecord = LegacyLeadTaskRecord;
export type LeadSourcePayloadRecord = LegacyLeadSourcePayloadRecord;
export type IntegrationRecord = LegacyIntegrationRecord;
export type SyncJobRecord = LegacySyncJobRecord;
export type AdCampaignMetricRecord = LegacyAdCampaignMetricRecord;
