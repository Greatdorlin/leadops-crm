import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  CircleDollarSign,
  Inbox,
  Target,
  Trophy,
  Users2,
} from "lucide-react";
import type { SalesDashboardSummary } from "@/lib/crm/sales-metrics";
import { formatCrmDateTime } from "@/lib/crm/formatters";
import type { DashboardWidgetKey } from "@/lib/crm/workspace-settings";
import type { DashboardTrendPoint } from "@/lib/storage/types";
import { appRoutes } from "@/lib/app-routes";
import { AdminCollapsibleSection } from "./AdminCollapsibleSection";
import { DashboardTargetCelebration } from "./DashboardTargetCelebration";
import { DashboardPulseChart } from "./DashboardPulseChart";
import { EmptyState } from "./EmptyState";
import { PremiumMetricCard } from "./PremiumMetricCard";
import { InfoTip } from "./ui/InfoTip";

function formatMoney(value: number, currency = "USD") {
  return `${currency} ${value.toLocaleString()}`;
}

function formatShortMoney(value: number, currency = "USD") {
  if (value >= 1_000_000) {
    return `${currency} ${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  }

  if (value >= 1_000) {
    return `${currency} ${(value / 1_000).toFixed(value >= 100_000 ? 0 : 1)}K`;
  }

  return formatMoney(value, currency);
}

function getPercent(value: number, max: number) {
  if (max <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (value / max) * 100));
}

function normalizeStageColor(value?: string | null) {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : null;
}

type StageDefinition = {
  id: string;
  key: string;
  name: string;
  color: string | null;
  sortOrder: number;
};

function CompactProgressRow({
  label,
  value,
  meta,
  percent,
  tone = "accent",
}: {
  label: string;
  value: string | number;
  meta?: string;
  percent: number;
  tone?: "accent" | "success" | "warning" | "danger" | "info";
}) {
  const fill = {
    accent: { from: "var(--ld-color-primary)", to: "var(--ld-color-accent)" },
    success: { from: "#6ee7b7", to: "#10b981" },
    warning: { from: "#fbbf24", to: "#f59e0b" },
    danger: { from: "#fb7185", to: "#ef4444" },
    info: { from: "#60a5fa", to: "#3b82f6" },
  }[tone];

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{label}</p>
          {meta ? <p className="mt-1 truncate text-xs text-white/70">{meta}</p> : null}
        </div>
        <p className="shrink-0 text-sm font-semibold text-white">{value}</p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full"
          style={{
            width: `${percent}%`,
            background: `linear-gradient(90deg, ${fill.from}, ${fill.to})`,
          }}
        />
      </div>
    </div>
  );
}

export function SalesCommandOverview({
  summary,
  stageDefinitions = [],
  trendData = [],
  visibleWidgets,
  workspaceCurrency = "USD",
}: {
  summary: SalesDashboardSummary;
  stageDefinitions?: StageDefinition[];
  trendData?: DashboardTrendPoint[];
  visibleWidgets?: DashboardWidgetKey[];
  workspaceCurrency?: string;
}) {
  const widgetSet = new Set(visibleWidgets ?? []);
  const showAll = widgetSet.size === 0;
  const showWidget = (key: DashboardWidgetKey) => showAll || widgetSet.has(key);
  const currency = workspaceCurrency;
  const claimedStageRows = new Set<number>();
  const configuredStagePerformance = stageDefinitions.map((definition) => {
    const rowIndex = summary.stagePerformance.findIndex((row, index) => {
      if (claimedStageRows.has(index)) {
        return false;
      }

      return (
        row.id === definition.id ||
        row.key === definition.key ||
        row.label.trim().toLowerCase() === definition.name.trim().toLowerCase()
      );
    });
    const row = rowIndex >= 0 ? summary.stagePerformance[rowIndex] : null;
    if (rowIndex >= 0) {
      claimedStageRows.add(rowIndex);
    }

    return {
      id: definition.id,
      key: definition.key,
      label: definition.name,
      color: definition.color,
      sortOrder: definition.sortOrder,
      totalLeads: row?.totalLeads ?? 0,
      wonValue: row?.wonValue ?? 0,
      pipelineValue: row?.pipelineValue ?? 0,
    };
  });
  const stagePerformance = [
    ...configuredStagePerformance,
    ...summary.stagePerformance.filter((_, index) => !claimedStageRows.has(index)),
  ];
  const stageMax = Math.max(...stagePerformance.map((stage) => stage.totalLeads), 1);
  const sourceMax = Math.max(...summary.topSources.map((source) => source.totalLeads), 1);
  const targetProgress = summary.target?.progressPercent ?? 0;
  const topMetricCards = [
    showWidget("total_leads")
      ? {
          key: "total_leads",
          label: "Total Leads",
          value: summary.totalLeads,
          subtitle: "All visible leads",
          icon: Users2,
          tone: "accent" as const,
        }
      : null,
    showWidget("new_leads")
      ? {
          key: "new_leads",
          label: "New Leads",
          value: summary.newLeads,
          subtitle: "Needs first touch",
          icon: Inbox,
          tone: "default" as const,
        }
      : null,
    showWidget("leads_this_month")
      ? {
          key: "leads_this_month",
          label: "This Month",
          value: summary.leadsThisMonth,
          subtitle: "New this month",
          icon: CalendarDays,
          tone: "default" as const,
        }
      : null,
    showWidget("overdue_follow_ups")
      ? {
          key: "overdue_follow_ups",
          label: "Overdue",
          value: summary.overdueFollowUps,
          subtitle: summary.overdueFollowUps > 0 ? "Needs action" : "Clear today",
          icon: AlertTriangle,
          tone: summary.overdueFollowUps > 0 ? ("danger" as const) : ("success" as const),
        }
      : null,
    showWidget("pipeline_value")
      ? {
          key: "pipeline_value",
          label: "Pipeline Value",
          value: formatShortMoney(summary.pipelineValue, currency),
          subtitle: "Open expected value",
          icon: CircleDollarSign,
          tone: "warning" as const,
        }
      : null,
    showWidget("won_value")
      ? {
          key: "won_value",
          label: "Won Value",
          value: formatShortMoney(summary.wonValue, currency),
          subtitle: `${summary.wonLeads} won`,
          icon: Trophy,
          tone: "success" as const,
        }
      : null,
  ].filter((card): card is NonNullable<typeof card> => Boolean(card));
  const showSourcePerformance = showWidget("top_sources");
  const showRecentIntake = showWidget("recent_intake");
  const showTargetProgress = showWidget("target_progress");
  const showTeamPerformance = showWidget("team_performance");
  const showAttentionSummary = showWidget("overdue_follow_ups") || showWidget("conversion_rate");
  const showLeadTrend = showWidget("lead_trend");
  const showPipelineOverview = showWidget("pipeline_overview");
  const salesTargetHref = `${appRoutes.settingsSalesTargets}#create-target`;

  return (
    <div className="space-y-6">
      {showTargetProgress ? (
        <DashboardTargetCelebration
          target={
            summary.target?.progressAvailable
              ? {
                  id: summary.target.id,
                  name: summary.target.name,
                  progressPercent: summary.target.progressPercent,
                  wonValueLabel: formatMoney(summary.target.wonValue, summary.target.currency),
                }
              : null
          }
        />
      ) : null}

      {topMetricCards.length > 0 ? (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(155px,1fr))]">
          {topMetricCards.map((card) => (
            <PremiumMetricCard
              key={card.key}
              label={card.label}
              value={card.value}
              subtitle={card.subtitle}
              icon={card.icon}
              tone={card.tone}
            />
          ))}
        </section>
      ) : null}

      {showLeadTrend && trendData.length > 0 ? (
        <DashboardPulseChart currency={currency} data={trendData} />
      ) : null}

      {showPipelineOverview ? (
        <AdminCollapsibleSection
        eyebrow="Pipeline"
        title="Live pipeline"
        actions={
          <Link
            href={salesTargetHref}
            className="ld-floating-control inline-flex h-10 items-center justify-center px-4 text-sm font-semibold"
          >
            {summary.target ? "Edit target" : "Set target"}
          </Link>
        }
        className="p-4 sm:p-5"
        bodyClassName="mt-5"
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(210px,1fr)_minmax(0,2fr)]">
          <div className="ld-solid-panel grid content-between rounded-xl border border-white/10 p-4 sm:p-5">
            <div>
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/14 bg-[var(--ld-color-primary)]/10 text-white shadow-[0_12px_28px_color-mix(in_srgb,var(--ld-color-primary)_12%,transparent)]">
                  <Target className="h-5 w-5" />
                </span>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-white/[0.075] px-3 py-1 text-xs font-semibold text-white/70">
                    {summary.target?.periodLabel ?? "Target not set"}
                  </span>
                  <InfoTip
                    label="Targets compare closed value against the saved goal and keep the remaining gap visible on the dashboard."
                    align="right"
                  />
                </div>
              </div>
              <div className="mx-auto mt-6 grid h-40 w-40 place-items-center rounded-full border border-white/10 bg-white/[0.035] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] 2xl:h-44 2xl:w-44">
                <div
                  className="grid h-32 w-32 place-items-center rounded-full 2xl:h-36 2xl:w-36"
                  style={{
                    background: `conic-gradient(var(--ld-color-success) ${Math.min(targetProgress, 100)}%, rgba(255,255,255,0.12) 0)`,
                  }}
                >
                  <div className="grid h-24 w-24 place-items-center rounded-full bg-[#071226]/92 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] 2xl:h-28 2xl:w-28">
                    <div>
                      <p className="text-[2rem] font-semibold tracking-[-0.06em] text-white 2xl:text-4xl">
                        {targetProgress}%
                      </p>
                      <p className="mt-1 text-xs text-white/70">of target</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-5 grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-white/70">Won value</span>
                <span className="font-semibold text-white">{formatShortMoney(summary.wonValue, currency)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-white/70">Pipeline</span>
                <span className="font-semibold text-white">{formatShortMoney(summary.pipelineValue, currency)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-white/70">Remaining</span>
                <span className="font-semibold text-white">
                  {summary.target ? (
                    summary.target.progressAvailable
                      ? formatShortMoney(summary.target.remainingValue, summary.target.currency)
                      : "Rate needed"
                  ) : (
                    <Link href={salesTargetHref} className="text-white hover:text-[var(--ld-color-accent)]">
                      Set a target
                    </Link>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="ld-solid-panel rounded-xl border border-white/10 p-4 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-2">
                <h3 className="text-lg font-semibold tracking-[-0.04em] text-white">Stage movement</h3>
                <div className="pt-0.5">
                  <InfoTip
                    label="Stage movement shows where open leads sit right now and how much live pipeline value each stage is holding."
                    align="left"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/[0.075] px-3 py-1 text-xs font-semibold text-white/70">
                  {summary.conversionRate}% conversion
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.075] px-3 py-1 text-xs font-semibold text-white/70">
                  {stagePerformance.length} live stages
                </span>
              </div>
            </div>

            {stagePerformance.length ? (
              <ul className="mt-4 grid gap-x-5 gap-y-3 sm:grid-cols-2">
                {stagePerformance.map((stage) => (
                  <li key={stage.label} className="min-w-0 rounded-lg border border-white/8 px-3 py-2.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="min-w-0 break-words text-sm font-medium text-white">{stage.label}</p>
                      <p className="shrink-0 text-sm font-semibold tabular-nums text-white">{stage.totalLeads}<span className="sr-only"> leads</span></p>
                    </div>
                    <div aria-hidden="true" className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full" style={{
                        width: `${getPercent(stage.totalLeads, stageMax)}%`,
                        backgroundColor: normalizeStageColor(stage.color) ?? "var(--ld-color-accent)",
                      }} />
                    </div>
                    <p className="mt-1.5 text-xs tabular-nums text-white/65">{formatShortMoney(stage.pipelineValue, currency)} pipeline</p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No stage data yet" description="Stage performance appears as leads move through your pipeline." />
            )}
          </div>
        </div>
        </AdminCollapsibleSection>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-7">
          {showSourcePerformance ? (
            <AdminCollapsibleSection
              eyebrow="Source performance"
              title="Which channels are working"
              actions={
                <Link
                  href={appRoutes.reports}
                  className="ld-floating-control inline-flex h-10 items-center justify-center px-4 text-sm font-semibold"
                >
                  Full report
                </Link>
              }
            >
              <div className="grid gap-4">
                {summary.topSources.length > 0 ? (
                  summary.topSources.slice(0, 6).map((source) => (
                    <CompactProgressRow
                      key={source.label}
                      label={source.label}
                      value={`${source.conversionRate}%`}
                      meta={`${source.totalLeads} leads • ${source.wonLeads} won • ${formatShortMoney(source.pipelineValue, currency)} pipeline`}
                      percent={getPercent(source.totalLeads, sourceMax)}
                      tone="accent"
                    />
                  ))
                ) : (
                  <EmptyState
                    title="No source performance yet"
                    description="Source performance appears once leads start coming in."
                  />
                )}
              </div>
            </AdminCollapsibleSection>
          ) : null}

          {showRecentIntake ? (
            <AdminCollapsibleSection
              eyebrow="Recent intake"
              title="Latest form activity"
              actions={
                <Link
                  href={appRoutes.intake}
                  className="ld-floating-control inline-flex h-10 items-center justify-center px-4 text-sm font-semibold"
                >
                  Intake log
                </Link>
              }
            >
              <div className="grid gap-3">
                {summary.recentIntake.length > 0 ? (
                  summary.recentIntake.map((event) => (
                    <div
                      key={event.id}
                      className="ld-solid-panel grid gap-3 rounded-[20px] p-4 sm:grid-cols-[minmax(0,1fr)_auto]"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                          {event.status.replace(/_/g, " ")}
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold text-white">
                          {event.sourceName || "Unknown source"}
                        </p>
                        <p className="mt-1 text-sm text-white/70">
                          {event.errorMessage || (event.leadName ? `Lead: ${event.leadName}` : "Processing update")}
                        </p>
                      </div>
                      <p className="text-sm text-white/70">{formatCrmDateTime(event.createdAt)}</p>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="No intake activity yet"
                    description="Webhook deliveries and failed syncs will appear here."
                  />
                )}
              </div>
            </AdminCollapsibleSection>
          ) : null}
        </div>

        <div className="space-y-6 xl:col-span-5">
          {showTargetProgress ? (
            <AdminCollapsibleSection
              eyebrow="Target progress"
              title="Target focus"
            >
              {summary.target ? (
                <div className="grid gap-4">
                  {summary.target.progressAvailable ? (
                    <>
                      <CompactProgressRow
                        label={summary.target.name}
                        value={formatShortMoney(summary.target.targetValue, summary.target.currency)}
                        meta={summary.target.periodLabel}
                        percent={Math.min(summary.target.progressPercent, 100)}
                        tone={summary.target.progressPercent >= 100 ? "success" : "warning"}
                      />
                      <CompactProgressRow
                        label="Won so far"
                        value={formatShortMoney(summary.target.wonValue, summary.target.currency)}
                        meta={`${formatShortMoney(summary.target.remainingValue, summary.target.currency)} remaining`}
                        percent={Math.min(summary.target.progressPercent, 100)}
                        tone="success"
                      />
                    </>
                  ) : (
                    <EmptyState title="Exchange rate needed" description={`Add the ${workspaceCurrency} to ${summary.target.currency} rate in Currency settings.`} />
                  )}
                </div>
              ) : (
                <EmptyState
                  title="No active sales target"
                  description="Set a target in Settings."
                />
              )}
            </AdminCollapsibleSection>
          ) : null}

          {showTeamPerformance ? (
            <AdminCollapsibleSection
              eyebrow="Rep performance"
              title="Team scoreboard"
            >
              <div className="grid gap-3">
                {summary.repPerformance.length > 0 ? (
                  summary.repPerformance.slice(0, 5).map((row) => (
                    <div
                      key={row.id}
                      className="ld-solid-panel grid gap-3 rounded-[20px] p-4 sm:grid-cols-[minmax(0,1fr)_auto]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{row.label}</p>
                        <p className="mt-1 text-sm text-white/70">
                          {row.assignedLeads} leads • {row.overdueFollowUps} overdue
                        </p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-sm font-semibold text-white">
                          {formatShortMoney(row.wonValue, currency)}
                        </p>
                        <p className="mt-1 text-xs text-white/70">{row.conversionRate}% conversion</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="No rep activity yet"
                    description="Rep performance appears once owners are active."
                  />
                )}
              </div>
            </AdminCollapsibleSection>
          ) : null}

          {showAttentionSummary ? (
            <AdminCollapsibleSection
              eyebrow="Attention"
              title="What needs action"
            >
              <div className="grid gap-3">
                <CompactProgressRow
                  label="Due today"
                  value={summary.dueTodayFollowUps}
                  meta="Follow-ups due before the day ends"
                  percent={getPercent(summary.dueTodayFollowUps, Math.max(summary.dueTodayFollowUps + summary.overdueFollowUps, 1))}
                  tone="info"
                />
                <CompactProgressRow
                  label="Stuck leads"
                  value={summary.stuckLeads}
                  meta="No recent movement in 7 days"
                  percent={getPercent(summary.stuckLeads, Math.max(summary.totalLeads, 1))}
                  tone={summary.stuckLeads > 0 ? "warning" : "success"}
                />
                <CompactProgressRow
                  label="Conversion rate"
                  value={`${summary.conversionRate}%`}
                  meta={`${summary.wonLeads} won • ${summary.lostLeads} lost`}
                  percent={Math.min(summary.conversionRate, 100)}
                  tone="success"
                />
              </div>
            </AdminCollapsibleSection>
          ) : null}
        </div>
      </section>
    </div>
  );
}
