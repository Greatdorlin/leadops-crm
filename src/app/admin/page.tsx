import { PlugZap, Filter } from "lucide-react";
import Link from "next/link";
import { AdminCollapsibleSection } from "@/components/admin/AdminCollapsibleSection";
import { AdminDashboardWidgetDeck } from "@/components/admin/AdminDashboardWidgetDeck";
import { AffiliateDashboardPanel } from "@/components/admin/AffiliateDashboardPanel";
import { DashboardHeroClock } from "@/components/admin/DashboardHeroClock";
import { SalesCommandOverview } from "@/components/admin/SalesCommandOverview";
import { AdminShell } from "@/components/admin/AdminShell";
import { ErrorState } from "@/components/admin/ErrorState";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { EmptyState } from "@/components/admin/EmptyState";
import { GlassSurface } from "@/components/admin/ui/GlassSurface";
import { SmoothButton } from "@/components/admin/ui/SmoothButton";
import { SectionHeader } from "@/components/admin/ui/SectionHeader";
import { IntegrationHealthCard } from "@/components/admin/IntegrationHealthCard";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { MetricCard } from "@/components/admin/MetricCard";
import { PriorityBadge } from "@/components/admin/PriorityBadge";
import { SearchInput } from "@/components/admin/SearchInput";
import { SourceBadge } from "@/components/admin/SourceBadge";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { AdminAccessViewSwitcher } from "@/components/admin/AdminAccessViewSwitcher";
import { cn } from "@/lib/cn";
import { getAdminAccessContext } from "@/lib/admin";
import { isLocalAdminPreviewEmail } from "@/lib/admin-access";
import {
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
  formatCrmDateTime,
  formatLeadStateLabel,
} from "@/lib/crm/formatters";
import { listLeadIntakeEvents } from "@/lib/crm/intake-runtime";
import { listLeadStages } from "@/lib/crm/lead-stages-admin";
import { buildAffiliateDashboardSummary } from "@/lib/crm/affiliate-dashboard";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";
import {
  buildSalesDashboardSummary,
  mergeSalesDashboardSummary,
} from "@/lib/crm/sales-metrics";
import { getActiveGlobalSalesTarget } from "@/lib/crm/sales-targets-admin";
import { appRoutes } from "@/lib/app-routes";
import {
  DASHBOARD_WIDGET_KEYS,
  resolveDashboardConfig,
  resolveDashboardWidgetOrder,
  resolveStoredWorkspaceSettings,
  type DashboardWidgetKey,
} from "@/lib/crm/workspace-settings";
import { getCompanySettings } from "@/lib/crm/workspace-settings-server";
import type { CrmStatus, IntegrationProvider, LeadRecord } from "@/lib/crm/types";
import { leadStore } from "@/lib/storage";

export const dynamic = "force-dynamic";

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

function safeNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function getIntegrationManagementHref(provider: IntegrationProvider) {
  const routes: Partial<Record<IntegrationProvider, string>> = {
    website: appRoutes.forms,
    facebook: appRoutes.integration("facebook"),
    google_sheets: appRoutes.integration("google-sheets"),
    google_ads: appRoutes.integration("google-ads"),
    tiktok: appRoutes.integration("tiktok"),
    linkedin: appRoutes.integration("linkedin"),
    sender: appRoutes.integrations,
  };
  return routes[provider];
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

function getDashboardTitle(accessLevel: AdminAccessLevel) {
  if (accessLevel === "affiliate") {
    return "Affiliate Dashboard";
  }

  if (accessLevel === "finance") {
    return "Finance Dashboard";
  }

  if (accessLevel === "sales_rep") {
    return "My Dashboard";
  }

  if (accessLevel === "master_admin") {
    return "Dashboard";
  }

  return "Team Dashboard";
}

function getDashboardDescription(accessLevel: AdminAccessLevel) {
  if (accessLevel === "affiliate") {
    return "Your leads, value, and follow-ups.";
  }

  if (accessLevel === "finance") {
    return "Lead value, checks, and approval signals.";
  }

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
    createdAt,
    updatedAt: lastActivityAt,
    lastActivityAt,
    deletedAt: null,
    deletedBy: null,
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
    stageId: `demo-stage-${overrides.crmStatus}`,
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
    sync: {
      googleSheets: { status: "skipped", message: "Use export when needed." },
      sender: { status: "success", message: "Demo lead ready." },
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
    capturedLeads: leads.length,
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
  const timestamp = now.toISOString();
  const stages = [
    { id: "demo-stage-new", key: "new", name: "New", color: "#60a5fa", sortOrder: 0, isWon: false, isLost: false, archived: false, createdAt: timestamp, updatedAt: timestamp },
    { id: "demo-stage-contacted", key: "contacted", name: "Contacted", color: "#f59e0b", sortOrder: 1, isWon: false, isLost: false, archived: false, createdAt: timestamp, updatedAt: timestamp },
    { id: "demo-stage-qualified", key: "qualified", name: "Qualified", color: "#10b981", sortOrder: 2, isWon: false, isLost: false, archived: false, createdAt: timestamp, updatedAt: timestamp },
    { id: "demo-stage-converted", key: "converted", name: "Converted", color: "#22c55e", sortOrder: 3, isWon: true, isLost: false, archived: false, createdAt: timestamp, updatedAt: timestamp },
    { id: "demo-stage-lost", key: "lost", name: "Lost", color: "#f43f5e", sortOrder: 4, isWon: false, isLost: true, archived: false, createdAt: timestamp, updatedAt: timestamp },
  ] as Awaited<ReturnType<typeof listLeadStages>>;
  const demoLeadTrend = [2, 3, 1, 4, 5, 3, 6, 4, 7, 5, 8, 6, 9, 7];
  const trend = demoLeadTrend.map((leadCount, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    date.setUTCDate(date.getUTCDate() - (demoLeadTrend.length - index - 1));
    return {
      date: date.toISOString().slice(0, 10),
      leads: leadCount,
      wonValue: index % 4 === 2 ? (index + 2) * 85000 : index % 5 === 0 ? 125000 : 0,
    };
  }) as Awaited<ReturnType<typeof leadStore.getDashboardTrend>>;

  return {
    leads,
    stats,
    tasks,
    users,
    integrations: [] as Awaited<ReturnType<typeof leadStore.listIntegrations>>,
    intakeEvents,
    activeTarget,
    stages,
    trend,
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
    permissions,
  } = await getAdminAccessContext(appRoutes.dashboard);
  const params = await searchParams;
  const filters = parseLeadListFilters(params);
  const selectedStage =
    readStageFilter(params) ??
    (filters.stageId === "all" || filters.status === "all"
      ? "all"
      : filters.stageId ?? filters.status);
  const scopedFilters = scopeLeadListFilters(filters, accessLevel, session.user?.email, crmUser);
  const showTeamViews = canViewSalesTeam(accessLevel, permissions);
  const showTechnicalSummary = canManageIntegrationsAccess(
    accessLevel,
    role,
    permissions,
  );
  const usePersonalTaskScope =
    accessLevel === "sales_rep" || accessLevel === "affiliate" || accessLevel === "finance";
  const showIntakeFeed =
    accessLevel !== "sales_rep" && accessLevel !== "affiliate" && accessLevel !== "finance";
  let pageError: unknown = null;
  let pageData:
    | {
        leads: Awaited<ReturnType<typeof leadStore.list>>;
        stats: Awaited<ReturnType<typeof leadStore.getDashboardStats>>;
        salesAggregate: Awaited<ReturnType<typeof leadStore.getSalesPipelineAggregate>> | null;
        tasks: Awaited<ReturnType<typeof leadStore.listLeadTasks>>;
        users: Awaited<ReturnType<typeof leadStore.listCrmUsers>>;
        integrations: Awaited<ReturnType<typeof leadStore.listIntegrations>>;
        intakeEvents: Awaited<ReturnType<typeof listLeadIntakeEvents>>;
        activeTarget: Awaited<ReturnType<typeof getActiveGlobalSalesTarget>>;
        stages: Awaited<ReturnType<typeof listLeadStages>>;
        trend: Awaited<ReturnType<typeof leadStore.getDashboardTrend>>;
      }
    | null = null;
  let usingDevelopmentDemoData = false;

  if (isLocalAdminPreviewEmail(session.user?.email)) {
    pageData = {
      ...buildDevelopmentDashboardData(),
      salesAggregate: null,
    };
    usingDevelopmentDemoData = true;
  } else try {
    const [leads, stats, salesAggregate, tasks, users, integrations, intakeEvents, activeTarget, stages, trend] = await Promise.all([
      leadStore.list({
        ...scopedFilters,
        limit: 120,
      }),
      leadStore.getDashboardStats({
        ...scopedFilters,
      }),
      leadStore.getSalesPipelineAggregate(scopedFilters),
      leadStore.listLeadTasks({
        assignedTo: usePersonalTaskScope ? session.user?.email ?? undefined : undefined,
        leadAssignedTo: scopedFilters.assignedTo,
        branchId: scopedFilters.branchId,
        departmentId: scopedFilters.departmentId,
        teamId: scopedFilters.teamId,
        scopeDenied: scopedFilters.scopeDenied,
        limit: 500,
      }),
      showTeamViews ? leadStore.listCrmUsers() : Promise.resolve([]),
      showTechnicalSummary ? leadStore.listIntegrations() : Promise.resolve([]),
      showIntakeFeed ? listLeadIntakeEvents({ limit: 8 }) : Promise.resolve([]),
      getActiveGlobalSalesTarget(),
      listLeadStages(),
      leadStore.getDashboardTrend(scopedFilters, 14),
    ]);

    pageData = {
      leads,
      stats,
      salesAggregate,
      tasks,
      users,
      integrations,
      intakeEvents,
      activeTarget,
      stages,
      trend,
    };
  } catch (error) {
    pageError = error;
    logCrmPageError("dashboard", error);

    if (process.env.NODE_ENV !== "production") {
      pageData = {
        ...buildDevelopmentDashboardData(),
        salesAggregate: null,
      };
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

  const { leads, stats, salesAggregate, tasks, users, integrations, intakeEvents, activeTarget, stages, trend } = pageData;
  const openTasks = tasks.filter((task) => !task.completedAt);
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
  const hasFilters = Boolean(
    filters.search ||
      (selectedStage && selectedStage !== "all") ||
      (filters.source && filters.source !== "all") ||
      (filters.priority && filters.priority !== "all") ||
      filters.assignedTo,
  );
  const welcomeName = getFirstNameLabel(crmUser?.fullName || session.user?.name || session.user?.email);
  const recentLeads = [...leads]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 5);
  const recentLeadNameById = buildLeadDisplayNameMap(recentLeads);
  const workspaceSettings = usingDevelopmentDemoData
    ? resolveStoredWorkspaceSettings(null)
    : await getCompanySettings();
  const dashboardConfig = resolveDashboardConfig(workspaceSettings.dashboard);
  const visibleDashboardWidgetKeys = resolveDashboardWidgetOrder(
    DASHBOARD_WIDGET_KEYS.map((id) => ({ id })),
    dashboardConfig,
  ).map((item) => item.id);
  const visibleDashboardWidgetSet = new Set<DashboardWidgetKey>(visibleDashboardWidgetKeys);
  const salesDashboardWidgetKeys = visibleDashboardWidgetKeys.filter(
    (key) => key !== "my_tasks" && key !== "recent_leads" && key !== "quick_actions",
  );
  const nextActionWidgetOrder = visibleDashboardWidgetKeys.filter(
    (key) => key === "my_tasks" || key === "recent_leads" || key === "quick_actions",
  );
  const stageById = new Map(stages.map((stage) => [stage.id, stage]));
  const salesDashboardSummary = salesAggregate
    ? mergeSalesDashboardSummary(salesAggregate, { intakeEvents, activeTarget })
    : buildSalesDashboardSummary({
        leads,
        tasks,
        users,
        intakeEvents,
        activeTarget,
      });
  const affiliateDashboardSummary =
    accessLevel === "affiliate"
      ? buildAffiliateDashboardSummary({
          leads,
          tasks,
          affiliateEmail: session.user?.email,
          commissionRatePercent: usingDevelopmentDemoData ? 5 : 0,
        })
      : null;
  const searchSlot = (
      <form action={appRoutes.dashboard} className="flex flex-col gap-2">
        <GlassSurface as="div" intensity="soft" border={true} className="flex flex-col gap-2 p-3 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <SearchInput
              defaultValue={filters.search ?? ""}
              placeholder="Search leads, region, tasks, people, or phone"
            />
          </div>
          <SmoothButton type="submit" variant="primary" size="sm">
            Search
          </SmoothButton>
          <Link
            href={appRoutes.dashboard}
            className="admin-button-secondary inline-flex h-8 items-center justify-center rounded-lg px-3 text-sm font-semibold"
          >
            {hasFilters ? "Reset" : "All leads"}
          </Link>
        </GlassSurface>

        {accessLevel !== "sales_rep" && hasFilters ? (
          <div className="rounded-[18px] border border-white/10 bg-black/16 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center justify-center"
                title="Active filters narrow the dashboard view"
              >
                <Filter
                  className="h-4 w-4 text-white/50"
                  aria-label="Active filters narrow the dashboard view"
                />
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">Filters</span>
              {selectedStage && selectedStage !== "all" ? (
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-0.5 text-xs text-white/80">
                  {stages.find((stage) => stage.id === selectedStage)?.name ?? crmLabelize(selectedStage)}
                </span>
              ) : null}
              {filters.source && filters.source !== "all" ? (
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-0.5 text-xs text-white/80">{crmLabelize(filters.source)}</span>
              ) : null}
              {filters.priority && filters.priority !== "all" ? (
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-0.5 text-xs text-white/80">{crmLabelize(filters.priority)}</span>
              ) : null}
              {filters.assignedTo ? (
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-0.5 text-xs text-white/80">Owner</span>
              ) : null}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">Stage</label>
                <AdminSelect
                  name="stage"
                  defaultValue={selectedStage ?? "all"}
                  className="h-11"
                >
                  <option value="all">All stages</option>
                  {stages.filter((stage) => !stage.archived).map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </AdminSelect>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">Source</label>
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
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">Priority</label>
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
            </div>
          </div>
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
        <GlassSurface as="section" intensity="soft" border={true} className="px-4 py-5 sm:px-6 sm:py-6 ld-animate-fade-in-up">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <DashboardHeroClock
                initialNowIso={new Date().toISOString()}
                name={welcomeName}
                nameClassName="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
              />
              <p className="mt-2 text-sm leading-6 text-white/70">
                Here&apos;s what needs attention today.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href={appRoutes.leads}
                className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold"
              >
                Open leads
              </Link>
              <Link
                href={appRoutes.tasks}
                className="admin-button-primary inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold"
              >
                Open tasks
              </Link>
            </div>
          </div>
        </GlassSurface>

        {canSwitchAccessViews && actualAccessLevel ? (
          <AdminCollapsibleSection
            eyebrow="Access"
            title="Switch your view"
            description="Temporarily view the dashboard as a different role to preview what other users see."
            defaultOpen={false}
          >
            <AdminAccessViewSwitcher
              actualAccessLevel={actualAccessLevel}
              activeAccessLevel={accessLevel}
            />
          </AdminCollapsibleSection>
        ) : null}

        {affiliateDashboardSummary ? (
          <AffiliateDashboardPanel
            summary={affiliateDashboardSummary}
            currency={salesDashboardSummary.target?.currency ?? workspaceSettings.globalCurrency}
          />
        ) : accessLevel === "sales_rep" || salesDashboardWidgetKeys.length === 0 ? null : (
          <>
            <SectionHeader
              eyebrow="Performance"
              title="Sales overview"
              description="Key metrics and pipeline health at a glance."
            />
            <div className="ld-animate-fade-in-up">
              <SalesCommandOverview
                summary={salesDashboardSummary}
                stageDefinitions={stages
                  .filter((stage) => !stage.archived)
                  .map((stage) => ({
                    id: stage.id,
                    key: stage.key,
                    name: stage.name,
                    color: stage.color,
                    sortOrder: stage.sortOrder,
                  }))}
                trendData={trend}
                visibleWidgets={visibleDashboardWidgetKeys}
                workspaceCurrency={workspaceSettings.globalCurrency}
              />
            </div>
          </>
        )}

        {nextActionWidgetOrder.length > 0 ? (
          <>
            <SectionHeader
              eyebrow="Workspace"
              title="Next actions"
              description="Tasks, leads, and lanes that need attention now."
            />
            <AdminDashboardWidgetDeck
          initialOrder={nextActionWidgetOrder}
          persistKey={`ld-dashboard-next-actions-v2:${accessLevel}`}
          widgets={[
            {
              id: "my_tasks",
              step: "1",
              stepLabel: "Start here",
              eyebrow: "Tasks to handle",
              title: accessLevel === "sales_rep" ? "Start with these tasks" : "Tasks that need attention first",
              description: "Urgent items, due-today work, and overdue follow-ups surface first.",
              accent: "warm" as const,
              ctaHref: appRoutes.tasks,
              ctaLabel: "View all",
              children:
                focusedTasks.slice(0, 4).length > 0 ? (
                  <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.035]">
                    {focusedTasks.slice(0, 4).map((task, index) => (
                      <article
                        key={task.id}
                        className={cn(
                          "flex flex-col gap-4 px-4 py-4 transition hover:bg-white/[0.06] sm:flex-row sm:items-center sm:justify-between",
                          index < focusedTasks.slice(0, 4).length - 1 ? "border-b border-white/10" : "",
                          isTaskOverdue(task) ? "border-l-2 border-l-rose-400/70" : isDateToday(task.dueAt) ? "border-l-2 border-l-amber-400/70" : "",
                        )}
                      >
                        <div className="min-w-0">
                            <p className="text-base font-semibold text-white">{task.title}</p>
                            <p className="mt-1 text-sm text-white/70">
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
                            href={appRoutes.lead(task.leadId)}
                            className="admin-button-ghost inline-flex h-8 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-white/70 transition-all duration-200 hover:bg-white/[0.06] hover:text-white"
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
              id: "recent_leads",
              step: "2",
              stepLabel: "Review next",
              eyebrow: "Recent leads",
              title: "Newest leads",
              description: "Fresh arrivals, newest activity, and lead context in one quick scan.",
              accent: "cool" as const,
              ctaHref: appRoutes.leads,
              ctaLabel: "View all",
              children:
                recentLeads.length > 0 ? (
                  <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.035]">
                    {recentLeads.map((lead, index) => (
                      <Link
                        key={lead.id}
                        href={appRoutes.lead(lead.id)}
                        className={cn(
                          "block px-4 py-4 transition hover:bg-white/[0.06] ld-animate-fade-in-up",
                          index < recentLeads.length - 1 ? "border-b border-white/10" : "",
                        )}
                        style={{ animationDelay: `${index * 60}ms` }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-base font-semibold text-white [overflow-wrap:anywhere]">
                              {recentLeadNameById[lead.id] || `${(lead.firstName || "Lead").trim()} ${lead.lastName}`.trim()}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-white/70 [overflow-wrap:anywhere]">
                              {lead.email || lead.whatsappNumber || "No contact details yet"}
                            </p>
                            <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-white/70">
                              {lead.state ? formatLeadStateLabel(lead.state) : "Region not captured yet"}
                            </p>
                          </div>
                          <div className="shrink-0 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
                              {formatCrmDateTime(lead.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <SourceBadge source={lead.source} />
                          <StatusBadge
                            status={(stageById.get(lead.stageId ?? "")?.key ?? lead.crmStatus) as CrmStatus}
                            label={stageById.get(lead.stageId ?? "")?.name ?? crmLabelize(lead.crmStatus)}
                            color={stageById.get(lead.stageId ?? "")?.color}
                          />
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
              id: "quick_actions",
              step: "3",
              stepLabel: "Jump in",
              eyebrow: "Operational lanes",
              title: "Open the right workspace fast",
              description: "Open the right place without crowding the dashboard.",
              accent: "navy" as const,
              defaultOpen: false,
              children: (
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    {
                      label: "Leads",
                      copy: "Create, import, filter, assign, and export lead segments.",
                      href: appRoutes.leads,
                    },
                    {
                      label: "Tasks",
                      copy: "Create tasks, clear overdue work, and rebalance follow-up.",
                      href: appRoutes.tasks,
                    },
                    {
                      label: "Reports",
                      copy: "Review pipeline, source performance, and revenue progress.",
                      href: appRoutes.reports,
                    },
                  ].map((lane) => (
                    <Link
                      key={lane.label}
                      href={lane.href}
                      className="admin-surface-muted rounded-[24px] px-4 py-4 transition hover:border-white/20 hover:bg-white/[0.08]"
                    >
                      <p className="text-base font-semibold text-white">{lane.label}</p>
                      <p className="mt-2 text-sm leading-6 text-white/70">{lane.copy}</p>
                    </Link>
                  ))}
                </div>
              ),
            },
          ].filter((widget) =>
            visibleDashboardWidgetSet.has(widget.id as DashboardWidgetKey),
          )}
            />
          </>
        ) : null}

        {showTechnicalSummary ? (
          <AdminCollapsibleSection
            eyebrow="Connected tools"
            title="Tool status"
            description="Live connection health."
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
                    href={getIntegrationManagementHref(integration.provider)}
                  />
                ))
              ) : (
                <div className="md:col-span-2 xl:col-span-3">
                  <EmptyState
                    title="No connected tools yet"
                    description="Connected tools will show up here once setup is saved."
                    icon={PlugZap}
                  />
                </div>
              )}
            </div>
          </AdminCollapsibleSection>
        ) : null}
      </div>
    </AdminShell>
  );
}
