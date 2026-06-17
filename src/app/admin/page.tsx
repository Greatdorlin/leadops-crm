import {
  AlarmClockCheck,
  CircleAlert,
  Inbox,
  PlugZap,
  UserPlus,
  Users2,
} from "lucide-react";
import Link from "next/link";
import { AdminCollapsibleSection } from "@/components/admin/AdminCollapsibleSection";
import { AdminDashboardWidgetDeck } from "@/components/admin/AdminDashboardWidgetDeck";
import { AdminLeadExportButton } from "@/components/admin/AdminLeadExportButton";
import { AdminWorkspaceComposer } from "@/components/admin/AdminWorkspaceComposer";
import { AdminShell } from "@/components/admin/AdminShell";
import { ErrorState } from "@/components/admin/ErrorState";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { EmptyState } from "@/components/admin/EmptyState";
import { FilterBar } from "@/components/admin/FilterBar";
import { IntegrationHealthCard } from "@/components/admin/IntegrationHealthCard";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { MetricCard } from "@/components/admin/MetricCard";
import { PriorityBadge } from "@/components/admin/PriorityBadge";
import { SearchInput } from "@/components/admin/SearchInput";
import { SourceBadge } from "@/components/admin/SourceBadge";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { TaskQueueTable } from "@/components/admin/TaskQueueTable";
import { TimelineItem } from "@/components/admin/TimelineItem";
import { getAdminAccessContext } from "@/lib/admin";
import { canExportLeadData } from "@/lib/admin-access";
import {
  buildNextFollowUpByLeadId,
  buildTeamPerformance,
  isDateToday,
  isTaskOverdue,
} from "@/lib/admin-insights";
import { parseLeadListFilters } from "@/lib/admin-leads";
import {
  canManageIntegrationsAccess,
  canViewSalesTeam,
  scopeLeadListFilters,
  type AdminAccessLevel,
} from "@/lib/admin-permissions";
import { buildLeadDisplayNameMap } from "@/lib/crm/lead-identity";
import {
  crmLabelize,
  formatCrmDate,
  formatCrmDateTime,
  formatLeadEventLabel,
  formatLeadStateLabel,
  formatLeadSourceLabel,
} from "@/lib/crm/formatters";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";
import type { LeadRecord } from "@/lib/pathway-engine/types";
import { leadStore } from "@/lib/storage";

export const dynamic = "force-dynamic";

const crmOptions = [
  "all",
  "new",
  "contacted",
  "qualified",
  "consultation_booked",
  "application_started",
  "documents_pending",
  "payment_pending",
  "converted",
  "lost",
  "unresponsive",
  "unqualified",
  "closed",
] as const;

const sourceOptions = [
  "all",
  "pathway_finder",
  "website_form",
  "facebook_lead_ads",
  "google_ads",
  "tiktok_lead_ads",
  "linkedin_lead_gen_forms",
  "google_sheets",
  "whatsapp_inquiry",
  "manual_entry",
  "agent",
  "referral",
] as const;

const priorityOptions = ["all", "low", "medium", "high", "urgent"] as const;

function eventTone(eventType: string) {
  if (eventType.includes("failed") || eventType.includes("lost")) {
    return "danger" as const;
  }

  if (eventType.includes("qualified") || eventType.includes("converted")) {
    return "success" as const;
  }

  if (eventType.includes("task") || eventType.includes("note")) {
    return "accent" as const;
  }

  if (eventType.includes("status")) {
    return "warning" as const;
  }

  return "neutral" as const;
}

function safeNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

function needsLeadAttention(
  lead: LeadRecord,
  nextFollowUpAt: string | null | undefined,
  includeAssignmentSignals: boolean,
) {
  return (
    lead.crmStatus === "new" ||
    (includeAssignmentSignals && !lead.assignedTo) ||
    lead.priority === "high" ||
    lead.priority === "urgent" ||
    Boolean(nextFollowUpAt && new Date(nextFollowUpAt).getTime() <= Date.now()) ||
    isDateToday(nextFollowUpAt)
  );
}

function scoreLeadForAction(
  lead: LeadRecord,
  nextFollowUpAt: string | null | undefined,
  includeAssignmentSignals: boolean,
) {
  let score = 0;

  if (lead.crmStatus === "new") {
    score += 90;
  }

  if (includeAssignmentSignals && !lead.assignedTo) {
    score += 80;
  }

  if (lead.priority === "urgent") {
    score += 75;
  } else if (lead.priority === "high") {
    score += 60;
  }

  if (nextFollowUpAt) {
    const dueTime = new Date(nextFollowUpAt).getTime();
    if (dueTime <= Date.now()) {
      score += 95;
    } else if (isDateToday(nextFollowUpAt)) {
      score += 70;
    } else {
      score += 15;
    }
  }

  return score;
}

function scoreTaskForQueue(task: Awaited<ReturnType<typeof leadStore.listLeadTasks>>[number]) {
  if (task.completedAt) {
    return 999;
  }

  if (isTaskOverdue(task)) {
    return 0;
  }

  if (isDateToday(task.dueAt)) {
    return 1;
  }

  if (!task.dueAt) {
    return 3;
  }

  return 2;
}

function buildDashboardHref(
  overrides: Partial<Record<"crmStatus" | "priority" | "source" | "search", string>>,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(overrides)) {
    if (value) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query ? `/admin?${query}` : "/admin";
}

function getDashboardTitle(accessLevel: AdminAccessLevel) {
  if (accessLevel === "sales_rep") {
    return "My Dashboard";
  }

  if (accessLevel === "master_admin") {
    return "Dashboard";
  }

  return "Team Dashboard";
}

function getDashboardDescription(accessLevel: AdminAccessLevel) {
  if (accessLevel === "sales_rep") {
    return "Your priorities and follow-ups.";
  }

  if (accessLevel === "master_admin") {
    return "Priorities, queues, and ownership.";
  }

  return "Queues, team workload, and ownership.";
}

function getFirstNameLabel(value?: string | null) {
  if (!value) {
    return "there";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "there";
  }

  return trimmed.split(/\s+/)[0] ?? trimmed;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const {
    session,
    crmUser,
    role,
    accessLevel,
    actualAccessLevel,
    canSwitchAccessViews,
  } = await getAdminAccessContext("/admin");
  const params = await searchParams;
  const filters = parseLeadListFilters(params);
  const scopedFilters = scopeLeadListFilters(filters, accessLevel, session.user?.email);
  const showTeamViews = canViewSalesTeam(accessLevel);
  const showTechnicalSummary = canManageIntegrationsAccess(accessLevel, role);
  let pageError: unknown = null;
  let pageData:
    | {
        leads: Awaited<ReturnType<typeof leadStore.list>>;
        stats: Awaited<ReturnType<typeof leadStore.getDashboardStats>>;
        tasks: Awaited<ReturnType<typeof leadStore.listLeadTasks>>;
        users: Awaited<ReturnType<typeof leadStore.listCrmUsers>>;
        integrations: Awaited<ReturnType<typeof leadStore.listIntegrations>>;
      }
    | null = null;

  try {
    const [leads, stats, tasks, users, integrations] = await Promise.all([
      leadStore.list({
        ...scopedFilters,
        limit: 120,
      }),
      leadStore.getDashboardStats(scopedFilters),
      leadStore.listLeadTasks({
        assignedTo: accessLevel === "sales_rep" ? session.user?.email ?? undefined : undefined,
      }),
      showTeamViews ? leadStore.listCrmUsers() : Promise.resolve([]),
      showTechnicalSummary ? leadStore.listIntegrations() : Promise.resolve([]),
    ]);

    pageData = {
      leads,
      stats,
      tasks,
      users,
      integrations,
    };
  } catch (error) {
    pageError = error;
    logCrmPageError("dashboard", error);
  }

  const shellActions = (
    <>
      <div className="hidden rounded-full border border-white/70 bg-white/76 px-4 py-2 text-sm text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] md:block">
        {session.user?.email}
      </div>
      {canExportLeadData(session.user?.email) ? <AdminLeadExportButton /> : null}
      <AdminSignOutButton />
    </>
  );

  if (!pageData) {
    const errorCopy = getCrmPageErrorCopy(pageError);

    return (
      <AdminShell
        activeNav="dashboard"
        accessLevel={accessLevel}
        role={role}
        actualAccessLevel={actualAccessLevel}
        canSwitchAccessViews={canSwitchAccessViews}
        title={getDashboardTitle(accessLevel)}
        description={getDashboardDescription(accessLevel)}
        actions={shellActions}
      >
        <ErrorState
          title={errorCopy.title}
          description={errorCopy.description}
          details={errorCopy.details}
        />
      </AdminShell>
    );
  }

  const { leads, stats, tasks, users, integrations } = pageData;
  const openTasks = tasks.filter((task) => !task.completedAt);
  const nextFollowUpByLeadId = buildNextFollowUpByLeadId(tasks);
  const includeAssignmentSignals = accessLevel !== "sales_rep";
  const actionLeads = leads
    .filter((lead) => needsLeadAttention(lead, nextFollowUpByLeadId[lead.id], includeAssignmentSignals))
    .sort((left, right) => {
      const leftScore = scoreLeadForAction(left, nextFollowUpByLeadId[left.id], includeAssignmentSignals);
      const rightScore = scoreLeadForAction(right, nextFollowUpByLeadId[right.id], includeAssignmentSignals);

      if (leftScore !== rightScore) {
        return rightScore - leftScore;
      }

      return new Date(right.lastActivityAt).getTime() - new Date(left.lastActivityAt).getTime();
    })
    .slice(0, 10);
  const teamRows = buildTeamPerformance(users, leads, tasks);
  const repsWithOverdueWork = teamRows.filter((row) => row.overdueTasks > 0);
  const personalRow =
    teamRows.find((row) => row.email.toLowerCase() === session.user?.email?.toLowerCase()) ?? null;
  const todayFollowUps = openTasks.filter((task) => isDateToday(task.dueAt));
  const overdueTasks = openTasks.filter((task) => isTaskOverdue(task));
  const unassignedLeads = leads.filter((lead) => !lead.assignedTo);
  const leadNameById = buildLeadDisplayNameMap(leads);
  const focusedTasks = openTasks
    .sort((left, right) => {
      const priorityDifference = scoreTaskForQueue(left) - scoreTaskForQueue(right);
      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      const leftTime = left.dueAt ? new Date(left.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      const rightTime = right.dueAt ? new Date(right.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      return leftTime - rightTime;
    })
    .slice(0, 8);
  const leadStateById = Object.fromEntries(
    leads.map((lead) => [lead.id, lead.state]),
  );
  const activityFeed = (
    await Promise.all(
      leads.slice(0, 8).map(async (lead) => {
        const events = await leadStore.listLeadEvents(lead.id);
        return events.slice(0, 3).map((event) => ({
          event,
          lead,
        }));
      }),
    )
  )
    .flat()
    .sort((left, right) => new Date(right.event.createdAt).getTime() - new Date(left.event.createdAt).getTime())
    .slice(0, 6);
  const hasFilters = Boolean(
    filters.search ||
      (filters.crmStatus && filters.crmStatus !== "all") ||
      (filters.source && filters.source !== "all") ||
      (filters.priority && filters.priority !== "all") ||
      filters.assignedTo,
  );
  const assigneeOptions =
    accessLevel === "sales_rep"
      ? [
          {
            label: session.user?.name || session.user?.email || "My queue",
            value: session.user?.email ?? "",
          },
        ]
      : users
          .filter((user) => user.isActive)
          .map((user) => ({
          label: user.fullName || user.email,
          value: user.email,
        }));
  const defaultAssignedTo = accessLevel === "sales_rep" ? session.user?.email ?? "" : "";
  const taskLeadOptions = leads.map((lead) => ({
    value: lead.id,
    label: `${leadNameById[lead.id] || "Lead"} • ${lead.state ? `${formatLeadStateLabel(lead.state)} • ` : ""}${lead.email || lead.whatsappNumber || "No contact yet"}`.trim(),
  }));
  const assignmentLeadOptions = [...unassignedLeads, ...actionLeads]
    .filter((lead, index, collection) => collection.findIndex((item) => item.id === lead.id) === index)
    .slice(0, 20)
    .map((lead) => ({
      value: lead.id,
      label: `${leadNameById[lead.id] || "Lead"} • ${lead.state ? `${formatLeadStateLabel(lead.state)} • ` : ""}${lead.email || lead.whatsappNumber || formatLeadSourceLabel(lead.source)}`.trim(),
      assignedTo: lead.assignedTo,
      crmStatus: lead.crmStatus,
      priority: lead.priority,
    }));
  const welcomeName = getFirstNameLabel(crmUser?.fullName || session.user?.name || session.user?.email);
  const dashboardDateLabel = formatCrmDate(new Date());
  const recentLeads = [...leads]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 5);
  const recentLeadNameById = buildLeadDisplayNameMap(recentLeads);
  const previewActionLeads = actionLeads.slice(0, 5);
  const previewActionLeadNameById = buildLeadDisplayNameMap(previewActionLeads);
  const previewUnassignedLeads = unassignedLeads.slice(0, 5);
  const previewUnassignedLeadNameById = buildLeadDisplayNameMap(previewUnassignedLeads);
  const activityLeadNameById = buildLeadDisplayNameMap(activityFeed.map(({ lead }) => lead));
  const overviewCards = [
    {
      label: accessLevel === "sales_rep" ? "Tasks today" : "Leads to review",
      value: safeNumber(accessLevel === "sales_rep" ? todayFollowUps.length : actionLeads.length),
      hint:
        accessLevel === "sales_rep"
          ? "Follow-ups scheduled for today."
          : "Leads that need a next step soon.",
      icon: AlarmClockCheck,
    },
    {
      label: "Overdue tasks",
      value: safeNumber(overdueTasks.length),
      hint:
        overdueTasks.length > 0
          ? `${safeNumber(overdueTasks.length)} ${pluralize(overdueTasks.length, "task")} need attention.`
          : "No overdue tasks right now.",
      icon: CircleAlert,
    },
    {
      label: accessLevel === "sales_rep" ? "High priority" : "Needs owner",
      value: safeNumber(accessLevel === "sales_rep" ? stats.highPriorityLeads : stats.unassignedLeads),
      hint:
        accessLevel === "sales_rep"
          ? "Best leads to handle first."
          : "Leads still waiting for an owner.",
      icon: accessLevel === "sales_rep" ? UserPlus : Inbox,
    },
    {
      label: accessLevel === "sales_rep" ? "Qualified leads" : "Active team",
      value: safeNumber(accessLevel === "sales_rep" ? personalRow?.qualifiedLeads ?? 0 : teamRows.length),
      hint:
        accessLevel === "sales_rep"
          ? "Leads already moving forward."
          : "People currently handling leads or tasks.",
      icon: Users2,
    },
  ] as const;
  const searchSlot = (
    <FilterBar>
      <form action="/admin" className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <SearchInput
              defaultValue={filters.search ?? ""}
              placeholder="Search leads, state, tasks, people, or phone number"
            />
          </div>
          <button
            type="submit"
            className="admin-button-primary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold"
          >
            Search
          </button>
          <Link
            href="/admin"
            className="admin-button-secondary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-medium"
          >
            {hasFilters ? "Reset" : "All leads"}
          </Link>
        </div>

        {accessLevel === "sales_rep" ? null : (
          <details
            open={hasFilters}
            className="rounded-[22px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,251,255,0.92)_0%,rgba(255,252,247,0.92)_100%)] px-4 py-3"
          >
            <summary className="cursor-pointer list-none text-sm font-medium text-slate-600">
              More filters {hasFilters ? "• active" : ""}
            </summary>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <AdminSelect
                name="crmStatus"
                defaultValue={filters.crmStatus ?? "all"}
                className="h-11"
              >
                {crmOptions.map((option) => (
                  <option key={option} value={option}>
                    {crmLabelize(option)}
                  </option>
                ))}
              </AdminSelect>
              <AdminSelect
                name="source"
                defaultValue={filters.source ?? "all"}
                className="h-11"
              >
                {sourceOptions.map((option) => (
                  <option key={option} value={option}>
                    {crmLabelize(option)}
                  </option>
                ))}
              </AdminSelect>
              <AdminSelect
                name="priority"
                defaultValue={filters.priority ?? "all"}
                className="h-11"
              >
                {priorityOptions.map((option) => (
                  <option key={option} value={option}>
                    {crmLabelize(option)}
                  </option>
                ))}
              </AdminSelect>
            </div>
          </details>
        )}
      </form>
    </FilterBar>
  );

  return (
    <AdminShell
      activeNav="dashboard"
      accessLevel={accessLevel}
      role={role}
      actualAccessLevel={actualAccessLevel}
      canSwitchAccessViews={canSwitchAccessViews}
      title={getDashboardTitle(accessLevel)}
      description={getDashboardDescription(accessLevel)}
      searchSlot={searchSlot}
      actions={shellActions}
      sidebarFooter={
        <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fc-yellow)]/84">
            {accessLevel === "sales_rep" ? "My focus" : "Today's focus"}
          </p>
          <p className="mt-2 text-sm leading-6 text-white/66">
            {accessLevel === "sales_rep"
              ? "Overdue first. Newest leads next."
              : "Overdue first. Assign fast. Keep the queue moving."}
          </p>
        </div>
      }
    >
      <div className="space-y-6">
        <section className="admin-surface rounded-[32px] p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0b123f]/54">
                {dashboardDateLabel}
              </p>
              <h2 className="mt-2 font-[family:var(--font-heading)] text-[2.5rem] leading-none tracking-[-0.05em] text-slate-950 sm:text-[3rem]">
                Good morning, {welcomeName}.
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Here&apos;s what needs attention today.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/leads"
                className="admin-button-secondary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-medium"
              >
                Open leads
              </Link>
              <Link
                href="#action-center"
                className="admin-button-primary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold"
              >
                {accessLevel === "sales_rep" ? "Create task" : "Create task"}
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
            {overviewCards.map((card) => {
              const Icon = card.icon;

              return (
                <article
                  key={card.label}
                  className="rounded-[28px] bg-[linear-gradient(135deg,#071338_0%,#101d56_62%,#1a2c78_100%)] p-5 text-white shadow-[0_22px_48px_rgba(7,19,56,0.18)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--fc-yellow)]/28 bg-[color:var(--fc-yellow)]/10 text-[color:var(--fc-yellow)]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/54">
                      {card.label}
                    </span>
                  </div>
                  <p className="mt-6 text-[2.2rem] font-semibold leading-none tracking-[-0.05em] text-white">
                    {card.value}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-white/68">{card.hint}</p>
                </article>
              );
            })}
          </div>
        </section>

        <AdminDashboardWidgetDeck
          widgets={[
            {
              id: "tasks",
              step: "1",
              stepLabel: "Start here",
              eyebrow: "Tasks to handle",
              title: accessLevel === "sales_rep" ? "Start with these tasks" : "Tasks that need attention first",
              description: "Urgent items, due-today work, and overdue follow-ups surface first.",
              accent: "warm",
              ctaHref: "/admin/tasks",
              ctaLabel: "View all",
              children:
                focusedTasks.slice(0, 4).length > 0 ? (
                  <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,rgba(252,251,247,0.98)_0%,rgba(247,250,255,0.94)_100%)]">
                    {focusedTasks.slice(0, 4).map((task, index) => (
                      <article
                        key={task.id}
                        className={[
                          "flex flex-col gap-4 px-4 py-4 transition hover:bg-white sm:flex-row sm:items-center sm:justify-between",
                          index < focusedTasks.slice(0, 4).length - 1 ? "border-b border-slate-200/80" : "",
                        ].join(" ")}
                      >
                        <div className="min-w-0">
                            <p className="text-base font-semibold text-slate-950">{task.title}</p>
                            <p className="mt-1 text-sm text-slate-500">
                              {leadNameById[task.leadId] || "Lead"}
                              {leadStateById[task.leadId]
                                ? ` • ${formatLeadStateLabel(leadStateById[task.leadId])}`
                                : ""}
                              {" • "}
                              {formatCrmDateTime(task.dueAt)}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/leads/${task.leadId}`}
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0b123f] transition hover:text-[#1f3486]"
                          >
                            Open lead
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No tasks due right now"
                    description="Create a task so the next step stays visible."
                  />
                ),
            },
            {
              id: "leads",
              step: "2",
              stepLabel: "Review next",
              eyebrow: "Recent leads",
              title: "Newest leads",
              description: "Fresh arrivals, newest activity, and lead context in one quick scan.",
              accent: "cool",
              ctaHref: "/admin/leads",
              ctaLabel: "View all",
              children:
                recentLeads.length > 0 ? (
                  <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,rgba(252,251,247,0.98)_0%,rgba(247,250,255,0.94)_100%)]">
                    {recentLeads.map((lead, index) => (
                      <Link
                        key={lead.id}
                        href={`/admin/leads/${lead.id}`}
                        className={[
                          "block px-4 py-4 transition hover:bg-white",
                          index < recentLeads.length - 1 ? "border-b border-slate-200/80" : "",
                        ].join(" ")}
                      >
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-base font-semibold text-slate-950 [overflow-wrap:anywhere]">
                              {recentLeadNameById[lead.id] || `${(lead.firstName || "Lead").trim()} ${lead.lastName}`.trim()}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-slate-500 [overflow-wrap:anywhere]">
                              {lead.email || lead.whatsappNumber || "No contact details yet"}
                            </p>
                            <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                              {lead.state ? formatLeadStateLabel(lead.state) : "State not captured yet"}
                            </p>
                          </div>
                          <div className="shrink-0 rounded-full border border-slate-200 bg-white/84 px-2.5 py-1">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                              {formatCrmDateTime(lead.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <SourceBadge source={lead.source} />
                          <StatusBadge status={lead.crmStatus} />
                          <PriorityBadge priority={lead.priority} />
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No recent leads yet"
                    description="New leads will show up here as soon as they arrive."
                  />
                ),
            },
            {
              id: "quick-actions",
              step: "3",
              stepLabel: "Act fast",
              eyebrow: "Quick actions",
              title: "Capture, assign, and move the queue forward",
              description: "Use the action center to add leads, create follow-ups, assign owners, and import lists without leaving the dashboard.",
              accent: "navy",
              defaultOpen: true,
              children: (
                <div id="action-center">
                  <AdminWorkspaceComposer
                    accessLevel={accessLevel}
                    leadOptions={taskLeadOptions}
                    assignmentLeadOptions={assignmentLeadOptions}
                    assigneeOptions={assigneeOptions}
                    defaultAssignedTo={defaultAssignedTo}
                  />
                </div>
              ),
            },
          ]}
        />

        <section className="grid gap-6 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-8">
            <AdminCollapsibleSection
              eyebrow="Task list"
              title={accessLevel === "sales_rep" ? "Your next tasks" : "Tasks due next"}
              description={
                accessLevel === "sales_rep"
                  ? "Due today and overdue first."
                  : "Urgent tasks first."
              }
              actions={
                <Link
                  href="/admin/tasks"
                  className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium"
                >
                  Open tasks page
                </Link>
              }
            >
              <TaskQueueTable
                tasks={focusedTasks}
                leadNamesById={leadNameById}
                leadStateById={leadStateById}
                emptyTitle="No open tasks right now"
                emptyDescription="Create a task so the next step stays visible."
              />
            </AdminCollapsibleSection>

            <AdminCollapsibleSection
              eyebrow={accessLevel === "sales_rep" ? "My leads" : "Lead queue"}
              title={accessLevel === "sales_rep" ? "Lead preview" : "Queue preview"}
              description="Use the leads page for full review."
              actions={
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/admin/leads"
                    className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium"
                  >
                    Open leads page
                  </Link>
                  <Link
                    href={buildDashboardHref({ crmStatus: "new" })}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-white hover:text-slate-950"
                  >
                    New
                  </Link>
                </div>
              }
            >
              <div className="grid gap-3">
                {previewActionLeads.length > 0 ? (
                  previewActionLeads.map((lead) => (
                    <Link
                      key={lead.id}
                      href={`/admin/leads/${lead.id}`}
                      className="admin-surface-muted rounded-[24px] px-4 py-4 transition hover:border-slate-300 hover:bg-white"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <p className="text-base font-semibold text-slate-950">
                            {previewActionLeadNameById[lead.id] || `${(lead.firstName || "Lead").trim()} ${lead.lastName}`.trim()}
                          </p>
                          <p className="mt-1 text-sm text-slate-500 [overflow-wrap:anywhere]">
                            {lead.email || lead.whatsappNumber || "No contact yet"}
                          </p>
                          <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                            {lead.state ? formatLeadStateLabel(lead.state) : "State not captured yet"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <SourceBadge source={lead.source} />
                          <StatusBadge status={lead.crmStatus} />
                          <PriorityBadge priority={lead.priority} />
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <EmptyState
                    title="No urgent leads in this view"
                    description="Open the leads page for the full queue."
                  />
                )}
              </div>
            </AdminCollapsibleSection>
          </div>

          <div className="space-y-6 xl:col-span-4">
            <AdminCollapsibleSection
              eyebrow={accessLevel === "sales_rep" ? "My numbers" : "Team snapshot"}
              title={accessLevel === "sales_rep" ? "Today at a glance" : "Team at a glance"}
              description={
                accessLevel === "sales_rep"
                  ? "Your workload."
                  : "Workload and coverage."
              }
            >
              <div className="grid gap-3">
                {accessLevel === "sales_rep" ? (
                  <>
                    <MetricCard
                      label="Open tasks"
                      value={safeNumber(personalRow?.openTasks ?? 0)}
                      supporting="Tasks still on your plate."
                    />
                    <MetricCard
                      label="Qualified leads"
                      value={safeNumber(personalRow?.qualifiedLeads ?? 0)}
                      supporting="Leads already moving forward."
                      tone="warning"
                    />
                    <MetricCard
                      label="Converted leads"
                      value={safeNumber(personalRow?.convertedLeads ?? 0)}
                      supporting="Leads already closed."
                      tone="positive"
                    />
                  </>
                ) : (
                  <>
                    <MetricCard
                      label="Active team"
                      value={safeNumber(teamRows.length)}
                      supporting="People currently handling leads or tasks."
                      tone="accent"
                    />
                    <MetricCard
                      label="Overdue queues"
                      value={safeNumber(repsWithOverdueWork.length)}
                      supporting="People who may need support."
                      tone={repsWithOverdueWork.length > 0 ? "warning" : "positive"}
                    />
                    <MetricCard
                      label="Needs owner"
                      value={safeNumber(stats.unassignedLeads)}
                      supporting="Leads still waiting for an owner."
                    />
                  </>
                )}
              </div>
            </AdminCollapsibleSection>

            <AdminCollapsibleSection
              eyebrow="Recent activity"
              title="Latest updates"
              description="Notes, tasks, and status changes."
            >
              <div className="space-y-3">
                {activityFeed.length > 0 ? (
                  activityFeed.map(({ event, lead }) => (
                    <TimelineItem
                      key={event.id}
                      title={`${formatLeadEventLabel(event.eventType)} • ${activityLeadNameById[lead.id] || `${lead.firstName || "Lead"} ${lead.lastName}`.trim()}`.trim()}
                      description={
                        typeof event.eventData?.preview === "string"
                          ? event.eventData.preview
                          : typeof event.eventData?.to === "string"
                            ? `Updated to ${crmLabelize(event.eventData.to)}`
                            : lead.email || lead.whatsappNumber || "Lead activity recorded."
                      }
                      meta={event.createdBy || formatLeadSourceLabel(lead.source)}
                      timestamp={event.createdAt}
                      tone={eventTone(event.eventType)}
                    />
                  ))
                ) : (
                  <EmptyState
                    title="No recent activity yet"
                    description="Notes, task updates, and status changes will show up here."
                  />
                )}
              </div>
            </AdminCollapsibleSection>

            {accessLevel === "sales_rep" ? null : (
              <AdminCollapsibleSection
                eyebrow="Needs owner"
                title="Unassigned leads"
                description="Needs owner."
              >
                <div className="grid gap-3">
                  {previewUnassignedLeads.length > 0 ? (
                    previewUnassignedLeads.map((lead) => (
                      <Link
                        key={lead.id}
                        href={`/admin/leads/${lead.id}`}
                        className="admin-surface-muted rounded-[22px] px-4 py-3 transition hover:border-slate-300 hover:bg-white"
                      >
                        <p className="text-sm font-semibold text-slate-950">
                          {previewUnassignedLeadNameById[lead.id] || `${(lead.firstName || "Lead").trim()} ${lead.lastName}`.trim()}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {lead.state ? `${formatLeadStateLabel(lead.state)} • ` : ""}{formatLeadSourceLabel(lead.source)} • {lead.email || lead.whatsappNumber || "No contact yet"}
                        </p>
                      </Link>
                    ))
                  ) : (
                    <EmptyState
                      title="No unassigned leads"
                      description="Every visible lead already has an owner."
                    />
                  )}
                </div>
              </AdminCollapsibleSection>
            )}

            {showTechnicalSummary ? (
              <AdminCollapsibleSection
                eyebrow="Connected tools"
                title="Tool status"
                description="Connection health."
              >
                <div className="grid gap-3">
                  <MetricCard
                    label="Tool issues"
                    value={safeNumber(stats.failedIntegrations)}
                    supporting={
                      stats.failedIntegrations > 0
                        ? "One or more connected tools still need attention."
                        : "No connection issue is currently flagged."
                    }
                    tone={stats.failedIntegrations > 0 ? "danger" : "positive"}
                  />
                  {integrations.length > 0 ? (
                    integrations.slice(0, 3).map((integration) => (
                      <IntegrationHealthCard
                        key={integration.id}
                        integration={integration}
                        href={`/admin/integrations/${integration.provider.replaceAll("_", "-")}`}
                      />
                    ))
                  ) : (
                    <EmptyState
                      title="No connected tools yet"
                      description="Connected tools will show up here once setup is saved."
                      icon={PlugZap}
                    />
                  )}
                </div>
              </AdminCollapsibleSection>
            ) : null}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
