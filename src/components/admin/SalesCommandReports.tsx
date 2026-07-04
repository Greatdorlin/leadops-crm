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

function formatMoney(value: number, currency = "NGN") {
  return `${currency} ${value.toLocaleString()}`;
}

export function SalesCommandReports({
  summary,
}: {
  summary: SalesDashboardSummary;
}) {
  const sourceChartData = summary.topSources.map((source) => ({
    label: source.label,
    value: source.totalLeads,
    meta: `${source.wonLeads} won • ${source.conversionRate}% conversion`,
  }));

  const stageChartData = summary.stagePerformance.map((stage) => ({
    label: stage.label,
    value: stage.totalLeads,
  }));

  const repChartData = summary.repPerformance.map((rep) => ({
    label: rep.label,
    value: rep.assignedLeads,
    meta: `${rep.overdueFollowUps} overdue follow-ups`,
  }));

  const intakeChartData = [
    { label: "Lead Created", value: summary.intakeSummary.leadCreated },
    { label: "Mapped", value: summary.intakeSummary.mapped },
    { label: "Failed", value: summary.intakeSummary.failed },
  ];

  const hasIntakeData = intakeChartData.some((d) => d.value > 0);
  const totalIntake = intakeChartData.reduce((sum, d) => sum + d.value, 0);

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
            <div className="mt-4">
              {summary.topSources.length > 0 ? (
                <HorizontalBarChart
                  data={sourceChartData}
                  showLabels={true}
                  showValues={true}
                  showMeta={true}
                  animate={true}
                />
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
            <div className="mt-4">
              {summary.repPerformance.length > 0 ? (
                <HorizontalBarChart
                  data={repChartData}
                  showLabels={true}
                  showValues={true}
                  showMeta={true}
                  animate={true}
                />
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
            <div className="mt-4">
              {summary.stagePerformance.length > 0 ? (
                <div className="ld-animate-fade-in" style={{ height: 240 }}>
                  <VerticalBarChart
                    data={stageChartData}
                    showLabels={true}
                    showValues={true}
                    animate={true}
                  />
                </div>
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
            <div className="mt-4 space-y-4">
              {hasIntakeData ? (
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                  <DonutChart
                    data={intakeChartData}
                    size={140}
                    strokeWidth={16}
                    innerText={totalIntake.toLocaleString()}
                    innerSubtext="Total"
                    animate={true}
                  />
                  <div className="w-full sm:flex-1">
                    <PieChartLegend data={intakeChartData} showPercent={true} />
                  </div>
                </div>
              ) : null}
              <div className="grid gap-3">
                <MetricCard label="Lead created" value={summary.intakeSummary.leadCreated} supporting="Webhook deliveries that created or updated a lead." tone="positive" />
                <MetricCard label="Failed" value={summary.intakeSummary.failed} supporting="Intake submissions that need review." tone={summary.intakeSummary.failed > 0 ? "danger" : "positive"} />
                <MetricCard label="Mapped" value={summary.intakeSummary.mapped} supporting="Payloads validated before lead creation." />
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
