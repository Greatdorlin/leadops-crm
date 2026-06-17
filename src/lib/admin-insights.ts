import {
  resolveAdminAccessLevel,
  type AdminAccessLevel,
} from "@/lib/admin-permissions";
import type {
  CrmUserRecord,
  CrmUserRole,
  LeadRecord,
  LeadTaskRecord,
} from "@/lib/pathway-engine/types";

export interface TeamPerformanceRow {
  id: string;
  email: string;
  fullName: string;
  role: CrmUserRole;
  accessLevel: AdminAccessLevel;
  assignedLeads: number;
  openTasks: number;
  overdueTasks: number;
  dueTodayTasks: number;
  completedTasks: number;
  contactedLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  highPriorityLeads: number;
  lastActivityAt: string | null;
}

const QUALIFIED_STATUSES = new Set<string>([
  "qualified",
  "consultation_booked",
  "application_started",
  "documents_pending",
  "payment_pending",
  "converted",
] as const);

function normalizeOwnerEmail(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function toTime(value?: string | null) {
  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function isTaskOverdue(task: LeadTaskRecord, now = Date.now()) {
  return Boolean(task.dueAt && !task.completedAt && toTime(task.dueAt) < now);
}

export function isDateToday(value?: string | null, now = new Date()) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function isTaskDueToday(task: LeadTaskRecord, now = new Date()) {
  return Boolean(task.dueAt && !task.completedAt && isDateToday(task.dueAt, now));
}

export function buildNextFollowUpByLeadId(tasks: LeadTaskRecord[]) {
  return tasks.reduce<Record<string, string | null>>((accumulator, task) => {
    if (!task.dueAt || task.completedAt) {
      return accumulator;
    }

    const current = accumulator[task.leadId];
    if (!current || toTime(task.dueAt) < toTime(current)) {
      accumulator[task.leadId] = task.dueAt;
    }

    return accumulator;
  }, {});
}

export function buildTeamPerformance(
  users: CrmUserRecord[],
  leads: LeadRecord[],
  tasks: LeadTaskRecord[],
) {
  const userMap = new Map(
    users.map((user) => [normalizeOwnerEmail(user.email), user] as const),
  );
  const fallbackUsers: CrmUserRecord[] = [...new Set([
    ...leads.map((lead) => normalizeOwnerEmail(lead.assignedTo)),
    ...tasks.map((task) => normalizeOwnerEmail(task.assignedTo)),
  ])]
    .filter(Boolean)
    .filter((email) => !userMap.has(email))
    .map((email) => ({
      id: email,
      email,
      fullName: email,
      role: "sales_agent",
      isActive: true,
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    }));

  return [...users, ...fallbackUsers]
    .filter((user) => user.isActive && user.role !== "finance" && user.role !== "ad_manager")
    .map<TeamPerformanceRow>((user) => {
      const email = normalizeOwnerEmail(user.email);
      const assignedLeads = leads.filter((lead) => normalizeOwnerEmail(lead.assignedTo) === email);
      const assignedTasks = tasks.filter((task) => normalizeOwnerEmail(task.assignedTo) === email);
      const openTasks = assignedTasks.filter((task) => !task.completedAt);
      const latestLeadActivity = Math.max(...assignedLeads.map((lead) => toTime(lead.lastActivityAt)), 0);
      const latestTaskActivity = Math.max(
        ...assignedTasks.map((task) => Math.max(toTime(task.completedAt), toTime(task.createdAt), toTime(task.dueAt))),
        0,
      );
      const lastActivityAt = Math.max(latestLeadActivity, latestTaskActivity);

      return {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        accessLevel: resolveAdminAccessLevel({ email: user.email, role: user.role }),
        assignedLeads: assignedLeads.length,
        openTasks: openTasks.length,
        overdueTasks: openTasks.filter((task) => isTaskOverdue(task)).length,
        dueTodayTasks: openTasks.filter((task) => isTaskDueToday(task)).length,
        completedTasks: assignedTasks.filter((task) => Boolean(task.completedAt)).length,
        contactedLeads: assignedLeads.filter((lead) => lead.crmStatus !== "new").length,
        qualifiedLeads: assignedLeads.filter((lead) => QUALIFIED_STATUSES.has(lead.crmStatus)).length,
        convertedLeads: assignedLeads.filter((lead) => lead.crmStatus === "converted").length,
        highPriorityLeads: assignedLeads.filter(
          (lead) => lead.priority === "high" || lead.priority === "urgent",
        ).length,
        lastActivityAt: lastActivityAt > 0 ? new Date(lastActivityAt).toISOString() : null,
      };
    })
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
