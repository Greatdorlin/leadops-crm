import { BriefcaseBusiness, CircleDollarSign, ClipboardCheck, Trophy, UserRoundCheck } from "lucide-react";
import Link from "next/link";
import { appRoutes } from "@/lib/app-routes";
import type { AffiliateDashboardSummary } from "@/lib/crm/affiliate-dashboard";
import { crmLabelize, formatCrmDate, formatLeadSourceLabel } from "@/lib/crm/formatters";
import { cn } from "@/lib/cn";
import { GlassCard } from "./GlassCard";
import { PremiumMetricCard } from "./PremiumMetricCard";
import { PriorityBadge } from "./PriorityBadge";
import { SourceBadge } from "./SourceBadge";
import { StatusBadge } from "./StatusBadge";

function formatMoney(value: number, currency = "NGN") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatShortMoney(value: number, currency = "NGN") {
  if (Math.abs(value) >= 1_000_000) {
    return `${formatMoney(value / 1_000_000, currency).replace(/\.0+$/, "")}m`;
  }

  if (Math.abs(value) >= 1_000) {
    return `${formatMoney(value / 1_000, currency).replace(/\.0+$/, "")}k`;
  }

  return formatMoney(value, currency);
}

export function AffiliateDashboardPanel({
  summary,
  currency = "NGN",
}: {
  summary: AffiliateDashboardSummary;
  currency?: string;
}) {
  const leadTypeTotal = Math.max(summary.directLeads + summary.businessLeads, 1);
  const businessPercent = Math.round((summary.businessLeads / leadTypeTotal) * 100);
  const directPercent = Math.round((summary.directLeads / leadTypeTotal) * 100);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PremiumMetricCard
          label="My leads"
          value={summary.totalLeads}
          subtitle={`${summary.businessLeads} B2B, ${summary.directLeads} direct`}
          icon={UserRoundCheck}
          tone="accent"
        />
        <PremiumMetricCard
          label="Active value"
          value={formatShortMoney(summary.pipelineValue, currency)}
          subtitle={`${summary.activeLeads} active opportunities`}
          icon={BriefcaseBusiness}
          tone="default"
        />
        <PremiumMetricCard
          label="Won value"
          value={formatShortMoney(summary.wonValue, currency)}
          subtitle={`${summary.wonLeads} converted leads`}
          icon={Trophy}
          tone="success"
        />
        <PremiumMetricCard
          label="My earnings"
          value={summary.commissionConfigured ? formatShortMoney(summary.earningsValue, currency) : "Not set"}
          subtitle={
            summary.commissionConfigured
              ? `${summary.commissionRatePercent}% commission estimate`
              : "Commission plan needs owner setup"
          }
          icon={CircleDollarSign}
          tone={summary.commissionConfigured ? "success" : "warning"}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <GlassCard glassStyle="soft" className="overflow-hidden p-0">
          <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--ld-color-accent)]">
                Affiliate pipeline
              </p>
              <h3 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-white">Leads I brought in</h3>
            </div>
            <Link
              href={appRoutes.leads}
              className="ld-glass-button inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-semibold"
            >
              Open leads
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="ld-readable-table min-w-[760px]">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Type</th>
                  <th>Source</th>
                  <th>Stage</th>
                  <th>Priority</th>
                  <th>Value</th>
                  <th>Follow-up</th>
                </tr>
              </thead>
              <tbody>
                {summary.recentLeads.length > 0 ? (
                  summary.recentLeads.map((lead) => (
                    <tr key={lead.id} className="transition hover:bg-white/[0.045]">
                      <td>
                        <Link href={appRoutes.lead(lead.id)} className="block">
                          <span className="block font-semibold text-white">{lead.name}</span>
                          <span className="text-xs text-white/70">{lead.companyName ?? "Individual lead"}</span>
                        </Link>
                      </td>
                      <td>
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                            lead.leadCustomerType === "business"
                              ? "border-[var(--ld-color-primary)]/20 bg-[var(--ld-color-primary)]/12 text-white"
                              : "border-violet-300/20 bg-violet-400/12 text-violet-100",
                          )}
                        >
                          {lead.leadCustomerType === "business" ? "B2B" : "Direct"}
                        </span>
                      </td>
                      <td>
                        <SourceBadge source={lead.source} label={formatLeadSourceLabel(lead.source)} />
                      </td>
                      <td>
                        <StatusBadge status={lead.stage} label={crmLabelize(lead.stage)} />
                      </td>
                      <td>
                        <PriorityBadge priority={lead.priority} />
                      </td>
                      <td className="font-semibold text-white">{formatShortMoney(lead.value, currency)}</td>
                      <td className="text-white/70">{formatCrmDate(lead.nextFollowUpAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-white/70">
                      No assigned affiliate leads yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>

        <div className="space-y-5">
          <GlassCard glassStyle="vibrant" className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--ld-color-accent)]">
              Lead mix
            </p>
            <h3 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-white">B2B vs direct</h3>
            <div className="mt-5 space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-white">B2B leads</span>
                  <span className="text-white/70">{summary.businessLeads} leads</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--ld-color-primary)] to-[var(--ld-color-accent)]"
                    style={{ width: `${businessPercent}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-white">Direct leads</span>
                  <span className="text-white/70">{summary.directLeads} leads</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-300 to-fuchsia-400"
                    style={{ width: `${directPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard glassStyle="soft" className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--ld-color-accent)]">
                  My tasks
                </p>
                <h3 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-white">Follow-ups to handle</h3>
              </div>
              <ClipboardCheck className="h-5 w-5 text-white/70" />
            </div>
            <div className="mt-4 space-y-3">
              {summary.tasksDueSoon.length > 0 ? (
                summary.tasksDueSoon.map((task) => (
                  <Link
                    key={task.id}
                    href={appRoutes.tasks}
                    className="block rounded-[18px] border border-white/10 bg-white/[0.045] px-4 py-3 transition hover:border-white/18 hover:bg-white/[0.07]"
                  >
                    <span className="block text-sm font-semibold text-white">{task.title}</span>
                    <span className="text-xs text-white/70">{formatCrmDate(task.dueAt)}</span>
                  </Link>
                ))
              ) : (
                <p className="rounded-[18px] border border-white/10 bg-white/[0.045] px-4 py-5 text-sm text-white/70">
                  No affiliate tasks are due.
                </p>
              )}
            </div>
          </GlassCard>

          <GlassCard glassStyle="soft" className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--ld-color-accent)]">
              Profile
            </p>
            <h3 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-white">Keep payout details clean</h3>
            <p className="mt-2 text-sm leading-6 text-white/70">
              Update your name and profile image. Payment verification stays with finance and owners.
            </p>
            <Link
              href={appRoutes.profile}
              className="ld-floating-control mt-4 inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-semibold"
            >
              My profile
            </Link>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
