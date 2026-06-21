import { PlugZap } from "lucide-react";
import Link from "next/link";
import { AdminCollapsibleSection } from "@/components/admin/AdminCollapsibleSection";
import { AdminDashboardWidgetDeck } from "@/components/admin/AdminDashboardWidgetDeck";
import { SalesCommandOverview } from "@/components/admin/SalesCommandOverview";
import { AdminWorkspaceComposer } from "@/components/admin/AdminWorkspaceComposer";
import { AdminShell } from "@/components/admin/AdminShell";
import { ErrorState } from "@/components/admin/ErrorState";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { EmptyState } from "@/components/admin/EmptyState";
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
import { listCustomFields } from "@/lib/crm/custom-fields-admin";
import { listLeadIntakeEvents } from "@/lib/crm/intake-runtime";
import { listLeadStages } from "@/lib/crm/lead-stages-admin";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";
import { buildSalesDashboardSummary } from "@/lib/crm/sales-metrics";
import { getActiveGlobalSalesTarget } from "@/lib/crm/sales-targets-admin";
import {
  DASHBOARD_WIDGET_KEYS,
  getCompanySettings,
  resolveDashboardConfig,
  resolveDashboardWidgetOrder,
  type DashboardWidgetKey,
} from "@/lib/crm/workspace-settings";
import type { CrmStatus, LeadRecord } from "@/lib/crm/types";
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

function readStageFilter(input: Record<string, string | string[] | undefined>) {
  const raw = Array.isArray(input.stage) ? input.stage[0] : input.stage;
  return raw?.trim() ? raw : undefined;
}

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

async function listDashboardLeadEvents(leadId: string) {
  try {
    return await leadStore.listLeadEvents(leadId);
  } catch (error) {
    console.warn("[crm:dashboard] Activity feed unavailable for lead.", {
      leadId,
      error,
    });
    return [];
  }
}

function safeNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function needsLeadAttention(
  lead: LeadRecord,
  nextFollowUpAt: string | null | undefined,
  includeAssignmentSignals: boolean,
) {
  return (
    !lead.stageId ||
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

  if (!lead.stageId) {
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
  overrides: Partial<Record<"stage" | "priority" | "source" | "search", string>>,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(overrides)) {
    if (value) {
      params.set(key === "stage" ? "crmStatus" : key, value);
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

function resolveLeadStageBadge(stageId?: string | null): CrmStatus {
  return (stageId ?? "new") as CrmStatus;
}

function createDemoLead(
  index: number,
  overrides: Partial<LeadRecord> & {
    firstName: string;
    lastName: string;
    email: string;
    source: LeadRecord["source"];
    crmStatus: CrmStatus;
    assignedTo: string | null;
  },
): LeadRecord {
  const now = new Date();
  const createdAt = new Date(now.getTime() - index * 6 * 60 * 60 * 1000).toISOString();
  const lastActivityAt = new Date(now.getTime() - index * 90 * 60 * 1000).toISOString();

  return {
    id: `demo-lead-${index}`,
    reportToken: null,
    createdAt,
    updatedAt: lastActivityAt,
    lastActivityAt,
    completedAt: null,
    deletedAt: null,
    deletedBy: null,
    completionStatus: "complete",
    sourceDetail: null,
    priority: "medium",
    assignedToList: overrides.assignedTo ? [overrides.assignedTo] : [],
    whatsappNumber: `+234 80${index} 555 01${index}`,
    state: "Lagos",
    country: "Nigeria",
    region: "Lagos",
    city: index % 2 === 0 ? "Lekki" : "Ikeja",
    address: null,
    postalCode: null,
    companyName: null,
    sourceId: null,
    stageId: overrides.crmStatus,
    campaignId: null,
    campaignLabel: null,
    assignedUserId: null,
    teamId: null,
    branchId: null,
    departmentId: null,
    estimatedValue: 250000 + index * 85000,
    expectedValue: 125000 + index * 42000,
    wonValue: overrides.crmStatus === "converted" ? 380000 + index * 75000 : null,
    closeProbability: overrides.crmStatus === "converted" ? 100 : 35 + index * 9,
    expectedCloseDate: new Date(now.getTime() + (index + 3) * 24 * 60 * 60 * 1000).toISOString(),
    wonAt: overrides.crmStatus === "converted" ? lastActivityAt : null,
    lostAt: overrides.crmStatus === "lost" ? lastActivityAt : null,
    lostReason: overrides.crmStatus === "lost" ? "Budget paused" : null,
    nextFollowUpAt: new Date(now.getTime() + (index - 2) * 24 * 60 * 60 * 1000).toISOString(),
    archivedAt: null,
    externalLeadId: null,
    externalFormId: null,
    facebookLeadgenId: null,
    facebookFormId: null,
    facebookPageId: null,
    facebookCampaignId: null,
    facebookAdId: null,
    facebookAdsetId: null,
    googleClickId: null,
    googleCampaignId: null,
    googleAdGroupId: null,
    googleAdId: null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmContent: null,
    utmTerm: null,
    landingPage: null,
    sourcePayload: null,
    primaryGoal: null,
    currentStepKey: "contact",
    currentStepIndex: 0,
    progressPercent: 100,
    readinessLevel: null,
    topPathwayTitle: null,
    answers: {},
    report: null,
    publicReport: null,
    sync: {
      googleSheets: { status: "skipped", message: "Use export when needed." },
      sender: { status: "success", message: "Demo lead ready." },
    },
    analytics: {
      whatsappClicked: false,
      consultationClicked: false,
      reportViewed: false,
    },
    ...overrides,
  } as LeadRecord;
}

function buildDevelopmentDashboardData() {
  const now = new Date();
  const users = [
    {
      id: "demo-user-sarah",
      email: "sarah@example.com",
      fullName: "Sarah Kim",
      role: "sales_agent",
      isActive: true,
      avatarUrl: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: "demo-user-james",
      email: "james@example.com",
      fullName: "James Lee",
      role: "lead_sales_rep",
      isActive: true,
      avatarUrl: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: "demo-user-ama",
      email: "ama@example.com",
      fullName: "Ama Okafor",
      role: "sales_agent",
      isActive: true,
      avatarUrl: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
  ] as Awaited<ReturnType<typeof leadStore.listCrmUsers>>;
  const leads = [
    createDemoLead(1, {
      firstName: "Aurelia",
      lastName: "Systems",
      email: "hello@aurelia.example",
      source: "website_form",
      crmStatus: "qualified",
      assignedTo: "sarah@example.com",
      priority: "high",
      companyName: "Aurelia Systems",
    }),
    createDemoLead(2, {
      firstName: "Vertex",
      lastName: "Labs",
      email: "growth@vertex.example",
      source: "referral",
      crmStatus: "contacted",
      assignedTo: "james@example.com",
      priority: "urgent",
      companyName: "Vertex Labs",
    }),
    createDemoLead(3, {
      firstName: "Northwind",
      lastName: "Co",
      email: "team@northwind.example",
      source: "manual_entry",
      crmStatus: "new",
      assignedTo: null,
      priority: "medium",
      companyName: "Northwind Co.",
    }),
    createDemoLead(4, {
      firstName: "BrightWave",
      lastName: "Studio",
      email: "ops@brightwave.example",
      source: "facebook_lead_ads",
      crmStatus: "converted",
      assignedTo: "ama@example.com",
      priority: "high",
      companyName: "BrightWave Studio",
    }),
    createDemoLead(5, {
      firstName: "Cobalt",
      lastName: "Dynamics",
      email: "sales@cobalt.example",
      source: "google_ads",
      crmStatus: "qualified",
      assignedTo: "sarah@example.com",
      priority: "medium",
      companyName: "Cobalt Dynamics",
    }),
  ];
  const tasks = [
    {
      id: "demo-task-1",
      leadId: leads[1].id,
      title: "Prepare proposal for Vertex Labs",
      description: "Send pricing and next-step summary.",
      dueAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      completedAt: null,
      assignedTo: "james@example.com",
      createdBy: "owner@example.com",
      createdAt: new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "demo-task-2",
      leadId: leads[0].id,
      title: "Call Aurelia Systems",
      description: "Confirm decision timeline.",
      dueAt: new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString(),
      completedAt: null,
      assignedTo: "sarah@example.com",
      createdBy: "owner@example.com",
      createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
    },
  ] as Awaited<ReturnType<typeof leadStore.listLeadTasks>>;
  const intakeEvents = [
    {
      id: "demo-intake-1",
      status: "lead_created",
      sourceName: "Website contact form",
      leadId: leads[0].id,
      leadName: "Aurelia Systems",
      errorMessage: null,
      normalizedSummary: [
        { label: "Name", value: "Aurelia Systems" },
        { label: "Interest", value: "Private sales command center" },
      ],
      rawPayload: null,
      createdAt: new Date(now.getTime() - 45 * 60 * 1000).toISOString(),
    },
    {
      id: "demo-intake-2",
      status: "failed",
      sourceName: "Landing page",
      leadId: null,
      leadName: null,
      errorMessage: "Email is required.",
      normalizedSummary: [{ label: "Source", value: "Landing page" }],
      rawPayload: null,
      createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
    },
  ] as Awaited<ReturnType<typeof listLeadIntakeEvents>>;
  const stats = {
    totalLeads: leads.length,
    newLeadsToday: 2,
    unassignedLeads: leads.filter((lead) => !lead.assignedTo).length,
    followUpsDueToday: 2,
    completedAssessments: leads.length,
    consultationReadyLeads: 3,
    highPriorityLeads: leads.filter((lead) => lead.priority === "high" || lead.priority === "urgent").length,
    failedIntegrations: 0,
    facebookLeadsThisWeek: leads.filter((lead) => lead.source === "facebook_lead_ads").length,
    websiteLeadsThisWeek: leads.filter((lead) => lead.source === "website_form").length,
    senderSyncStatus: {
      success: leads.length,
      pending: 0,
      failed: 0,
      notConfigured: 0,
      skipped: 0,
    },
  } as Awaited<ReturnType<typeof leadStore.getDashboardStats>>;
  const activeTarget = {
    id: "demo-target-global",
    name: "Monthly Revenue Target",
    scope: "global",
    scopeId: null,
    period: "monthly",
    targetValue: 2500000,
    currency: "NGN",
    startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
    endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    isActive: true,
    archived: false,
  } as Awaited<ReturnType<typeof getActiveGlobalSalesTarget>>;

  return {
    leads,
    stats,
    tasks,
    users,
    integrations: [] as Awaited<ReturnType<typeof leadStore.listIntegrations>>,
    intakeEvents,
    activeTarget,
  };
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
  const selectedStage = readStageFilter(params) ?? (filters.stageId === "all" ? "all" : filters.stageId);
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
        intakeEvents: Awaited<ReturnType<typeof listLeadIntakeEvents>>;
        activeTarget: Awaited<ReturnType<typeof getActiveGlobalSalesTarget>>;
      }
    | null = null;
  let usingDevelopmentDemoData = false;

  try {
    const [leads, stats, tasks, users, integrations, intakeEvents, activeTarget] = await Promise.all([
      leadStore.list({
        ...scopedFilters,
        stageId: selectedStage,
        limit: 120,
      }),
      leadStore.getDashboardStats({
        ...scopedFilters,
        stageId: selectedStage,
      }),
      leadStore.listLeadTasks({
        assignedTo: accessLevel === "sales_rep" ? session.user?.email ?? undefined : undefined,
      }),
      showTeamViews ? leadStore.listCrmUsers() : Promise.resolve([]),
      showTechnicalSummary ? leadStore.listIntegrations() : Promise.resolve([]),
      accessLevel === "sales_rep" ? Promise.resolve([]) : listLeadIntakeEvents({ limit: 8 }),
      getActiveGlobalSalesTarget(),
    ]);

    pageData = {
      leads,
      stats,
      tasks,
      users,
      integrations,
      intakeEvents,
      activeTarget,
    };
  } catch (error) {
    pageError = error;
    logCrmPageError("dashboard", error);

    if (process.env.NODE_ENV !== "production") {
      pageData = buildDevelopmentDashboardData();
      usingDevelopmentDemoData = true;
    }
  }

  const shellActions = (
    <>
      <div className="ld-floating-control hidden h-10 items-center px-4 text-sm font-semibold text-white/72 md:inline-flex">
        {session.user?.email}
      </div>
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
        userName={crmUser?.fullName || session.user?.name}
        userEmail={crmUser?.email || session.user?.email}
        userAvatarUrl={crmUser?.avatarUrl}
      >
        <ErrorState
          title={errorCopy.title}
          description={errorCopy.description}
          details={errorCopy.details}
        />
      </AdminShell>
    );
  }

  let leadCaptureCustomFields = [] as Awaited<ReturnType<typeof listCustomFields>>;
  let leadCaptureStageOptions = [] as Array<{ value: CrmStatus; label: string }>;
  try {
    leadCaptureCustomFields = (await listCustomFields()).filter(
      (field) => field.showInForm && !field.archived,
    );
    leadCaptureStageOptions = (await listLeadStages())
      .filter((stage) => !stage.archived && crmOptions.includes(stage.key as (typeof crmOptions)[number]))
      .map((stage) => ({
        value: stage.key as CrmStatus,
        label: stage.name,
      }));
  } catch (error) {
    logCrmPageError("dashboard-custom-fields", error);
  }

  const { leads, stats, tasks, users, integrations, intakeEvents, activeTarget } = pageData;
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
  const activityFeed = usingDevelopmentDemoData
    ? leads.slice(0, 5).map((lead, index) => ({
        lead,
        event: {
          id: `demo-event-${index + 1}`,
          leadId: lead.id,
          eventType: index === 0 ? "lead_created" : index === 1 ? "stage_changed" : "follow_up_due",
          eventData:
            index === 1
              ? { to: formatLeadStateLabel(lead.state) }
              : { preview: index === 0 ? "New demo lead captured." : "Follow-up queued for today." },
          createdBy: lead.assignedTo ?? "Demo workspace",
          createdAt: lead.lastActivityAt,
        },
      }))
    : (
        await Promise.all(
          leads.slice(0, 8).map(async (lead) => {
            const events = await listDashboardLeadEvents(lead.id);
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
      (selectedStage && selectedStage !== "all") ||
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
      stage: lead.stageId ?? "new",
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
  const workspaceSettings = await getCompanySettings();
  const dashboardConfig = resolveDashboardConfig(workspaceSettings.dashboard);
  const visibleDashboardWidgetKeys = resolveDashboardWidgetOrder(
    DASHBOARD_WIDGET_KEYS.map((id) => ({ id })),
    dashboardConfig,
  ).map((item) => item.id);
  const visibleDashboardWidgetSet = new Set<DashboardWidgetKey>(visibleDashboardWidgetKeys);
  const salesDashboardSummary = buildSalesDashboardSummary({
    leads,
    tasks,
    users,
    intakeEvents,
    activeTarget,
  });
  const searchSlot = (
      <form action="/admin" className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <SearchInput
              defaultValue={filters.search ?? ""}
              placeholder="Search leads, region, tasks, people, or phone"
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

        {accessLevel !== "sales_rep" && hasFilters ? (
          <details
            open
            className="rounded-[18px] border border-white/10 bg-black/16 px-4 py-2.5"
          >
            <summary className="cursor-pointer list-none text-sm font-medium text-white/64">
              Filters active
            </summary>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <AdminSelect
                name="stage"
                defaultValue={selectedStage ?? "all"}
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
        ) : null}
      </form>
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
      userName={crmUser?.fullName || session.user?.name}
      userEmail={crmUser?.email || session.user?.email}
      userAvatarUrl={crmUser?.avatarUrl}
    >
      <div className="space-y-6">
        <section className="px-1 py-4 sm:px-2 sm:py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/44">
                {dashboardDateLabel}
              </p>
              <h2 className="mt-2 font-[family:var(--font-heading)] text-[2.5rem] leading-none tracking-[-0.06em] text-white sm:text-[3rem]">
                Good morning, {welcomeName}.
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/68">
                Here&apos;s what needs attention today.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/leads"
                className="ld-floating-control inline-flex h-11 items-center justify-center px-5 text-sm font-semibold"
              >
                Open leads
              </Link>
              <Link
                href="#action-center"
                className="ld-glass-button inline-flex h-11 items-center justify-center px-5 text-sm font-semibold"
              >
                {accessLevel === "sales_rep" ? "Create task" : "Create task"}
              </Link>
            </div>
          </div>
        </section>

        {accessLevel === "sales_rep" ? null : (
          <SalesCommandOverview
            summary={salesDashboardSummary}
            visibleWidgets={visibleDashboardWidgetKeys}
          />
        )}

        <AdminDashboardWidgetDeck
          initialOrder={
            visibleDashboardWidgetSet.has("my_tasks")
              ? ["tasks", "leads", "quick-actions"]
              : ["leads", "quick-actions", "tasks"]
          }
          persistKey={null}
          widgets={[
            {
              id: "tasks",
              step: "1",
              stepLabel: "Start here",
              eyebrow: "Tasks to handle",
              title: accessLevel === "sales_rep" ? "Start with these tasks" : "Tasks that need attention first",
              description: "Urgent items, due-today work, and overdue follow-ups surface first.",
              accent: "warm" as const,
              ctaHref: "/admin/tasks",
              ctaLabel: "View all",
              children:
                focusedTasks.slice(0, 4).length > 0 ? (
                  <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.035]">
                    {focusedTasks.slice(0, 4).map((task, index) => (
                      <article
                        key={task.id}
                        className={[
                          "flex flex-col gap-4 px-4 py-4 transition hover:bg-white/[0.06] sm:flex-row sm:items-center sm:justify-between",
                          index < focusedTasks.slice(0, 4).length - 1 ? "border-b border-white/10" : "",
                        ].join(" ")}
                      >
                        <div className="min-w-0">
                            <p className="text-base font-semibold text-white">{task.title}</p>
                            <p className="mt-1 text-sm text-white/54">
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
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-100 transition hover:text-white"
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
              accent: "cool" as const,
              ctaHref: "/admin/leads",
              ctaLabel: "View all",
              children:
                recentLeads.length > 0 ? (
                  <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.035]">
                    {recentLeads.map((lead, index) => (
                      <Link
                        key={lead.id}
                        href={`/admin/leads/${lead.id}`}
                        className={[
                          "block px-4 py-4 transition hover:bg-white/[0.06]",
                          index < recentLeads.length - 1 ? "border-b border-white/10" : "",
                        ].join(" ")}
                      >
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-base font-semibold text-white [overflow-wrap:anywhere]">
                              {recentLeadNameById[lead.id] || `${(lead.firstName || "Lead").trim()} ${lead.lastName}`.trim()}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-white/54 [overflow-wrap:anywhere]">
                              {lead.email || lead.whatsappNumber || "No contact details yet"}
                            </p>
                            <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-white/38">
                              {lead.state ? formatLeadStateLabel(lead.state) : "Region not captured yet"}
                            </p>
                          </div>
                          <div className="shrink-0 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/42">
                              {formatCrmDateTime(lead.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <SourceBadge source={lead.source} />
                          <StatusBadge status={resolveLeadStageBadge(lead.stageId)} />
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
              accent: "navy" as const,
              defaultOpen: false,
              children: (
                <div id="action-center">
                  <AdminWorkspaceComposer
                    accessLevel={accessLevel}
                    leadOptions={taskLeadOptions}
                    assignmentLeadOptions={assignmentLeadOptions}
                    assigneeOptions={assigneeOptions}
                    defaultAssignedTo={defaultAssignedTo}
                    leadCaptureCustomFields={leadCaptureCustomFields}
                    leadCaptureStageOptions={leadCaptureStageOptions.length > 0 ? leadCaptureStageOptions : undefined}
                  />
                </div>
              ),
            },
          ].filter((widget) => {
            if (widget.id === "tasks") {
              return visibleDashboardWidgetSet.has("my_tasks");
            }

            return true;
          })}
        />

        <section className="grid gap-6 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-8">
            {visibleDashboardWidgetSet.has("my_tasks") ? (
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
            ) : null}

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
                    href={buildDashboardHref({ stage: "new" })}
                    className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-white/64 transition hover:border-cyan-200/22 hover:bg-white/[0.08] hover:text-white"
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
                      className="admin-surface-muted rounded-[24px] px-4 py-4 transition hover:border-cyan-200/22 hover:bg-white/[0.07]"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <p className="text-base font-semibold text-white">
                            {previewActionLeadNameById[lead.id] || `${(lead.firstName || "Lead").trim()} ${lead.lastName}`.trim()}
                          </p>
                          <p className="mt-1 text-sm text-white/54 [overflow-wrap:anywhere]">
                            {lead.email || lead.whatsappNumber || "No contact yet"}
                          </p>
                          <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-white/38">
                            {lead.state ? formatLeadStateLabel(lead.state) : "Region not captured yet"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <SourceBadge source={lead.source} />
                          <StatusBadge status={resolveLeadStageBadge(lead.stageId)} />
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
            {visibleDashboardWidgetSet.has("team_performance") ? (
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
            ) : null}

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
                        className="admin-surface-muted rounded-[22px] px-4 py-3 transition hover:border-cyan-200/22 hover:bg-white/[0.07]"
                      >
                        <p className="text-sm font-semibold text-white">
                          {previewUnassignedLeadNameById[lead.id] || `${(lead.firstName || "Lead").trim()} ${lead.lastName}`.trim()}
                        </p>
                        <p className="mt-1 text-sm text-white/54">
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
