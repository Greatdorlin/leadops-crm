import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminCollapsibleSection } from "@/components/admin/AdminCollapsibleSection";
import { AffiliateDashboardPanel } from "@/components/admin/AffiliateDashboardPanel";
import { DashboardRecentLeads } from "@/components/admin/DashboardRecentLeads";
import { DashboardHeroClock } from "@/components/admin/DashboardHeroClock";
import { SalesCommandOverview } from "@/components/admin/SalesCommandOverview";
import { AdminShell } from "@/components/admin/AdminShell";
import { ErrorState } from "@/components/admin/ErrorState";
import { MetricCard } from "@/components/admin/MetricCard";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { GlassSurface } from "@/components/admin/ui/GlassSurface";
import { SectionHeader } from "@/components/admin/ui/SectionHeader";
import { AdminAccessViewSwitcher } from "@/components/admin/AdminAccessViewSwitcher";
import { getAdminAccessContext } from "@/lib/admin";
import { isLocalAdminPreviewEmail } from "@/lib/admin-access";
import { parseLeadListFilters } from "@/lib/admin-leads";
import {
  canViewSalesTeam,
  scopeLeadListFilters,
  type AdminAccessLevel,
} from "@/lib/admin-permissions";
import { buildLeadDisplayNameMap } from "@/lib/crm/lead-identity";
import {
  crmLabelize,
} from "@/lib/crm/formatters";
import { listLeadIntakeEvents } from "@/lib/crm/intake-runtime";
import { listLeadStages } from "@/lib/crm/lead-stages-admin";
import { buildAffiliateDashboardSummary } from "@/lib/crm/affiliate-dashboard";
import { canAccessAffiliateDashboard } from "@/lib/crm/authz";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";
import {
  buildSalesDashboardSummary,
  mergeSalesDashboardSummary,
} from "@/lib/crm/sales-metrics";
import { getResolvedSalesTargetForUser } from "@/lib/crm/sales-targets-admin";
import { appRoutes } from "@/lib/app-routes";
import {
  DASHBOARD_WIDGET_KEYS,
  resolveDashboardConfig,
  resolveDashboardWidgetOrder,
  resolveStoredWorkspaceSettings,
  type DashboardWidgetKey,
} from "@/lib/crm/workspace-settings";
import { getCompanySettings } from "@/lib/crm/workspace-settings-server";
import type { CrmStatus, LeadRecord } from "@/lib/crm/types";
import { leadStore } from "@/lib/storage";

export const dynamic = "force-dynamic";

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
  } as Awaited<ReturnType<typeof getResolvedSalesTargetForUser>>;
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
  if (
    accessLevel === "affiliate" &&
    !canAccessAffiliateDashboard({
      accessLevel,
      email: session.user?.email,
      permissions,
      role,
    })
  ) {
    redirect(appRoutes.leads);
  }
  const params = await searchParams;
  const filters = parseLeadListFilters(params);
  const scopedFilters = scopeLeadListFilters(filters, accessLevel, session.user?.email, crmUser);
  const showTeamViews = canViewSalesTeam(accessLevel, permissions);
  const usePersonalTaskScope = accessLevel === "sales_rep" || accessLevel === "finance";
  const showIntakeFeed =
    accessLevel !== "sales_rep" && accessLevel !== "affiliate" && accessLevel !== "finance";
  let pageError: unknown = null;
  let pageData:
    | {
        leads: Awaited<ReturnType<typeof leadStore.list>>;
        salesAggregate: Awaited<ReturnType<typeof leadStore.getSalesPipelineAggregate>> | null;
        tasks: Awaited<ReturnType<typeof leadStore.listLeadTasks>>;
        users: Awaited<ReturnType<typeof leadStore.listCrmUsers>>;
        intakeEvents: Awaited<ReturnType<typeof listLeadIntakeEvents>>;
        activeTarget: Awaited<ReturnType<typeof getResolvedSalesTargetForUser>>;
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
    const [leads, salesAggregate, tasks, users, intakeEvents, activeTarget, stages, trend] = await Promise.all([
      leadStore.list({
        ...scopedFilters,
        limit: 120,
      }),
      leadStore.getSalesPipelineAggregate(scopedFilters),
      leadStore.listLeadTasks({
        assignedTo: usePersonalTaskScope ? session.user?.email ?? undefined : undefined,
        leadAssignedTo: scopedFilters.assignedTo,
        leadAffiliateReferrerId: scopedFilters.affiliateReferrerId,
        branchId: scopedFilters.branchId,
        departmentId: scopedFilters.departmentId,
        teamId: scopedFilters.teamId,
        scopeDenied: scopedFilters.scopeDenied,
        limit: 500,
      }),
      showTeamViews ? leadStore.listCrmUsers() : Promise.resolve([]),
      showIntakeFeed ? listLeadIntakeEvents({ limit: 8 }) : Promise.resolve([]),
      getResolvedSalesTargetForUser(crmUser),
      listLeadStages(),
      leadStore.getDashboardTrend(scopedFilters, 14),
    ]);

    pageData = {
      leads,
      salesAggregate,
      tasks,
      users,
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

  const { leads, salesAggregate, tasks, users, intakeEvents, activeTarget, stages, trend } = pageData;
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
  const stageById = new Map(stages.map((stage) => [stage.id, stage]));
  const dashboardStageOptions = stages
    .filter((stage) => !stage.archived)
    .map((stage) => ({
      id: stage.id,
      key: stage.key,
      label: stage.name,
      color: stage.color,
    }));
  const dashboardAssigneeOptions = users
    .filter((user) => user.isActive)
    .map((user) => ({
      avatarUrl: user.avatarUrl,
      detail: user.role,
      label: user.fullName || user.email,
      value: user.email,
    }));
  const dashboardRecentLeads = recentLeads.map((lead) => {
    const stage = stageById.get(lead.stageId ?? "");
    return {
      assignedTo: lead.assignedTo,
      contact: lead.email || lead.whatsappNumber || "No contact details yet",
      createdAt: lead.createdAt,
      id: lead.id,
      location: lead.region || lead.city || lead.state || lead.country || "Location not captured",
      name: recentLeadNameById[lead.id] || `${(lead.firstName || "Lead").trim()} ${lead.lastName}`.trim(),
      nextFollowUpAt: lead.nextFollowUpAt ?? null,
      priority: lead.priority,
      source: lead.source,
      stageColor: stage?.color ?? null,
      stageId: lead.stageId ?? null,
      stageLabel: stage?.name ?? crmLabelize(lead.crmStatus),
    };
  });
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
          affiliateUserId: crmUser?.id,
          affiliateEmail: session.user?.email,
          commissionRatePercent: usingDevelopmentDemoData ? 5 : 0,
        })
      : null;
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
        ) : accessLevel === "sales_rep" ? (
          <section className="space-y-4 ld-animate-fade-in-up">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <SectionHeader
                eyebrow="Performance"
                title="My performance"
                description="Your private pipeline, results, and active sales target."
              />
              <Link
                href={appRoutes.reports}
                className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold"
              >
                View details
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="My pipeline" value={`${salesDashboardSummary.target?.currency ?? workspaceSettings.globalCurrency} ${salesDashboardSummary.pipelineValue.toLocaleString()}`} supporting="Open expected value in your queue." />
              <MetricCard label="My won value" value={`${salesDashboardSummary.target?.currency ?? workspaceSettings.globalCurrency} ${salesDashboardSummary.wonValue.toLocaleString()}`} supporting="Value closed in your reporting view." tone="positive" />
              <MetricCard label="Converted" value={salesDashboardSummary.wonLeads} supporting="Leads you have closed." tone="positive" />
              <MetricCard
                label="Target progress"
                value={salesDashboardSummary.target ? `${salesDashboardSummary.target.progressPercent}%` : "Not set"}
                supporting={salesDashboardSummary.target?.name ?? "No active target applies to you."}
                tone={salesDashboardSummary.target ? "accent" : "default"}
              />
            </div>
          </section>
        ) : salesDashboardWidgetKeys.length === 0 ? null : (
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

        {visibleDashboardWidgetSet.has("recent_leads") ? (
          <DashboardRecentLeads
            leads={dashboardRecentLeads}
            stageOptions={dashboardStageOptions}
            assigneeOptions={dashboardAssigneeOptions}
            previewMode={usingDevelopmentDemoData}
          />
        ) : null}

      </div>
    </AdminShell>
  );
}
