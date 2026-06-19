import { crmLabelize, formatLeadInterestLabel, formatLeadQualificationLabel, formatLeadSourceLabel } from "@/lib/crm/labels";
import type { LeadRecord } from "@/lib/crm/types";
import type { LeadActivityEvent, LeadNote, LeadTask } from "./activity";
import type { LeadCoreRecord, LeadDetailRecord, LegacyProgressSummary } from "./leads";

function fullName(firstName?: string | null, lastName?: string | null) {
  return `${firstName ?? ""} ${lastName ?? ""}`.trim() || "Lead";
}

function mapLegacyStatus(lead: Pick<LeadRecord, "crmStatus" | "deletedAt">): LeadCoreRecord["status"] {
  if (lead.deletedAt) {
    return "archived";
  }

  if (lead.crmStatus === "converted") {
    return "won";
  }

  if (lead.crmStatus === "lost" || lead.crmStatus === "closed" || lead.crmStatus === "unqualified") {
    return "lost";
  }

  if (lead.crmStatus === "unresponsive") {
    return "stalled";
  }

  return "active";
}

function mapLegacyPriority(priority: LeadRecord["priority"]): LeadCoreRecord["priority"] {
  return priority === "medium" ? "normal" : priority;
}

function buildLegacyProgressSummary(
  lead: Pick<LeadRecord, "currentStepKey" | "currentStepIndex" | "progressPercent">,
): LegacyProgressSummary | null {
  if (
    lead.currentStepKey === null &&
    typeof lead.currentStepIndex !== "number" &&
    typeof lead.progressPercent !== "number"
  ) {
    return null;
  }

  return {
    stepKey: lead.currentStepKey ?? null,
    stepIndex: typeof lead.currentStepIndex === "number" ? lead.currentStepIndex : null,
    progressPercent: typeof lead.progressPercent === "number" ? lead.progressPercent : null,
  };
}

function buildReportSummary(lead: Pick<LeadRecord, "reportToken" | "report">) {
  if (!lead.reportToken && !lead.report) {
    return null;
  }

  const report = lead.report as
    | {
        summaryDiagnosis?: string | null;
        firstPracticalStep?: string | null;
      }
    | null
    | undefined;

  return {
    reportToken: lead.reportToken ?? null,
    summaryDiagnosis: report?.summaryDiagnosis ?? null,
    recommendedAction: report?.firstPracticalStep ?? null,
  };
}

export function mapLegacyLeadRecordToLeadCoreRecord(lead: LeadRecord): LeadCoreRecord {
  const estimatedValue = lead.sourcePayload?.estimatedValue;
  const numericEstimatedValue =
    typeof estimatedValue === "number"
      ? estimatedValue
      : typeof estimatedValue === "string"
        ? Number.parseFloat(estimatedValue)
        : null;

  return {
    id: lead.id,
    name: fullName(lead.firstName, lead.lastName),
    email: lead.email || null,
    phone: lead.whatsappNumber || null,
    companyName: null,
    sourceId: lead.sourceDetail || lead.source || null,
    sourceLabel: lead.source ? formatLeadSourceLabel(lead.source) : null,
    campaignId: lead.facebookCampaignId || lead.googleCampaignId || null,
    campaignLabel: lead.utmCampaign || null,
    stageId: lead.crmStatus,
    stageLabel: crmLabelize(lead.crmStatus),
    status: mapLegacyStatus(lead),
    priority: mapLegacyPriority(lead.priority),
    assignedUserId: lead.assignedTo || null,
    assignedUserName: lead.assignedTo || null,
    teamId: null,
    teamName: null,
    branchId: null,
    branchName: null,
    departmentId: null,
    departmentName: null,
    estimatedValue: Number.isFinite(numericEstimatedValue ?? NaN) ? numericEstimatedValue : null,
    expectedValue: null,
    wonValue: null,
    closeProbability: null,
    expectedCloseDate: null,
    wonAt: lead.crmStatus === "converted" ? lead.completedAt : null,
    lostAt: lead.crmStatus === "lost" ? lead.updatedAt : null,
    lostReason: null,
    nextFollowUpAt: null,
    lastActivityAt: lead.lastActivityAt,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
    archivedAt: lead.deletedAt,
    categoryLabel: lead.primaryGoal ? crmLabelize(lead.primaryGoal) : null,
    fitSignal: lead.readinessLevel || lead.answers.assessmentReadiness || null,
    fitSignalLabel: lead.readinessLevel ? formatLeadQualificationLabel(lead.readinessLevel) : null,
    interestLabel: formatLeadInterestLabel(lead),
  };
}

export function mapLegacyLeadTaskToDomainTask(task: LeadRecord["id"] extends string ? {
  id: string;
  leadId: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  completedAt: string | null;
  assignedTo: string | null;
  createdAt: string;
} : never): LeadTask {
  const status = task.completedAt
    ? "completed"
    : task.dueAt && new Date(task.dueAt).getTime() < Date.now()
      ? "overdue"
      : "open";

  return {
    id: task.id,
    leadId: task.leadId,
    title: task.title,
    description: task.description,
    status,
    priority: "normal",
    assignedUserId: task.assignedTo || null,
    dueAt: task.dueAt,
    completedAt: task.completedAt,
    createdAt: task.createdAt,
    updatedAt: task.completedAt ?? task.createdAt,
  };
}

export function mapLegacyLeadNoteToDomainNote(note: {
  id: string;
  leadId: string;
  note: string;
  createdBy: string | null;
  createdAt: string;
}): LeadNote {
  return {
    id: note.id,
    leadId: note.leadId,
    authorId: note.createdBy,
    body: note.note,
    createdAt: note.createdAt,
    updatedAt: note.createdAt,
  };
}

export function mapLegacyLeadEventToDomainActivity(event: {
  id: string;
  leadId: string;
  eventType: string;
  eventData: Record<string, unknown> | null;
  createdBy: string | null;
  createdAt: string;
}): LeadActivityEvent {
  const typeMap: Record<string, LeadActivityEvent["type"]> = {
    lead_created: "lead_created",
    lead_assigned: "lead_assigned",
    status_changed: "stage_changed",
    note_added: "note_added",
    task_created: "task_created",
    task_completed: "task_completed",
    website_lead_received: "intake_received",
    facebook_lead_received: "intake_received",
    google_ads_lead_received: "intake_received",
    tiktok_lead_received: "intake_received",
    linkedin_lead_received: "intake_received",
    google_sheet_exported: "export_completed",
    google_sheet_imported: "import_completed",
  };

  return {
    id: event.id,
    leadId: event.leadId,
    actorId: event.createdBy,
    type: typeMap[event.eventType] ?? "stage_changed",
    message: crmLabelize(event.eventType),
    metadata: event.eventData,
    createdAt: event.createdAt,
  };
}

export function mapLegacyLeadRecordToLeadDetailRecord(
  lead: LeadRecord,
  input?: {
    tasks?: Array<Parameters<typeof mapLegacyLeadTaskToDomainTask>[0]>;
    notes?: Array<Parameters<typeof mapLegacyLeadNoteToDomainNote>[0]>;
    activity?: Array<Parameters<typeof mapLegacyLeadEventToDomainActivity>[0]>;
  },
): LeadDetailRecord {
  const core = mapLegacyLeadRecordToLeadCoreRecord(lead);

  return {
    ...core,
    customFieldValues: [],
    notes: (input?.notes ?? []).map(mapLegacyLeadNoteToDomainNote),
    tasks: (input?.tasks ?? []).map(mapLegacyLeadTaskToDomainTask),
    activity: (input?.activity ?? []).map(mapLegacyLeadEventToDomainActivity),
    intakeSourceSummary: {
      formSourceId: null,
      formSourceName: null,
      sourceType: lead.source,
      sourceId: lead.sourceDetail || lead.source || null,
      campaignId: lead.facebookCampaignId || lead.googleCampaignId || null,
      campaignLabel: lead.utmCampaign || null,
    },
    intakeSummary: {
      keyFacts: [
        { label: "Category", value: core.categoryLabel ?? "Not set" },
        { label: "Fit signal", value: core.fitSignalLabel ?? "Not set" },
        { label: "Interest", value: core.interestLabel ?? "Not set" },
      ],
      intakeAnswers: Object.entries(lead.answers)
        .filter(([, value]) => value !== null && value !== "")
        .slice(0, 8)
        .map(([label, value]) => ({
          label: crmLabelize(label),
          value: typeof value === "boolean" ? (value ? "Yes" : "No") : String(value),
        })),
      legacyProgress: buildLegacyProgressSummary(lead),
      reportSummary: buildReportSummary(lead),
    },
  };
}
