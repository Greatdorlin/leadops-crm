import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, Mail, MapPin, PhoneCall } from "lucide-react";
import { formatLeadAssigneeSummary } from "@/lib/crm/lead-assignees";
import { buildLeadDisplayNameMap } from "@/lib/crm/lead-identity";
import { crmLabelize, formatCrmDateTime, formatLeadStateLabel } from "@/lib/crm/formatters";
import type { LeadRecord } from "@/lib/pathway-engine/types";
import { EmptyState } from "./EmptyState";
import { LeadOwnerQuickAssign } from "./LeadOwnerQuickAssign";
import { PriorityBadge } from "./PriorityBadge";
import { SourceBadge } from "./SourceBadge";
import { StatusBadge } from "./StatusBadge";

function leadSummary(lead: LeadRecord) {
  return lead.topPathwayTitle || lead.readinessLevel || "Awaiting report";
}

function goalLabel(lead: LeadRecord) {
  return lead.primaryGoal ? crmLabelize(lead.primaryGoal) : "Not set";
}

function assessmentLabel(lead: LeadRecord) {
  return lead.completionStatus === "complete" ? "Assessment complete" : "Assessment in progress";
}

function ownerLabel(lead: LeadRecord) {
  const summary = formatLeadAssigneeSummary(lead.assignedToList);
  if (!summary.primary) {
    return "Unassigned";
  }

  return summary.additionalCount > 0
    ? `${summary.primary} +${summary.additionalCount} more`
    : summary.primary;
}

export function LeadDataTable({
  leads,
  emptyTitle,
  emptyDescription,
  assigneeOptions = [],
  renderActions,
}: {
  leads: LeadRecord[];
  emptyTitle: string;
  emptyDescription: string;
  assigneeOptions?: Array<{ label: string; value: string }>;
  renderActions?: (lead: LeadRecord) => ReactNode;
}) {
  if (leads.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const leadDisplayNameById = buildLeadDisplayNameMap(leads);

  return (
    <>
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,250,255,0.95)_100%)] md:hidden">
        {leads.map((lead, index) => (
          <article
            key={lead.id}
            className={[
              "px-4 py-4",
              index < leads.length - 1 ? "border-b border-slate-200/80" : "",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/admin/leads/${lead.id}`}
                  className="text-lg font-semibold tracking-[-0.03em] text-slate-950 transition hover:text-[#1f3486]"
                >
                  {leadDisplayNameById[lead.id]}
                </Link>
                <p className="mt-1 text-sm leading-6 text-slate-500 [overflow-wrap:anywhere]">
                  {leadSummary(lead)}
                </p>
              </div>
              <StatusBadge status={lead.crmStatus} />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <SourceBadge source={lead.source} />
              <PriorityBadge priority={lead.priority} />
              {lead.state ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                  <MapPin className="h-3.5 w-3.5" />
                  {formatLeadStateLabel(lead.state)}
                </span>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3 rounded-[22px] border border-slate-200/80 bg-white/80 p-4 text-sm">
              <div className="flex items-start gap-2.5">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#2252db]" />
                <p className="min-w-0 text-slate-700 [overflow-wrap:anywhere]">
                  {lead.email || "No email yet"}
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <PhoneCall className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <p className="min-w-0 text-slate-700 [overflow-wrap:anywhere]">
                  {lead.whatsappNumber || "No phone yet"}
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                <p className="min-w-0 text-slate-700 [overflow-wrap:anywhere]">
                  {lead.state ? formatLeadStateLabel(lead.state) : "State not captured yet"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs uppercase tracking-[0.14em] text-slate-400">
                <div>
                  <p>Goal</p>
                  <p className="mt-1 text-sm font-medium normal-case tracking-normal text-slate-700">
                    {goalLabel(lead)}
                  </p>
                </div>
                <div>
                  <p>Owner</p>
                  {assigneeOptions.length > 0 ? (
                    <div className="mt-2">
                      <LeadOwnerQuickAssign
                        leadId={lead.id}
                        initialAssignedTo={lead.assignedTo}
                        crmStatus={lead.crmStatus}
                        priority={lead.priority}
                        assigneeOptions={assigneeOptions}
                        variant="compact"
                      />
                    </div>
                  ) : (
                    <p className="mt-1 text-sm font-medium normal-case tracking-normal text-slate-700 [overflow-wrap:anywhere]">
                      {ownerLabel(lead)}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid gap-3 text-xs uppercase tracking-[0.14em] text-slate-400 sm:grid-cols-2">
                <div>
                  <p>Assessment</p>
                  <p className="mt-1 text-sm font-medium normal-case tracking-normal text-slate-700">
                    {assessmentLabel(lead)}
                  </p>
                </div>
                <div>
                  <p>Updated</p>
                  <p className="mt-1 text-sm font-medium normal-case tracking-normal text-slate-700">
                    {formatCrmDateTime(lead.lastActivityAt)}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p>Created</p>
                  <p className="mt-1 text-sm font-medium normal-case tracking-normal text-slate-700">
                    {formatCrmDateTime(lead.createdAt)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4">
              {renderActions ? (
                <div className="flex flex-wrap gap-2">{renderActions(lead)}</div>
              ) : (
                <Link
                  href={`/admin/leads/${lead.id}`}
                  className="admin-button-primary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm"
                >
                  Open lead
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-[30px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,250,255,0.95)_100%)] md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(249,251,255,0.95)_0%,rgba(245,248,255,0.92)_100%)] text-left">
                <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Lead
                </th>
                <th className="px-4 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Source
                </th>
                <th className="px-4 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Stage
                </th>
                <th className="px-4 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Priority
                </th>
                <th className="px-4 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Goal
                </th>
                <th className="px-4 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Owner
                </th>
                <th className="px-4 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Activity
                </th>
                <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead, index) => (
                <tr
                  key={lead.id}
                  className={[
                    "align-top transition hover:bg-white",
                    index < leads.length - 1 ? "border-b border-slate-200/70" : "",
                  ].join(" ")}
                >
                  <td className="px-5 py-4">
                    <div className="min-w-[280px]">
                      <Link
                        href={`/admin/leads/${lead.id}`}
                        className="text-base font-semibold tracking-[-0.03em] text-slate-950 transition hover:text-[#1f3486]"
                      >
                        {leadDisplayNameById[lead.id]}
                      </Link>
                      <p className="mt-1 text-sm text-slate-700 [overflow-wrap:anywhere]">
                        {lead.email || lead.whatsappNumber || "No contact yet"}
                      </p>
                      <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                        {lead.state ? formatLeadStateLabel(lead.state) : "State not captured yet"}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {leadSummary(lead)}
                      </p>
                      <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                        {assessmentLabel(lead)}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="min-w-[130px]">
                      <SourceBadge source={lead.source} />
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="min-w-[140px]">
                      <StatusBadge status={lead.crmStatus} />
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="min-w-[110px]">
                      <PriorityBadge priority={lead.priority} />
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">
                    <div className="min-w-[120px]">{goalLabel(lead)}</div>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">
                    <div className="min-w-[210px]">
                      {assigneeOptions.length > 0 ? (
                        <LeadOwnerQuickAssign
                          leadId={lead.id}
                          initialAssignedTo={lead.assignedTo}
                          crmStatus={lead.crmStatus}
                          priority={lead.priority}
                          assigneeOptions={assigneeOptions}
                          variant="compact"
                        />
                      ) : (
                        <p className="[overflow-wrap:anywhere]">{ownerLabel(lead)}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600">
                    <div className="min-w-[170px]">
                      <p>{formatCrmDateTime(lead.lastActivityAt)}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">
                        Created {formatCrmDateTime(lead.createdAt)}
                      </p>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {renderActions ? (
                      <div className="flex min-w-[210px] justify-end gap-2">{renderActions(lead)}</div>
                    ) : (
                      <Link
                        href={`/admin/leads/${lead.id}`}
                        className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium"
                      >
                        Open
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
