import Link from "next/link";
import type { SalesDashboardSummary } from "@/lib/crm/sales-metrics";
import { formatCrmDateTime } from "@/lib/crm/formatters";
import { EmptyState } from "./EmptyState";
import { MetricCard } from "./MetricCard";
import { SectionHeader } from "./SectionHeader";

function formatMoney(value: number, currency = "NGN") {
  return `${currency} ${value.toLocaleString()}`;
}

export function SalesCommandOverview({
  summary,
}: {
  summary: SalesDashboardSummary;
}) {
  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Total leads" value={summary.totalLeads} supporting="All visible leads." tone="accent" />
        <MetricCard label="New leads" value={summary.newLeads} supporting="Leads still at the first stage." />
        <MetricCard label="Overdue follow-ups" value={summary.overdueFollowUps} supporting="Needs attention today." tone={summary.overdueFollowUps > 0 ? "danger" : "positive"} />
        <MetricCard label="Pipeline value" value={formatMoney(summary.pipelineValue, summary.target?.currency ?? "NGN")} supporting="Open expected value." />
        <MetricCard label="Won value" value={formatMoney(summary.wonValue, summary.target?.currency ?? "NGN")} supporting="Closed value so far." tone="positive" />
      </section>

      <section className="grid gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-7">
          <section className="admin-surface rounded-[24px] p-5">
            <SectionHeader
              eyebrow="Source performance"
              title="Top sources"
              description="See which channels are bringing leads and turning into won business."
            />
            <div className="mt-4 space-y-3">
              {summary.topSources.length > 0 ? (
                summary.topSources.map((source) => (
                  <div key={source.label} className="admin-surface-muted rounded-2xl p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-slate-950">{source.label}</p>
                        <p className="mt-1.5 text-sm text-slate-500">
                          {source.wonLeads} won • {source.conversionRate}% conversion
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-slate-950">{source.totalLeads}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {formatMoney(source.pipelineValue, summary.target?.currency ?? "NGN")} pipeline
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No source performance yet"
                  description="Lead source performance will appear once leads start coming in."
                />
              )}
            </div>
          </section>

          <section className="admin-surface rounded-[24px] p-5">
            <SectionHeader
              eyebrow="Recent intake"
              title="Latest form activity"
              description="Track recent webhook and intake activity without leaving the dashboard."
            />
            <div className="mt-4 space-y-3">
              {summary.recentIntake.length > 0 ? (
                summary.recentIntake.map((event) => (
                  <div key={event.id} className="admin-surface-muted rounded-2xl p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                          {event.status.replace(/_/g, " ")}
                        </p>
                        <p className="mt-1 text-base font-semibold text-slate-950">
                          {event.sourceName || "Unknown source"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {event.errorMessage || (event.leadName ? `Lead: ${event.leadName}` : "Processing update")}
                        </p>
                      </div>
                      <p className="text-sm text-slate-500">{formatCrmDateTime(event.createdAt)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No intake activity yet"
                  description="Webhook deliveries and failed syncs will appear here once a source goes live."
                />
              )}
            </div>
            <div className="mt-4">
              <Link
                href="/admin/intake"
                className="admin-button-secondary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-medium"
              >
                Open intake log
              </Link>
            </div>
          </section>
        </div>

        <div className="space-y-6 xl:col-span-5">
          <section className="admin-surface rounded-[24px] p-5">
            <SectionHeader
              eyebrow="Target progress"
              title="Sales target"
              description="Keep the team focused on the remaining value needed this period."
            />
            {summary.target ? (
              <div className="mt-4 space-y-3">
                <MetricCard
                  label={summary.target.name}
                  value={formatMoney(summary.target.targetValue, summary.target.currency)}
                  supporting={summary.target.periodLabel}
                  tone="accent"
                />
                <MetricCard
                  label="Progress"
                  value={`${summary.target.progressPercent}%`}
                  supporting={`${formatMoney(summary.target.remainingValue, summary.target.currency)} remaining`}
                  tone={summary.target.progressPercent >= 100 ? "positive" : "warning"}
                />
              </div>
            ) : (
              <EmptyState
                title="No active sales target"
                description="Set a monthly target in Settings to track progress on the dashboard."
              />
            )}
          </section>

          <section className="admin-surface rounded-[24px] p-5">
            <SectionHeader
              eyebrow="Rep performance"
              title="Who needs attention"
              description="Lead ownership, overdue follow-ups, and current results by rep."
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
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-950">
                          {formatMoney(row.wonValue, summary.target?.currency ?? "NGN")}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">{row.conversionRate}% conversion</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No rep activity yet"
                  description="Rep performance will appear once leads and owners are in place."
                />
              )}
            </div>
          </section>

          <section className="admin-surface rounded-[24px] p-5">
            <SectionHeader
              eyebrow="Attention"
              title="Quick status"
              description="A fast summary of what needs action right now."
            />
            <div className="mt-4 grid gap-3">
              <MetricCard label="Due today" value={summary.dueTodayFollowUps} supporting="Follow-ups due before the day ends." />
              <MetricCard label="Stuck leads" value={summary.stuckLeads} supporting="No recent movement in the last 7 days." tone={summary.stuckLeads > 0 ? "warning" : "positive"} />
              <MetricCard label="Conversion rate" value={`${summary.conversionRate}%`} supporting={`${summary.wonLeads} won • ${summary.lostLeads} lost`} />
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
