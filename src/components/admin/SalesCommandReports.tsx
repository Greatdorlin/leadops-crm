import type { SalesDashboardSummary } from "@/lib/crm/sales-metrics";
import { EmptyState } from "./EmptyState";
import { MetricCard } from "./MetricCard";
import { SectionHeader } from "./SectionHeader";
import {
  HorizontalBarChart,
  VerticalBarChart,
  DonutChart,
  PieChartLegend,
} from "@/components/admin/charts";

export type SalesCommandReportView = "overview" | "pipeline" | "team" | "sources";

function formatMoney(value: number, currency = "USD") {
  return `${currency} ${value.toLocaleString()}`;
}

export function SalesCommandReports({
  summary,
  workspaceCurrency = "USD",
  view,
}: {
  summary: SalesDashboardSummary;
  workspaceCurrency?: string;
  view: SalesCommandReportView;
}) {
  const currency = summary.target?.currency ?? workspaceCurrency;
  const sourceChartData = summary.topSources.map((source) => ({
    label: source.label,
    value: source.totalLeads,
    meta: `${source.wonLeads} won • ${source.conversionRate}% conversion`,
  }));
  const stageChartData = summary.stagePerformance.map((stage) => ({
    label: stage.label,
    value: stage.totalLeads,
  }));
  const intakeChartData = [
    { label: "Lead Created", value: summary.intakeSummary.leadCreated },
    { label: "Mapped", value: summary.intakeSummary.mapped },
    { label: "Failed", value: summary.intakeSummary.failed },
  ];
  const hasIntakeData = intakeChartData.some((datum) => datum.value > 0);
  const totalIntake = intakeChartData.reduce((sum, datum) => sum + datum.value, 0);

  if (view === "overview") {
    return (
      <div className="min-w-0 space-y-6">
        <section className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard label="Pipeline value" value={formatMoney(summary.pipelineValue, currency)} supporting="Open lead value." />
          <MetricCard label="Won value" value={formatMoney(summary.wonValue, currency)} supporting="Closed value so far." tone="positive" />
          <MetricCard label="Conversion rate" value={`${summary.conversionRate}%`} supporting="Won leads against total volume." />
        </section>

        <section className="grid min-w-0 gap-6 xl:grid-cols-2">
          <section className="admin-surface min-w-0 overflow-hidden rounded-[24px] p-4 sm:p-5">
            <SectionHeader
              eyebrow="Follow-up pressure"
              title="What needs action now"
              description="Due, overdue, and stalled work in this reporting view."
            />
            <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
              <MetricCard label="Overdue" value={summary.overdueFollowUps} supporting="Past due." tone={summary.overdueFollowUps > 0 ? "danger" : "positive"} />
              <MetricCard label="Due today" value={summary.dueTodayFollowUps} supporting="Due today." tone="warning" />
              <MetricCard label="Stuck leads" value={summary.stuckLeads} supporting="No recent movement." tone={summary.stuckLeads > 0 ? "warning" : "positive"} />
            </div>
          </section>

          <section className="admin-surface min-w-0 overflow-hidden rounded-[24px] p-4 sm:p-5">
            <SectionHeader
              eyebrow="Who needs attention"
              title="Rep follow-up load"
              description="Owners carrying overdue follow-ups."
            />
            <div className="mt-4 grid min-w-0 gap-3">
              {summary.repPerformance.length > 0 ? (
                summary.repPerformance.slice(0, 3).map((rep) => (
                  <div key={rep.id} className="ld-solid-panel grid min-w-0 gap-3 rounded-[18px] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{rep.label}</p>
                      <p className="mt-1 break-words text-sm text-white/65">{rep.assignedLeads} assigned leads</p>
                    </div>
                    <p className="min-w-0 text-sm font-semibold text-amber-100 sm:text-right">
                      {rep.overdueFollowUps} overdue
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState title="No rep activity yet" description="Rep activity appears once leads have owners." />
              )}
            </div>
          </section>
        </section>
      </div>
    );
  }

  if (view === "pipeline") {
    return (
      <section className="admin-surface min-w-0 overflow-hidden rounded-[24px] p-4 sm:p-5">
        <SectionHeader
          eyebrow="Stage performance"
          title="Where leads are getting stuck"
          description="Current lead volume and value by stage."
        />
        <div className="mt-4 min-w-0 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {summary.stagePerformance.length > 0 ? (
            <div className="ld-animate-fade-in h-60 min-w-[30rem] sm:min-w-0">
              <VerticalBarChart data={stageChartData} showLabels showValues animate />
            </div>
          ) : (
            <EmptyState title="No stage performance yet" description="Stage reporting will appear once leads are active." />
          )}
        </div>
      </section>
    );
  }

  if (view === "team") {
    return (
      <section className="admin-surface min-w-0 overflow-hidden rounded-[24px] p-4 sm:p-5">
        <SectionHeader
          eyebrow="Rep performance"
          title="Who is closing and who is stuck"
          description="Lead ownership, overdue follow-ups, and results by rep."
        />
        {summary.repPerformance.length > 0 ? (
          <div
            className="mt-4 flex min-w-0 snap-x snap-proximity touch-pan-x gap-3 overflow-x-auto overscroll-x-contain pb-3 [scrollbar-color:color-mix(in_srgb,var(--ld-color-primary)_45%,transparent)_transparent]"
            aria-label="Rep performance cards"
          >
            {summary.repPerformance.map((rep) => (
              <article
                key={rep.id}
                className="ld-solid-panel w-[min(82vw,19rem)] shrink-0 snap-start rounded-[20px] p-4 sm:w-[19rem]"
              >
                <p className="truncate text-sm font-semibold text-white">{rep.label}</p>
                <p className="mt-1 text-sm text-white/65">{rep.assignedLeads} assigned leads</p>
                <dl className="mt-5 grid grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <dt className="text-[11px] uppercase tracking-[0.14em] text-white/50">Won value</dt>
                    <dd className="mt-1 break-words text-sm font-semibold text-white">{formatMoney(rep.wonValue, currency)}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[11px] uppercase tracking-[0.14em] text-white/50">Conversion</dt>
                    <dd className="mt-1 text-sm font-semibold text-white">{rep.conversionRate}%</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[11px] uppercase tracking-[0.14em] text-white/50">Overdue</dt>
                    <dd className="mt-1 text-sm font-semibold text-amber-100">{rep.overdueFollowUps}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[11px] uppercase tracking-[0.14em] text-white/50">Pipeline</dt>
                    <dd className="mt-1 break-words text-sm font-semibold text-white">{formatMoney(rep.pipelineValue, currency)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState title="No rep performance yet" description="Rep performance will appear once leads have owners." />
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="grid min-w-0 gap-6 xl:grid-cols-12">
      <section className="admin-surface min-w-0 rounded-[24px] p-4 sm:p-5 xl:col-span-7">
        <SectionHeader
          eyebrow="Source performance"
          title="Which sources are converting"
          description="Lead volume, pipeline value, and won value by source."
        />
        <div className="mt-4 min-w-0">
          {summary.topSources.length > 0 ? (
            <HorizontalBarChart data={sourceChartData} showLabels showValues showMeta animate />
          ) : (
            <EmptyState title="No source performance yet" description="Source performance will appear once leads are captured." />
          )}
        </div>
      </section>

      <section className="admin-surface min-w-0 rounded-[24px] p-4 sm:p-5 xl:col-span-5">
        <SectionHeader
          eyebrow="Intake status"
          title="Webhook success and failure"
          description="Successful and failed intake activity."
        />
        <div className="mt-4 min-w-0 space-y-4">
          {hasIntakeData ? (
            <div className="flex min-w-0 flex-col items-center gap-4 sm:flex-row sm:items-start">
              <DonutChart data={intakeChartData} size={140} strokeWidth={16} innerText={totalIntake.toLocaleString()} innerSubtext="Total" animate />
              <div className="min-w-0 w-full sm:flex-1">
                <PieChartLegend data={intakeChartData} showPercent />
              </div>
            </div>
          ) : null}
          <div className="grid min-w-0 gap-3">
            <MetricCard label="Lead created" value={summary.intakeSummary.leadCreated} supporting="Created or updated a lead." tone="positive" />
            <MetricCard label="Failed" value={summary.intakeSummary.failed} supporting="Needs review." tone={summary.intakeSummary.failed > 0 ? "danger" : "positive"} />
            <MetricCard label="Mapped" value={summary.intakeSummary.mapped} supporting="Validated before creation." />
          </div>
        </div>
      </section>
    </section>
  );
}
