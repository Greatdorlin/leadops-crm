import {
  getPrimaryLeadAssignee,
  parseLeadAssignees,
} from "@/lib/crm/lead-assignees";
import {
  adCampaignMetrics,
  crmUsers,
  integrations,
  leadEvents,
  leadNotes,
  leadSourcePayloads,
  leadTasks,
  leads,
  syncJobs,
} from "@/lib/db/schema";
import type {
  AdCampaignMetricRecord,
  CrmUserRecord,
  IntegrationRecord,
  LeadEventRecord,
  LeadNoteRecord,
  LeadRecord,
  LeadSourcePayloadRecord,
  LeadTaskRecord,
  SyncJobRecord,
} from "@/lib/crm/types";
import {
  defaultSyncMetadata,
  toIsoString,
  formatSpend,
  deriveCompatibilityStatus,
} from "./values";

export function mapLeadRecord(row: typeof leads.$inferSelect): LeadRecord {
  const assignedToList = parseLeadAssignees(row.assignedTo);
  const compatibilityStatus = deriveCompatibilityStatus(row);

  return {
    id: row.id,
    createdAt: toIsoString(row.createdAt) ?? new Date(0).toISOString(),
    updatedAt: toIsoString(row.updatedAt) ?? new Date(0).toISOString(),
    lastActivityAt:
      toIsoString(row.lastActivityAt) ?? new Date(0).toISOString(),
    deletedAt: toIsoString(row.deletedAt),
    deletedBy: row.deletedBy,
    crmStatus: compatibilityStatus,
    source: row.source,
    sourceId: row.sourceId,
    sourceDetail: row.sourceDetail,
    stageId: row.stageId,
    priority: row.priority,
    leadCustomerType: row.leadCustomerType,
    assignedTo: getPrimaryLeadAssignee(row.assignedTo),
    assignedToList,
    affiliateReferrerId: row.affiliateReferrerId,
    assignedUserId: row.assignedUserId,
    companyName: row.companyName,
    campaignId: row.campaignId,
    campaignLabel: row.campaignLabel,
    teamId: row.teamId,
    branchId: row.branchId,
    departmentId: row.departmentId,
    estimatedValue:
      row.estimatedValue === null
        ? null
        : Number.parseFloat(row.estimatedValue),
    expectedValue:
      row.expectedValue === null ? null : Number.parseFloat(row.expectedValue),
    wonValue: row.wonValue === null ? null : Number.parseFloat(row.wonValue),
    closeProbability: row.closeProbability,
    expectedCloseDate: toIsoString(row.expectedCloseDate),
    wonAt: toIsoString(row.wonAt),
    lostAt: toIsoString(row.lostAt),
    lostReason: row.lostReason,
    nextFollowUpAt: toIsoString(row.nextFollowUpAt),
    archivedAt: toIsoString(row.archivedAt),
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    whatsappNumber: row.whatsappNumber,
    callNumber: row.callNumber,
    state: row.state,
    country: row.country,
    region: row.region,
    city: row.city,
    address: row.address,
    postalCode: row.postalCode,
    externalLeadId: row.externalLeadId,
    externalFormId: row.externalFormId,
    facebookLeadgenId: row.facebookLeadgenId,
    facebookFormId: row.facebookFormId,
    facebookPageId: row.facebookPageId,
    facebookCampaignId: row.facebookCampaignId,
    facebookAdId: row.facebookAdId,
    facebookAdsetId: row.facebookAdsetId,
    googleClickId: row.googleClickId,
    googleCampaignId: row.googleCampaignId,
    googleAdGroupId: row.googleAdGroupId,
    googleAdId: row.googleAdId,
    utmSource: row.utmSource,
    utmMedium: row.utmMedium,
    utmCampaign: row.utmCampaign,
    utmContent: row.utmContent,
    utmTerm: row.utmTerm,
    landingPage: row.landingPage,
    sourcePayload: row.sourcePayload ?? null,
    sync: defaultSyncMetadata(
      "Legacy sync fields retired. Use Leads Desk exports and intake logs.",
    ),
  };
}

export function mapCrmUserRecord(
  row: typeof crmUsers.$inferSelect,
): CrmUserRecord {
  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    role: row.role,
    isActive: row.isActive,
    avatarUrl: row.avatarUrl,
    accessScope: row.accessScope as CrmUserRecord["accessScope"],
    branchId: row.branchId,
    departmentId: row.departmentId,
    teamId: row.teamId,
    createdAt: toIsoString(row.createdAt) ?? new Date(0).toISOString(),
    updatedAt: toIsoString(row.updatedAt) ?? new Date(0).toISOString(),
  };
}

export function mapLeadEventRecord(
  row: typeof leadEvents.$inferSelect,
): LeadEventRecord {
  return {
    id: row.id,
    leadId: row.leadId,
    eventType: row.eventType,
    eventData: row.eventData ?? null,
    createdBy: row.createdBy,
    createdAt: toIsoString(row.createdAt) ?? new Date(0).toISOString(),
  };
}

export function mapLeadNoteRecord(
  row: typeof leadNotes.$inferSelect,
): LeadNoteRecord {
  return {
    id: row.id,
    leadId: row.leadId,
    note: row.note,
    createdBy: row.createdBy,
    createdAt: toIsoString(row.createdAt) ?? new Date(0).toISOString(),
  };
}

export function mapLeadTaskRecord(
  row: typeof leadTasks.$inferSelect,
): LeadTaskRecord {
  return {
    id: row.id,
    leadId: row.leadId,
    title: row.title,
    description: row.description,
    dueAt: toIsoString(row.dueAt),
    completedAt: toIsoString(row.completedAt),
    assignedTo: row.assignedTo,
    createdBy: row.createdBy,
    createdAt: toIsoString(row.createdAt) ?? new Date(0).toISOString(),
  };
}

export function mapLeadSourcePayloadRecord(
  row: typeof leadSourcePayloads.$inferSelect,
): LeadSourcePayloadRecord {
  return {
    id: row.id,
    source: row.source,
    externalId: row.externalId,
    payload: row.payload,
    processingStatus: row.processingStatus,
    processedAt: toIsoString(row.processedAt),
    errorMessage: row.errorMessage,
    retryCount: row.retryCount,
    createdAt: toIsoString(row.createdAt) ?? new Date(0).toISOString(),
  };
}

export function mapIntegrationRecord(
  row: typeof integrations.$inferSelect,
): IntegrationRecord {
  return {
    id: row.id,
    provider: row.provider,
    accountName: row.accountName,
    externalAccountId: row.externalAccountId,
    status: row.status,
    accessTokenEncrypted: row.accessTokenEncrypted,
    refreshTokenEncrypted: row.refreshTokenEncrypted,
    config: row.config ?? null,
    lastSyncAt: toIsoString(row.lastSyncAt),
    lastError: row.lastError,
    createdAt: toIsoString(row.createdAt) ?? new Date(0).toISOString(),
    updatedAt: toIsoString(row.updatedAt) ?? new Date(0).toISOString(),
  };
}

export function mapSyncJobRecord(
  row: typeof syncJobs.$inferSelect,
): SyncJobRecord {
  return {
    id: row.id,
    provider: row.provider,
    jobType: row.jobType,
    status: row.status,
    startedAt: toIsoString(row.startedAt),
    finishedAt: toIsoString(row.finishedAt),
    errorMessage: row.errorMessage,
    metadata: row.metadata ?? null,
    createdAt: toIsoString(row.createdAt) ?? new Date(0).toISOString(),
  };
}

export function mapAdCampaignMetricRecord(
  row: typeof adCampaignMetrics.$inferSelect,
): AdCampaignMetricRecord {
  return {
    id: row.id,
    provider: row.provider,
    accountId: row.accountId,
    campaignId: row.campaignId,
    campaignName: row.campaignName,
    adGroupId: row.adGroupId,
    adGroupName: row.adGroupName,
    adId: row.adId,
    adName: row.adName,
    date: row.date,
    impressions: row.impressions,
    clicks: row.clicks,
    spend: formatSpend(row.spend),
    leads: row.leads,
    conversions: row.conversions,
    rawMetrics: row.rawMetrics ?? null,
    createdAt: toIsoString(row.createdAt) ?? new Date(0).toISOString(),
  };
}
