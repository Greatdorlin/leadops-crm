import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { appRoutes } from "@/lib/app-routes";
import { formatCrmDateTime } from "@/lib/crm/formatters";
import type { LeadPriority, LeadSource } from "@/lib/crm/types";
import { AdminCollapsibleSection } from "./AdminCollapsibleSection";
import { EmptyState } from "./EmptyState";
import { LeadFollowUpQuickChange } from "./LeadFollowUpQuickChange";
import { LeadOwnerQuickAssign, type LeadAssigneeOption } from "./LeadOwnerQuickAssign";
import { LeadStatusQuickChange, type LeadStageQuickOption } from "./LeadStatusQuickChange";
import { PriorityBadge } from "./PriorityBadge";
import { SourceBadge } from "./SourceBadge";

export interface DashboardRecentLead {
  assignedTo: string | null;
  contact: string;
  createdAt: string;
  id: string;
  location: string;
  name: string;
  nextFollowUpAt: string | null;
  priority: LeadPriority;
  source: LeadSource | null;
  stageColor: string | null;
  stageId: string | null;
  stageLabel: string;
}

export function DashboardRecentLeads({
  assigneeOptions,
  leads,
  previewMode = false,
  stageOptions,
}: {
  assigneeOptions: LeadAssigneeOption[];
  leads: DashboardRecentLead[];
  previewMode?: boolean;
  stageOptions: LeadStageQuickOption[];
}) {
  return (
    <AdminCollapsibleSection
      eyebrow="Recent leads"
      title="Newest leads"
      actions={
        <Link
          href={appRoutes.leads}
          prefetch={false}
          className="ld-floating-control inline-flex h-10 items-center justify-center gap-2 px-4 text-sm font-semibold"
        >
          View all
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      }
      className="p-4 sm:p-5"
      bodyClassName="mt-4"
    >
      {leads.length > 0 ? (
        <div className="divide-y divide-white/10 overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.035]">
          {leads.map((lead) => (
            <article key={lead.id} className="min-w-0 px-4 py-4 transition hover:bg-white/[0.045] sm:px-5">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={appRoutes.lead(lead.id)}
                    prefetch={false}
                    className="block truncate text-base font-bold tracking-[-0.025em] text-white transition hover:text-[var(--ld-color-accent)]"
                  >
                    {lead.name}
                  </Link>
                  <p className="mt-1 truncate text-sm text-white/70">{lead.contact}</p>
                  <p className="mt-1 text-xs font-medium text-white/55">{lead.location}</p>
                </div>
                <time className="shrink-0 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">
                  {formatCrmDateTime(lead.createdAt)}
                </time>
              </div>

              <div className="mt-3 grid min-w-0 gap-2 sm:flex sm:flex-wrap sm:items-center">
                <div className="flex min-w-0 flex-wrap items-center gap-2 sm:contents">
                  <SourceBadge source={lead.source} />
                  <LeadStatusQuickChange
                    leadId={lead.id}
                    initialStageId={lead.stageId}
                    initialStageLabel={lead.stageLabel}
                    initialStageColor={lead.stageColor}
                    stageOptions={stageOptions}
                    previewMode={previewMode}
                  />
                  <PriorityBadge priority={lead.priority} />
                </div>
                <div className="min-w-0 sm:w-[12rem] sm:shrink-0">
                  <LeadOwnerQuickAssign
                    leadId={lead.id}
                    initialAssignedTo={lead.assignedTo}
                    assigneeOptions={assigneeOptions}
                    variant="compact"
                    previewMode={previewMode}
                  />
                </div>
                <div className="min-w-0 sm:shrink-0">
                  <LeadFollowUpQuickChange
                    leadId={lead.id}
                    initialFollowUpAt={lead.nextFollowUpAt}
                    initialLabel={lead.nextFollowUpAt ? formatCrmDateTime(lead.nextFollowUpAt) : "Set follow-up"}
                    previewMode={previewMode}
                  />
                </div>
                <Link
                  href={appRoutes.lead(lead.id)}
                  prefetch={false}
                  className="admin-button-secondary inline-flex h-10 w-full items-center justify-center rounded-full px-4 text-sm font-semibold sm:w-auto sm:shrink-0"
                >
                  Open
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No recent leads" description="New leads will appear here as they arrive." />
      )}
    </AdminCollapsibleSection>
  );
}
