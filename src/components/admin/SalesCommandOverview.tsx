import Link from "next/link";
import type { SalesDashboardSummary } from "@/lib/crm/sales-metrics";
import { formatCrmDateTime } from "@/lib/crm/formatters";
import type { DashboardWidgetKey } from "@/lib/crm/workspace-settings";
import { DashboardTargetCelebration } from "./DashboardTargetCelebration";
import { EmptyState } from "./EmptyState";
import { MetricCard } from "./MetricCard";
import { SectionHeader } from "./SectionHeader";

function formatMoney(value: number, currency = "NGN") {
  return `${currency} ${value.toLocaleString()}`;
}

type OverviewMetricCard = {
  key: string;
  label: string;
  value: string | number;
  supporting: string;
  tone?: "accent" | "danger" | "positive" | "warning";
};

export function SalesCommandOverview({
  summary,
  visibleWidgets,
}: {
  summary: SalesDashboardSummary;
  visibleWidgets?: DashboardWidgetKey[];
}) {
  const widgetSet = new Set(visibleWidgets ?? []);
  const showAll = widgetSet.size === 0;
  const showWidget = (key: DashboardWidgetKey) => showAll || widgetSet.has(key);
  const topMetricCards: OverviewMetricCard[] = [];

  if (showWidget("total_leads")) {
    topMetricCards.push({
      key: "total_leads",
      label: "Total leads",
      value: summary.totalLeads,
      supporting: "All visible leads.",
      tone: "accent",
    });
  }

  if (showWidget("new_leads")) {
    topMetricCards.push({
      key: "new_leads",
      label: "New leads",
      value: summary.newLeads,
      supporting: "Leads still at the first stage.",
    });
  }

  if (showWidget("leads_this_month")) {
    topMetricCards.push({
      key: "leads_this_month",
      label: "Leads this month",
      value: summary.leadsThisMonth,
      supporting: "Captured during the current month.",
    });
  }

  if (showWidget("overdue_follow_ups")) {
    topMetricCards.push({
      key: "overdue_follow_ups",
      label: "Overdue follow-ups",
      value: summary.overdueFollowUps,
      supporting: "Needs attention today.",
      tone: summary.overdueFollowUps > 0 ? "danger" : "positive",
    });
  }

  if (showWidget("pipeline_value")) {
    topMetricCards.push({
      key: "pipeline_value",
      label: "Pipeline value",
      value: formatMoney(summary.pipelineValue, summary.target?.currency ?? "NGN"),
      supporting: "Open expected value.",
    });
  }

  if (showWidget("won_value")) {
    topMetricCards.push({
      key: "won_value",
      label: "Won value",
      value: formatMoney(summary.wonValue, summary.target?.currency ?? "NGN"),
      supporting: "Closed value so far.",
      tone: "positive",
    });
  }

  if (showWidget("conversion_rate")) {
    topMetricCards.push({
      key: "conversion_rate",
      label: "Conversion rate",
      value: `${summary.conversionRate}%`,
      supporting: `${summary.wonLeads} won • ${summary.lostLeads} lost`,
    });
  }

  const showSourcePerformance = showWidget("top_sources");
  const showRecentIntake = showWidget("recent_intake");
  const showTargetProgress = showWidget("target_progress");
  const showTeamPerformance = showWidget("team_performance");
  const showAttentionSummary = showWidget("overdue_follow_ups") || showWidget("conversion_rate");

  return (
    <div className="space-y-6">
      <DashboardTargetCelebration
        target={
          summary.target
            ? {
                id: summary.target.id,
                name: summary.target.name,
                progressPercent: summary.target.progressPercent,
                wonValueLabel: formatMoney(summary.target.wonValue, summary.target.currency),
              }
            : null
        }
      />

      {topMetricCards.length > 0 ? (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {topMetricCards.map((card) => (
            <MetricCard
              key={card.key}
              label={card.label}
              value={card.value}
              supporting={card.supporting}
              tone={card.tone}
            />
          ))}
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-7">
          {showSourcePerformance ? (
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
          ) : null}

          {showRecentIntake ? (
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
          ) : null}
        </div>

        <div className="space-y-6 xl:col-span-5">
          {showTargetProgress ? (
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
          ) : null}

          {showTeamPerformance ? (
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
          ) : null}

          {showAttentionSummary ? (
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
          ) : null}
        </div>
      </section>
    </div>
  );
}
