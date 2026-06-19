import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { emptyAnswers } from "@/lib/assessment/defaults";
import {
  getPrimaryLeadAssignee,
  parseLeadAssignees,
  serializeLeadAssignees,
} from "@/lib/crm/lead-assignees";
import { elevatePriority, isUnassigned } from "@/lib/crm/assignments";
import {
  mergeAssessmentAnswers,
  normalizeEmail,
  normalizePhone,
  normalizeText,
  pickPreferredValue,
} from "@/lib/crm/dedupe";
import { leadEventTypes } from "@/lib/crm/lead-events";
import { getDb } from "@/lib/db/client";
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
import { parseNigeriaStateValue } from "@/lib/nigeria-state-options";
import { getPublicReportPrimaryPathway } from "@/lib/pathway-engine/report/public-report-payload";
import type {
  AdCampaignMetricRecord,
  AnalyticsEventType,
  AssessmentAnswers,
  CrmStatus,
  CrmUserRecord,
  IntegrationProvider,
  IntegrationRecord,
  LeadEventRecord,
  LeadNoteRecord,
  LeadPriority,
  LeadRecord,
  LeadSourcePayloadRecord,
  LeadTaskRecord,
  SyncJobRecord,
  SyncStatus,
} from "@/lib/crm/types";
import type {
  AdCampaignMetricListFilters,
  AdCampaignMetricUpsertInput,
  CampaignReportItem,
  CompleteLeadInput,
  CrmDashboardStats,
  CrmUserUpsertInput,
  DraftLeadUpsertInput,
  ExternalLeadUpsertInput,
  ExternalLeadUpsertResult,
  IntegrationUpsertInput,
  LeadDuplicateLookupInput,
  LeadEventCreateInput,
  LeadListFilters,
  LeadNoteCreateInput,
  LeadProfileUpdateInput,
  LeadSourcePayloadCreateInput,
  LeadTaskCreateInput,
  LeadTaskListFilters,
  LeadStorage,
  SourceReportItem,
  SyncJobCreateInput,
  SyncJobListFilters,
  SyncJobUpdateInput,
} from "./types";

function defaultAnalytics() {
  return {
    whatsappClicked: false,
    consultationClicked: false,
    reportViewed: false,
  };
}

function defaultSyncState(message: string): SyncStatus {
  return {
    status: "pending",
    message,
    lastAttemptAt: null,
    syncedAt: null,
  };
}

function retiredGoogleSheetsSyncState(): SyncStatus {
  return {
    status: "skipped",
    message: "Google Sheets sync retired. Use the CRM export instead.",
    lastAttemptAt: null,
    syncedAt: null,
  };
}

function defaultSyncMetadata(message = "Lead captured. Sync pending.") {
  return {
    googleSheets: retiredGoogleSheetsSyncState(),
    sender: defaultSyncState(message),
  };
}

function clampProgress(progressPercent: number) {
  return Math.max(0, Math.min(100, Math.round(progressPercent)));
}

function toIsoString(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function startOfDay(base = new Date()) {
  const day = new Date(base);
  day.setHours(0, 0, 0, 0);
  return day;
}

function endOfDay(base = new Date()) {
  const day = new Date(base);
  day.setHours(23, 59, 59, 999);
  return day;
}

function formatSpend(value: string | number | null | undefined) {
  const numericValue =
    typeof value === "number" ? value : Number.parseFloat(value ?? "0");
  return Number.isFinite(numericValue) ? numericValue.toFixed(2) : "0.00";
}

function mapLeadRecord(row: typeof leads.$inferSelect): LeadRecord {
  const assignedToList = parseLeadAssignees(row.assignedTo);

  return {
    id: row.id,
    reportToken: row.reportToken,
    createdAt: toIsoString(row.createdAt) ?? new Date(0).toISOString(),
    updatedAt: toIsoString(row.updatedAt) ?? new Date(0).toISOString(),
    lastActivityAt: toIsoString(row.lastActivityAt) ?? new Date(0).toISOString(),
    completedAt: toIsoString(row.completedAt),
    deletedAt: toIsoString(row.deletedAt),
    deletedBy: row.deletedBy,
    completionStatus: row.completionStatus,
    crmStatus: row.crmStatus,
    source: row.source,
    sourceId: row.sourceId,
    sourceDetail: row.sourceDetail,
    stageId: row.stageId,
    priority: row.priority,
    assignedTo: getPrimaryLeadAssignee(row.assignedTo),
    assignedToList,
    assignedUserId: row.assignedUserId,
    companyName: row.companyName,
    campaignId: row.campaignId,
    campaignLabel: row.campaignLabel,
    teamId: row.teamId,
    branchId: row.branchId,
    departmentId: row.departmentId,
    estimatedValue: row.estimatedValue === null ? null : Number.parseFloat(row.estimatedValue),
    expectedValue: row.expectedValue === null ? null : Number.parseFloat(row.expectedValue),
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
    state: row.state,
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
    primaryGoal: row.primaryGoal,
    currentStepKey: row.currentStepKey,
    currentStepIndex: row.currentStepIndex,
    progressPercent: row.progressPercent,
    readinessLevel: row.readinessLevel as LeadRecord["readinessLevel"],
    topPathwayTitle: row.topPathwayTitle,
    answers: row.answers,
    report: row.report,
    publicReport: row.publicReport ?? null,
    sync: row.sync,
    analytics: row.analytics,
  };
}

function mapCrmUserRecord(row: typeof crmUsers.$inferSelect): CrmUserRecord {
  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    role: row.role,
    isActive: row.isActive,
    createdAt: toIsoString(row.createdAt) ?? new Date(0).toISOString(),
    updatedAt: toIsoString(row.updatedAt) ?? new Date(0).toISOString(),
  };
}

function mapLeadEventRecord(row: typeof leadEvents.$inferSelect): LeadEventRecord {
  return {
    id: row.id,
    leadId: row.leadId,
    eventType: row.eventType,
    eventData: row.eventData ?? null,
    createdBy: row.createdBy,
    createdAt: toIsoString(row.createdAt) ?? new Date(0).toISOString(),
  };
}

function mapLeadNoteRecord(row: typeof leadNotes.$inferSelect): LeadNoteRecord {
  return {
    id: row.id,
    leadId: row.leadId,
    note: row.note,
    createdBy: row.createdBy,
    createdAt: toIsoString(row.createdAt) ?? new Date(0).toISOString(),
  };
}

function mapLeadTaskRecord(row: typeof leadTasks.$inferSelect): LeadTaskRecord {
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

function mapLeadSourcePayloadRecord(
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

function mapIntegrationRecord(row: typeof integrations.$inferSelect): IntegrationRecord {
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

function mapSyncJobRecord(row: typeof syncJobs.$inferSelect): SyncJobRecord {
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

function mapAdCampaignMetricRecord(
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

function deriveLeadSnapshot(answers: AssessmentAnswers) {
  return {
    firstName: answers.firstName,
    lastName: answers.lastName,
    email: answers.email,
    whatsappNumber: answers.whatsappNumber,
    state: answers.stateOfResidence,
    primaryGoal: answers.primaryGoal,
  };
}

function buildSearchConditions(search: string) {
  const query = `%${search.trim()}%`;

  return or(
    ilike(leads.firstName, query),
    ilike(leads.lastName, query),
    ilike(leads.email, query),
    ilike(leads.whatsappNumber, query),
    ilike(leads.state, query),
    ilike(leads.sourceDetail, query),
    ilike(leads.assignedTo, query),
  );
}

function buildLeadAnswersFromExternal(input: ExternalLeadUpsertInput) {
  return mergeAssessmentAnswers(emptyAnswers, {
    firstName: normalizeText(input.firstName) ?? "",
    lastName: normalizeText(input.lastName) ?? "",
    email: normalizeText(input.email) ?? "",
    whatsappNumber: normalizeText(input.whatsappNumber) ?? "",
    stateOfResidence: parseNigeriaStateValue(input.state) ?? null,
    primaryGoal: input.primaryGoal ?? null,
    ...input.answers,
  });
}

function serializedLeadAssigneeValue(input?: {
  primary?: string | null;
  assignees?: string[] | null;
}) {
  return serializeLeadAssignees([input?.primary, ...(input?.assignees ?? [])]);
}

function buildLeadAssigneeFilterCondition(email: string) {
  return or(
    eq(leads.assignedTo, email),
    sql`${leads.assignedTo} like ${`${email}|%`}`,
    sql`${leads.assignedTo} like ${`%|${email}|%`}`,
    sql`${leads.assignedTo} like ${`%|${email}`}`,
  );
}

function normalizeLeadState(value?: string | null) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return parseNigeriaStateValue(value) ?? normalizeText(value);
}

function isQualifiedLikeStatus(status: CrmStatus) {
  return [
    "qualified",
    "consultation_booked",
    "application_started",
    "documents_pending",
    "payment_pending",
    "converted",
  ].includes(status);
}

function buildLeadListConditions(filters: LeadListFilters) {
  const conditions: SQL[] = [];

  if (filters.recordState === "trashed") {
    conditions.push(isNotNull(leads.deletedAt));
  } else if (filters.recordState !== "all") {
    conditions.push(isNull(leads.deletedAt));
  }

  if (filters.completionStatus && filters.completionStatus !== "all") {
    conditions.push(eq(leads.completionStatus, filters.completionStatus));
  }

  if (filters.crmStatus && filters.crmStatus !== "all") {
    conditions.push(eq(leads.crmStatus, filters.crmStatus));
  }

  if (filters.primaryGoal && filters.primaryGoal !== "all") {
    conditions.push(eq(leads.primaryGoal, filters.primaryGoal));
  }

  if (filters.source && filters.source !== "all") {
    conditions.push(eq(leads.source, filters.source));
  }

  if (filters.priority && filters.priority !== "all") {
    conditions.push(eq(leads.priority, filters.priority));
  }

  if (filters.assignedTo?.trim()) {
    const condition = buildLeadAssigneeFilterCondition(filters.assignedTo.trim());
    if (condition) {
      conditions.push(condition);
    }
  }

  if (filters.search?.trim()) {
    const condition = buildSearchConditions(filters.search);
    if (condition) {
      conditions.push(condition);
    }
  }

  return conditions;
}

export class NeonLeadStore implements LeadStorage {
  constructor(private readonly getDatabase: typeof getDb = getDb) {}

  async upsertDraft(input: DraftLeadUpsertInput) {
    const db = this.getDatabase();
    const now = new Date();
    const baseUpdate = {
      ...deriveLeadSnapshot(input.answers),
      currentStepKey: input.currentStepKey,
      currentStepIndex: input.currentStepIndex,
      progressPercent: clampProgress(input.progressPercent),
      answers: input.answers,
      deletedAt: null,
      deletedBy: null,
      updatedAt: now,
      lastActivityAt: now,
    };

    if (input.leadId) {
      const existing = await db.query.leads.findFirst({
        where: eq(leads.id, input.leadId),
      });

      if (existing) {
        if (existing.completionStatus === "complete") {
          return mapLeadRecord(existing);
        }

        const [updated] = await db
          .update(leads)
          .set(baseUpdate)
          .where(eq(leads.id, input.leadId))
          .returning();

        return mapLeadRecord(updated);
      }
    }

    const [created] = await db
      .insert(leads)
      .values({
        ...baseUpdate,
        source: "pathway_finder",
        sourceDetail: "assessment_draft",
        priority: "medium",
        assignedTo: null,
        answers: {
          ...emptyAnswers,
          ...input.answers,
        },
        completionStatus: "incomplete",
        crmStatus: "new",
        reportToken: null,
        report: null,
        publicReport: null,
        sourcePayload: null,
        analytics: defaultAnalytics(),
        sync: defaultSyncMetadata("Lead is incomplete. Awaiting completed submission."),
      })
      .returning();

    return mapLeadRecord(created);
  }

  async completeLead(input: CompleteLeadInput) {
    const db = this.getDatabase();
    const existing = await db.query.leads.findFirst({
      where: eq(leads.id, input.leadId),
    });

    if (!existing) {
      throw new Error("Lead not found.");
    }

    const now = new Date();
    const reportToken = existing.reportToken ?? crypto.randomUUID();
    const pendingSync = {
      googleSheets: retiredGoogleSheetsSyncState(),
      sender: defaultSyncState("Completed lead saved. Sender sync pending."),
    };

    const [completed] = await db
      .update(leads)
      .set({
        ...deriveLeadSnapshot(input.answers),
        primaryGoal: input.answers.primaryGoal,
        currentStepKey: "analysis",
        currentStepIndex: existing.currentStepIndex,
        progressPercent: 100,
        answers: input.answers,
        report: input.report,
        publicReport: input.publicReport,
        reportToken,
        completionStatus: "complete",
        crmStatus: existing.crmStatus ?? "new",
        readinessLevel: input.report.readinessLevel,
        topPathwayTitle: getPublicReportPrimaryPathway(input.publicReport),
        completedAt: now,
        deletedAt: null,
        deletedBy: null,
        updatedAt: now,
        lastActivityAt: now,
        sync: pendingSync,
      })
      .where(eq(leads.id, input.leadId))
      .returning();

    return mapLeadRecord(completed);
  }

  async getById(id: string) {
    const db = this.getDatabase();
    const record = await db.query.leads.findFirst({
      where: eq(leads.id, id),
    });

    return record ? mapLeadRecord(record) : null;
  }

  async getByReportToken(reportToken: string) {
    const db = this.getDatabase();
    const record = await db.query.leads.findFirst({
      where: eq(leads.reportToken, reportToken),
    });

    return record ? mapLeadRecord(record) : null;
  }

  async list(filters: LeadListFilters = {}) {
    const db = this.getDatabase();
    const conditions = buildLeadListConditions(filters);

    const records = await db.query.leads.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(leads.updatedAt)],
      limit: filters.limit,
      offset: filters.offset,
    });

    return records.map(mapLeadRecord);
  }

  async countLeads(filters: LeadListFilters = {}) {
    const db = this.getDatabase();
    const conditions = buildLeadListConditions(filters);
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return Number(row?.count ?? 0);
  }

  async listCompletedUnsynced() {
    const completed = await this.list({ completionStatus: "complete" });
    return completed.filter((lead) => lead.sync.googleSheets.status !== "success");
  }

  async trackByReportToken(reportToken: string, event: AnalyticsEventType) {
    const db = this.getDatabase();
    const existing = await db.query.leads.findFirst({
      where: eq(leads.reportToken, reportToken),
    });

    if (!existing) {
      return null;
    }

    const analytics = { ...existing.analytics };
    if (event === "report_viewed") {
      analytics.reportViewed = true;
    }
    if (event === "whatsapp_clicked") {
      analytics.whatsappClicked = true;
    }
    if (event === "consultation_clicked") {
      analytics.consultationClicked = true;
    }

    const [updated] = await db
      .update(leads)
      .set({
        analytics,
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      })
      .where(eq(leads.id, existing.id))
      .returning();

    return mapLeadRecord(updated);
  }

  async updateCrmStatus(id: string, crmStatus: CrmStatus, changedBy?: string | null) {
    const db = this.getDatabase();
    const existing = await db.query.leads.findFirst({
      where: eq(leads.id, id),
    });

    if (!existing) {
      return null;
    }

    if (existing.crmStatus === crmStatus) {
      return mapLeadRecord(existing);
    }

    const [updated] = await db
      .update(leads)
      .set({
        crmStatus,
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      })
      .where(eq(leads.id, id))
      .returning();

    await this.addLeadEvent({
      leadId: id,
      eventType: leadEventTypes.statusChanged,
      eventData: {
        from: existing.crmStatus,
        to: crmStatus,
      },
      createdBy: changedBy ?? null,
    });

    return updated ? mapLeadRecord(updated) : null;
  }

  async updateGoogleSheetsSync(id: string, status: SyncStatus) {
    return this.updateSyncChannel(id, "googleSheets", status);
  }

  async updateSenderSync(id: string, status: SyncStatus) {
    return this.updateSyncChannel(id, "sender", status);
  }

  async upsertExternalLead(input: ExternalLeadUpsertInput): Promise<ExternalLeadUpsertResult> {
    const db = this.getDatabase();
    const duplicate = input.alwaysCreateNewRecord ? null : await this.findDuplicateLead(input);

    if (!duplicate) {
      const created = await this.createExternalLead(input);
      await this.addLeadEvent({
        leadId: created.id,
        eventType: leadEventTypes.leadCreated,
        eventData: {
          source: input.source,
          sourceDetail: input.sourceDetail ?? null,
          externalLeadId: input.externalLeadId ?? null,
        },
      });

      return {
        lead: created,
        created: true,
        duplicateOfId: null,
      };
    }

    const mergedAnswers = mergeAssessmentAnswers(duplicate.answers, {
      firstName: normalizeText(input.firstName) ?? undefined,
      lastName: normalizeText(input.lastName) ?? undefined,
      email: normalizeText(input.email) ?? undefined,
      whatsappNumber: normalizeText(input.whatsappNumber) ?? undefined,
      stateOfResidence: parseNigeriaStateValue(input.state) ?? undefined,
      primaryGoal: input.primaryGoal ?? undefined,
      ...input.answers,
    });
    const incomingSourceDetail = normalizeText(input.sourceDetail);
    const incomingLandingPage = normalizeText(input.landingPage);
    const incomingTopPathwayTitle = normalizeText(input.topPathwayTitle);
    const shouldRefreshWebsiteAttribution = input.source === "website_form";

    const [updated] = await db
      .update(leads)
      .set({
        firstName: duplicate.firstName || normalizeText(input.firstName) || "",
        lastName: duplicate.lastName || normalizeText(input.lastName) || "",
        email: duplicate.email || normalizeText(input.email) || "",
        whatsappNumber: duplicate.whatsappNumber || normalizeText(input.whatsappNumber) || "",
        state: pickPreferredValue(duplicate.state, parseNigeriaStateValue(input.state)),
        primaryGoal: duplicate.primaryGoal ?? input.primaryGoal ?? null,
        sourceDetail:
          shouldRefreshWebsiteAttribution && incomingSourceDetail
            ? incomingSourceDetail
            : pickPreferredValue(duplicate.sourceDetail, incomingSourceDetail),
        externalLeadId: pickPreferredValue(duplicate.externalLeadId, normalizeText(input.externalLeadId)),
        externalFormId: pickPreferredValue(duplicate.externalFormId, normalizeText(input.externalFormId)),
        priority: elevatePriority(duplicate.priority, input.priority),
        facebookLeadgenId: pickPreferredValue(duplicate.facebookLeadgenId, normalizeText(input.facebookLeadgenId)),
        facebookFormId: pickPreferredValue(duplicate.facebookFormId, normalizeText(input.facebookFormId)),
        facebookPageId: pickPreferredValue(duplicate.facebookPageId, normalizeText(input.facebookPageId)),
        facebookCampaignId: pickPreferredValue(
          duplicate.facebookCampaignId,
          normalizeText(input.facebookCampaignId),
        ),
        facebookAdId: pickPreferredValue(duplicate.facebookAdId, normalizeText(input.facebookAdId)),
        facebookAdsetId: pickPreferredValue(duplicate.facebookAdsetId, normalizeText(input.facebookAdsetId)),
        googleClickId: pickPreferredValue(duplicate.googleClickId, normalizeText(input.googleClickId)),
        googleCampaignId: pickPreferredValue(
          duplicate.googleCampaignId,
          normalizeText(input.googleCampaignId),
        ),
        googleAdGroupId: pickPreferredValue(
          duplicate.googleAdGroupId,
          normalizeText(input.googleAdGroupId),
        ),
        googleAdId: pickPreferredValue(duplicate.googleAdId, normalizeText(input.googleAdId)),
        utmSource: pickPreferredValue(duplicate.utmSource, normalizeText(input.utmSource)),
        utmMedium: pickPreferredValue(duplicate.utmMedium, normalizeText(input.utmMedium)),
        utmCampaign: pickPreferredValue(duplicate.utmCampaign, normalizeText(input.utmCampaign)),
        utmContent: pickPreferredValue(duplicate.utmContent, normalizeText(input.utmContent)),
        utmTerm: pickPreferredValue(duplicate.utmTerm, normalizeText(input.utmTerm)),
        landingPage:
          shouldRefreshWebsiteAttribution && incomingLandingPage
            ? incomingLandingPage
            : pickPreferredValue(duplicate.landingPage, incomingLandingPage),
        sourcePayload: input.sourcePayload ?? duplicate.sourcePayload,
        topPathwayTitle: pickPreferredValue(duplicate.topPathwayTitle, incomingTopPathwayTitle),
        answers: mergedAnswers,
        deletedAt: null,
        deletedBy: null,
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      })
      .where(eq(leads.id, duplicate.id))
      .returning();

    await this.addLeadEvent({
      leadId: duplicate.id,
      eventType: leadEventTypes.leadUpdatedFromSource,
      eventData: {
        source: input.source,
        sourceDetail: input.sourceDetail ?? null,
        externalLeadId: input.externalLeadId ?? null,
        facebookLeadgenId: input.facebookLeadgenId ?? null,
        googleClickId: input.googleClickId ?? null,
      },
    });

    return {
      lead: mapLeadRecord(updated),
      created: false,
      duplicateOfId: duplicate.id,
    };
  }

  async createExternalLead(input: ExternalLeadUpsertInput) {
    const db = this.getDatabase();
    const answers = buildLeadAnswersFromExternal(input);
    const now = new Date();
    const isComplete = input.completionStatus === "complete";

    const [created] = await db
      .insert(leads)
      .values({
        source: input.source,
        sourceDetail: normalizeText(input.sourceDetail),
        priority: input.priority ?? "medium",
        assignedTo: serializedLeadAssigneeValue({
          primary: input.assignedTo,
          assignees: input.assignedToList ?? null,
        }),
        firstName: answers.firstName,
        lastName: answers.lastName,
        email: answers.email,
        whatsappNumber: answers.whatsappNumber,
        state: answers.stateOfResidence,
        externalLeadId: normalizeText(input.externalLeadId),
        externalFormId: normalizeText(input.externalFormId),
        facebookLeadgenId: normalizeText(input.facebookLeadgenId),
        facebookFormId: normalizeText(input.facebookFormId),
        facebookPageId: normalizeText(input.facebookPageId),
        facebookCampaignId: normalizeText(input.facebookCampaignId),
        facebookAdId: normalizeText(input.facebookAdId),
        facebookAdsetId: normalizeText(input.facebookAdsetId),
        googleClickId: normalizeText(input.googleClickId),
        googleCampaignId: normalizeText(input.googleCampaignId),
        googleAdGroupId: normalizeText(input.googleAdGroupId),
        googleAdId: normalizeText(input.googleAdId),
        utmSource: normalizeText(input.utmSource),
        utmMedium: normalizeText(input.utmMedium),
        utmCampaign: normalizeText(input.utmCampaign),
        utmContent: normalizeText(input.utmContent),
        utmTerm: normalizeText(input.utmTerm),
        landingPage: normalizeText(input.landingPage),
        sourcePayload: input.sourcePayload ?? null,
        primaryGoal: input.primaryGoal ?? answers.primaryGoal ?? null,
        currentStepKey: input.currentStepKey ?? "contact",
        currentStepIndex: input.currentStepIndex ?? 0,
        progressPercent: clampProgress(input.progressPercent ?? 0),
        readinessLevel: input.readinessLevel ?? input.report?.readinessLevel ?? null,
        topPathwayTitle:
          input.topPathwayTitle ??
          (input.publicReport ? getPublicReportPrimaryPathway(input.publicReport) : null),
        answers,
        report: input.report ?? null,
        publicReport: input.publicReport ?? null,
        completionStatus: input.completionStatus ?? "incomplete",
        crmStatus: input.crmStatus ?? "new",
        reportToken: null,
        analytics: defaultAnalytics(),
        sync: defaultSyncMetadata("External lead captured. CRM export pending."),
        completedAt: isComplete ? now : null,
        deletedAt: null,
        deletedBy: null,
        createdAt: now,
        updatedAt: now,
        lastActivityAt: now,
      })
      .returning();

    return mapLeadRecord(created);
  }

  async findDuplicateLead(input: LeadDuplicateLookupInput) {
    const source = input.source ?? null;
    const externalLeadId = normalizeText(input.externalLeadId);
    const byFacebookLeadgenId = normalizeText(input.facebookLeadgenId);
    const googleClickId = normalizeText(input.googleClickId);
    const email = normalizeEmail(input.email);
    const phone = normalizePhone(input.whatsappNumber);

    if (source && externalLeadId) {
      const match = await this.findLeadByWhere(
        and(eq(leads.source, source), eq(leads.externalLeadId, externalLeadId)),
      );
      if (match) {
        return match;
      }
    }

    if (byFacebookLeadgenId) {
      const match = await this.findLeadByWhere(eq(leads.facebookLeadgenId, byFacebookLeadgenId));
      if (match) {
        return match;
      }
    }

    if (googleClickId && email) {
      const match = await this.findLeadByWhere(
        and(eq(leads.googleClickId, googleClickId), this.emailEquals(email)),
      );
      if (match) {
        return match;
      }
    }

    if (googleClickId && phone) {
      const match = await this.findLeadByWhere(
        and(eq(leads.googleClickId, googleClickId), this.phoneEquals(phone)),
      );
      if (match) {
        return match;
      }
    }

    if (email && phone) {
      const match = await this.findLeadByWhere(and(this.emailEquals(email), this.phoneEquals(phone)));
      if (match) {
        return match;
      }
    }

    if (phone) {
      const match = await this.findLeadByWhere(this.phoneEquals(phone));
      if (match) {
        return match;
      }
    }

    if (email) {
      const match = await this.findLeadByWhere(this.emailEquals(email));
      if (match) {
        return match;
      }
    }

    return null;
  }

  async addLeadEvent(input: LeadEventCreateInput) {
    const db = this.getDatabase();
    const [created] = await db
      .insert(leadEvents)
      .values({
        leadId: input.leadId,
        eventType: input.eventType,
        eventData: input.eventData ?? null,
        createdBy: normalizeText(input.createdBy),
      })
      .returning();

    await this.touchLead(input.leadId);
    return mapLeadEventRecord(created);
  }

  async listLeadEvents(leadId: string) {
    const db = this.getDatabase();
    const records = await db.query.leadEvents.findMany({
      where: eq(leadEvents.leadId, leadId),
      orderBy: [desc(leadEvents.createdAt)],
    });

    return records.map(mapLeadEventRecord);
  }

  async addLeadNote(input: LeadNoteCreateInput) {
    const db = this.getDatabase();
    const [created] = await db
      .insert(leadNotes)
      .values({
        leadId: input.leadId,
        note: input.note.trim(),
        createdBy: normalizeText(input.createdBy),
      })
      .returning();

    await this.addLeadEvent({
      leadId: input.leadId,
      eventType: leadEventTypes.noteAdded,
      eventData: {
        preview: input.note.trim().slice(0, 140),
      },
      createdBy: input.createdBy ?? null,
    });

    return mapLeadNoteRecord(created);
  }

  async listLeadNotes(leadId: string) {
    const db = this.getDatabase();
    const records = await db.query.leadNotes.findMany({
      where: eq(leadNotes.leadId, leadId),
      orderBy: [desc(leadNotes.createdAt)],
    });

    return records.map(mapLeadNoteRecord);
  }

  async addLeadTask(input: LeadTaskCreateInput) {
    const db = this.getDatabase();
    const [created] = await db
      .insert(leadTasks)
      .values({
        leadId: input.leadId,
        title: input.title.trim(),
        description: normalizeText(input.description),
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
        assignedTo: normalizeText(input.assignedTo),
        createdBy: normalizeText(input.createdBy),
      })
      .returning();

    await this.addLeadEvent({
      leadId: input.leadId,
      eventType: leadEventTypes.taskCreated,
      eventData: {
        title: created.title,
        dueAt: toIsoString(created.dueAt),
        assignedTo: created.assignedTo,
      },
      createdBy: input.createdBy ?? null,
    });

    return mapLeadTaskRecord(created);
  }

  async listLeadTasks(filters: LeadTaskListFilters = {}) {
    const db = this.getDatabase();
    const conditions: SQL[] = [];
    const leadScopeFilters: LeadListFilters = {
      recordState: filters.leadRecordState ?? "active",
    };

    if (filters.leadId) {
      conditions.push(eq(leadTasks.leadId, filters.leadId));
    }

    if (filters.assignedTo?.trim()) {
      conditions.push(eq(leadTasks.assignedTo, filters.assignedTo.trim()));
    }

    if (filters.completion === "open") {
      conditions.push(isNull(leadTasks.completedAt));
    }

    if (filters.completion === "completed") {
      conditions.push(sql`${leadTasks.completedAt} is not null`);
    }

    if (filters.dueAfter) {
      conditions.push(gte(leadTasks.dueAt, new Date(filters.dueAfter)));
    }

    if (filters.dueBefore) {
      conditions.push(lte(leadTasks.dueAt, new Date(filters.dueBefore)));
    }

    if (filters.overdueOnly) {
      conditions.push(and(isNull(leadTasks.completedAt), lte(leadTasks.dueAt, new Date())) as SQL);
    }

    if (filters.crmStatus) {
      leadScopeFilters.crmStatus = filters.crmStatus;
    }

    const leadScopeConditions = buildLeadListConditions(leadScopeFilters);
    conditions.push(
      inArray(
        leadTasks.leadId,
        db
          .select({ id: leads.id })
          .from(leads)
          .where(leadScopeConditions.length > 0 ? and(...leadScopeConditions) : undefined),
      ),
    );

    const records = await db.query.leadTasks.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [asc(leadTasks.completedAt), asc(leadTasks.dueAt), desc(leadTasks.createdAt)],
    });

    return records.map(mapLeadTaskRecord);
  }

  async completeLeadTask(taskId: string, completedBy?: string | null) {
    const db = this.getDatabase();
    const existing = await db.query.leadTasks.findFirst({
      where: eq(leadTasks.id, taskId),
    });

    if (!existing) {
      return null;
    }

    if (existing.completedAt) {
      return mapLeadTaskRecord(existing);
    }

    const [updated] = await db
      .update(leadTasks)
      .set({
        completedAt: new Date(),
      })
      .where(eq(leadTasks.id, taskId))
      .returning();

    await this.addLeadEvent({
      leadId: existing.leadId,
      eventType: leadEventTypes.taskCompleted,
      eventData: {
        taskId,
        title: existing.title,
      },
      createdBy: completedBy ?? null,
    });

    return updated ? mapLeadTaskRecord(updated) : null;
  }

  async assignLead(id: string, assignedTo: string | null, changedBy?: string | null) {
    if (!assignedTo) {
      return this.assignLeadOwners(id, [], changedBy);
    }

    const db = this.getDatabase();
    const existing = await db.query.leads.findFirst({
      where: eq(leads.id, id),
    });

    if (!existing) {
      return null;
    }

    const existingAssignees = parseLeadAssignees(existing.assignedTo);
    const normalizedAssignedTo = serializeLeadAssignees([
      assignedTo,
      ...existingAssignees.filter((value) => value !== getPrimaryLeadAssignee(existing.assignedTo)),
    ]);

    if ((existing.assignedTo ?? null) === normalizedAssignedTo) {
      return mapLeadRecord(existing);
    }

    const [updated] = await db
      .update(leads)
      .set({
        assignedTo: normalizedAssignedTo,
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      })
      .where(eq(leads.id, id))
      .returning();

    await this.addLeadEvent({
      leadId: id,
      eventType: leadEventTypes.leadAssigned,
      eventData: {
        from: parseLeadAssignees(existing.assignedTo),
        to: parseLeadAssignees(normalizedAssignedTo),
      },
      createdBy: changedBy ?? null,
    });

    return updated ? mapLeadRecord(updated) : null;
  }

  async assignLeadOwners(id: string, assignedToList: string[], changedBy?: string | null) {
    const db = this.getDatabase();
    const existing = await db.query.leads.findFirst({
      where: eq(leads.id, id),
    });

    if (!existing) {
      return null;
    }

    const nextAssignedTo = serializeLeadAssignees(assignedToList);
    if ((existing.assignedTo ?? null) === nextAssignedTo) {
      return mapLeadRecord(existing);
    }

    const [updated] = await db
      .update(leads)
      .set({
        assignedTo: nextAssignedTo,
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      })
      .where(eq(leads.id, id))
      .returning();

    await this.addLeadEvent({
      leadId: id,
      eventType: leadEventTypes.leadAssigned,
      eventData: {
        from: parseLeadAssignees(existing.assignedTo),
        to: parseLeadAssignees(nextAssignedTo),
      },
      createdBy: changedBy ?? null,
    });

    return updated ? mapLeadRecord(updated) : null;
  }

  async updateLeadProfile(id: string, input: LeadProfileUpdateInput, changedBy?: string | null) {
    const db = this.getDatabase();
    const existing = await db.query.leads.findFirst({
      where: eq(leads.id, id),
    });

    if (!existing) {
      return null;
    }

    const nextFirstName =
      input.firstName === undefined ? existing.firstName : input.firstName.trim();
    const nextLastName =
      input.lastName === undefined ? existing.lastName : normalizeText(input.lastName) ?? "";
    const nextEmail = input.email === undefined ? existing.email : normalizeText(input.email) ?? "";
    const nextWhatsappNumber =
      input.whatsappNumber === undefined
        ? existing.whatsappNumber
        : normalizeText(input.whatsappNumber) ?? "";
    const nextState = input.state === undefined ? existing.state : normalizeLeadState(input.state) ?? null;
    const nextPrimaryGoal =
      input.primaryGoal === undefined ? existing.primaryGoal : input.primaryGoal ?? null;

    const changedFields = [
      existing.firstName !== nextFirstName ? "firstName" : null,
      existing.lastName !== nextLastName ? "lastName" : null,
      existing.email !== nextEmail ? "email" : null,
      existing.whatsappNumber !== nextWhatsappNumber ? "whatsappNumber" : null,
      existing.state !== nextState ? "state" : null,
      existing.primaryGoal !== nextPrimaryGoal ? "primaryGoal" : null,
    ].filter((value): value is string => Boolean(value));

    if (changedFields.length === 0) {
      return mapLeadRecord(existing);
    }

    const nextAnswers = mergeAssessmentAnswers(existing.answers, {
      firstName: input.firstName === undefined ? undefined : nextFirstName,
      lastName: input.lastName === undefined ? undefined : nextLastName,
      email: input.email === undefined ? undefined : nextEmail,
      whatsappNumber: input.whatsappNumber === undefined ? undefined : nextWhatsappNumber,
      stateOfResidence: input.state === undefined ? undefined : nextState,
      primaryGoal: input.primaryGoal === undefined ? undefined : nextPrimaryGoal,
    });

    const [updated] = await db
      .update(leads)
      .set({
        firstName: nextFirstName,
        lastName: nextLastName,
        email: nextEmail,
        whatsappNumber: nextWhatsappNumber,
        state: nextState,
        primaryGoal: nextPrimaryGoal,
        answers: nextAnswers,
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      })
      .where(eq(leads.id, id))
      .returning();

    await this.addLeadEvent({
      leadId: id,
      eventType: leadEventTypes.leadProfileUpdated,
      eventData: {
        changedFields,
      },
      createdBy: changedBy ?? null,
    });

    return updated ? mapLeadRecord(updated) : null;
  }

  async softDeleteLead(id: string, deletedBy?: string | null) {
    const db = this.getDatabase();
    const existing = await db.query.leads.findFirst({
      where: eq(leads.id, id),
    });

    if (!existing) {
      return null;
    }

    if (existing.deletedAt) {
      return mapLeadRecord(existing);
    }

    const [updated] = await db
      .update(leads)
      .set({
        deletedAt: new Date(),
        deletedBy: normalizeText(deletedBy),
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      })
      .where(eq(leads.id, id))
      .returning();

    await this.addLeadEvent({
      leadId: id,
      eventType: leadEventTypes.leadTrashed,
      eventData: {
        deletedBy: normalizeText(deletedBy),
      },
      createdBy: deletedBy ?? null,
    });

    return updated ? mapLeadRecord(updated) : null;
  }

  async restoreLead(id: string, restoredBy?: string | null) {
    const db = this.getDatabase();
    const existing = await db.query.leads.findFirst({
      where: eq(leads.id, id),
    });

    if (!existing) {
      return null;
    }

    if (!existing.deletedAt) {
      return mapLeadRecord(existing);
    }

    const [updated] = await db
      .update(leads)
      .set({
        deletedAt: null,
        deletedBy: null,
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      })
      .where(eq(leads.id, id))
      .returning();

    await this.addLeadEvent({
      leadId: id,
      eventType: leadEventTypes.leadRestored,
      eventData: {
        restoredBy: normalizeText(restoredBy),
      },
      createdBy: restoredBy ?? null,
    });

    return updated ? mapLeadRecord(updated) : null;
  }

  async permanentlyDeleteLead(id: string) {
    const db = this.getDatabase();
    const deleted = await db.delete(leads).where(eq(leads.id, id)).returning({ id: leads.id });
    return deleted.length > 0;
  }

  async updateLeadPriority(id: string, priority: LeadPriority, changedBy?: string | null) {
    const db = this.getDatabase();
    const existing = await db.query.leads.findFirst({
      where: eq(leads.id, id),
    });

    if (!existing) {
      return null;
    }

    if (existing.priority === priority) {
      return mapLeadRecord(existing);
    }

    const [updated] = await db
      .update(leads)
      .set({
        priority,
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      })
      .where(eq(leads.id, id))
      .returning();

    await this.addLeadEvent({
      leadId: id,
      eventType: leadEventTypes.priorityChanged,
      eventData: {
        from: existing.priority,
        to: priority,
      },
      createdBy: changedBy ?? null,
    });

    return updated ? mapLeadRecord(updated) : null;
  }

  async saveSourcePayload(input: LeadSourcePayloadCreateInput) {
    const db = this.getDatabase();
    const [created] = await db
      .insert(leadSourcePayloads)
      .values({
        source: input.source,
        externalId: normalizeText(input.externalId),
        payload: input.payload,
        processingStatus: input.processingStatus ?? "pending",
        processedAt: input.processedAt ? new Date(input.processedAt) : null,
        errorMessage: normalizeText(input.errorMessage),
        retryCount: input.retryCount ?? 0,
      })
      .returning();

    return mapLeadSourcePayloadRecord(created);
  }

  async markPayloadProcessing(id: string) {
    const db = this.getDatabase();
    const [updated] = await db
      .update(leadSourcePayloads)
      .set({
        processingStatus: "processing",
        errorMessage: null,
      })
      .where(eq(leadSourcePayloads.id, id))
      .returning();

    return updated ? mapLeadSourcePayloadRecord(updated) : null;
  }

  async markPayloadProcessed(id: string) {
    const db = this.getDatabase();
    const [updated] = await db
      .update(leadSourcePayloads)
      .set({
        processingStatus: "processed",
        processedAt: new Date(),
        errorMessage: null,
      })
      .where(eq(leadSourcePayloads.id, id))
      .returning();

    return updated ? mapLeadSourcePayloadRecord(updated) : null;
  }

  async markPayloadFailed(id: string, errorMessage: string) {
    const db = this.getDatabase();
    const [updated] = await db
      .update(leadSourcePayloads)
      .set({
        processingStatus: "failed",
        errorMessage,
      })
      .where(eq(leadSourcePayloads.id, id))
      .returning();

    return updated ? mapLeadSourcePayloadRecord(updated) : null;
  }

  async listFailedPayloads(source?: string) {
    const db = this.getDatabase();
    const conditions: SQL[] = [eq(leadSourcePayloads.processingStatus, "failed")];

    if (source?.trim()) {
      conditions.push(eq(leadSourcePayloads.source, source.trim()));
    }

    const records = await db.query.leadSourcePayloads.findMany({
      where: and(...conditions),
      orderBy: [desc(leadSourcePayloads.createdAt)],
    });

    return records.map(mapLeadSourcePayloadRecord);
  }

  async retrySourcePayload(id: string) {
    const db = this.getDatabase();
    const existing = await db.query.leadSourcePayloads.findFirst({
      where: eq(leadSourcePayloads.id, id),
    });

    if (!existing) {
      return null;
    }

    const [updated] = await db
      .update(leadSourcePayloads)
      .set({
        processingStatus: "pending",
        processedAt: null,
        errorMessage: null,
        retryCount: existing.retryCount + 1,
      })
      .where(eq(leadSourcePayloads.id, id))
      .returning();

    return updated ? mapLeadSourcePayloadRecord(updated) : null;
  }

  async createSyncJob(input: SyncJobCreateInput) {
    const db = this.getDatabase();
    const [created] = await db
      .insert(syncJobs)
      .values({
        provider: input.provider,
        jobType: input.jobType,
        status: input.status ?? "pending",
        startedAt: input.startedAt ? new Date(input.startedAt) : null,
        finishedAt: input.finishedAt ? new Date(input.finishedAt) : null,
        errorMessage: normalizeText(input.errorMessage),
        metadata: input.metadata ?? null,
      })
      .returning();

    return mapSyncJobRecord(created);
  }

  async updateSyncJob(id: string, input: SyncJobUpdateInput) {
    const db = this.getDatabase();
    const [updated] = await db
      .update(syncJobs)
      .set({
        status: input.status,
        startedAt: input.startedAt ? new Date(input.startedAt) : undefined,
        finishedAt: input.finishedAt ? new Date(input.finishedAt) : undefined,
        errorMessage:
          input.errorMessage === undefined ? undefined : normalizeText(input.errorMessage),
        metadata: input.metadata,
      })
      .where(eq(syncJobs.id, id))
      .returning();

    return updated ? mapSyncJobRecord(updated) : null;
  }

  async listSyncJobs(filters: SyncJobListFilters = {}) {
    const db = this.getDatabase();
    const conditions: SQL[] = [];

    if (filters.provider) {
      conditions.push(eq(syncJobs.provider, filters.provider));
    }

    if (filters.status) {
      conditions.push(eq(syncJobs.status, filters.status));
    }

    const records = await db.query.syncJobs.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(syncJobs.createdAt)],
      limit: filters.limit,
    });

    return records.map(mapSyncJobRecord);
  }

  async upsertAdCampaignMetric(input: AdCampaignMetricUpsertInput) {
    const db = this.getDatabase();
    const [record] = await db
      .insert(adCampaignMetrics)
      .values({
        provider: input.provider,
        accountId: input.accountId,
        campaignId: input.campaignId,
        campaignName: input.campaignName,
        adGroupId: normalizeText(input.adGroupId) ?? "",
        adGroupName: normalizeText(input.adGroupName) ?? "",
        adId: normalizeText(input.adId) ?? "",
        adName: normalizeText(input.adName) ?? "",
        date: input.date,
        impressions: input.impressions,
        clicks: input.clicks,
        spend: formatSpend(input.spend),
        leads: input.leads,
        conversions: input.conversions,
        rawMetrics: input.rawMetrics ?? null,
      })
      .onConflictDoUpdate({
        target: [
          adCampaignMetrics.provider,
          adCampaignMetrics.accountId,
          adCampaignMetrics.campaignId,
          adCampaignMetrics.adGroupId,
          adCampaignMetrics.adId,
          adCampaignMetrics.date,
        ],
        set: {
          campaignName: input.campaignName,
          adGroupName: normalizeText(input.adGroupName) ?? "",
          adName: normalizeText(input.adName) ?? "",
          impressions: input.impressions,
          clicks: input.clicks,
          spend: formatSpend(input.spend),
          leads: input.leads,
          conversions: input.conversions,
          rawMetrics: input.rawMetrics ?? null,
        },
      })
      .returning();

    return mapAdCampaignMetricRecord(record);
  }

  async listAdCampaignMetrics(filters: AdCampaignMetricListFilters = {}) {
    const db = this.getDatabase();
    const conditions: SQL[] = [];

    if (filters.provider) {
      conditions.push(eq(adCampaignMetrics.provider, filters.provider));
    }

    if (filters.campaignId?.trim()) {
      conditions.push(eq(adCampaignMetrics.campaignId, filters.campaignId.trim()));
    }

    if (filters.dateFrom) {
      conditions.push(gte(adCampaignMetrics.date, filters.dateFrom));
    }

    if (filters.dateTo) {
      conditions.push(lte(adCampaignMetrics.date, filters.dateTo));
    }

    const records = await db.query.adCampaignMetrics.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(adCampaignMetrics.date), desc(adCampaignMetrics.createdAt)],
    });

    return records.map(mapAdCampaignMetricRecord);
  }

  async getDashboardStats(filters: LeadListFilters = {}) {
    const leadsForDashboard = await this.list(filters);
    const dueTodayTasks = await this.listLeadTasks({
      completion: "open",
      dueAfter: startOfDay(),
      dueBefore: endOfDay(),
    });
    const integrationRecords = await this.listIntegrations();

    const today = startOfDay();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const senderSyncStatus = leadsForDashboard.reduce(
      (accumulator, lead) => {
        const status = lead.sync.sender.status;
        if (status === "success") {
          accumulator.success += 1;
        } else if (status === "failed") {
          accumulator.failed += 1;
        } else if (status === "not_configured") {
          accumulator.notConfigured += 1;
        } else if (status === "skipped") {
          accumulator.skipped += 1;
        } else {
          accumulator.pending += 1;
        }

        return accumulator;
      },
      {
        success: 0,
        pending: 0,
        failed: 0,
        notConfigured: 0,
        skipped: 0,
      },
    );

    const stats: CrmDashboardStats = {
      totalLeads: leadsForDashboard.length,
      newLeadsToday: leadsForDashboard.filter((lead) => new Date(lead.createdAt) >= today).length,
      unassignedLeads: leadsForDashboard.filter((lead) => isUnassigned(lead.assignedTo)).length,
      followUpsDueToday: dueTodayTasks.length,
      completedAssessments: leadsForDashboard.filter((lead) => lead.completionStatus === "complete")
        .length,
      consultationReadyLeads: leadsForDashboard.filter((lead) => isQualifiedLikeStatus(lead.crmStatus))
        .length,
      highPriorityLeads: leadsForDashboard.filter((lead) =>
        lead.priority === "high" || lead.priority === "urgent",
      ).length,
      failedIntegrations: integrationRecords.filter((integration) => integration.status === "failed")
        .length,
      facebookLeadsThisWeek: leadsForDashboard.filter(
        (lead) =>
          lead.source === "facebook_lead_ads" && new Date(lead.createdAt) >= sevenDaysAgo,
      ).length,
      websiteLeadsThisWeek: leadsForDashboard.filter(
        (lead) => lead.source === "website_form" && new Date(lead.createdAt) >= sevenDaysAgo,
      ).length,
      senderSyncStatus,
    };

    return stats;
  }

  async getSourceReport() {
    const allLeads = await this.list();
    const summary = new Map<string, SourceReportItem>();

    for (const lead of allLeads) {
      const key = lead.source ?? "unknown";
      const existing = summary.get(key) ?? {
        source: key,
        leadCount: 0,
        qualifiedCount: 0,
        convertedCount: 0,
        highPriorityCount: 0,
      };

      existing.leadCount += 1;
      if (isQualifiedLikeStatus(lead.crmStatus)) {
        existing.qualifiedCount += 1;
      }
      if (lead.crmStatus === "converted") {
        existing.convertedCount += 1;
      }
      if (lead.priority === "high" || lead.priority === "urgent") {
        existing.highPriorityCount += 1;
      }

      summary.set(key, existing);
    }

    return [...summary.values()].sort((left, right) => right.leadCount - left.leadCount);
  }

  async getCampaignReport() {
    const metrics = await this.listAdCampaignMetrics();
    const grouped = new Map<string, CampaignReportItem>();

    for (const metric of metrics) {
      const key = `${metric.provider}:${metric.campaignId}`;
      const existing = grouped.get(key) ?? {
        provider: metric.provider,
        campaignId: metric.campaignId,
        campaignName: metric.campaignName,
        spend: "0.00",
        clicks: 0,
        impressions: 0,
        leads: 0,
        conversions: 0,
        costPerLead: "0.00",
      };

      existing.spend = formatSpend(Number(existing.spend) + Number(metric.spend));
      existing.clicks += metric.clicks;
      existing.impressions += metric.impressions;
      existing.leads += metric.leads;
      existing.conversions += metric.conversions;
      existing.costPerLead =
        existing.leads > 0 ? formatSpend(Number(existing.spend) / existing.leads) : "0.00";

      grouped.set(key, existing);
    }

    return [...grouped.values()].sort((left, right) => Number(right.spend) - Number(left.spend));
  }

  async listCrmUsers() {
    const db = this.getDatabase();
    const records = await db.query.crmUsers.findMany({
      orderBy: [desc(crmUsers.isActive), asc(crmUsers.fullName)],
    });

    return records.map(mapCrmUserRecord);
  }

  async getCrmUserById(id: string) {
    const db = this.getDatabase();
    const record = await db.query.crmUsers.findFirst({
      where: eq(crmUsers.id, id),
    });

    return record ? mapCrmUserRecord(record) : null;
  }

  async upsertCrmUser(input: CrmUserUpsertInput) {
    const db = this.getDatabase();
    const email = normalizeEmail(input.email);

    const [record] = await db
      .insert(crmUsers)
      .values({
        email,
        fullName: input.fullName.trim(),
        role: input.role,
        isActive: input.isActive ?? true,
      })
      .onConflictDoUpdate({
        target: crmUsers.email,
        set: {
          fullName: input.fullName.trim(),
          role: input.role,
          isActive: input.isActive ?? true,
          updatedAt: new Date(),
        },
      })
      .returning();

    return mapCrmUserRecord(record);
  }

  async setCrmUserActive(id: string, isActive: boolean) {
    const db = this.getDatabase();
    const [updated] = await db
      .update(crmUsers)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(crmUsers.id, id))
      .returning();

    return updated ? mapCrmUserRecord(updated) : null;
  }

  async listIntegrations() {
    const db = this.getDatabase();
    const records = await db.query.integrations.findMany({
      orderBy: [asc(integrations.provider), desc(integrations.updatedAt)],
    });

    return records.map(mapIntegrationRecord);
  }

  async getIntegration(provider: IntegrationProvider) {
    const db = this.getDatabase();
    const record = await db.query.integrations.findFirst({
      where: eq(integrations.provider, provider),
      orderBy: [desc(integrations.updatedAt)],
    });

    return record ? mapIntegrationRecord(record) : null;
  }

  async upsertIntegration(input: IntegrationUpsertInput) {
    const db = this.getDatabase();
    const existing = await db.query.integrations.findFirst({
      where: eq(integrations.provider, input.provider),
      orderBy: [desc(integrations.updatedAt)],
    });

    if (existing) {
      const [updated] = await db
        .update(integrations)
        .set({
          accountName:
            input.accountName === undefined ? existing.accountName : normalizeText(input.accountName),
          externalAccountId:
            input.externalAccountId === undefined
              ? existing.externalAccountId
              : normalizeText(input.externalAccountId),
          status: input.status ?? existing.status,
          accessTokenEncrypted:
            input.accessTokenEncrypted === undefined
              ? existing.accessTokenEncrypted
              : input.accessTokenEncrypted,
          refreshTokenEncrypted:
            input.refreshTokenEncrypted === undefined
              ? existing.refreshTokenEncrypted
              : input.refreshTokenEncrypted,
          config: input.config === undefined ? existing.config : input.config,
          lastSyncAt:
            input.lastSyncAt === undefined
              ? existing.lastSyncAt
              : input.lastSyncAt
                ? new Date(input.lastSyncAt)
                : null,
          lastError:
            input.lastError === undefined ? existing.lastError : normalizeText(input.lastError),
          updatedAt: new Date(),
        })
        .where(eq(integrations.id, existing.id))
        .returning();

      return mapIntegrationRecord(updated);
    }

    const [created] = await db
      .insert(integrations)
      .values({
        provider: input.provider,
        accountName: normalizeText(input.accountName),
        externalAccountId: normalizeText(input.externalAccountId),
        status: input.status ?? "not_configured",
        accessTokenEncrypted: input.accessTokenEncrypted ?? null,
        refreshTokenEncrypted: input.refreshTokenEncrypted ?? null,
        config: input.config ?? null,
        lastSyncAt: input.lastSyncAt ? new Date(input.lastSyncAt) : null,
        lastError: normalizeText(input.lastError),
      })
      .returning();

    return mapIntegrationRecord(created);
  }

  private async updateSyncChannel(
    id: string,
    channel: "googleSheets" | "sender",
    status: SyncStatus,
  ) {
    const db = this.getDatabase();
    const existing = await db.query.leads.findFirst({
      where: eq(leads.id, id),
    });

    if (!existing) {
      return null;
    }

    const nextSync = {
      ...existing.sync,
      [channel]: status,
    };

    const [updated] = await db
      .update(leads)
      .set({
        sync: nextSync,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, id))
      .returning();

    return updated ? mapLeadRecord(updated) : null;
  }

  private async findLeadByWhere(where: SQL | undefined) {
    if (!where) {
      return null;
    }

    const db = this.getDatabase();
    const record = await db.query.leads.findFirst({
      where,
      orderBy: [asc(leads.createdAt)],
    });

    return record ? mapLeadRecord(record) : null;
  }

  private emailEquals(value: string) {
    return sql`lower(trim(${leads.email})) = ${value}`;
  }

  private phoneEquals(value: string) {
    return sql`regexp_replace(coalesce(${leads.whatsappNumber}, ''), '[^0-9+]', '', 'g') = ${value}`;
  }

  private async touchLead(leadId: string) {
    const db = this.getDatabase();
    await db
      .update(leads)
      .set({
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(leads.id, leadId));
  }
}
