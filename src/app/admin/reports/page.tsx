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
import {
  canAccessReports,
  canManageIntegrationsAccess,
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

export default async function AdminReportsPage() {
  const {
    session,
    role,
    accessLevel,
    actualAccessLevel,
    canSwitchAccessViews,
    permissions,
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

  try {
    const reportFilters = showPersonalOnly
      ? { assignedTo: session.user?.email ?? undefined }
      : {};
    const [leadDistribution, stats, salesAggregate, teamRows, sourceReport, campaignReport, intakeEvents, activeTarget, workspaceSettings] = await Promise.all([
      leadStore.getLeadDistributionReport(reportFilters),
      leadStore.getDashboardStats(reportFilters),
      leadStore.getSalesPipelineAggregate(reportFilters),
      leadStore.getTeamPerformance(),
      showSourceAndCampaignReports ? leadStore.getSourceReport() : Promise.resolve([]),
      showSourceAndCampaignReports ? leadStore.getCampaignReport() : Promise.resolve([]),
      showPersonalOnly ? Promise.resolve([]) : listLeadIntakeEvents({ limit: 8 }),
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
