export const LEAD_STAGE_TYPES = [
  "new",
  "contacted",
  "follow_up",
  "qualified",
  "proposal",
  "won",
  "lost",
  "archived",
] as const;

export const LEAD_PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export const LEAD_STATUSES = [
  "active",
  "stalled",
  "won",
  "lost",
  "archived",
] as const;

export const DEFAULT_LEAD_STAGES = [
  { id: "new", label: "New Lead", type: "new", color: "#2563eb" },
  { id: "contacted", label: "Contacted", type: "contacted", color: "#0f766e" },
  { id: "follow_up", label: "Follow-up", type: "follow_up", color: "#d97706" },
  { id: "qualified", label: "Qualified", type: "qualified", color: "#7c3aed" },
  { id: "proposal", label: "Proposal", type: "proposal", color: "#4f46e5" },
  { id: "won", label: "Won", type: "won", color: "#15803d" },
  { id: "lost", label: "Lost", type: "lost", color: "#dc2626" },
  { id: "archived", label: "Archived", type: "archived", color: "#64748b" },
] as const;

export type LeadStageType = (typeof LEAD_STAGE_TYPES)[number];
export type LeadPriority = (typeof LEAD_PRIORITIES)[number];
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export interface IntakeSourceSummary {
  formSourceId: string | null;
  formSourceName: string | null;
  sourceType: string | null;
  sourceId: string | null;
  campaignId: string | null;
  campaignLabel: string | null;
}

export interface LegacyProgressSummary {
  stepKey: string | null;
  stepIndex: number | null;
  progressPercent: number | null;
}

export interface LeadCoreRecord {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  sourceId: string | null;
  sourceLabel: string | null;
  campaignId: string | null;
  campaignLabel: string | null;
  stageId: string | null;
  stageLabel: string | null;
  status: LeadStatus;
  priority: LeadPriority;
  assignedUserId: string | null;
  assignedUserName: string | null;
  teamId: string | null;
  teamName: string | null;
  branchId: string | null;
  branchName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  estimatedValue: number | null;
  expectedValue: number | null;
  wonValue: number | null;
  closeProbability: number | null;
  expectedCloseDate: string | null;
  wonAt: string | null;
  lostAt: string | null;
  lostReason: string | null;
  nextFollowUpAt: string | null;
  lastActivityAt: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  categoryLabel: string | null;
  fitSignal: string | null;
  fitSignalLabel: string | null;
  interestLabel: string | null;
}

export interface LeadDetailRecord extends LeadCoreRecord {
  customFieldValues: Array<{
    customFieldId: string;
    key: string;
    label: string;
    value: unknown;
    displayValue: string | null;
  }>;
  notes: Array<{
    id: string;
    authorId: string | null;
    body: string;
    createdAt: string;
    updatedAt: string | null;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: LeadPriority;
    assignedUserId: string | null;
    dueAt: string | null;
    completedAt: string | null;
    createdAt: string;
    updatedAt: string | null;
  }>;
  activity: Array<{
    id: string;
    actorId: string | null;
    type: string;
    message: string;
    metadata: Record<string, unknown> | null;
    createdAt: string;
  }>;
  intakeSourceSummary: IntakeSourceSummary | null;
  intakeSummary: {
    keyFacts: Array<{ label: string; value: string }>;
    intakeAnswers: Array<{ label: string; value: string }>;
    legacyProgress: LegacyProgressSummary | null;
    reportSummary: {
      reportToken: string | null;
      summaryDiagnosis: string | null;
      recommendedAction: string | null;
    } | null;
  } | null;
}

export interface LeadCreateContract {
  name: string;
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
  sourceId?: string | null;
  sourceLabel?: string | null;
  campaignId?: string | null;
  campaignLabel?: string | null;
  stageId?: string | null;
  stageLabel?: string | null;
  status?: LeadStatus;
  priority?: LeadPriority;
  assignedUserId?: string | null;
  teamId?: string | null;
  branchId?: string | null;
  departmentId?: string | null;
  estimatedValue?: number | null;
  expectedValue?: number | null;
  closeProbability?: number | null;
  expectedCloseDate?: string | null;
  nextFollowUpAt?: string | null;
  notes?: string | null;
}

export interface LeadUpdateContract extends Partial<LeadCreateContract> {
  wonValue?: number | null;
  wonAt?: string | null;
  lostAt?: string | null;
  lostReason?: string | null;
  archivedAt?: string | null;
}
