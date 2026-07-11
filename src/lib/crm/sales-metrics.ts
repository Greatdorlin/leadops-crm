import { buildTeamPerformance } from "@/lib/admin-insights";
import { crmLabelize, formatLeadSourceLabel } from "@/lib/crm/formatters";
import { calculateExpectedValue, getLeadFollowUpStatus, isLeadClosed } from "@/lib/crm/sales-command";
import type {
  CrmUserRecord,
  LeadRecord,
  LeadTaskRecord,
} from "@/lib/crm/types";
import type { AdminSalesTargetRecord } from "@/lib/crm/sales-targets-admin";
import type { IntakeEventAdminRow } from "@/lib/crm/intake-runtime";

export interface SourcePerformanceSummaryRow {
  label: string;
  totalLeads: number;
  wonLeads: number;
  wonValue: number;
  pipelineValue: number;
  conversionRate: number;
}

export interface StagePerformanceSummaryRow {
  label: string;
  totalLeads: number;
  wonValue: number;
  pipelineValue: number;
}

export interface RepPerformanceSummaryRow {
  id: string;
  label: string;
  assignedLeads: number;
  overdueFollowUps: number;
  wonLeads: number;
  wonValue: number;
  pipelineValue: number;
  conversionRate: number;
}

export interface IntakeStatusSummary {
  received: number;
  mapped: number;
  leadCreated: number;
  failed: number;
  ignored: number;
}

export interface SalesDashboardSummary {
  totalLeads: number;
  newLeads: number;
  leadsThisMonth: number;
  overdueFollowUps: number;
  dueTodayFollowUps: number;
  stuckLeads: number;
  wonLeads: number;
  lostLeads: number;
  pipelineValue: number;
  wonValue: number;
  conversionRate: number;
  topSources: SourcePerformanceSummaryRow[];
  stagePerformance: StagePerformanceSummaryRow[];
  repPerformance: RepPerformanceSummaryRow[];
  intakeSummary: IntakeStatusSummary;
  recentIntake: IntakeEventAdminRow[];
  target:
    | {
        id: string;
        name: string;
        targetValue: number;
        wonValue: number;
        remainingValue: number;
        progressPercent: number;
        periodLabel: string;
        currency: string;
      }
    | null;
}

export type SalesPipelineAggregate = Omit<
  SalesDashboardSummary,
  "intakeSummary" | "recentIntake" | "target"
>;

function roundMoney(value: number) {
  return Number.parseFloat(value.toFixed(2));
}

function isWonLead(lead: LeadRecord) {
  return Boolean(lead.crmStatus === "converted" || lead.wonAt);
}

function isLostLead(lead: LeadRecord) {
  return Boolean(lead.crmStatus === "lost" || lead.lostAt);
}

function getLeadWonValue(lead: LeadRecord) {
  const value = lead.wonValue ?? lead.expectedValue ?? lead.estimatedValue ?? 0;
  return Number.isFinite(value) ? value : 0;
}

function getLeadPipelineValue(lead: LeadRecord) {
  if (isWonLead(lead) || isLostLead(lead)) {
    return 0;
  }

  const value =
    lead.expectedValue ??
    calculateExpectedValue(lead.estimatedValue ?? null, lead.closeProbability ?? null) ??
    lead.estimatedValue ??
    0;

  return Number.isFinite(value) ? value : 0;
}

function getMonthStart(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function normalizeEmail(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function formatTargetPeriodLabel(target: AdminSalesTargetRecord) {
  return `${crmLabelize(target.period)} target`;
}

export function buildIntakeStatusSummary(events: IntakeEventAdminRow[]): IntakeStatusSummary {
  return events.reduce<IntakeStatusSummary>(
    (summary, event) => {
      if (event.status === "received") {
        summary.received += 1;
      } else if (event.status === "mapped") {
        summary.mapped += 1;
      } else if (event.status === "lead_created") {
        summary.leadCreated += 1;
      } else if (event.status === "failed") {
        summary.failed += 1;
      } else if (event.status === "ignored") {
        summary.ignored += 1;
      }

      return summary;
    },
    { received: 0, mapped: 0, leadCreated: 0, failed: 0, ignored: 0 },
  );
}

export function mergeSalesDashboardSummary(
  aggregate: SalesPipelineAggregate,
  input: {
    intakeEvents?: IntakeEventAdminRow[];
    activeTarget?: AdminSalesTargetRecord | null;
  } = {},
): SalesDashboardSummary {
  const intakeEvents = input.intakeEvents ?? [];
  const activeTarget = input.activeTarget ?? null;

  return {
    ...aggregate,
    intakeSummary: buildIntakeStatusSummary(intakeEvents),
    recentIntake: intakeEvents.slice(0, 8),
    target: activeTarget
      ? {
          id: activeTarget.id,
          name: activeTarget.name,
          targetValue: activeTarget.targetValue,
          wonValue: aggregate.wonValue,
          remainingValue: roundMoney(Math.max(0, activeTarget.targetValue - aggregate.wonValue)),
          progressPercent:
            activeTarget.targetValue > 0
              ? Number.parseFloat(((aggregate.wonValue / activeTarget.targetValue) * 100).toFixed(1))
              : 0,
          periodLabel: formatTargetPeriodLabel(activeTarget),
          currency: activeTarget.currency,
        }
      : null,
  };
}

export function buildSourcePerformanceSummary(leads: LeadRecord[]) {
  const grouped = new Map<string, SourcePerformanceSummaryRow>();

  for (const lead of leads) {
    const label = formatLeadSourceLabel(lead.source);
    const current =
      grouped.get(label) ??
      {
        label,
        totalLeads: 0,
        wonLeads: 0,
        wonValue: 0,
        pipelineValue: 0,
        conversionRate: 0,
      };

    current.totalLeads += 1;
    if (isWonLead(lead)) {
      current.wonLeads += 1;
      current.wonValue += getLeadWonValue(lead);
    }
    current.pipelineValue += getLeadPipelineValue(lead);
    grouped.set(label, current);
  }

  return [...grouped.values()]
    .map((row) => ({
      ...row,
      wonValue: roundMoney(row.wonValue),
      pipelineValue: roundMoney(row.pipelineValue),
      conversionRate:
        row.totalLeads > 0
          ? Number.parseFloat(((row.wonLeads / row.totalLeads) * 100).toFixed(1))
          : 0,
    }))
    .sort((left, right) => right.totalLeads - left.totalLeads);
}

export function buildStagePerformanceSummary(leads: LeadRecord[]) {
  const grouped = new Map<string, StagePerformanceSummaryRow>();

  for (const lead of leads) {
    const label = crmLabelize(lead.crmStatus);
    const current =
      grouped.get(label) ??
      {
        label,
        totalLeads: 0,
        wonValue: 0,
        pipelineValue: 0,
      };

    current.totalLeads += 1;
    if (isWonLead(lead)) {
      current.wonValue += getLeadWonValue(lead);
    }
    current.pipelineValue += getLeadPipelineValue(lead);
    grouped.set(label, current);
  }

  return [...grouped.values()]
    .map((row) => ({
      ...row,
      wonValue: roundMoney(row.wonValue),
      pipelineValue: roundMoney(row.pipelineValue),
    }))
    .sort((left, right) => right.totalLeads - left.totalLeads);
}

export function buildRepPerformanceSummary(
  users: CrmUserRecord[],
  leads: LeadRecord[],
  tasks: LeadTaskRecord[],
) {
  const teamRows = buildTeamPerformance(users, leads, tasks);

  return teamRows.map<RepPerformanceSummaryRow>((row) => {
    const ownedLeads = leads.filter(
      (lead) => normalizeEmail(lead.assignedTo) === normalizeEmail(row.email),
    );
    const wonLeads = ownedLeads.filter(isWonLead);
    const wonValue = wonLeads.reduce((sum, lead) => sum + getLeadWonValue(lead), 0);
    const pipelineValue = ownedLeads.reduce((sum, lead) => sum + getLeadPipelineValue(lead), 0);

    return {
      id: row.id,
      label: row.fullName || row.email,
      assignedLeads: row.assignedLeads,
      overdueFollowUps: ownedLeads.filter(
        (lead) => getLeadFollowUpStatus(lead) === "overdue",
      ).length,
      wonLeads: wonLeads.length,
      wonValue: roundMoney(wonValue),
      pipelineValue: roundMoney(pipelineValue),
      conversionRate:
        row.assignedLeads > 0
          ? Number.parseFloat(((wonLeads.length / row.assignedLeads) * 100).toFixed(1))
          : 0,
    };
  });
}

export function buildSalesDashboardSummary(input: {
  leads: LeadRecord[];
  tasks: LeadTaskRecord[];
  users: CrmUserRecord[];
  intakeEvents?: IntakeEventAdminRow[];
  activeTarget?: AdminSalesTargetRecord | null;
  now?: Date;
}) : SalesDashboardSummary {
  const now = input.now ?? new Date();
  const monthStart = getMonthStart(now);
  const openLeads = input.leads.filter((lead) => !isLeadClosed(lead));
  const wonLeads = input.leads.filter(isWonLead);
  const lostLeads = input.leads.filter(isLostLead);
  const overdueFollowUps = openLeads.filter((lead) => getLeadFollowUpStatus(lead, now) === "overdue");
  const dueTodayFollowUps = openLeads.filter((lead) => getLeadFollowUpStatus(lead, now) === "due_today");
  const stuckLeads = openLeads.filter((lead) => {
    const lastActivityTime = new Date(lead.lastActivityAt).getTime();
    const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    return Number.isFinite(lastActivityTime) && lastActivityTime < sevenDaysAgo;
  });
  const pipelineValue = roundMoney(openLeads.reduce((sum, lead) => sum + getLeadPipelineValue(lead), 0));
  const wonValue = roundMoney(wonLeads.reduce((sum, lead) => sum + getLeadWonValue(lead), 0));
  const conversionRate =
    input.leads.length > 0
      ? Number.parseFloat(((wonLeads.length / input.leads.length) * 100).toFixed(1))
      : 0;
  const intakeEvents = input.intakeEvents ?? [];

  const aggregate: SalesPipelineAggregate = {
    totalLeads: input.leads.length,
    newLeads: input.leads.filter((lead) => lead.crmStatus === "new").length,
    leadsThisMonth: input.leads.filter((lead) => new Date(lead.createdAt) >= monthStart).length,
    overdueFollowUps: overdueFollowUps.length,
    dueTodayFollowUps: dueTodayFollowUps.length,
    stuckLeads: stuckLeads.length,
    wonLeads: wonLeads.length,
    lostLeads: lostLeads.length,
    pipelineValue,
    wonValue,
    conversionRate,
    topSources: buildSourcePerformanceSummary(input.leads).slice(0, 5),
    stagePerformance: buildStagePerformanceSummary(input.leads).slice(0, 6),
    repPerformance: buildRepPerformanceSummary(input.users, input.leads, input.tasks).slice(0, 6),
  };

  return mergeSalesDashboardSummary(aggregate, {
    activeTarget: input.activeTarget,
    intakeEvents,
  });
}
