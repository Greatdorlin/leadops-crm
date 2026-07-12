import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { EmptyState } from "@/components/admin/EmptyState";
import { ErrorState } from "@/components/admin/ErrorState";
import { MetricCard } from "@/components/admin/MetricCard";
import { GlassSurface } from "@/components/admin/ui/GlassSurface";
import { SalesCommandReports } from "@/components/admin/SalesCommandReports";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { getAdminAccessContext } from "@/lib/admin";
import { isLocalAdminPreviewEmail } from "@/lib/admin-access";
import {
  canAccessReports,
  canManageIntegrationsAccess,
  scopeLeadListFilters,
} from "@/lib/admin-permissions";
import { appRoutes } from "@/lib/app-routes";
import {
  crmLabelize,
  formatLeadSourceLabel,
} from "@/lib/crm/formatters";
import { listLeadIntakeEvents } from "@/lib/crm/intake-runtime";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";
import { mergeSalesDashboardSummary } from "@/lib/crm/sales-metrics";
import { getActiveGlobalSalesTarget } from "@/lib/crm/sales-targets-admin";
import { getCompanySettings } from "@/lib/crm/workspace-settings-server";
import { leadStore } from "@/lib/storage";

export const dynamic = "force-dynamic";

function buildDevelopmentReportsData() {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  const intakeEvents = [
    {
      id: "demo-intake-report-1",
      status: "lead_created" as const,
      sourceName: "Executive consultation form",
      leadId: "demo-lead-1",
      leadName: "Aurelia Systems",
      errorMessage: null,
      normalizedSummary: [{ label: "Interest", value: "Enterprise sales operations" }],
      rawPayload: null,
      createdAt: new Date(now.getTime() - 32 * 60 * 1000).toISOString(),
    },
    {
      id: "demo-intake-report-2",
      status: "lead_created" as const,
      sourceName: "Meta lead campaign",
      leadId: "demo-lead-2",
      leadName: "Vertex Labs",
      errorMessage: null,
      normalizedSummary: [{ label: "Interest", value: "Growth implementation" }],
      rawPayload: null,
      createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
    },
  ];

  return {
    leadDistribution: {
      interestReport: [
        { label: "Enterprise implementation", value: 18 },
        { label: "Revenue operations", value: 14 },
        { label: "Advisory package", value: 9 },
        { label: "Team enablement", value: 7 },
      ],
      locationReport: [
        { label: "Lagos", value: 16 },
        { label: "London", value: 11 },
        { label: "Accra", value: 8 },
        { label: "Toronto", value: 6 },
      ],
    },
    stats: {
      totalLeads: 56,
      newLeadsToday: 8,
      unassignedLeads: 3,
      followUpsDueToday: 9,
      capturedLeads: 56,
      consultationReadyLeads: 17,
      highPriorityLeads: 12,
      failedIntegrations: 0,
      facebookLeadsThisWeek: 14,
      websiteLeadsThisWeek: 19,
      senderSyncStatus: { success: 53, pending: 3, failed: 0, notConfigured: 0, skipped: 0 },
    },
    salesAggregate: {
      totalLeads: 56,
      newLeads: 18,
      leadsThisMonth: 41,
      overdueFollowUps: 4,
      dueTodayFollowUps: 9,
      stuckLeads: 5,
      wonLeads: 9,
      lostLeads: 4,
      pipelineValue: 18400000,
      wonValue: 7300000,
      conversionRate: 16.1,
      topSources: [
        { label: "Website form", totalLeads: 19, wonLeads: 4, wonValue: 3100000, pipelineValue: 6100000, conversionRate: 21.1 },
        { label: "Facebook lead ads", totalLeads: 14, wonLeads: 2, wonValue: 1700000, pipelineValue: 4700000, conversionRate: 14.3 },
        { label: "Referral", totalLeads: 11, wonLeads: 2, wonValue: 1600000, pipelineValue: 3900000, conversionRate: 18.2 },
        { label: "LinkedIn lead forms", totalLeads: 7, wonLeads: 1, wonValue: 900000, pipelineValue: 2400000, conversionRate: 14.3 },
      ],
      stagePerformance: [
        { id: "demo-stage-new", key: "new", label: "New", color: "#60a5fa", sortOrder: 0, totalLeads: 18, wonValue: 0, pipelineValue: 2800000 },
        { id: "demo-stage-contacted", key: "contacted", label: "Contacted", color: "#a78bfa", sortOrder: 1, totalLeads: 13, wonValue: 0, pipelineValue: 4300000 },
        { id: "demo-stage-qualified", key: "qualified", label: "Qualified", color: "#22d3ee", sortOrder: 2, totalLeads: 12, wonValue: 0, pipelineValue: 7300000 },
        { id: "demo-stage-won", key: "converted", label: "Won", color: "#34d399", sortOrder: 3, totalLeads: 9, wonValue: 7300000, pipelineValue: 0 },
        { id: "demo-stage-lost", key: "lost", label: "Lost", color: "#fb7185", sortOrder: 4, totalLeads: 4, wonValue: 0, pipelineValue: 0 },
      ],
      repPerformance: [
        { id: "demo-user-sarah", label: "Sarah Kim", assignedLeads: 21, overdueFollowUps: 1, wonLeads: 4, wonValue: 3200000, pipelineValue: 6400000, conversionRate: 19 },
        { id: "demo-user-james", label: "James Lee", assignedLeads: 18, overdueFollowUps: 2, wonLeads: 3, wonValue: 2400000, pipelineValue: 5900000, conversionRate: 16.7 },
        { id: "demo-user-priya", label: "Priya Shah", assignedLeads: 14, overdueFollowUps: 1, wonLeads: 2, wonValue: 1700000, pipelineValue: 4700000, conversionRate: 14.3 },
      ],
    },
    teamRows: [
      { id: "demo-user-sarah", email: "sarah@example.com", fullName: "Sarah Kim", role: "sales_agent" as const, accessLevel: "sales_rep" as const, assignedLeads: 21, openTasks: 8, overdueTasks: 1, dueTodayTasks: 3, completedTasks: 34, contactedLeads: 17, qualifiedLeads: 9, convertedLeads: 4, highPriorityLeads: 5, lastActivityAt: now.toISOString() },
      { id: "demo-user-james", email: "james@example.com", fullName: "James Lee", role: "sales_agent" as const, accessLevel: "sales_rep" as const, assignedLeads: 18, openTasks: 7, overdueTasks: 2, dueTodayTasks: 4, completedTasks: 29, contactedLeads: 14, qualifiedLeads: 8, convertedLeads: 3, highPriorityLeads: 4, lastActivityAt: now.toISOString() },
      { id: "demo-user-priya", email: "priya@example.com", fullName: "Priya Shah", role: "sales_agent" as const, accessLevel: "sales_rep" as const, assignedLeads: 14, openTasks: 5, overdueTasks: 1, dueTodayTasks: 2, completedTasks: 26, contactedLeads: 12, qualifiedLeads: 6, convertedLeads: 2, highPriorityLeads: 3, lastActivityAt: now.toISOString() },
    ],
    sourceReport: [
      { source: "website_form" as const, leadCount: 19, qualifiedCount: 11, convertedCount: 4, highPriorityCount: 5 },
      { source: "facebook_lead_ads" as const, leadCount: 14, qualifiedCount: 7, convertedCount: 2, highPriorityCount: 4 },
      { source: "referral" as const, leadCount: 11, qualifiedCount: 7, convertedCount: 2, highPriorityCount: 2 },
    ],
    campaignReport: [
      { provider: "google_ads" as const, campaignId: "demo-search", campaignName: "High-intent search", spend: "NGN 620,000", clicks: 842, impressions: 19300, leads: 27, conversions: 6, costPerLead: "NGN 22,963" },
      { provider: "facebook" as const, campaignId: "demo-meta", campaignName: "Executive growth campaign", spend: "NGN 410,000", clicks: 1160, impressions: 42800, leads: 31, conversions: 5, costPerLead: "NGN 13,226" },
    ],
    intakeEvents,
    activeTarget: {
      id: "demo-target",
      name: "Monthly revenue target",
      scope: "global" as const,
      scopeId: null,
      period: "monthly" as const,
      targetValue: 12000000,
      currency: "NGN",
      startDate: monthStart.toISOString().slice(0, 10),
      endDate: monthEnd.toISOString().slice(0, 10),
      isActive: true,
      archived: false,
      createdAt: monthStart.toISOString(),
      updatedAt: now.toISOString(),
    },
    workspaceCurrency: "NGN",
  };
}

export default async function AdminReportsPage() {
  const {
    session,
    role,
    accessLevel,
    actualAccessLevel,
    canSwitchAccessViews,
    permissions,
    crmUser,
  } =
    await getAdminAccessContext(appRoutes.reports);
  if (!canAccessReports(accessLevel, permissions)) {
    redirect(appRoutes.dashboard);
  }
  const showTeamOnly = accessLevel === "lead_sales_rep";
  const showPersonalOnly = accessLevel === "sales_rep";
  const showSourceAndCampaignReports =
    canManageIntegrationsAccess(accessLevel, role, permissions);
  let pageData:
    | {
        leadDistribution: Awaited<ReturnType<typeof leadStore.getLeadDistributionReport>>;
        stats: Awaited<ReturnType<typeof leadStore.getDashboardStats>>;
        salesAggregate: Awaited<ReturnType<typeof leadStore.getSalesPipelineAggregate>>;
        teamRows: Awaited<ReturnType<typeof leadStore.getTeamPerformance>>;
        sourceReport: Awaited<ReturnType<typeof leadStore.getSourceReport>>;
        campaignReport: Awaited<ReturnType<typeof leadStore.getCampaignReport>>;
        intakeEvents: Awaited<ReturnType<typeof listLeadIntakeEvents>>;
        activeTarget: Awaited<ReturnType<typeof getActiveGlobalSalesTarget>>;
        workspaceCurrency: string;
      }
    | null = null;
  let pageError: unknown = null;

  if (isLocalAdminPreviewEmail(session.user?.email)) {
    pageData = buildDevelopmentReportsData();
  } else try {
    const reportFilters = scopeLeadListFilters({}, accessLevel, session.user?.email, crmUser);
    const [leadDistribution, stats, salesAggregate, teamRows, sourceReport, campaignReport, intakeEvents, activeTarget, workspaceSettings] = await Promise.all([
      leadStore.getLeadDistributionReport(reportFilters),
      leadStore.getDashboardStats(reportFilters),
      leadStore.getSalesPipelineAggregate(reportFilters),
      leadStore.getTeamPerformance(reportFilters),
      showSourceAndCampaignReports ? leadStore.getSourceReport(reportFilters) : Promise.resolve([]),
      showSourceAndCampaignReports ? leadStore.getCampaignReport() : Promise.resolve([]),
      accessLevel === "master_admin" || accessLevel === "general_admin"
        ? listLeadIntakeEvents({ limit: 8 })
        : Promise.resolve([]),
      getActiveGlobalSalesTarget(),
      getCompanySettings(),
    ]);

    pageData = {
      leadDistribution,
      stats,
      salesAggregate,
      teamRows,
      sourceReport,
      campaignReport,
      intakeEvents,
      activeTarget,
      workspaceCurrency: workspaceSettings.globalCurrency,
    };
  } catch (error) {
    pageError = error;
    logCrmPageError("reports", error);
    if (process.env.NODE_ENV !== "production") {
      pageData = buildDevelopmentReportsData();
    }
  }

  if (!pageData) {
    const errorCopy = getCrmPageErrorCopy(pageError);

    return (
      <AdminShell
        activeNav="reports"
        accessLevel={accessLevel}
        role={role}
        actualAccessLevel={actualAccessLevel}
        canSwitchAccessViews={canSwitchAccessViews}
        title={showPersonalOnly ? "My performance" : "Reports"}
        description={
          showPersonalOnly
            ? "Your personal lead and follow-up results."
            : "Pipeline, performance, and demand signals for the sales team."
        }
        actions={<AdminSignOutButton />}
      >
        <ErrorState
          title={errorCopy.title}
          description={errorCopy.description}
          details={errorCopy.details}
        />
      </AdminShell>
    );
  }

  const {
    leadDistribution,
    stats,
    salesAggregate,
    teamRows,
    sourceReport,
    campaignReport,
    intakeEvents,
    activeTarget,
    workspaceCurrency,
  } = pageData;
  const personalRow =
    teamRows.find((row) => row.email.toLowerCase() === session.user?.email?.toLowerCase()) ?? null;
  const reportSummary = leadDistribution;
  const statusReport = salesAggregate.stagePerformance.map((row) => ({
    label: row.label,
    value: row.totalLeads,
  }));
  const converted = salesAggregate.wonLeads;
  const progressing = Math.max(
    0,
    salesAggregate.totalLeads - salesAggregate.newLeads - salesAggregate.lostLeads,
  );
  const highIntentLeads = stats.highPriorityLeads;
  const salesReportSummary = mergeSalesDashboardSummary(salesAggregate, {
    intakeEvents,
    activeTarget,
  });

  return (
    <AdminShell
      activeNav="reports"
      accessLevel={accessLevel}
      role={role}
      actualAccessLevel={actualAccessLevel}
      canSwitchAccessViews={canSwitchAccessViews}
      title={showPersonalOnly ? "My performance" : "Reports"}
      description={
        showPersonalOnly
          ? "Your lead progress, follow-up output, and conversion results."
          : showTeamOnly
            ? "Team workload, qualification progress, and rep performance."
            : "Pipeline, demand, source quality, and team performance across the CRM."
      }
      actions={<AdminSignOutButton />}
    >
      <div className="space-y-6">
        {showPersonalOnly ? null : (
          <SalesCommandReports
            summary={salesReportSummary}
            workspaceCurrency={workspaceCurrency}
          />
        )}
        {showPersonalOnly ? (
          <>
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <MetricCard label="Assigned leads" value={salesAggregate.totalLeads} supporting="Leads currently in your queue." tone="accent" />
              <MetricCard label="Contacted" value={personalRow?.contactedLeads ?? 0} supporting="Leads you have moved past new." />
              <MetricCard label="Qualified" value={personalRow?.qualifiedLeads ?? 0} supporting="Leads progressing well." tone="warning" />
              <MetricCard label="Converted" value={personalRow?.convertedLeads ?? 0} supporting="Leads already closed." tone="positive" />
              <MetricCard label="Completed tasks" value={personalRow?.completedTasks ?? 0} supporting="Tasks you have already finished." />
            </section>

            <section className="grid gap-6 xl:grid-cols-12">
              <div className="space-y-6 xl:col-span-7">
                <GlassSurface as="section" className="rounded-[24px] p-5 ld-animate-fade-in-up">
                  <SectionHeader
                    eyebrow="Pipeline"
                    title="My lead stages"
                    description="Where your current leads sit in the follow-up journey."
                  />
                  <div className="mt-4 space-y-3">
                    {statusReport.length > 0 ? (
                      statusReport.map((item) => (
                        <div key={item.label} className="admin-surface-muted flex items-center justify-between rounded-2xl px-4 py-3">
                          <span className="text-white/80">{item.label}</span>
                          <span className="font-semibold text-white">{item.value}</span>
                        </div>
                      ))
                    ) : (
                      <EmptyState
                        title="No lead stages yet"
                        description="Your stage breakdown will appear here once leads are assigned to you."
                      />
                    )}
                  </div>
                </GlassSurface>
              </div>

              <div className="space-y-6 xl:col-span-5">
                <GlassSurface as="section" className="rounded-[24px] p-5 ld-animate-fade-in-up">
                  <SectionHeader
                    eyebrow="Focus"
                    title="My priority signals"
                    description="The quick numbers that show where your effort should go next."
                  />
                  <div className="mt-4 grid gap-3">
                    <MetricCard label="Open tasks" value={personalRow?.openTasks ?? 0} supporting="Tasks still in progress." />
                    <MetricCard label="Overdue tasks" value={personalRow?.overdueTasks ?? 0} supporting="Follow-ups that need a catch-up." tone="danger" />
                    <MetricCard label="High-priority leads" value={personalRow?.highPriorityLeads ?? 0} supporting="Leads worth moving early." tone="warning" />
                  </div>
                </GlassSurface>
              </div>
            </section>
          </>
        ) : (
          <>
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <MetricCard label="Total leads" value={salesAggregate.totalLeads} supporting="Leads visible in this reporting view." tone="accent" />
              <MetricCard label="Converted" value={converted} supporting="Leads marked converted." tone="positive" />
              <MetricCard label="Progressing" value={progressing} supporting="Leads moving forward in the pipeline." />
              <MetricCard label="High intent" value={highIntentLeads} supporting="Human-support requests or high-priority signals." tone="warning" />
              <MetricCard
                label="Active reps"
                value={teamRows.length}
                supporting="Team members with current lead or task activity."
              />
            </section>

            <section className="grid gap-6 xl:grid-cols-12">
              <div className="space-y-6 xl:col-span-7">
                <GlassSurface as="section" className="rounded-[24px] p-5 ld-animate-fade-in-up">
                  <SectionHeader
                    eyebrow="Team performance"
                    title="Rep workload and results"
                    description="How the current queue, qualification progress, and conversions are distributed across the team."
                  />
                  <div className="mt-4 grid gap-3">
                    {teamRows.length > 0 ? (
                      teamRows.map((row) => (
                        <div key={row.id} className="admin-surface-muted rounded-2xl p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-base font-semibold text-white">{row.fullName || row.email}</p>
                              <p className="mt-1.5 text-sm text-white/60">{crmLabelize(row.accessLevel)}</p>
                            </div>
                            <p className="text-sm font-semibold text-white/80">{row.assignedLeads} leads</p>
                          </div>
                          <div className="mt-4 grid gap-3 text-sm text-white/70 md:grid-cols-5">
                            <p>Open tasks: <span className="text-white/90">{row.openTasks}</span></p>
                            <p>Overdue: <span className="text-white/90">{row.overdueTasks}</span></p>
                            <p>Contacted: <span className="text-white/90">{row.contactedLeads}</span></p>
                            <p>Qualified: <span className="text-white/90">{row.qualifiedLeads}</span></p>
                            <p>Converted: <span className="text-white/90">{row.convertedLeads}</span></p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyState
                        title="No team performance yet"
                        description="Rep performance will appear here once leads and tasks are assigned."
                      />
                    )}
                  </div>
                </GlassSurface>

                {showSourceAndCampaignReports ? (
                  <GlassSurface as="section" className="rounded-[24px] p-5 ld-animate-fade-in-up">
                    <SectionHeader
                      eyebrow="Lead sources"
                      title="Source performance"
                      description="Lead volume, progression, and conversion by source."
                    />
                    <div className="mt-4 space-y-3">
                      {sourceReport.length > 0 ? (
                        sourceReport.map((item) => (
                          <div key={item.source} className="admin-surface-muted rounded-2xl p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-base font-semibold text-white">
                                  {formatLeadSourceLabel(item.source)}
                                </p>
                                <p className="mt-1.5 text-sm text-white/60">
                                  {item.qualifiedCount} progressing • {item.convertedCount} converted
                                </p>
                              </div>
                              <p className="text-xl font-semibold text-white">{item.leadCount}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <EmptyState
                          title="No source performance yet"
                          description="Source performance will appear here once lead activity starts flowing in."
                        />
                      )}
                    </div>
                  </GlassSurface>
                ) : null}
              </div>

              <div className="space-y-6 xl:col-span-5">
                <GlassSurface as="section" className="rounded-[24px] p-5 ld-animate-fade-in-up">
                    <SectionHeader
                    eyebrow="Pipeline status"
                    title="Lead stages"
                    description="Where current lead volume sits in the journey."
                  />
                  <div className="mt-4 space-y-3">
                    {statusReport.length > 0 ? (
                      statusReport.map((item) => (
                        <div key={item.label} className="admin-surface-muted flex items-center justify-between rounded-2xl px-4 py-3">
                          <span className="text-white/80">{item.label}</span>
                          <span className="font-semibold text-white">{item.value}</span>
                        </div>
                      ))
                    ) : (
                      <EmptyState
                        title="No lead stages yet"
                        description="Lead stages will appear here once the first leads are captured."
                      />
                    )}
                  </div>
                </GlassSurface>

                <GlassSurface as="section" className="rounded-[24px] p-5 ld-animate-fade-in-up">
                  <SectionHeader
                    eyebrow="Demand"
                    title="Top interests and locations"
                    description="What current leads are asking for most often."
                  />
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-white">Top interests</p>
                      {reportSummary.interestReport.length > 0 ? (
                        reportSummary.interestReport.slice(0, 5).map((item) => (
                          <div key={item.label} className="admin-surface-muted flex items-center justify-between rounded-2xl px-4 py-3">
                            <span className="text-sm text-white/80">{item.label}</span>
                            <span className="font-semibold text-white">{item.value}</span>
                          </div>
                        ))
                      ) : (
                        <EmptyState
                          title="No demand signals yet"
                          description="Interest trends appear here once more lead details are captured."
                        />
                      )}
                    </div>
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-white">Location interest</p>
                      {reportSummary.locationReport.length > 0 ? (
                        reportSummary.locationReport.slice(0, 5).map((item) => (
                          <div key={item.label} className="admin-surface-muted flex items-center justify-between rounded-2xl px-4 py-3">
                            <span className="text-sm text-white/80">{item.label}</span>
                            <span className="font-semibold text-white">{item.value}</span>
                          </div>
                        ))
                      ) : (
                        <EmptyState
                          title="No location interest yet"
                          description="Location trends will appear here once leads share their preferences."
                        />
                      )}
                    </div>
                  </div>
                </GlassSurface>

                {showSourceAndCampaignReports ? (
                  <GlassSurface as="section" className="rounded-[24px] p-5 ld-animate-fade-in-up">
                    <SectionHeader
                      eyebrow="Campaign performance"
                      title="Stored campaign activity"
                      description="Spend, clicks, impressions, leads, and cost per lead from stored ads activity."
                    />
                    <div className="mt-4 space-y-3">
                      {campaignReport.length > 0 ? (
                        campaignReport.map((campaign) => (
                          <div key={`${campaign.provider}-${campaign.campaignId}`} className="admin-surface-muted rounded-2xl p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="text-base font-semibold text-white">
                                  {campaign.campaignName || "Unnamed campaign"}
                                </p>
                                <p className="mt-1.5 text-sm text-white/60">{crmLabelize(campaign.provider)}</p>
                              </div>
                              <p className="text-sm font-semibold text-white/80">{campaign.costPerLead} CPL</p>
                            </div>
                            <div className="mt-4 grid gap-3 text-sm text-white/70 md:grid-cols-5">
                              <p>Spend: <span className="text-white/90">{campaign.spend}</span></p>
                              <p>Clicks: <span className="text-white/90">{campaign.clicks}</span></p>
                              <p>Impressions: <span className="text-white/90">{campaign.impressions}</span></p>
                              <p>Leads: <span className="text-white/90">{campaign.leads}</span></p>
                              <p>Conversions: <span className="text-white/90">{campaign.conversions}</span></p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <EmptyState
                          title="No campaign performance yet"
                          description="Campaign activity will appear here after ad performance is refreshed."
                        />
                      )}
                    </div>
                  </GlassSurface>
                ) : null}
              </div>
            </section>
          </>
        )}
      </div>
    </AdminShell>
  );
}
