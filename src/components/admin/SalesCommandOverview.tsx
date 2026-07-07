import Link from "next/link";
import {
  AlertTriangle,
  CircleDollarSign,
  Inbox,
  Target,
  Trophy,
  Users2,
} from "lucide-react";
import type { SalesDashboardSummary } from "@/lib/crm/sales-metrics";
import { formatCrmDateTime } from "@/lib/crm/formatters";
import type { DashboardWidgetKey } from "@/lib/crm/workspace-settings";
import { appRoutes } from "@/lib/app-routes";
import { AdminCollapsibleSection } from "./AdminCollapsibleSection";
import { DashboardTargetCelebration } from "./DashboardTargetCelebration";
import { EmptyState } from "./EmptyState";
import { PremiumMetricCard } from "./PremiumMetricCard";
import { InfoTip } from "./ui/InfoTip";

function formatMoney(value: number, currency = "NGN") {
  return `${currency} ${value.toLocaleString()}`;
}

function formatShortMoney(value: number, currency = "NGN") {
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

  return Math.max(8, Math.min(100, Math.round((value / max) * 100)));
}

function Sparkline({ tone = "accent" }: { tone?: "accent" | "success" | "warning" | "danger" | "info" }) {
  const stroke = {
    accent: "url(#spark-accent)",
    success: "url(#spark-success)",
    warning: "url(#spark-warning)",
    danger: "url(#spark-danger)",
    info: "url(#spark-info)",
  }[tone];
  const fill = {
    accent: "url(#fill-accent)",
    success: "url(#fill-success)",
    warning: "url(#fill-warning)",
    danger: "url(#fill-danger)",
    info: "url(#fill-info)",
  }[tone];

  return (
    <svg className="mt-3 h-12 w-full" style={{ filter: "drop-shadow(0 0 5px rgba(255,255,255,0.15))" }} viewBox="0 0 180 42" role="presentation" aria-hidden="true">
      <defs>
        <linearGradient id="spark-accent" x1="0" x2="1">
          <stop stopColor="var(--ld-color-primary)" />
          <stop offset="1" stopColor="var(--ld-color-accent)" />
        </linearGradient>
        <linearGradient id="spark-success" x1="0" x2="1">
          <stop stopColor="#6ee7b7" />
          <stop offset="1" stopColor="#a7f3d0" />
        </linearGradient>
        <linearGradient id="spark-warning" x1="0" x2="1">
          <stop stopColor="#fbbf24" />
          <stop offset="1" stopColor="#fb7185" />
        </linearGradient>
        <linearGradient id="spark-danger" x1="0" x2="1">
          <stop stopColor="#fb7185" />
          <stop offset="1" stopColor="#c084fc" />
        </linearGradient>
        <linearGradient id="spark-info" x1="0" x2="1">
          <stop stopColor="#60a5fa" />
          <stop offset="1" stopColor="#67e8f9" />
        </linearGradient>
        <linearGradient id="fill-accent" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="var(--ld-color-primary)" stopOpacity="0.22" offset="0" />
          <stop stopColor="var(--ld-color-accent)" stopOpacity="0" offset="1" />
        </linearGradient>
        <linearGradient id="fill-success" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#6ee7b7" stopOpacity="0.22" offset="0" />
          <stop stopColor="#a7f3d0" stopOpacity="0" offset="1" />
        </linearGradient>
        <linearGradient id="fill-warning" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#fbbf24" stopOpacity="0.22" offset="0" />
          <stop stopColor="#fb7185" stopOpacity="0" offset="1" />
        </linearGradient>
        <linearGradient id="fill-danger" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#fb7185" stopOpacity="0.22" offset="0" />
          <stop stopColor="#c084fc" stopOpacity="0" offset="1" />
        </linearGradient>
        <linearGradient id="fill-info" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#60a5fa" stopOpacity="0.22" offset="0" />
          <stop stopColor="#67e8f9" stopOpacity="0" offset="1" />
        </linearGradient>
        <filter id="spark-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <path
        d="M4 28 C 18 18, 28 31, 42 22 S 68 18, 82 25 S 108 35, 122 18 S 150 18, 176 10 L 176 42 L 4 42 Z"
        fill={fill}
        opacity="0.35"
      />
      <path
        d="M4 28 C 18 18, 28 31, 42 22 S 68 18, 82 25 S 108 35, 122 18 S 150 18, 176 10"
        fill="none"
        stroke="rgba(255,255,255,0.22)"
        strokeLinecap="round"
        strokeWidth="9"
      />
      <path
        d="M4 28 C 18 18, 28 31, 42 22 S 68 18, 82 25 S 108 35, 122 18 S 150 18, 176 10"
        fill="none"
        stroke={stroke}
        strokeLinecap="round"
        strokeWidth="5"
        filter="url(#spark-glow)"
      />
    </svg>
  );
}

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
  visibleWidgets,
}: {
  summary: SalesDashboardSummary;
  visibleWidgets?: DashboardWidgetKey[];
}) {
  const widgetSet = new Set(visibleWidgets ?? []);
  const showAll = widgetSet.size === 0;
  const showWidget = (key: DashboardWidgetKey) => showAll || widgetSet.has(key);
  const currency = summary.target?.currency ?? "NGN";
  const stageMax = Math.max(...summary.stagePerformance.map((stage) => stage.totalLeads), 1);
  const sourceMax = Math.max(...summary.topSources.map((source) => source.totalLeads), 1);
  const targetProgress = summary.target?.progressPercent ?? 0;
  const topMetricCards = [
    showWidget("total_leads")
      ? {
          key: "total_leads",
          label: "Total Leads",
          value: summary.totalLeads,
          trend: { direction: "up" as const, label: "All visible leads" },
          icon: Users2,
          tone: "accent" as const,
          spark: "accent" as const,
        }
      : null,
    showWidget("new_leads")
      ? {
          key: "new_leads",
          label: "New Leads",
          value: summary.newLeads,
          trend: { direction: "up" as const, label: "Needs first touch" },
          icon: Inbox,
          tone: "default" as const,
          spark: "info" as const,
        }
      : null,
    showWidget("overdue_follow_ups")
      ? {
          key: "overdue_follow_ups",
          label: "Overdue",
          value: summary.overdueFollowUps,
          trend: {
            direction: summary.overdueFollowUps > 0 ? ("down" as const) : ("up" as const),
            label: summary.overdueFollowUps > 0 ? "Needs action" : "Clear today",
          },
          icon: AlertTriangle,
          tone: summary.overdueFollowUps > 0 ? ("danger" as const) : ("success" as const),
          spark: summary.overdueFollowUps > 0 ? ("danger" as const) : ("success" as const),
        }
      : null,
    showWidget("pipeline_value")
      ? {
          key: "pipeline_value",
          label: "Pipeline Value",
          value: formatShortMoney(summary.pipelineValue, currency),
          trend: { direction: "up" as const, label: "Open expected value" },
          icon: CircleDollarSign,
          tone: "warning" as const,
          spark: "warning" as const,
        }
      : null,
    showWidget("won_value")
      ? {
          key: "won_value",
          label: "Won Value",
          value: formatShortMoney(summary.wonValue, currency),
          trend: { direction: "up" as const, label: `${summary.wonLeads} won` },
          icon: Trophy,
          tone: "success" as const,
          spark: "success" as const,
        }
      : null,
  ].filter((card): card is NonNullable<typeof card> => Boolean(card));
  const showSourcePerformance = showWidget("top_sources");
  const showRecentIntake = showWidget("recent_intake");
  const showTargetProgress = showWidget("target_progress");
  const showTeamPerformance = showWidget("team_performance");
  const showAttentionSummary = showWidget("overdue_follow_ups") || showWidget("conversion_rate");
  const salesTargetHref = `${appRoutes.settingsSalesTargets}#create-target`;

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
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {topMetricCards.map((card) => (
            <PremiumMetricCard
              key={card.key}
              label={card.label}
              value={card.value}
              trend={card.trend}
              icon={card.icon}
              tone={card.tone}
            >
              <Sparkline tone={card.spark} />
            </PremiumMetricCard>
          ))}
        </section>
      ) : null}

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
        className="p-0"
        bodyClassName="mt-5"
      >
        <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="ld-solid-panel grid content-between rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--ld-color-primary)_18%,transparent),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5">
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
                    formatShortMoney(summary.target.remainingValue, currency)
                  ) : (
                    <Link href={salesTargetHref} className="text-white hover:text-[var(--ld-color-accent)]">
                      Set a target
                    </Link>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="ld-solid-panel rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--ld-color-accent)_16%,transparent),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))] p-5">
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
                  {summary.stagePerformance.length} live stages
                </span>
              </div>
            </div>

            <div className="mt-6 grid min-h-[230px] items-end gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {summary.stagePerformance.slice(0, 5).map((stage, index) => {
                const percent = getPercent(stage.totalLeads, stageMax);
                const barHeight = 42 + Math.round((percent / 100) * 118);
                const barGradients = [
                  { from: "var(--ld-color-primary)", to: "var(--ld-color-accent)" },
                  { from: "var(--ld-color-accent)", to: "var(--ld-color-primary)" },
                  { from: "color-mix(in srgb, var(--ld-color-primary) 60%, var(--ld-color-accent))", to: "color-mix(in srgb, var(--ld-color-accent) 60%, var(--ld-color-primary))" },
                  { from: "color-mix(in srgb, var(--ld-color-primary) 40%, var(--ld-color-accent))", to: "color-mix(in srgb, var(--ld-color-accent) 80%, var(--ld-color-primary))" },
                  { from: "color-mix(in srgb, var(--ld-color-accent) 40%, var(--ld-color-primary))", to: "color-mix(in srgb, var(--ld-color-primary) 80%, var(--ld-color-accent))" },
                ];
                const gradient = barGradients[index % barGradients.length];

                return (
                  <div key={stage.label} className="grid h-full min-h-[204px] grid-rows-[1fr_auto] gap-3">
                    <div className="flex items-end rounded-[18px] border border-white/[0.06] bg-white/[0.035] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                      <div
                        className="w-full min-h-12 rounded-[14px] shadow-[0_18px_42px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.2)]"
                        style={{
                          height: `${barHeight}px`,
                          background: `linear-gradient(180deg, ${gradient.from}, ${gradient.to})`,
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{stage.label}</p>
                      <p className="mt-1 text-[1.65rem] font-semibold leading-none tracking-[-0.05em] text-white">
                        {stage.totalLeads}
                      </p>
                      <p className="mt-1 text-xs text-white/70">
                        {formatShortMoney(stage.pipelineValue, currency)}
                      </p>
                    </div>
                  </div>
                );
              })}
              {summary.stagePerformance.length === 0 ? (
                <div className="sm:col-span-3 lg:col-span-5">
                  <EmptyState
                    title="No stage data yet"
                    description="Stage performance appears once leads move through your pipeline."
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </AdminCollapsibleSection>

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
