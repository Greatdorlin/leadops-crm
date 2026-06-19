import type { SalesDashboardSummary } from "@/lib/crm/sales-metrics";
import { EmptyState } from "./EmptyState";
import { MetricCard } from "./MetricCard";
import { SectionHeader } from "./SectionHeader";

function formatMoney(value: number, currency = "NGN") {
  return `${currency} ${value.toLocaleString()}`;
}

export function SalesCommandReports({
  summary,
}: {
  summary: SalesDashboardSummary;
}) {
  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="Pipeline value" value={formatMoney(summary.pipelineValue, summary.target?.currency ?? "NGN")} supporting="Open lead value." />
        <MetricCard label="Won value" value={formatMoney(summary.wonValue, summary.target?.currency ?? "NGN")} supporting="Closed value so far." tone="positive" />
        <MetricCard label="Conversion rate" value={`${summary.conversionRate}%`} supporting="Won leads against total volume." />
        <MetricCard label="Overdue follow-ups" value={summary.overdueFollowUps} supporting="Needs action now." tone={summary.overdueFollowUps > 0 ? "danger" : "positive"} />
        <MetricCard label="Webhook failures" value={summary.intakeSummary.failed} supporting="Failed intake submissions." tone={summary.intakeSummary.failed > 0 ? "danger" : "positive"} />
        <MetricCard label="Leads this month" value={summary.leadsThisMonth} supporting="Current month intake volume." tone="accent" />
      </section>

      <section className="grid gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-7">
          <section className="admin-surface rounded-[24px] p-5">
            <SectionHeader
              eyebrow="Source performance"
              title="Which sources are converting"
              description="Lead volume, pipeline value, and won value by source."
            />
            <div className="mt-4 space-y-3">
              {summary.topSources.length > 0 ? (
                summary.topSources.map((source) => (
                  <div key={source.label} className="admin-surface-muted rounded-2xl p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-slate-950">{source.label}</p>
                        <p className="mt-1.5 text-sm text-slate-500">
                          {source.totalLeads} leads • {source.wonLeads} won • {source.conversionRate}% conversion
                        </p>
                      </div>
                      <div className="text-right text-sm text-slate-600">
                        <p>{formatMoney(source.pipelineValue, summary.target?.currency ?? "NGN")} pipeline</p>
                        <p className="mt-1">{formatMoney(source.wonValue, summary.target?.currency ?? "NGN")} won</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No source performance yet"
                  description="Source performance will appear once leads are captured."
                />
              )}
            </div>
          </section>

          <section className="admin-surface rounded-[24px] p-5">
            <SectionHeader
              eyebrow="Rep performance"
              title="Who is closing and who is stuck"
              description="Lead ownership, overdue follow-ups, and results by rep."
            />
            <div className="mt-4 space-y-3">
              {summary.repPerformance.length > 0 ? (
                summary.repPerformance.map((row) => (
                  <div key={row.id} className="admin-surface-muted rounded-2xl p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-slate-950">{row.label}</p>
                        <p className="mt-1.5 text-sm text-slate-500">
                          {row.assignedLeads} leads • {row.overdueFollowUps} overdue
                        </p>
                      </div>
                      <div className="text-right text-sm text-slate-600">
                        <p>{formatMoney(row.pipelineValue, summary.target?.currency ?? "NGN")} pipeline</p>
                        <p className="mt-1">{formatMoney(row.wonValue, summary.target?.currency ?? "NGN")} won</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No rep performance yet"
                  description="Rep performance will appear once leads have owners."
                />
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6 xl:col-span-5">
          <section className="admin-surface rounded-[24px] p-5">
            <SectionHeader
              eyebrow="Stage performance"
              title="Where leads are getting stuck"
              description="Current lead volume and value by stage."
            />
            <div className="mt-4 space-y-3">
              {summary.stagePerformance.length > 0 ? (
                summary.stagePerformance.map((stage) => (
                  <div key={stage.label} className="admin-surface-muted flex items-start justify-between gap-4 rounded-2xl px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{stage.label}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatMoney(stage.pipelineValue, summary.target?.currency ?? "NGN")} pipeline
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-slate-950">{stage.totalLeads}</p>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No stage performance yet"
                  description="Stage reporting will appear once leads are active."
                />
              )}
            </div>
          </section>

          <section className="admin-surface rounded-[24px] p-5">
            <SectionHeader
              eyebrow="Intake status"
              title="Webhook success and failure"
              description="A simple summary of successful and failed intake activity."
            />
            <div className="mt-4 grid gap-3">
              <MetricCard label="Lead created" value={summary.intakeSummary.leadCreated} supporting="Webhook deliveries that created or updated a lead." tone="positive" />
              <MetricCard label="Failed" value={summary.intakeSummary.failed} supporting="Intake submissions that need review." tone={summary.intakeSummary.failed > 0 ? "danger" : "positive"} />
              <MetricCard label="Mapped" value={summary.intakeSummary.mapped} supporting="Payloads validated before lead creation." />
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
