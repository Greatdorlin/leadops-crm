import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { EmptyState } from "@/components/admin/EmptyState";
import { ErrorState } from "@/components/admin/ErrorState";
import { MetricCard } from "@/components/admin/MetricCard";
import { SalesCommandReports } from "@/components/admin/SalesCommandReports";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { getAdminAccessContext } from "@/lib/admin";
import { buildTeamPerformance } from "@/lib/admin-insights";
import { canManageIntegrationsAccess } from "@/lib/admin-permissions";
import {
  crmLabelize,
  formatLeadSourceLabel,
} from "@/lib/crm/formatters";
import { listLeadIntakeEvents } from "@/lib/crm/intake-runtime";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";
import { buildSalesDashboardSummary } from "@/lib/crm/sales-metrics";
import { getActiveGlobalSalesTarget } from "@/lib/crm/sales-targets-admin";
import { buildAdminReportSummary } from "@/lib/crm/view-models";
import { leadStore } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const { session, role, accessLevel, actualAccessLevel, canSwitchAccessViews } =
    await getAdminAccessContext("/admin/reports");
  const showTeamOnly = accessLevel === "lead_sales_rep";
  const showPersonalOnly = accessLevel === "sales_rep";
  const showSourceAndCampaignReports =
    accessLevel === "master_admin" || accessLevel === "general_admin" || canManageIntegrationsAccess(accessLevel, role);
  let pageData:
    | {
        leads: Awaited<ReturnType<typeof leadStore.list>>;
        tasks: Awaited<ReturnType<typeof leadStore.listLeadTasks>>;
        users: Awaited<ReturnType<typeof leadStore.listCrmUsers>>;
        sourceReport: Awaited<ReturnType<typeof leadStore.getSourceReport>>;
        campaignReport: Awaited<ReturnType<typeof leadStore.getCampaignReport>>;
        intakeEvents: Awaited<ReturnType<typeof listLeadIntakeEvents>>;
        activeTarget: Awaited<ReturnType<typeof getActiveGlobalSalesTarget>>;
      }
    | null = null;
  let pageError: unknown = null;

  try {
    const [leads, tasks, users, sourceReport, campaignReport, intakeEvents, activeTarget] = await Promise.all([
      leadStore.list(showPersonalOnly ? { assignedTo: session.user?.email ?? undefined } : undefined),
      leadStore.listLeadTasks(showPersonalOnly ? { assignedTo: session.user?.email ?? undefined } : undefined),
      leadStore.listCrmUsers(),
      showSourceAndCampaignReports ? leadStore.getSourceReport() : Promise.resolve([]),
      showSourceAndCampaignReports ? leadStore.getCampaignReport() : Promise.resolve([]),
      showPersonalOnly ? Promise.resolve([]) : listLeadIntakeEvents({ limit: 8 }),
      getActiveGlobalSalesTarget(),
    ]);

    pageData = { leads, tasks, users, sourceReport, campaignReport, intakeEvents, activeTarget };
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

  const { leads, tasks, users, sourceReport, campaignReport, intakeEvents, activeTarget } = pageData;
  const teamRows = buildTeamPerformance(users, leads, tasks);
  const personalRow =
    teamRows.find((row) => row.email.toLowerCase() === session.user?.email?.toLowerCase()) ?? null;
  const reportSummary = buildAdminReportSummary(leads);
  const converted = leads.filter((lead) => Boolean(lead.wonAt)).length;
  const progressing = leads.filter((lead) => Boolean(lead.stageId) || Boolean(lead.wonAt)).length;
  const highIntentLeads = reportSummary.highIntentLeads;
  const salesReportSummary = buildSalesDashboardSummary({
    leads,
    tasks,
    users,
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
        {showPersonalOnly ? null : <SalesCommandReports summary={salesReportSummary} />}
        {showPersonalOnly ? (
          <>
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <MetricCard label="Assigned leads" value={leads.length} supporting="Leads currently in your queue." tone="accent" />
              <MetricCard label="Contacted" value={personalRow?.contactedLeads ?? 0} supporting="Leads you have moved past new." />
              <MetricCard label="Qualified" value={personalRow?.qualifiedLeads ?? 0} supporting="Leads progressing well." tone="warning" />
              <MetricCard label="Converted" value={personalRow?.convertedLeads ?? 0} supporting="Leads already closed." tone="positive" />
              <MetricCard label="Completed tasks" value={personalRow?.completedTasks ?? 0} supporting="Tasks you have already finished." />
            </section>

            <section className="grid gap-6 xl:grid-cols-12">
              <div className="space-y-6 xl:col-span-7">
                <section className="admin-surface rounded-[24px] p-5">
                  <SectionHeader
                    eyebrow="Pipeline"
                    title="My lead stages"
                    description="Where your current leads sit in the follow-up journey."
                  />
                  <div className="mt-4 space-y-3">
                    {reportSummary.statusReport.length > 0 ? (
                      reportSummary.statusReport.map((item) => (
                        <div key={item.label} className="admin-surface-muted flex items-center justify-between rounded-2xl px-4 py-3">
                          <span className="text-slate-700">{item.label}</span>
                          <span className="font-semibold text-slate-950">{item.value}</span>
                        </div>
                      ))
                    ) : (
                      <EmptyState
                        title="No lead stages yet"
                        description="Your stage breakdown will appear here once leads are assigned to you."
                      />
                    )}
                  </div>
                </section>
              </div>

              <div className="space-y-6 xl:col-span-5">
                <section className="admin-surface rounded-[24px] p-5">
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
                </section>
              </div>
            </section>
          </>
        ) : (
          <>
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <MetricCard label="Total leads" value={leads.length} supporting="Leads visible in this reporting view." tone="accent" />
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
                <section className="admin-surface rounded-[24px] p-5">
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
                              <p className="text-base font-semibold text-slate-950">{row.fullName || row.email}</p>
                              <p className="mt-1.5 text-sm text-slate-500">{crmLabelize(row.accessLevel)}</p>
                            </div>
                            <p className="text-sm font-semibold text-slate-700">{row.assignedLeads} leads</p>
                          </div>
                          <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-5">
                            <p>Open tasks: <span className="text-slate-800">{row.openTasks}</span></p>
                            <p>Overdue: <span className="text-slate-800">{row.overdueTasks}</span></p>
                            <p>Contacted: <span className="text-slate-800">{row.contactedLeads}</span></p>
                            <p>Qualified: <span className="text-slate-800">{row.qualifiedLeads}</span></p>
                            <p>Converted: <span className="text-slate-800">{row.convertedLeads}</span></p>
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
                </section>

                {showSourceAndCampaignReports ? (
                  <section className="admin-surface rounded-[24px] p-5">
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
                                <p className="text-base font-semibold text-slate-950">
                                  {formatLeadSourceLabel(item.source)}
                                </p>
                                <p className="mt-1.5 text-sm text-slate-500">
                                  {item.qualifiedCount} progressing • {item.convertedCount} converted
                                </p>
                              </div>
                              <p className="text-xl font-semibold text-slate-950">{item.leadCount}</p>
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
                  </section>
                ) : null}
              </div>

              <div className="space-y-6 xl:col-span-5">
                <section className="admin-surface rounded-[24px] p-5">
                  <SectionHeader
                    eyebrow="Pipeline status"
                    title="Lead stages"
                    description="Where current lead volume sits in the journey."
                  />
                  <div className="mt-4 space-y-3">
                    {reportSummary.statusReport.length > 0 ? (
                      reportSummary.statusReport.map((item) => (
                        <div key={item.label} className="admin-surface-muted flex items-center justify-between rounded-2xl px-4 py-3">
                          <span className="text-slate-700">{item.label}</span>
                          <span className="font-semibold text-slate-950">{item.value}</span>
                        </div>
                      ))
                    ) : (
                      <EmptyState
                        title="No lead stages yet"
                        description="Lead stages will appear here once the first leads are captured."
                      />
                    )}
                  </div>
                </section>

                <section className="admin-surface rounded-[24px] p-5">
                  <SectionHeader
                    eyebrow="Demand"
                    title="Top interests and locations"
                    description="What current leads are asking for most often."
                  />
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-slate-900">Top interests</p>
                      {reportSummary.interestReport.length > 0 ? (
                        reportSummary.interestReport.slice(0, 5).map((item) => (
                          <div key={item.label} className="admin-surface-muted flex items-center justify-between rounded-2xl px-4 py-3">
                            <span className="text-sm text-slate-700">{item.label}</span>
                            <span className="font-semibold text-slate-950">{item.value}</span>
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
                      <p className="text-sm font-semibold text-slate-900">Location interest</p>
                      {reportSummary.destinationReport.length > 0 ? (
                        reportSummary.destinationReport.slice(0, 5).map((item) => (
                          <div key={item.label} className="admin-surface-muted flex items-center justify-between rounded-2xl px-4 py-3">
                            <span className="text-sm text-slate-700">{item.label}</span>
                            <span className="font-semibold text-slate-950">{item.value}</span>
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
                </section>

                {showSourceAndCampaignReports ? (
                  <section className="admin-surface rounded-[24px] p-5">
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
                                <p className="text-base font-semibold text-slate-950">
                                  {campaign.campaignName || "Unnamed campaign"}
                                </p>
                                <p className="mt-1.5 text-sm text-slate-500">{crmLabelize(campaign.provider)}</p>
                              </div>
                              <p className="text-sm font-semibold text-slate-700">{campaign.costPerLead} CPL</p>
                            </div>
                            <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-5">
                              <p>Spend: <span className="text-slate-800">{campaign.spend}</span></p>
                              <p>Clicks: <span className="text-slate-800">{campaign.clicks}</span></p>
                              <p>Impressions: <span className="text-slate-800">{campaign.impressions}</span></p>
                              <p>Leads: <span className="text-slate-800">{campaign.leads}</span></p>
                              <p>Conversions: <span className="text-slate-800">{campaign.conversions}</span></p>
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
                  </section>
                ) : null}
              </div>
            </section>
          </>
        )}
      </div>
    </AdminShell>
  );
}
