import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import {
  getPrimaryLeadAssignee,
  parseLeadAssignees,
  serializeLeadAssignees,
} from "@/lib/crm/lead-assignees";
import { elevatePriority } from "@/lib/crm/assignments";
import {
  normalizeEmail,
  normalizePhone,
  normalizeText,
  pickPreferredValue,
} from "@/lib/crm/value-normalization";
import { leadEventTypes } from "@/lib/crm/lead-events";
import { decodeLeadCursor } from "@/lib/crm/lead-pagination";
import { formatLeadSourceLabel } from "@/lib/crm/formatters";
import { resolveAdminAccessLevel } from "@/lib/admin-permissions";
import { getDb } from "@/lib/db/client";
import type { DatabaseExecutor } from "@/lib/db/client";
import {
  adCampaignMetrics,
  crmUsers,
  integrations,
  leadEvents,
  leadNotes,
  leadSourcePayloads,
  leadStages,
  leadTasks,
  leads,
  syncJobs,
} from "@/lib/db/schema";
import { parseNigeriaStateValue } from "@/lib/nigeria-state-options";
import { buildLeadAuditChanges } from "@/lib/crm/lead-audit-events";
import { applyWorkspaceAutomationsToNewLead } from "@/lib/crm/workspace-automations";
import type {
  AdCampaignMetricRecord,
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
  CrmDashboardStats,
  DashboardTrendPoint,
  CrmUserUpsertInput,
  ExternalLeadUpsertInput,
  ExternalLeadUpsertResult,
  IntegrationUpsertInput,
  LeadDuplicateLookupInput,
  LeadDuplicateListInput,
  LeadDistributionReport,
  LeadEventCreateInput,
  LeadEventCountFilters,
  LeadListFilters,
  LeadNoteCreateInput,
  LeadProfileUpdateInput,
  LeadSourcePayloadCreateInput,
  LeadTaskCreateInput,
  LeadTaskListFilters,
  LeadTaskQueueRecord,
  LeadWorkflowUpdateInput,
  LeadStorage,
  SourceReportItem,
  SyncJobCreateInput,
  SyncJobListFilters,
  SyncJobUpdateInput,
} from "./types";

function defaultSyncState(message: string): LeadRecord["sync"]["sender"] {
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

function parseOptionalNumeric(value?: string | number | null) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeLeadRegion(value?: string | null) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return parseNigeriaStateValue(value) ?? normalizeText(value);
}

function deriveCompatibilityStatus(row: typeof leads.$inferSelect): LeadRecord["crmStatus"] {
  if (row.wonAt) {
    return "converted";
  }

  if (row.lostAt) {
    return "lost";
  }

  if (row.stageId || row.assignedTo || row.nextFollowUpAt) {
    return "contacted";
  }

  return "new";
}

function mapLeadRecord(row: typeof leads.$inferSelect): LeadRecord {
  const assignedToList = parseLeadAssignees(row.assignedTo);
  const compatibilityStatus = deriveCompatibilityStatus(row);

  return {
    id: row.id,
    createdAt: toIsoString(row.createdAt) ?? new Date(0).toISOString(),
    updatedAt: toIsoString(row.updatedAt) ?? new Date(0).toISOString(),
    lastActivityAt: toIsoString(row.lastActivityAt) ?? new Date(0).toISOString(),
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
    sync: defaultSyncMetadata("Legacy sync fields retired. Use Leads Desk exports and intake logs."),
  };
}

function mapCrmUserRecord(row: typeof crmUsers.$inferSelect): CrmUserRecord {
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

function buildSearchConditions(search: string) {
  const query = `%${search.trim()}%`;

  return or(
    ilike(leads.firstName, query),
    ilike(leads.lastName, query),
    ilike(leads.email, query),
    ilike(leads.whatsappNumber, query),
    ilike(leads.state, query),
    ilike(leads.country, query),
    ilike(leads.region, query),
    ilike(leads.city, query),
    ilike(leads.address, query),
    ilike(leads.postalCode, query),
    ilike(leads.companyName, query),
    ilike(leads.sourceDetail, query),
    ilike(leads.assignedTo, query),
  );
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

function timestampParam(value: Date) {
  return sql`${value.toISOString()}::timestamptz`;
}

function buildLeadStatusFilterCondition(status: NonNullable<LeadListFilters["status"]>) {
  if (status === "all") {
    return null;
  }

  const stageHasKey = (key: string) => sql`${leads.stageId} in (
    select ${leadStages.id} from ${leadStages} where ${leadStages.key} = ${key}
  )`;

  if (status === "converted") {
    return or(isNotNull(leads.wonAt), sql`${leads.stageId} in (
      select ${leadStages.id} from ${leadStages} where ${leadStages.isWon} = true
    )`);
  }

  if (status === "lost") {
    return or(isNotNull(leads.lostAt), sql`${leads.stageId} in (
      select ${leadStages.id} from ${leadStages} where ${leadStages.isLost} = true
    )`);
  }

  if (status === "new") {
    return or(
      stageHasKey(status),
      and(
        isNull(leads.wonAt),
        isNull(leads.lostAt),
        isNull(leads.stageId),
        sql`nullif(trim(coalesce(${leads.assignedTo}, '')), '') is null`,
        isNull(leads.nextFollowUpAt),
      ),
    );
  }

  if (status === "contacted") {
    return or(
      stageHasKey(status),
      and(
        isNull(leads.wonAt),
        isNull(leads.lostAt),
        isNull(leads.stageId),
        or(
          sql`nullif(trim(coalesce(${leads.assignedTo}, '')), '') is not null`,
          isNotNull(leads.nextFollowUpAt),
        ),
      ),
    );
  }

  return stageHasKey(status);
}

function buildLeadListConditions(filters: LeadListFilters) {
  const conditions: SQL[] = [];

  if (filters.scopeDenied) {
    conditions.push(sql`false`);
  }

  if (filters.recordState === "trashed") {
    conditions.push(isNotNull(leads.deletedAt));
  } else if (filters.recordState !== "all") {
    conditions.push(isNull(leads.deletedAt));
  }

  if (filters.stageId && filters.stageId !== "all") {
    conditions.push(eq(leads.stageId, filters.stageId));
  }

  if (filters.status && filters.status !== "all") {
    const condition = buildLeadStatusFilterCondition(filters.status);
    if (condition) {
      conditions.push(condition);
    }
  }

  if (filters.sourceId && filters.sourceId !== "all") {
    conditions.push(eq(leads.sourceId, filters.sourceId));
  }

  if (filters.source && filters.source !== "all") {
    conditions.push(eq(leads.source, filters.source));
  }

  if (filters.priority && filters.priority !== "all") {
    conditions.push(eq(leads.priority, filters.priority));
  }

  if (filters.leadCustomerType && filters.leadCustomerType !== "all") {
    conditions.push(eq(leads.leadCustomerType, filters.leadCustomerType));
  }

  if (filters.createdFrom) {
    conditions.push(gte(leads.createdAt, new Date(filters.createdFrom)));
  }

  if (filters.createdTo) {
    const end = new Date(filters.createdTo);
    if (
      typeof filters.createdTo === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(filters.createdTo)
    ) {
      end.setHours(23, 59, 59, 999);
    }
    conditions.push(lte(leads.createdAt, end));
  }

  if (filters.assignedTo?.trim()) {
    const condition = buildLeadAssigneeFilterCondition(filters.assignedTo.trim());
    if (condition) {
      conditions.push(condition);
    }
  }

  if (filters.assignedUserId?.trim()) {
    conditions.push(eq(leads.assignedUserId, filters.assignedUserId.trim()));
  }

  if (filters.affiliateReferrerId?.trim()) {
    conditions.push(eq(leads.affiliateReferrerId, filters.affiliateReferrerId.trim()));
  }

  if (filters.branchId?.trim()) {
    conditions.push(eq(leads.branchId, filters.branchId.trim()));
  }

  if (filters.departmentId?.trim()) {
    conditions.push(eq(leads.departmentId, filters.departmentId.trim()));
  }

  if (filters.teamId?.trim()) {
    conditions.push(eq(leads.teamId, filters.teamId.trim()));
  }

  if (filters.assignment === "unassigned") {
    conditions.push(sql`nullif(trim(coalesce(${leads.assignedTo}, '')), '') is null`);
  }

  if (filters.search?.trim()) {
    const condition = buildSearchConditions(filters.search);
    if (condition) {
      conditions.push(condition);
    }
  }

  return conditions;
}

function buildLeadTaskFilterConditions(filters: LeadTaskListFilters) {
  if (filters.leadIds?.length === 0) {
    return null;
  }

  const taskConditions: SQL[] = [];
  const leadScopeFilters: LeadListFilters = {
    recordState: filters.leadRecordState ?? "active",
    branchId: filters.branchId,
    departmentId: filters.departmentId,
    teamId: filters.teamId,
    scopeDenied: filters.scopeDenied,
    assignedTo: filters.leadAssignedTo,
    affiliateReferrerId: filters.leadAffiliateReferrerId,
  };

  if (filters.leadId) {
    taskConditions.push(eq(leadTasks.leadId, filters.leadId));
  }

  if (filters.leadIds) {
    taskConditions.push(inArray(leadTasks.leadId, filters.leadIds));
  }

  if (filters.assignedTo?.trim()) {
    taskConditions.push(eq(leadTasks.assignedTo, filters.assignedTo.trim()));
  }

  if (filters.completion === "open") {
    taskConditions.push(isNull(leadTasks.completedAt));
  }

  if (filters.completion === "completed") {
    taskConditions.push(isNotNull(leadTasks.completedAt));
  }

  if (filters.dueAfter) {
    taskConditions.push(gte(leadTasks.dueAt, new Date(filters.dueAfter)));
  }

  if (filters.dueBefore) {
    taskConditions.push(lte(leadTasks.dueAt, new Date(filters.dueBefore)));
  }

  if (filters.overdueOnly) {
    taskConditions.push(
      and(isNull(leadTasks.completedAt), lte(leadTasks.dueAt, new Date())) as SQL,
    );
  }

  if (filters.stageId) {
    leadScopeFilters.stageId = filters.stageId;
  }

  return {
    leadConditions: buildLeadListConditions(leadScopeFilters),
    taskConditions,
  };
}

export class NeonLeadStore implements LeadStorage {
  constructor(private readonly getDatabase: () => DatabaseExecutor = getDb) {}

  async getById(id: string) {
    const db = this.getDatabase();
    const record = await db.query.leads.findFirst({
      where: eq(leads.id, id),
    });

    return record ? mapLeadRecord(record) : null;
  }

  async list(filters: LeadListFilters = {}) {
    const db = this.getDatabase();
    const conditions = buildLeadListConditions(filters);

    const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);
    const cursor = decodeLeadCursor(filters.cursor);
    const direction = cursor ? filters.cursorDirection ?? "next" : "next";

    if (cursor) {
      const cursorUpdatedAt = new Date(cursor.updatedAt);
      conditions.push(
        direction === "next"
          ? or(
              lt(leads.updatedAt, cursorUpdatedAt),
              and(eq(leads.updatedAt, cursorUpdatedAt), lt(leads.id, cursor.id)),
            ) as SQL
          : or(
              gt(leads.updatedAt, cursorUpdatedAt),
              and(eq(leads.updatedAt, cursorUpdatedAt), gt(leads.id, cursor.id)),
            ) as SQL,
      );
    }

    const records = await db.query.leads.findMany({
      columns: {
        sourcePayload: false,
      },
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy:
        direction === "prev"
          ? [asc(leads.updatedAt), asc(leads.id)]
          : [desc(leads.updatedAt), desc(leads.id)],
      limit,
      offset: cursor ? undefined : filters.offset,
    });

    const orderedRecords = direction === "prev" ? records.reverse() : records;
    return orderedRecords.map((record) => mapLeadRecord({ ...record, sourcePayload: null }));
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

      const automationApplied = await applyWorkspaceAutomationsToNewLead(created.id, db);
      const automatedLead = automationApplied ? await this.getById(created.id) : null;

      return {
        lead: automatedLead ?? created,
        created: true,
        duplicateOfId: null,
      };
    }
    const incomingSourceDetail = normalizeText(input.sourceDetail);
    const incomingLandingPage = normalizeText(input.landingPage);
    const shouldRefreshWebsiteAttribution = input.source === "website_form";
    const nextRegion = normalizeLeadRegion(input.region ?? input.state);

    const [updated] = await db
      .update(leads)
      .set({
        firstName: duplicate.firstName || normalizeText(input.firstName) || "",
        lastName: duplicate.lastName || normalizeText(input.lastName) || "",
        email: duplicate.email || normalizeText(input.email) || "",
        whatsappNumber: duplicate.whatsappNumber || normalizeText(input.whatsappNumber) || "",
        leadCustomerType: input.leadCustomerType ?? duplicate.leadCustomerType ?? "direct",
        state: pickPreferredValue(duplicate.state, nextRegion),
        country: pickPreferredValue(duplicate.country ?? null, normalizeText(input.country)),
        region: pickPreferredValue(duplicate.region ?? null, nextRegion),
        city: pickPreferredValue(duplicate.city ?? null, normalizeText(input.city)),
        address: pickPreferredValue(duplicate.address ?? null, normalizeText(input.address)),
        postalCode: pickPreferredValue(duplicate.postalCode ?? null, normalizeText(input.postalCode)),
        companyName: pickPreferredValue(duplicate.companyName ?? null, normalizeText(input.companyName)),
        sourceId: pickPreferredValue(duplicate.sourceId ?? null, input.sourceId ?? null),
        stageId: pickPreferredValue(duplicate.stageId ?? null, input.stageId ?? null),
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
        assignedUserId: pickPreferredValue(duplicate.assignedUserId ?? null, input.assignedUserId ?? null),
        teamId: pickPreferredValue(duplicate.teamId ?? null, input.teamId ?? null),
        branchId: pickPreferredValue(duplicate.branchId ?? null, input.branchId ?? null),
        departmentId: pickPreferredValue(duplicate.departmentId ?? null, input.departmentId ?? null),
        campaignId: pickPreferredValue(duplicate.campaignId ?? null, normalizeText(input.campaignId)),
        campaignLabel: pickPreferredValue(
          duplicate.campaignLabel ?? null,
          normalizeText(input.campaignLabel),
        ),
        estimatedValue:
          duplicate.estimatedValue !== null && duplicate.estimatedValue !== undefined
            ? String(duplicate.estimatedValue)
            : parseOptionalNumeric(input.estimatedValue)?.toString() ?? null,
        expectedValue:
          duplicate.expectedValue !== null && duplicate.expectedValue !== undefined
            ? String(duplicate.expectedValue)
            : parseOptionalNumeric(input.expectedValue)?.toString() ?? null,
        wonValue:
          duplicate.wonValue !== null && duplicate.wonValue !== undefined
            ? String(duplicate.wonValue)
            : parseOptionalNumeric(input.wonValue)?.toString() ?? null,
        closeProbability:
          duplicate.closeProbability ?? (input.closeProbability === undefined ? null : input.closeProbability),
        expectedCloseDate:
          duplicate.expectedCloseDate
            ? new Date(duplicate.expectedCloseDate)
            : input.expectedCloseDate
              ? new Date(input.expectedCloseDate)
              : null,
        wonAt:
          duplicate.wonAt
            ? new Date(duplicate.wonAt)
            : input.wonAt
              ? new Date(input.wonAt)
              : null,
        lostAt:
          duplicate.lostAt
            ? new Date(duplicate.lostAt)
            : input.lostAt
              ? new Date(input.lostAt)
              : null,
        lostReason: pickPreferredValue(duplicate.lostReason ?? null, normalizeText(input.lostReason)),
        nextFollowUpAt:
          duplicate.nextFollowUpAt
            ? new Date(duplicate.nextFollowUpAt)
            : input.nextFollowUpAt
              ? new Date(input.nextFollowUpAt)
              : null,
        landingPage:
          shouldRefreshWebsiteAttribution && incomingLandingPage
            ? incomingLandingPage
            : pickPreferredValue(duplicate.landingPage, incomingLandingPage),
        sourcePayload: input.sourcePayload ?? duplicate.sourcePayload,
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
    const now = new Date();
    const region = normalizeLeadRegion(input.region ?? input.state);

    const [created] = await db
      .insert(leads)
      .values({
        source: input.source,
        sourceId: input.sourceId ?? null,
        stageId: input.stageId ?? null,
        sourceDetail: normalizeText(input.sourceDetail),
        priority: input.priority ?? "medium",
        leadCustomerType: input.leadCustomerType ?? "direct",
        assignedTo: serializedLeadAssigneeValue({
          primary: input.assignedTo,
          assignees: input.assignedToList ?? null,
        }),
        affiliateReferrerId: input.affiliateReferrerId ?? null,
        assignedUserId: input.assignedUserId ?? null,
        teamId: input.teamId ?? null,
        branchId: input.branchId ?? null,
        departmentId: input.departmentId ?? null,
        companyName: normalizeText(input.companyName),
        campaignId: normalizeText(input.campaignId),
        campaignLabel: normalizeText(input.campaignLabel),
        estimatedValue: parseOptionalNumeric(input.estimatedValue)?.toString() ?? null,
        expectedValue: parseOptionalNumeric(input.expectedValue)?.toString() ?? null,
        wonValue: parseOptionalNumeric(input.wonValue)?.toString() ?? null,
        closeProbability: input.closeProbability ?? null,
        expectedCloseDate: input.expectedCloseDate ? new Date(input.expectedCloseDate) : null,
        wonAt: input.wonAt ? new Date(input.wonAt) : null,
        lostAt: input.lostAt ? new Date(input.lostAt) : null,
        lostReason: normalizeText(input.lostReason),
        nextFollowUpAt: input.nextFollowUpAt ? new Date(input.nextFollowUpAt) : null,
        firstName: normalizeText(input.firstName) ?? "",
        lastName: normalizeText(input.lastName) ?? "",
        email: normalizeText(input.email) ?? "",
        whatsappNumber: normalizeText(input.whatsappNumber) ?? "",
        state: region,
        country: normalizeText(input.country),
        region,
        city: normalizeText(input.city),
        address: normalizeText(input.address),
        postalCode: normalizeText(input.postalCode),
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

  async listDuplicateLeads(input: LeadDuplicateListInput) {
    const email = normalizeEmail(input.email);
    const phone = normalizePhone(input.whatsappNumber);
    const matches: SQL[] = [];

    if (email) {
      matches.push(this.emailEquals(email));
    }
    if (phone) {
      matches.push(this.phoneEquals(phone));
    }
    if (matches.length === 0) {
      return [];
    }

    const conditions: SQL[] = [
      isNull(leads.deletedAt),
      ne(leads.id, input.excludeId),
      or(...matches) as SQL,
    ];
    if (input.assignedTo?.trim()) {
      const assignmentCondition = buildLeadAssigneeFilterCondition(input.assignedTo.trim());
      if (assignmentCondition) {
        conditions.push(assignmentCondition);
      }
    }

    const db = this.getDatabase();
    const records = await db.query.leads.findMany({
      where: and(...conditions),
      orderBy: [desc(leads.updatedAt), desc(leads.id)],
      limit: Math.min(Math.max(input.limit ?? 10, 1), 25),
    });

    return records.map(mapLeadRecord);
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

  async countLeadEvents(filters: LeadEventCountFilters = {}) {
    const db = this.getDatabase();
    const conditions: SQL[] = [isNull(leads.deletedAt)];
    if (filters.eventType) {
      conditions.push(eq(leadEvents.eventType, filters.eventType));
    }
    if (filters.source) {
      conditions.push(eq(leads.source, filters.source));
    }

    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leadEvents)
      .innerJoin(leads, eq(leadEvents.leadId, leads.id))
      .where(and(...conditions));

    return Number(row?.count ?? 0);
  }

  async addLeadNote(input: LeadNoteCreateInput) {
    const db = this.getDatabase();
    return db.transaction(async (transaction) => {
    const activityAt = new Date();
    const [created] = await transaction
      .insert(leadNotes)
      .values({
        leadId: input.leadId,
        note: input.note.trim(),
        createdBy: normalizeText(input.createdBy),
      })
      .returning();

    await transaction.insert(leadEvents).values({
      leadId: input.leadId,
      eventType: leadEventTypes.noteAdded,
      eventData: {
        preview: input.note.trim().slice(0, 140),
        changes: buildLeadAuditChanges([{
          field: "note",
          label: "Note",
          before: null,
          after: input.note.trim().slice(0, 140),
        }]),
      },
      createdBy: input.createdBy ?? null,
    });

    await transaction
      .update(leads)
      .set({ updatedAt: activityAt, lastActivityAt: activityAt })
      .where(eq(leads.id, input.leadId));

    return mapLeadNoteRecord(created);
    });
  }

  async listLeadNotes(leadId: string) {
    const db = this.getDatabase();
    const records = await db.query.leadNotes.findMany({
      where: eq(leadNotes.leadId, leadId),
      orderBy: [desc(leadNotes.createdAt)],
    });

    return records.map(mapLeadNoteRecord);
  }

  async getLeadNoteCounts(leadIds: string[]) {
    if (leadIds.length === 0) {
      return {};
    }

    const db = this.getDatabase();
    const rows = await db
      .select({
        leadId: leadNotes.leadId,
        count: sql<number>`count(*)`,
      })
      .from(leadNotes)
      .where(inArray(leadNotes.leadId, leadIds))
      .groupBy(leadNotes.leadId);

    return Object.fromEntries(rows.map((row) => [row.leadId, Number(row.count)]));
  }

  async addLeadTask(input: LeadTaskCreateInput) {
    const db = this.getDatabase();
    return db.transaction(async (transaction) => {
    const activityAt = new Date();
    const [created] = await transaction
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

    await transaction.insert(leadEvents).values({
      leadId: input.leadId,
      eventType: leadEventTypes.taskCreated,
      eventData: {
        title: created.title,
        dueAt: toIsoString(created.dueAt),
        assignedTo: created.assignedTo,
        changes: buildLeadAuditChanges([
          { field: "title", label: "Task", before: null, after: created.title },
          { field: "dueAt", label: "Due at", before: null, after: created.dueAt },
          { field: "assignedTo", label: "Assigned to", before: null, after: created.assignedTo },
        ]),
      },
      createdBy: input.createdBy ?? null,
    });

    await transaction
      .update(leads)
      .set({ updatedAt: activityAt, lastActivityAt: activityAt })
      .where(eq(leads.id, input.leadId));

    return mapLeadTaskRecord(created);
    });
  }

  async listLeadTasks(filters: LeadTaskListFilters = {}) {
    const db = this.getDatabase();
    const filterConditions = buildLeadTaskFilterConditions(filters);
    if (!filterConditions) {
      return [];
    }

    const conditions = [...filterConditions.taskConditions];
    conditions.push(
      inArray(
        leadTasks.leadId,
        db
          .select({ id: leads.id })
          .from(leads)
          .where(
            filterConditions.leadConditions.length > 0
              ? and(...filterConditions.leadConditions)
              : undefined,
          ),
      ),
    );

    const records = await db.query.leadTasks.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [asc(leadTasks.completedAt), asc(leadTasks.dueAt), desc(leadTasks.createdAt)],
      limit: filters.limit ? Math.min(Math.max(filters.limit, 1), 500) : undefined,
    });

    return records.map(mapLeadTaskRecord);
  }

  async listLeadTaskQueue(
    filters: LeadTaskListFilters = {},
  ): Promise<LeadTaskQueueRecord[]> {
    const db = this.getDatabase();
    const filterConditions = buildLeadTaskFilterConditions(filters);
    if (!filterConditions) {
      return [];
    }

    const records = await db
      .select({
        task: {
          id: leadTasks.id,
          leadId: leadTasks.leadId,
          title: leadTasks.title,
          description: leadTasks.description,
          dueAt: leadTasks.dueAt,
          completedAt: leadTasks.completedAt,
          assignedTo: leadTasks.assignedTo,
          createdBy: leadTasks.createdBy,
          createdAt: leadTasks.createdAt,
        },
        lead: {
          id: leads.id,
          firstName: leads.firstName,
          lastName: leads.lastName,
          companyName: leads.companyName,
          state: leads.state,
          country: leads.country,
          region: leads.region,
          city: leads.city,
        },
      })
      .from(leadTasks)
      .innerJoin(leads, eq(leadTasks.leadId, leads.id))
      .where(
        and(
          ...filterConditions.taskConditions,
          ...filterConditions.leadConditions,
        ),
      )
      .orderBy(asc(leadTasks.completedAt), asc(leadTasks.dueAt), desc(leadTasks.createdAt))
      .limit(Math.min(Math.max(filters.limit ?? 100, 1), 200));

    return records.map((record) => ({
      ...mapLeadTaskRecord(record.task),
      lead: record.lead,
    }));
  }

  async getLeadTaskById(taskId: string) {
    const db = this.getDatabase();
    const record = await db.query.leadTasks.findFirst({
      where: eq(leadTasks.id, taskId),
    });

    return record ? mapLeadTaskRecord(record) : null;
  }

  async completeLeadTask(taskId: string, completedBy?: string | null) {
    const db = this.getDatabase();
    return db.transaction(async (transaction) => {
    const activityAt = new Date();
    const existing = await transaction.query.leadTasks.findFirst({
      where: eq(leadTasks.id, taskId),
    });

    if (!existing) {
      return null;
    }

    if (existing.completedAt) {
      return mapLeadTaskRecord(existing);
    }

    const [updated] = await transaction
      .update(leadTasks)
      .set({
        completedAt: activityAt,
      })
      .where(eq(leadTasks.id, taskId))
      .returning();

    await transaction.insert(leadEvents).values({
      leadId: existing.leadId,
      eventType: leadEventTypes.taskCompleted,
      eventData: {
        taskId,
        title: existing.title,
        changes: buildLeadAuditChanges([{
          field: "completedAt",
          label: "Completed at",
          before: null,
          after: updated?.completedAt ?? null,
        }]),
      },
      createdBy: completedBy ?? null,
    });

    await transaction
      .update(leads)
      .set({ updatedAt: activityAt, lastActivityAt: activityAt })
      .where(eq(leads.id, existing.leadId));

    return updated ? mapLeadTaskRecord(updated) : null;
    });
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

  async updateLeadWorkflow(
    id: string,
    input: LeadWorkflowUpdateInput,
    changedBy?: string | null,
  ) {
    const db = this.getDatabase();
    return db.transaction(async (transaction) => {
    const existing = await transaction.query.leads.findFirst({ where: eq(leads.id, id) });

    if (!existing) {
      return null;
    }

    const nextAssignedTo =
      input.assignedToList === undefined
        ? existing.assignedTo
        : serializeLeadAssignees(input.assignedToList);
    const nextAssignedUserId =
      input.assignedUserId === undefined ? existing.assignedUserId : input.assignedUserId;
    const nextStageId = input.stageId === undefined ? existing.stageId : input.stageId;
    const nextPriority = input.priority ?? existing.priority;
    const nextFollowUpAt =
      input.nextFollowUpAt === undefined
        ? existing.nextFollowUpAt
        : input.nextFollowUpAt
          ? new Date(input.nextFollowUpAt)
          : null;
    const nextWonAt =
      input.wonAt === undefined
        ? existing.wonAt
        : input.wonAt
          ? new Date(input.wonAt)
          : null;
    const nextLostAt =
      input.lostAt === undefined
        ? existing.lostAt
        : input.lostAt
          ? new Date(input.lostAt)
          : null;
    const nextLostReason =
      input.lostReason === undefined ? existing.lostReason : normalizeText(input.lostReason);

    const assignmentChanged =
      (existing.assignedTo ?? null) !== (nextAssignedTo ?? null) ||
      (existing.assignedUserId ?? null) !== (nextAssignedUserId ?? null);
    const stageChanged = (existing.stageId ?? null) !== (nextStageId ?? null);
    const priorityChanged = existing.priority !== nextPriority;
    const followUpChanged =
      (existing.nextFollowUpAt?.getTime() ?? null) !== (nextFollowUpAt?.getTime() ?? null);
    const wonStateChanged =
      (existing.wonAt?.getTime() ?? null) !== (nextWonAt?.getTime() ?? null);
    const lostStateChanged =
      (existing.lostAt?.getTime() ?? null) !== (nextLostAt?.getTime() ?? null) ||
      (existing.lostReason ?? null) !== (nextLostReason ?? null);

    if (
      !assignmentChanged &&
      !stageChanged &&
      !priorityChanged &&
      !followUpChanged &&
      !wonStateChanged &&
      !lostStateChanged
    ) {
      return mapLeadRecord(existing);
    }

    const [updated] = await transaction
      .update(leads)
      .set({
        assignedTo: nextAssignedTo,
        assignedUserId: nextAssignedUserId,
        stageId: nextStageId,
        priority: nextPriority,
        nextFollowUpAt,
        wonAt: nextWonAt,
        lostAt: nextLostAt,
        lostReason: nextLostReason,
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      })
      .where(eq(leads.id, id))
      .returning();

    if (!updated) {
      return null;
    }

    const events = [] as Array<Parameters<LeadStorage["addLeadEvent"]>[0]>;

    if (assignmentChanged) {
      events.push({
        leadId: id,
        eventType: leadEventTypes.leadAssigned,
        eventData: {
          from: parseLeadAssignees(existing.assignedTo),
          to: parseLeadAssignees(nextAssignedTo),
          changes: buildLeadAuditChanges([{
            field: "owners",
            label: "Owners",
            before: parseLeadAssignees(existing.assignedTo),
            after: parseLeadAssignees(nextAssignedTo),
          }]),
        },
        createdBy: changedBy ?? null,
      });
    }

    if (stageChanged) {
      events.push({
        leadId: id,
        eventType: leadEventTypes.statusChanged,
        eventData: {
          fromStageId: existing.stageId,
          toStageId: nextStageId,
          to: input.stageKey ?? null,
          changes: buildLeadAuditChanges([{
            field: "stage",
            label: "Stage",
            before: existing.stageId,
            after: input.stageKey ?? nextStageId,
          }]),
        },
        createdBy: changedBy ?? null,
      });
    }

    if (priorityChanged) {
      events.push({
        leadId: id,
        eventType: leadEventTypes.priorityChanged,
        eventData: {
          from: existing.priority,
          to: nextPriority,
          changes: buildLeadAuditChanges([{
            field: "priority",
            label: "Priority",
            before: existing.priority,
            after: nextPriority,
          }]),
        },
        createdBy: changedBy ?? null,
      });
    }

    if (followUpChanged) {
      events.push({
        leadId: id,
        eventType: leadEventTypes.followUpChanged,
        eventData: {
          from: toIsoString(existing.nextFollowUpAt),
          to: toIsoString(nextFollowUpAt),
          changes: buildLeadAuditChanges([{
            field: "nextFollowUpAt",
            label: "Next follow-up",
            before: existing.nextFollowUpAt,
            after: nextFollowUpAt,
          }]),
        },
        createdBy: changedBy ?? null,
      });
    }

    if (wonStateChanged || lostStateChanged) {
      events.push({
        leadId: id,
        eventType: leadEventTypes.leadLifecycleChanged,
        eventData: {
          changes: buildLeadAuditChanges([
            { field: "wonAt", label: "Won at", before: existing.wonAt, after: nextWonAt },
            { field: "lostAt", label: "Lost at", before: existing.lostAt, after: nextLostAt },
            { field: "lostReason", label: "Lost reason", before: existing.lostReason, after: nextLostReason },
          ]),
        },
        createdBy: changedBy ?? null,
      });
    }

    if (events.length > 0) {
      await transaction.insert(leadEvents).values(events.map((event) => ({
        leadId: event.leadId,
        eventType: event.eventType,
        eventData: event.eventData ?? null,
        createdBy: event.createdBy ?? null,
      })));
    }

    return mapLeadRecord(updated);
    });
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
    const nextState =
      input.state === undefined && input.region === undefined
        ? existing.state
        : normalizeLeadRegion(input.region ?? input.state) ?? null;
    const nextCountry =
      input.country === undefined ? existing.country : normalizeText(input.country) ?? null;
    const nextRegion =
      input.region === undefined ? existing.region : normalizeLeadRegion(input.region) ?? null;
    const nextCity = input.city === undefined ? existing.city : normalizeText(input.city) ?? null;
    const nextAddress =
      input.address === undefined ? existing.address : normalizeText(input.address) ?? null;
    const nextPostalCode =
      input.postalCode === undefined ? existing.postalCode : normalizeText(input.postalCode) ?? null;
    const nextCompanyName =
      input.companyName === undefined ? existing.companyName : normalizeText(input.companyName) ?? null;
    const nextLeadCustomerType =
      input.leadCustomerType === undefined
        ? existing.leadCustomerType
        : input.leadCustomerType ?? "direct";
    const nextCampaignId =
      input.campaignId === undefined ? existing.campaignId : normalizeText(input.campaignId) ?? null;
    const nextCampaignLabel =
      input.campaignLabel === undefined
        ? existing.campaignLabel
        : normalizeText(input.campaignLabel) ?? null;
    const nextAssignedUserId =
      input.assignedUserId === undefined ? existing.assignedUserId : input.assignedUserId ?? null;
    const nextTeamId = input.teamId === undefined ? existing.teamId : input.teamId ?? null;
    const nextBranchId = input.branchId === undefined ? existing.branchId : input.branchId ?? null;
    const nextDepartmentId =
      input.departmentId === undefined ? existing.departmentId : input.departmentId ?? null;
    const nextEstimatedValue =
      input.estimatedValue === undefined
        ? existing.estimatedValue
        : parseOptionalNumeric(input.estimatedValue)?.toString() ?? null;
    const nextExpectedValue =
      input.expectedValue === undefined
        ? existing.expectedValue
        : parseOptionalNumeric(input.expectedValue)?.toString() ?? null;
    const nextWonValue =
      input.wonValue === undefined
        ? existing.wonValue
        : parseOptionalNumeric(input.wonValue)?.toString() ?? null;
    const nextCloseProbability =
      input.closeProbability === undefined ? existing.closeProbability : input.closeProbability ?? null;
    const nextExpectedCloseDate =
      input.expectedCloseDate === undefined
        ? existing.expectedCloseDate
        : input.expectedCloseDate
          ? new Date(input.expectedCloseDate)
          : null;
    const nextWonAt =
      input.wonAt === undefined ? existing.wonAt : input.wonAt ? new Date(input.wonAt) : null;
    const nextLostAt =
      input.lostAt === undefined ? existing.lostAt : input.lostAt ? new Date(input.lostAt) : null;
    const nextLostReason =
      input.lostReason === undefined ? existing.lostReason : normalizeText(input.lostReason) ?? null;
    const nextFollowUpAt =
      input.nextFollowUpAt === undefined
        ? existing.nextFollowUpAt
        : input.nextFollowUpAt
          ? new Date(input.nextFollowUpAt)
          : null;

    const changes = buildLeadAuditChanges([
      { field: "firstName", label: "First name", before: existing.firstName, after: nextFirstName },
      { field: "lastName", label: "Last name", before: existing.lastName, after: nextLastName },
      { field: "email", label: "Email", before: existing.email, after: nextEmail },
      { field: "whatsappNumber", label: "WhatsApp number", before: existing.whatsappNumber, after: nextWhatsappNumber },
      { field: "state", label: "State", before: existing.state, after: nextState },
      { field: "country", label: "Country", before: existing.country, after: nextCountry },
      { field: "region", label: "Region", before: existing.region, after: nextRegion },
      { field: "city", label: "City", before: existing.city, after: nextCity },
      { field: "address", label: "Address", before: existing.address, after: nextAddress },
      { field: "postalCode", label: "Postal code", before: existing.postalCode, after: nextPostalCode },
      { field: "companyName", label: "Company", before: existing.companyName, after: nextCompanyName },
      { field: "leadCustomerType", label: "Customer type", before: existing.leadCustomerType, after: nextLeadCustomerType },
      { field: "campaignId", label: "Campaign ID", before: existing.campaignId, after: nextCampaignId },
      { field: "campaignLabel", label: "Campaign", before: existing.campaignLabel, after: nextCampaignLabel },
      { field: "assignedUserId", label: "Assigned user ID", before: existing.assignedUserId, after: nextAssignedUserId },
      { field: "teamId", label: "Team ID", before: existing.teamId, after: nextTeamId },
      { field: "branchId", label: "Branch ID", before: existing.branchId, after: nextBranchId },
      { field: "departmentId", label: "Department ID", before: existing.departmentId, after: nextDepartmentId },
      { field: "estimatedValue", label: "Estimated value", before: existing.estimatedValue, after: nextEstimatedValue },
      { field: "expectedValue", label: "Expected value", before: existing.expectedValue, after: nextExpectedValue },
      { field: "wonValue", label: "Won value", before: existing.wonValue, after: nextWonValue },
      { field: "closeProbability", label: "Close probability", before: existing.closeProbability, after: nextCloseProbability },
      { field: "expectedCloseDate", label: "Expected close date", before: existing.expectedCloseDate, after: nextExpectedCloseDate },
      { field: "wonAt", label: "Won at", before: existing.wonAt, after: nextWonAt },
      { field: "lostAt", label: "Lost at", before: existing.lostAt, after: nextLostAt },
      { field: "lostReason", label: "Lost reason", before: existing.lostReason, after: nextLostReason },
      { field: "nextFollowUpAt", label: "Next follow-up", before: existing.nextFollowUpAt, after: nextFollowUpAt },
    ]);

    if (changes.length === 0) {
      return mapLeadRecord(existing);
    }

    const [updated] = await db
      .update(leads)
      .set({
        firstName: nextFirstName,
        lastName: nextLastName,
        email: nextEmail,
        whatsappNumber: nextWhatsappNumber,
        state: nextState,
        country: nextCountry,
        region: nextRegion,
        city: nextCity,
        address: nextAddress,
        postalCode: nextPostalCode,
        companyName: nextCompanyName,
        leadCustomerType: nextLeadCustomerType,
        campaignId: nextCampaignId,
        campaignLabel: nextCampaignLabel,
        assignedUserId: nextAssignedUserId,
        teamId: nextTeamId,
        branchId: nextBranchId,
        departmentId: nextDepartmentId,
        estimatedValue: nextEstimatedValue,
        expectedValue: nextExpectedValue,
        wonValue: nextWonValue,
        closeProbability: nextCloseProbability,
        expectedCloseDate: nextExpectedCloseDate,
        wonAt: nextWonAt,
        lostAt: nextLostAt,
        lostReason: nextLostReason,
        nextFollowUpAt: nextFollowUpAt,
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      })
      .where(eq(leads.id, id))
      .returning();

    const lifecycleChanges = changes.filter((change) =>
      change.field === "wonAt" || change.field === "lostAt" || change.field === "lostReason",
    );
    const profileChanges = changes.filter((change) => !lifecycleChanges.includes(change));
    if (profileChanges.length > 0) {
      await this.addLeadEvent({
        leadId: id,
        eventType: leadEventTypes.leadProfileUpdated,
        eventData: {
          changedFields: profileChanges.map((change) => change.field),
          changes: profileChanges,
        },
        createdBy: changedBy ?? null,
      });
    }

    if (lifecycleChanges.length > 0) {
      await this.addLeadEvent({
        leadId: id,
        eventType: leadEventTypes.leadLifecycleChanged,
        eventData: { changes: lifecycleChanges },
        createdBy: changedBy ?? null,
      });
    }

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
    const db = this.getDatabase();
    const conditions = buildLeadListConditions(filters);
    const today = startOfDay();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const todayParam = timestampParam(today);
    const sevenDaysAgoParam = timestampParam(sevenDaysAgo);
    const leadScope = db
      .select({ id: leads.id })
      .from(leads)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const [leadTotals, dueTodayTotals, failedIntegrationTotals] = await Promise.all([
      db
        .select({
          totalLeads: sql<number>`count(*)`,
          newLeadsToday: sql<number>`count(*) filter (where ${leads.createdAt} >= ${todayParam})`,
          unassignedLeads: sql<number>`count(*) filter (
            where nullif(trim(coalesce(${leads.assignedTo}, '')), '') is null
          )`,
          consultationReadyLeads: sql<number>`count(*) filter (
            where ${leads.wonAt} is not null
              or ${leads.stageId} is not null
              or ${leads.estimatedValue} is not null
              or ${leads.expectedValue} is not null
          )`,
          highPriorityLeads: sql<number>`count(*) filter (
            where ${leads.priority} in ('high', 'urgent')
          )`,
          facebookLeadsThisWeek: sql<number>`count(*) filter (
            where ${leads.source} = 'facebook_lead_ads' and ${leads.createdAt} >= ${sevenDaysAgoParam}
          )`,
          websiteLeadsThisWeek: sql<number>`count(*) filter (
            where ${leads.source} = 'website_form' and ${leads.createdAt} >= ${sevenDaysAgoParam}
          )`,
        })
        .from(leads)
        .where(conditions.length > 0 ? and(...conditions) : undefined),
      db
        .select({ count: sql<number>`count(*)` })
        .from(leadTasks)
        .where(
          and(
            isNull(leadTasks.completedAt),
            gte(leadTasks.dueAt, startOfDay()),
            lte(leadTasks.dueAt, endOfDay()),
            inArray(leadTasks.leadId, leadScope),
          ),
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(integrations)
        .where(eq(integrations.status, "failed")),
    ]);

    const totalLeads = Number(leadTotals[0]?.totalLeads ?? 0);

    const stats: CrmDashboardStats = {
      totalLeads,
      newLeadsToday: Number(leadTotals[0]?.newLeadsToday ?? 0),
      unassignedLeads: Number(leadTotals[0]?.unassignedLeads ?? 0),
      followUpsDueToday: Number(dueTodayTotals[0]?.count ?? 0),
      capturedLeads: totalLeads,
      consultationReadyLeads: Number(leadTotals[0]?.consultationReadyLeads ?? 0),
      highPriorityLeads: Number(leadTotals[0]?.highPriorityLeads ?? 0),
      failedIntegrations: Number(failedIntegrationTotals[0]?.count ?? 0),
      facebookLeadsThisWeek: Number(leadTotals[0]?.facebookLeadsThisWeek ?? 0),
      websiteLeadsThisWeek: Number(leadTotals[0]?.websiteLeadsThisWeek ?? 0),
      senderSyncStatus: {
        success: 0,
        pending: totalLeads,
        failed: 0,
        notConfigured: 0,
        skipped: 0,
      },
    };

    return stats;
  }

  async getDashboardTrend(
    filters: LeadListFilters = {},
    days = 14,
  ): Promise<DashboardTrendPoint[]> {
    const db = this.getDatabase();
    const dayCount = Math.min(Math.max(Math.trunc(days), 7), 90);
    const today = new Date();
    const todayUtc = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
    );
    const firstDay = new Date(todayUtc);
    firstDay.setUTCDate(firstDay.getUTCDate() - (dayCount - 1));
    const conditions = buildLeadListConditions(filters);
    const createdDay = sql<string>`to_char(
      date_trunc('day', ${leads.createdAt} at time zone 'UTC'),
      'YYYY-MM-DD'
    )`;
    const wonDay = sql<string>`to_char(
      date_trunc('day', ${leads.wonAt} at time zone 'UTC'),
      'YYYY-MM-DD'
    )`;

    const [createdRows, wonRows] = await Promise.all([
      db
        .select({
          date: createdDay,
          leads: sql<number>`count(*)::int`,
        })
        .from(leads)
        .where(and(...conditions, gte(leads.createdAt, firstDay)))
        .groupBy(createdDay)
        .orderBy(createdDay),
      db
        .select({
          date: wonDay,
          wonValue: sql<number>`coalesce(sum(
            coalesce(${leads.wonValue}, ${leads.expectedValue}, ${leads.estimatedValue}, 0)
          ), 0)`,
        })
        .from(leads)
        .where(
          and(
            ...conditions,
            isNotNull(leads.wonAt),
            gte(leads.wonAt, firstDay),
          ),
        )
        .groupBy(wonDay)
        .orderBy(wonDay),
    ]);

    const leadsByDate = new Map(
      createdRows.map((row) => [row.date, Number(row.leads ?? 0)]),
    );
    const wonValueByDate = new Map(
      wonRows.map((row) => [row.date, Number(row.wonValue ?? 0)]),
    );

    return Array.from({ length: dayCount }, (_, index) => {
      const date = new Date(firstDay);
      date.setUTCDate(firstDay.getUTCDate() + index);
      const dateKey = date.toISOString().slice(0, 10);
      return {
        date: dateKey,
        leads: leadsByDate.get(dateKey) ?? 0,
        wonValue: wonValueByDate.get(dateKey) ?? 0,
      };
    });
  }

  async getSalesPipelineAggregate(filters: LeadListFilters = {}) {
    const db = this.getDatabase();
    const conditions = buildLeadListConditions(filters);
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStartParam = timestampParam(monthStart);
    const todayStartParam = timestampParam(startOfDay(now));
    const todayEndParam = timestampParam(endOfDay(now));
    const sevenDaysAgoParam = timestampParam(sevenDaysAgo);
    const openLead = sql`${leads.wonAt} is null and ${leads.lostAt} is null`;
    const pipelineValue = sql<number>`coalesce(sum(
      case
        when ${leads.wonAt} is not null or ${leads.lostAt} is not null then 0
        else coalesce(
          ${leads.expectedValue},
          case
            when ${leads.estimatedValue} is not null and ${leads.closeProbability} is not null
              then ${leads.estimatedValue} * ${leads.closeProbability} / 100.0
            else ${leads.estimatedValue}
          end,
          0
        )
      end
    ), 0)`;
    const wonValue = sql<number>`coalesce(sum(
      case
        when ${leads.wonAt} is not null
          then coalesce(${leads.wonValue}, ${leads.expectedValue}, ${leads.estimatedValue}, 0)
        else 0
      end
    ), 0)`;
    const stageLabel = sql<string>`coalesce(
      ${leadStages.name},
      case
        when ${leads.wonAt} is not null then 'Converted'
        when ${leads.lostAt} is not null then 'Lost'
        when nullif(trim(coalesce(${leads.assignedTo}, '')), '') is null
          and ${leads.nextFollowUpAt} is null then 'New'
        else 'Contacted'
      end
    )`;
    const ownerEmail = sql<string | null>`nullif(
      lower(trim(split_part(coalesce(${leads.assignedTo}, ''), '|', 1))),
      ''
    )`;

    const [overviewRows, sourceRows, stageRows, repRows, userRows] = await Promise.all([
      db
        .select({
          totalLeads: sql<number>`count(*)`,
          newLeads: sql<number>`count(*) filter (
            where ${leads.stageId} in (
              select ${leadStages.id} from ${leadStages} where ${leadStages.key} = 'new'
            ) or (
              ${leads.stageId} is null
              and ${leads.wonAt} is null
              and ${leads.lostAt} is null
              and nullif(trim(coalesce(${leads.assignedTo}, '')), '') is null
              and ${leads.nextFollowUpAt} is null
            )
          )`,
          leadsThisMonth: sql<number>`count(*) filter (where ${leads.createdAt} >= ${monthStartParam})`,
          overdueFollowUps: sql<number>`count(*) filter (
            where ${openLead} and ${leads.nextFollowUpAt} < ${todayStartParam}
          )`,
          dueTodayFollowUps: sql<number>`count(*) filter (
            where ${openLead}
              and ${leads.nextFollowUpAt} >= ${todayStartParam}
              and ${leads.nextFollowUpAt} <= ${todayEndParam}
          )`,
          stuckLeads: sql<number>`count(*) filter (
            where ${openLead} and ${leads.lastActivityAt} < ${sevenDaysAgoParam}
          )`,
          wonLeads: sql<number>`count(*) filter (where ${leads.wonAt} is not null)`,
          lostLeads: sql<number>`count(*) filter (where ${leads.lostAt} is not null)`,
          pipelineValue,
          wonValue,
        })
        .from(leads)
        .where(where),
      db
        .select({
          source: leads.source,
          totalLeads: sql<number>`count(*)`,
          wonLeads: sql<number>`count(*) filter (where ${leads.wonAt} is not null)`,
          wonValue,
          pipelineValue,
        })
        .from(leads)
        .where(where)
        .groupBy(leads.source),
      db
        .select({
          id: leadStages.id,
          key: leadStages.key,
          label: stageLabel,
          color: leadStages.color,
          sortOrder: leadStages.sortOrder,
          totalLeads: sql<number>`count(*)`,
          wonValue,
          pipelineValue,
        })
        .from(leads)
        .leftJoin(leadStages, eq(leads.stageId, leadStages.id))
        .where(where)
        .groupBy(
          leadStages.id,
          leadStages.key,
          stageLabel,
          leadStages.color,
          leadStages.sortOrder,
        ),
      db
        .select({
          assignedUserId: leads.assignedUserId,
          ownerEmail,
          assignedLeads: sql<number>`count(*)`,
          overdueFollowUps: sql<number>`count(*) filter (
            where ${openLead} and ${leads.nextFollowUpAt} < ${todayStartParam}
          )`,
          wonLeads: sql<number>`count(*) filter (where ${leads.wonAt} is not null)`,
          wonValue,
          pipelineValue,
        })
        .from(leads)
        .where(
          and(
            ...(conditions.length > 0 ? conditions : []),
            or(isNotNull(leads.assignedUserId), sql`${ownerEmail} is not null`),
          ),
        )
        .groupBy(leads.assignedUserId, ownerEmail),
      db.query.crmUsers.findMany({
        where: eq(crmUsers.isActive, true),
      }),
    ]);

    const overview = overviewRows[0];
    const totalLeads = Number(overview?.totalLeads ?? 0);
    const wonLeads = Number(overview?.wonLeads ?? 0);
    const usersById = new Map(userRows.map((user) => [user.id, user]));
    const usersByEmail = new Map(userRows.map((user) => [normalizeEmail(user.email), user]));

    return {
      totalLeads,
      newLeads: Number(overview?.newLeads ?? 0),
      leadsThisMonth: Number(overview?.leadsThisMonth ?? 0),
      overdueFollowUps: Number(overview?.overdueFollowUps ?? 0),
      dueTodayFollowUps: Number(overview?.dueTodayFollowUps ?? 0),
      stuckLeads: Number(overview?.stuckLeads ?? 0),
      wonLeads,
      lostLeads: Number(overview?.lostLeads ?? 0),
      pipelineValue: Number(overview?.pipelineValue ?? 0),
      wonValue: Number(overview?.wonValue ?? 0),
      conversionRate: totalLeads > 0 ? Number(((wonLeads / totalLeads) * 100).toFixed(1)) : 0,
      topSources: sourceRows
        .map((row) => {
          const sourceTotal = Number(row.totalLeads);
          const sourceWon = Number(row.wonLeads);
          return {
            label: formatLeadSourceLabel(row.source),
            totalLeads: sourceTotal,
            wonLeads: sourceWon,
            wonValue: Number(row.wonValue),
            pipelineValue: Number(row.pipelineValue),
            conversionRate:
              sourceTotal > 0 ? Number(((sourceWon / sourceTotal) * 100).toFixed(1)) : 0,
          };
        })
        .sort((left, right) => right.totalLeads - left.totalLeads)
        .slice(0, 5),
      stagePerformance: stageRows
        .map((row) => ({
          id: row.id,
          key: row.key,
          label: row.label,
          color: row.color,
          sortOrder: row.sortOrder,
          totalLeads: Number(row.totalLeads),
          wonValue: Number(row.wonValue),
          pipelineValue: Number(row.pipelineValue),
        }))
        .sort((left, right) => {
          if (left.sortOrder !== null && right.sortOrder !== null) {
            return left.sortOrder - right.sortOrder;
          }

          if (left.sortOrder !== null) {
            return -1;
          }

          if (right.sortOrder !== null) {
            return 1;
          }

          return right.totalLeads - left.totalLeads;
        }),
      repPerformance: repRows
        .map((row) => {
          const user =
            (row.assignedUserId ? usersById.get(row.assignedUserId) : null) ??
            (row.ownerEmail ? usersByEmail.get(normalizeEmail(row.ownerEmail)) : null);
          const assignedLeads = Number(row.assignedLeads);
          const repWonLeads = Number(row.wonLeads);
          const email = user?.email ?? row.ownerEmail ?? "Unassigned";
          return {
            id: user?.id ?? email,
            label: user?.fullName || email,
            assignedLeads,
            overdueFollowUps: Number(row.overdueFollowUps),
            wonLeads: repWonLeads,
            wonValue: Number(row.wonValue),
            pipelineValue: Number(row.pipelineValue),
            conversionRate:
              assignedLeads > 0 ? Number(((repWonLeads / assignedLeads) * 100).toFixed(1)) : 0,
          };
        })
        .sort((left, right) => right.assignedLeads - left.assignedLeads)
        .slice(0, 6),
    };
  }

  async getTeamPerformance(filters: LeadListFilters = {}) {
    const db = this.getDatabase();
    const ownerEmail = sql<string | null>`nullif(
      lower(trim(split_part(coalesce(${leads.assignedTo}, ''), '|', 1))),
      ''
    )`;
    const taskOwnerEmail = sql<string | null>`nullif(lower(trim(coalesce(${leadTasks.assignedTo}, ''))), '')`;
    const todayStart = startOfDay();
    const todayEnd = endOfDay();
    const nowParam = timestampParam(new Date());
    const todayStartParam = timestampParam(todayStart);
    const todayEndParam = timestampParam(todayEnd);
    const leadScopeConditions = buildLeadListConditions({ ...filters, recordState: "active" });

    const [users, leadRows, taskRows] = await Promise.all([
      db.query.crmUsers.findMany({
        where: eq(crmUsers.isActive, true),
        orderBy: [asc(crmUsers.fullName), asc(crmUsers.email)],
      }),
      db
        .select({
          assignedUserId: leads.assignedUserId,
          ownerEmail,
          assignedLeads: sql<number>`count(*)`,
          contactedLeads: sql<number>`count(*)`,
          qualifiedLeads: sql<number>`count(*) filter (
            where ${leads.wonAt} is not null
              or ${leads.stageId} is not null
              or ${leads.estimatedValue} is not null
              or ${leads.expectedValue} is not null
          )`,
          convertedLeads: sql<number>`count(*) filter (where ${leads.wonAt} is not null)`,
          highPriorityLeads: sql<number>`count(*) filter (
            where ${leads.priority} in ('high', 'urgent')
          )`,
          lastActivityAt: sql<Date | null>`max(${leads.lastActivityAt})`,
        })
        .from(leads)
        .where(
          and(
            ...leadScopeConditions,
            or(isNotNull(leads.assignedUserId), sql`${ownerEmail} is not null`),
          ),
        )
        .groupBy(leads.assignedUserId, ownerEmail),
      db
        .select({
          ownerEmail: taskOwnerEmail,
          openTasks: sql<number>`count(*) filter (where ${leadTasks.completedAt} is null)`,
          overdueTasks: sql<number>`count(*) filter (
            where ${leadTasks.completedAt} is null and ${leadTasks.dueAt} < ${nowParam}
          )`,
          dueTodayTasks: sql<number>`count(*) filter (
            where ${leadTasks.completedAt} is null
              and ${leadTasks.dueAt} >= ${todayStartParam}
              and ${leadTasks.dueAt} <= ${todayEndParam}
          )`,
          completedTasks: sql<number>`count(*) filter (where ${leadTasks.completedAt} is not null)`,
          lastActivityAt: sql<Date | null>`max(greatest(
            ${leadTasks.createdAt},
            coalesce(${leadTasks.completedAt}, 'epoch'::timestamptz),
            coalesce(${leadTasks.dueAt}, 'epoch'::timestamptz)
          ))`,
        })
        .from(leadTasks)
        .innerJoin(leads, eq(leadTasks.leadId, leads.id))
        .where(
          and(
            ...leadScopeConditions,
            sql`${taskOwnerEmail} is not null`,
          ),
        )
        .groupBy(taskOwnerEmail),
    ]);

    const usersById = new Map(users.map((user) => [user.id, user]));
    const usersByEmail = new Map(users.map((user) => [normalizeEmail(user.email), user]));
    const rowsByEmail = new Map<
      string,
      {
        user: (typeof users)[number] | null;
        assignedLeads: number;
        openTasks: number;
        overdueTasks: number;
        dueTodayTasks: number;
        completedTasks: number;
        contactedLeads: number;
        qualifiedLeads: number;
        convertedLeads: number;
        highPriorityLeads: number;
        lastActivityAt: Date | string | null;
      }
    >();

    const ensureRow = (email: string, user: (typeof users)[number] | null = null) => {
      const normalizedEmail = normalizeEmail(email) ?? email.trim().toLowerCase();
      const existing = rowsByEmail.get(normalizedEmail);
      if (existing) {
        if (!existing.user && user) {
          existing.user = user;
        }
        return existing;
      }

      const created = {
        user,
        assignedLeads: 0,
        openTasks: 0,
        overdueTasks: 0,
        dueTodayTasks: 0,
        completedTasks: 0,
        contactedLeads: 0,
        qualifiedLeads: 0,
        convertedLeads: 0,
        highPriorityLeads: 0,
        lastActivityAt: null as Date | string | null,
      };
      rowsByEmail.set(normalizedEmail, created);
      return created;
    };

    for (const user of users) {
      ensureRow(user.email, user);
    }

    for (const row of leadRows) {
      const user =
        (row.assignedUserId ? usersById.get(row.assignedUserId) : null) ??
        (row.ownerEmail ? usersByEmail.get(normalizeEmail(row.ownerEmail)) : null) ??
        null;
      const email = user?.email ?? row.ownerEmail;
      if (!email) {
        continue;
      }

      const target = ensureRow(email, user);
      target.assignedLeads += Number(row.assignedLeads);
      target.contactedLeads += Number(row.contactedLeads);
      target.qualifiedLeads += Number(row.qualifiedLeads);
      target.convertedLeads += Number(row.convertedLeads);
      target.highPriorityLeads += Number(row.highPriorityLeads);
      target.lastActivityAt = row.lastActivityAt;
    }

    for (const row of taskRows) {
      if (!row.ownerEmail) {
        continue;
      }
      const user = usersByEmail.get(normalizeEmail(row.ownerEmail)) ?? null;
      const target = ensureRow(user?.email ?? row.ownerEmail, user);
      target.openTasks += Number(row.openTasks);
      target.overdueTasks += Number(row.overdueTasks);
      target.dueTodayTasks += Number(row.dueTodayTasks);
      target.completedTasks += Number(row.completedTasks);
      const currentTime = target.lastActivityAt ? new Date(target.lastActivityAt).getTime() : 0;
      const taskTime = row.lastActivityAt ? new Date(row.lastActivityAt).getTime() : 0;
      if (taskTime > currentTime) {
        target.lastActivityAt = row.lastActivityAt;
      }
    }

    return [...rowsByEmail.entries()]
      .map(([email, row]) => {
        const user = row.user;
        const role = user?.role ?? ("sales_agent" as const);
        return {
          id: user?.id ?? email,
          email: user?.email ?? email,
          fullName: user?.fullName ?? email,
          avatarUrl: user?.avatarUrl ?? null,
          role,
          accessLevel: resolveAdminAccessLevel({ email: user?.email ?? email, role }),
          assignedLeads: row.assignedLeads,
          openTasks: row.openTasks,
          overdueTasks: row.overdueTasks,
          dueTodayTasks: row.dueTodayTasks,
          completedTasks: row.completedTasks,
          contactedLeads: row.contactedLeads,
          qualifiedLeads: row.qualifiedLeads,
          convertedLeads: row.convertedLeads,
          highPriorityLeads: row.highPriorityLeads,
          lastActivityAt: row.lastActivityAt ? new Date(row.lastActivityAt).toISOString() : null,
        };
      })
      .filter((row) => row.role !== "finance" && row.role !== "ad_manager")
      .sort((left, right) => {
        if (left.overdueTasks !== right.overdueTasks) {
          return right.overdueTasks - left.overdueTasks;
        }
        if (left.assignedLeads !== right.assignedLeads) {
          return right.assignedLeads - left.assignedLeads;
        }
        return left.fullName.localeCompare(right.fullName);
      });
  }

  async getSourceReport(filters: LeadListFilters = {}) {
    const db = this.getDatabase();
    const conditions = buildLeadListConditions({ ...filters, recordState: "active" });
    const rows = await db
      .select({
        source: leads.source,
        leadCount: sql<number>`count(*)`,
        qualifiedCount: sql<number>`count(*) filter (
          where ${leads.wonAt} is not null
            or ${leads.stageId} is not null
            or ${leads.estimatedValue} is not null
            or ${leads.expectedValue} is not null
        )`,
        convertedCount: sql<number>`count(*) filter (where ${leads.wonAt} is not null)`,
        highPriorityCount: sql<number>`count(*) filter (
          where ${leads.priority} in ('high', 'urgent')
        )`,
      })
      .from(leads)
      .where(and(...conditions))
      .groupBy(leads.source);

    return rows
      .map<SourceReportItem>((row) => ({
        source: row.source ?? "unknown",
        leadCount: Number(row.leadCount),
        qualifiedCount: Number(row.qualifiedCount),
        convertedCount: Number(row.convertedCount),
        highPriorityCount: Number(row.highPriorityCount),
      }))
      .sort((left, right) => right.leadCount - left.leadCount);
  }

  async getLeadDistributionReport(
    filters: LeadListFilters = {},
  ): Promise<LeadDistributionReport> {
    const db = this.getDatabase();
    const conditions = buildLeadListConditions(filters);
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const interestLabel = sql<string>`coalesce(
      nullif(trim(coalesce(${leads.sourceDetail}, '')), ''),
      nullif(trim(coalesce(${leads.campaignLabel}, '')), ''),
      nullif(trim(coalesce(${leads.companyName}, '')), ''),
      'Not set'
    )`;
    const locationLabel = sql<string>`coalesce(
      nullif(trim(coalesce(${leads.city}, '')), ''),
      nullif(trim(coalesce(${leads.region}, '')), ''),
      nullif(trim(coalesce(${leads.country}, '')), ''),
      'Not yet set'
    )`;
    const leadCount = sql<number>`count(*)`;

    const [interestRows, locationRows] = await Promise.all([
      db
        .select({ label: interestLabel, value: leadCount })
        .from(leads)
        .where(where)
        .groupBy(interestLabel)
        .orderBy(desc(leadCount))
        .limit(10),
      db
        .select({ label: locationLabel, value: leadCount })
        .from(leads)
        .where(where)
        .groupBy(locationLabel)
        .orderBy(desc(leadCount))
        .limit(10),
    ]);

    return {
      interestReport: interestRows.map((row) => ({
        label: row.label,
        value: Number(row.value),
      })),
      locationReport: locationRows.map((row) => ({
        label: row.label,
        value: Number(row.value),
      })),
    };
  }

  async getCampaignReport() {
    const db = this.getDatabase();
    const rows = await db
      .select({
        provider: adCampaignMetrics.provider,
        campaignId: adCampaignMetrics.campaignId,
        campaignName: sql<string>`(
          array_agg(${adCampaignMetrics.campaignName} order by ${adCampaignMetrics.date} desc, ${adCampaignMetrics.createdAt} desc)
        )[1]`,
        spend: sql<string>`coalesce(sum(${adCampaignMetrics.spend}), 0)`,
        clicks: sql<number>`coalesce(sum(${adCampaignMetrics.clicks}), 0)`,
        impressions: sql<number>`coalesce(sum(${adCampaignMetrics.impressions}), 0)`,
        leads: sql<number>`coalesce(sum(${adCampaignMetrics.leads}), 0)`,
        conversions: sql<number>`coalesce(sum(${adCampaignMetrics.conversions}), 0)`,
      })
      .from(adCampaignMetrics)
      .groupBy(adCampaignMetrics.provider, adCampaignMetrics.campaignId);

    return rows
      .map<CampaignReportItem>((row) => {
        const spend = Number(row.spend);
        const leadCount = Number(row.leads);
        return {
          provider: row.provider,
          campaignId: row.campaignId,
          campaignName: row.campaignName,
          spend: formatSpend(spend),
          clicks: Number(row.clicks),
          impressions: Number(row.impressions),
          leads: leadCount,
          conversions: Number(row.conversions),
          costPerLead: leadCount > 0 ? formatSpend(spend / leadCount) : "0.00",
        };
      })
      .sort((left, right) => Number(right.spend) - Number(left.spend));
  }

  async countGoogleAdsCampaignLeads(input: { campaignId: string; campaignName: string }) {
    const db = this.getDatabase();
    const campaignId = input.campaignId.trim();
    const campaignName = input.campaignName.trim();
    const matches: SQL[] = [];

    if (campaignId) {
      matches.push(eq(leads.googleCampaignId, campaignId));
    }
    if (campaignName) {
      const pattern = `%${campaignName}%`;
      matches.push(
        ilike(leads.utmCampaign, pattern),
        ilike(leads.utmContent, pattern),
        ilike(leads.utmSource, pattern),
        ilike(leads.utmMedium, pattern),
        ilike(leads.utmTerm, pattern),
      );
    }
    if (matches.length === 0) {
      return 0;
    }

    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(and(isNull(leads.deletedAt), or(...matches)));

    return Number(row?.count ?? 0);
  }

  async listCrmUsers() {
    const db = this.getDatabase();
    const records = await db.query.crmUsers.findMany({
      orderBy: [desc(crmUsers.isActive), asc(crmUsers.fullName)],
    });

    return records.map(mapCrmUserRecord);
  }

  async getCrmUserByEmail(email: string) {
    const db = this.getDatabase();
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return null;
    }
    const record = await db.query.crmUsers.findFirst({
      where: eq(crmUsers.email, normalizedEmail),
    });

    return record ? mapCrmUserRecord(record) : null;
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

    if (!email) {
      throw new Error("CRM user email is required.");
    }

    const defaultScope = input.role === "admin" ? "all" : input.role === "manager" ? "team" : "own";
    const [record] = await db
      .insert(crmUsers)
      .values({
        email,
        fullName: input.fullName.trim(),
        role: input.role,
        isActive: input.isActive ?? true,
        avatarUrl: input.avatarUrl ?? null,
        accessScope: input.accessScope ?? defaultScope,
        branchId: input.branchId ?? null,
        departmentId: input.departmentId ?? null,
        teamId: input.teamId ?? null,
      })
      .onConflictDoUpdate({
        target: crmUsers.email,
        set: {
          fullName: input.fullName.trim(),
          role: input.role,
          isActive: input.isActive ?? true,
          avatarUrl: input.avatarUrl ?? null,
          ...(input.accessScope !== undefined ? { accessScope: input.accessScope } : {}),
          ...(input.branchId !== undefined ? { branchId: input.branchId } : {}),
          ...(input.departmentId !== undefined ? { departmentId: input.departmentId } : {}),
          ...(input.teamId !== undefined ? { teamId: input.teamId } : {}),
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
