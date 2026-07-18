import { calculateExpectedValue, getLeadFollowUpStatus, isLeadClosed } from "@/lib/crm/sales-command";
import type { LeadRecord, LeadTaskRecord } from "@/lib/crm/types";

export interface AffiliateLeadPreview {
  id: string;
  name: string;
  companyName: string | null;
  leadCustomerType: "direct" | "business";
  source: LeadRecord["source"];
  stage: LeadRecord["crmStatus"];
  priority: LeadRecord["priority"];
  value: number;
  nextFollowUpAt: string | null;
  createdAt: string;
}

export interface AffiliateDashboardSummary {
  affiliateEmail: string;
  totalLeads: number;
  directLeads: number;
  businessLeads: number;
  activeLeads: number;
  wonLeads: number;
  overdueFollowUps: number;
  dueTodayFollowUps: number;
  openTasks: number;
  pipelineValue: number;
  wonValue: number;
  earningsValue: number;
  commissionRatePercent: number;
  commissionConfigured: boolean;
  recentLeads: AffiliateLeadPreview[];
  tasksDueSoon: LeadTaskRecord[];
}

function normalizeEmail(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function getLeadName(lead: Pick<LeadRecord, "firstName" | "lastName" | "email">) {
  const name = [lead.firstName, lead.lastName].filter(Boolean).join(" ").trim();
  return name || lead.email || "Unnamed lead";
}

function getLeadValue(lead: LeadRecord) {
  const value =
    lead.wonValue ??
    lead.expectedValue ??
    calculateExpectedValue(lead.estimatedValue ?? null, lead.closeProbability ?? null) ??
    lead.estimatedValue ??
    0;

  return Number.isFinite(value) ? value : 0;
}

function isWonLead(lead: LeadRecord) {
  return Boolean(lead.crmStatus === "converted" || lead.wonAt);
}

function isLostLead(lead: LeadRecord) {
  return Boolean(lead.crmStatus === "lost" || lead.lostAt);
}

export function buildAffiliateDashboardSummary(input: {
  leads: LeadRecord[];
  tasks: LeadTaskRecord[];
  affiliateUserId?: string | null;
  affiliateEmail?: string | null;
  commissionRatePercent?: number;
  now?: Date;
}): AffiliateDashboardSummary {
  const affiliateEmail = normalizeEmail(input.affiliateEmail);
  const affiliateUserId = input.affiliateUserId?.trim() ?? "";
  const now = input.now ?? new Date();
  const commissionRatePercent = Math.max(0, input.commissionRatePercent ?? 0);
  const affiliateLeads = input.leads.filter(
    (lead) => Boolean(affiliateUserId) && lead.affiliateReferrerId === affiliateUserId,
  );
  const affiliateLeadIds = new Set(affiliateLeads.map((lead) => lead.id));
  const activeLeads = affiliateLeads.filter((lead) => !isLeadClosed(lead));
  const wonLeads = affiliateLeads.filter(isWonLead);
  const openTasks = input.tasks.filter((task) => {
    if (task.completedAt) {
      return false;
    }

    return affiliateLeadIds.has(task.leadId);
  });
  const wonValue = wonLeads.reduce((sum, lead) => sum + getLeadValue(lead), 0);
  const pipelineValue = activeLeads
    .filter((lead) => !isLostLead(lead))
    .reduce((sum, lead) => sum + getLeadValue(lead), 0);

  return {
    affiliateEmail,
    totalLeads: affiliateLeads.length,
    directLeads: affiliateLeads.filter((lead) => (lead.leadCustomerType ?? "direct") === "direct").length,
    businessLeads: affiliateLeads.filter((lead) => lead.leadCustomerType === "business").length,
    activeLeads: activeLeads.length,
    wonLeads: wonLeads.length,
    overdueFollowUps: activeLeads.filter((lead) => getLeadFollowUpStatus(lead, now) === "overdue").length,
    dueTodayFollowUps: activeLeads.filter((lead) => getLeadFollowUpStatus(lead, now) === "due_today").length,
    openTasks: openTasks.length,
    pipelineValue,
    wonValue,
    earningsValue: Number.parseFloat(((wonValue * commissionRatePercent) / 100).toFixed(2)),
    commissionRatePercent,
    commissionConfigured: commissionRatePercent > 0,
    recentLeads: [...affiliateLeads]
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 6)
      .map((lead) => ({
        id: lead.id,
        name: getLeadName(lead),
        companyName: lead.companyName ?? null,
        leadCustomerType: lead.leadCustomerType ?? "direct",
        source: lead.source,
        stage: lead.crmStatus,
        priority: lead.priority,
        value: getLeadValue(lead),
        nextFollowUpAt: lead.nextFollowUpAt ?? null,
        createdAt: lead.createdAt,
      })),
    tasksDueSoon: [...openTasks]
      .sort((left, right) => {
        if (!left.dueAt && !right.dueAt) {
          return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
        }

        if (!left.dueAt) {
          return 1;
        }

        if (!right.dueAt) {
          return -1;
        }

        return new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime();
      })
      .slice(0, 5),
  };
}
