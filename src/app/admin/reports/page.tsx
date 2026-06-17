import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { EmptyState } from "@/components/admin/EmptyState";
import { ErrorState } from "@/components/admin/ErrorState";
import { MetricCard } from "@/components/admin/MetricCard";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { getAdminAccessContext } from "@/lib/admin";
import { buildTeamPerformance } from "@/lib/admin-insights";
import { canManageIntegrationsAccess } from "@/lib/admin-permissions";
import { crmLabelize, formatLeadSourceLabel } from "@/lib/crm/formatters";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";
import { leadStore } from "@/lib/storage";

export const dynamic = "force-dynamic";

function groupCount(values: Array<string | null | undefined>) {
  const grouped = new Map<string, number>();

  for (const value of values) {
    const key = value?.trim() || "Not yet set";
    grouped.set(key, (grouped.get(key) ?? 0) + 1);
  }

  return [...grouped.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([label, value]) => ({ label, value }));
}

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
      }
    | null = null;
  let pageError: unknown = null;

  try {
    const [leads, tasks, users, sourceReport, campaignReport] = await Promise.all([
      leadStore.list(showPersonalOnly ? { assignedTo: session.user?.email ?? undefined } : undefined),
      leadStore.listLeadTasks(showPersonalOnly ? { assignedTo: session.user?.email ?? undefined } : undefined),
      leadStore.listCrmUsers(),
      showSourceAndCampaignReports ? leadStore.getSourceReport() : Promise.resolve([]),
      showSourceAndCampaignReports ? leadStore.getCampaignReport() : Promise.resolve([]),
    ]);

    pageData = { leads, tasks, users, sourceReport, campaignReport };
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

  const { leads, tasks, users, sourceReport, campaignReport } = pageData;
  const teamRows = buildTeamPerformance(users, leads, tasks);
  const personalRow =
    teamRows.find((row) => row.email.toLowerCase() === session.user?.email?.toLowerCase()) ?? null;
  const pathwayReport = groupCount(leads.map((lead) => lead.topPathwayTitle));
  const destinationReport = groupCount(leads.map((lead) => lead.answers.destinationInterest));
  const statusReport = groupCount(leads.map((lead) => lead.crmStatus));
  const converted = leads.filter((lead) => lead.crmStatus === "converted").length;
  const progressing = leads.filter((lead) =>
    ["qualified", "consultation_booked", "application_started", "documents_pending", "payment_pending", "converted"].includes(lead.crmStatus),
  ).length;
  const highIntentLeads = leads.filter(
    (lead) => lead.answers.wantsHumanSupport || lead.priority === "high" || lead.priority === "urgent",
  ).length;

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
                    {statusReport.length > 0 ? (
                      statusReport.map((item) => (
                        <div key={item.label} className="admin-surface-muted flex items-center justify-between rounded-2xl px-4 py-3">
                          <span className="text-slate-700">{crmLabelize(item.label)}</span>
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
                    {statusReport.length > 0 ? (
                      statusReport.map((item) => (
                        <div key={item.label} className="admin-surface-muted flex items-center justify-between rounded-2xl px-4 py-3">
                          <span className="text-slate-700">{crmLabelize(item.label)}</span>
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
                    title="Top pathways and destinations"
                    description="What current leads are asking for most often."
                  />
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-slate-900">Top pathways</p>
                      {pathwayReport.length > 0 ? (
                        pathwayReport.slice(0, 5).map((item) => (
                          <div key={item.label} className="admin-surface-muted flex items-center justify-between rounded-2xl px-4 py-3">
                            <span className="text-sm text-slate-700">{item.label}</span>
                            <span className="font-semibold text-slate-950">{item.value}</span>
                          </div>
                        ))
                      ) : (
                        <EmptyState
                          title="No pathway demand yet"
                          description="Pathway demand appears here once completed assessments generate lead data."
                        />
                      )}
                    </div>
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-slate-900">Destination interest</p>
                      {destinationReport.length > 0 ? (
                        destinationReport.slice(0, 5).map((item) => (
                          <div key={item.label} className="admin-surface-muted flex items-center justify-between rounded-2xl px-4 py-3">
                            <span className="text-sm text-slate-700">{crmLabelize(item.label)}</span>
                            <span className="font-semibold text-slate-950">{item.value}</span>
                          </div>
                        ))
                      ) : (
                        <EmptyState
                          title="No destination interest yet"
                          description="Destination interest will appear here once leads submit their preferences."
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
