import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  CalendarDays,
  Clock3,
  FileText,
  Mail,
  MapPin,
  MessageCircle,
  PhoneCall,
  UserRound,
} from "lucide-react";
import { appRoutes } from "@/lib/app-routes";
import { formatCrmDateTime } from "@/lib/crm/formatters";
import { cn } from "@/lib/cn";
import type { AdminLeadListItem } from "@/lib/crm/view-models";
import { AdminCollapsibleSection } from "./AdminCollapsibleSection";
import { EmptyState } from "./EmptyState";
import { LeadOwnerQuickAssign } from "./LeadOwnerQuickAssign";
import { PriorityBadge } from "./PriorityBadge";
import { SourceBadge } from "./SourceBadge";
import { StatusBadge } from "./StatusBadge";

function resolveLegacyStageBadge(stage?: string | null) {
  return (stage ?? "new") as Parameters<typeof StatusBadge>[0]["status"];
}

function buildWhatsAppHref(value?: string | null) {
  const sanitized = value?.replace(/[^\d]/g, "") ?? "";
  return sanitized ? `https://wa.me/${sanitized}` : null;
}

function getWebsiteLeadContext(lead: AdminLeadListItem) {
  if (lead.source !== "website_form") {
    return null;
  }

  return {
    routeId: lead.routeId,
    routeLabel: lead.routeLabel,
    nigeriaState: lead.nigeriaState,
  };
}

function formatLeadSummary(lead: AdminLeadListItem) {
  const websiteContext = getWebsiteLeadContext(lead);
  return websiteContext?.routeLabel || websiteContext?.routeId || lead.interestLabel;
}

function buildFollowUpHref(leadId: string) {
  return `${appRoutes.tasks}?leadId=${encodeURIComponent(leadId)}#task-action-center`;
}

function formatPotentialValue(lead: AdminLeadListItem) {
  const value = lead.expectedValue ?? lead.estimatedValue;
  if (value === null || value === undefined) {
    return "Potential value not set";
  }

  return `Potential value NGN ${value.toLocaleString()}`;
}

function LeadMetric({
  icon: Icon,
  label,
  tone = "blue",
  className,
  children,
}: {
  icon: LucideIcon;
  label: string;
  tone?: "blue" | "emerald" | "amber" | "violet";
  className?: string;
  children: ReactNode;
}) {
  const toneClasses = {
    blue: "border-[#d8e5ff] bg-[linear-gradient(180deg,#ffffff_0%,#f7faff_100%)] text-[#23418d]",
    emerald:
      "border-emerald-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(236,253,245,0.94)_100%)] text-emerald-700",
    amber:
      "border-amber-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(255,251,235,0.94)_100%)] text-amber-700",
    violet:
      "border-violet-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(245,243,255,0.95)_100%)] text-violet-700",
  }[tone];

  return (
    <div
      className={cn(
        "rounded-[24px] border p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]",
        toneClasses,
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border border-white/70 bg-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]">
          <Icon className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            {label}
          </p>
          <div className="mt-2 min-w-0 text-sm leading-6 text-slate-900">{children}</div>
        </div>
      </div>
    </div>
  );
}

function LeadProgressPanel({
  stage,
  stageLabel,
  priority,
  source,
  sourceLabel,
  lastActivityAt,
}: {
  stage: AdminLeadListItem["stage"];
  stageLabel: string;
  priority: AdminLeadListItem["priority"];
  source: AdminLeadListItem["source"];
  sourceLabel: string;
  lastActivityAt: string;
}) {
  return (
    <div className="rounded-[26px] border border-[#d7e2ff] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(243,247,255,0.96)_100%)] p-4 shadow-[0_16px_34px_rgba(15,23,42,0.05)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Lead stage
          </p>
          <div className="mt-3">
            <StatusBadge status={resolveLegacyStageBadge(stage)} label={stageLabel} />
          </div>
        </div>
        <span className="rounded-full border border-[#cad8ff] bg-white px-3 py-1.5 text-sm font-medium tracking-[-0.02em] text-slate-700 shadow-[0_8px_18px_rgba(34,82,219,0.06)]">
          Profile active
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <PriorityBadge priority={priority} />
        <SourceBadge source={source} label={sourceLabel} />
      </div>

      <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Profile
          </p>
          <p className="mt-1 font-medium text-slate-900">Tracked</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Last activity
          </p>
          <p className="mt-1 font-medium text-slate-900">{formatCrmDateTime(lastActivityAt)}</p>
        </div>
      </div>
    </div>
  );
}

function LeadActions({
  leadId,
  email,
  phone,
  whatsappHref,
  className,
}: {
  leadId: string;
  email: string;
  phone: string;
  whatsappHref: string | null;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Link
        href={appRoutes.lead(leadId)}
        className="admin-button-primary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm"
      >
        Open lead
        <ArrowUpRight className="h-4 w-4" />
      </Link>
      {whatsappHref ? (
        <a href={whatsappHref} target="_blank" rel="noreferrer" className="admin-icon-button">
          <MessageCircle className="h-4 w-4" />
        </a>
      ) : null}
      {email ? (
        <a href={`mailto:${email}`} className="admin-icon-button">
          <Mail className="h-4 w-4" />
        </a>
      ) : null}
      {phone ? (
        <a href={`tel:${phone}`} className="admin-icon-button">
          <PhoneCall className="h-4 w-4" />
        </a>
      ) : null}
    </div>
  );
}

function LeadHeader({
  lead,
  badgeClassName,
  compact = false,
}: {
  lead: AdminLeadListItem;
  badgeClassName?: string;
  compact?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 sm:gap-4">
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-[22px] bg-[linear-gradient(180deg,#e4ecff_0%,#cedbff_100%)] font-semibold tracking-[-0.05em] text-[#132d78] shadow-[0_16px_34px_rgba(34,82,219,0.12),inset_0_1px_0_rgba(255,255,255,0.88)]",
          compact ? "h-14 w-14 text-xl" : "h-20 w-20 text-[2rem]",
        )}
      >
        {lead.initials}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap gap-2">
          <SourceBadge source={lead.source} label={lead.sourceLabel} className={badgeClassName} />
          <StatusBadge
            status={resolveLegacyStageBadge(lead.stage)}
            label={lead.stageLabel}
            className={badgeClassName}
          />
          <PriorityBadge priority={lead.priority} className={badgeClassName} />
        </div>

        <Link
          href={appRoutes.lead(lead.id)}
          className={cn(
            "mt-3 block font-semibold leading-[0.98] tracking-[-0.05em] text-slate-950 transition hover:text-[#0b123f]",
            compact ? "text-[1.45rem]" : "text-[2rem]",
          )}
        >
          {lead.displayName}
        </Link>

        <div
          className={cn(
            "mt-3 grid gap-3 text-sm lg:grid-cols-2",
            compact && "lg:grid-cols-1",
            !compact && "xl:grid-cols-1 2xl:grid-cols-3",
          )}
        >
          <div className="flex items-start gap-2.5">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#2252db]" />
            <p className="min-w-0 leading-6 text-slate-700 [overflow-wrap:anywhere]">
              {lead.email || "No email yet"}
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <PhoneCall className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <p className="min-w-0 leading-6 text-slate-600 [overflow-wrap:anywhere]">
              {lead.phone || "No phone yet"}
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
            <p className="min-w-0 leading-6 text-slate-600 [overflow-wrap:anywhere]">
              {lead.stateLabel}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LeadTable({
  leads,
  eyebrow = "Lead queue",
  title = "Leads needing action",
  description = "The clearest next leads to review, contact, or assign.",
  emptyTitle = "No leads match this view",
  emptyDescription = "Adjust your search or filters to bring leads back into view.",
  actions,
  assigneeOptions = [],
}: {
  leads: AdminLeadListItem[];
  eyebrow?: string;
  title?: string;
  description?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  actions?: ReactNode;
  assigneeOptions?: Array<{ label: string; value: string }>;
}) {
  return (
    <AdminCollapsibleSection
      eyebrow={eyebrow}
      title={title}
      description={description}
      className="overflow-hidden"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500">
            {leads.length} visible
          </div>
        </div>
      }
    >
      {leads.length === 0 ? <EmptyState title={emptyTitle} description={emptyDescription} /> : null}

      <div id="lead-pipeline" className={cn("grid gap-3 md:hidden", leads.length === 0 && "hidden")}>
        {leads.map((lead) => {
          const whatsappHref = buildWhatsAppHref(lead.phone);
          const leadSummary = formatLeadSummary(lead);
          const websiteContext = getWebsiteLeadContext(lead);
          const websiteContextLine = [websiteContext?.routeId, websiteContext?.nigeriaState]
            .filter(Boolean)
            .join(" • ");

          return (
            <article
              key={lead.id}
              className="admin-surface-muted relative overflow-hidden rounded-[30px] p-0"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(111,140,255,0.18),transparent_72%)]" />

              <div className="relative border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,250,255,0.94)_100%)] px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <LeadHeader
                    lead={lead}
                    compact
                    badgeClassName="px-2.5 py-1 text-[11px] shadow-[0_6px_14px_rgba(15,23,42,0.04)]"
                  />

                  <div className="shrink-0 rounded-[20px] border border-[#d8e2fb] bg-white/90 px-3 py-2 text-right shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Last active
                    </p>
                    <p className="mt-1 text-sm font-medium leading-5 text-slate-700">
                      {formatCrmDateTime(lead.lastActivityAt)}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <LeadProgressPanel
                    stage={lead.stage ?? "new"}
                    stageLabel={lead.stageLabel}
                    priority={lead.priority}
                    source={lead.source}
                    sourceLabel={lead.sourceLabel}
                    lastActivityAt={lead.lastActivityAt}
                  />
                </div>
              </div>

              <div className="grid gap-3 px-4 py-4">
                <LeadMetric icon={FileText} label="Lead summary" tone="blue">
                  <p className="font-medium text-slate-900 [overflow-wrap:anywhere]">{leadSummary}</p>
                  {websiteContextLine ? (
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
                      {websiteContextLine}
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm font-medium text-slate-700">{formatPotentialValue(lead)}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Primary interest and current summary for this lead.
                  </p>
                </LeadMetric>

                <div className="grid gap-3 sm:grid-cols-2">
                  <LeadMetric icon={UserRound} label="Owner" tone="violet">
                    <p className="font-medium text-slate-900 [overflow-wrap:anywhere]">
                      {lead.assignedUserName}
                    </p>
                    {assigneeOptions.length > 0 ? (
                      <div className="mt-3">
                        <LeadOwnerQuickAssign
                          leadId={lead.id}
                    initialAssignedTo={lead.assignedTo}
                    stage={lead.stage ?? "new"}
                    priority={lead.priority}
                    assigneeOptions={assigneeOptions}
                  />
                      </div>
                    ) : (
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        Keep ownership clear before the next follow-up.
                      </p>
                    )}
                  </LeadMetric>

                  <LeadMetric icon={MapPin} label="State" tone="blue">
                    <p className="font-medium text-slate-900 [overflow-wrap:anywhere]">
                      {lead.stateLabel}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Use this to route follow-up to the right branch team.
                    </p>
                  </LeadMetric>

                  <LeadMetric icon={Clock3} label="Activity" tone="amber">
                    <p className="font-medium text-slate-900">
                      Created {formatCrmDateTime(lead.createdAt)}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Updated {formatCrmDateTime(lead.lastActivityAt)}
                    </p>
                  </LeadMetric>
                </div>

                <LeadMetric icon={CalendarDays} label="Next touch" tone="emerald">
                  <p className="font-medium text-slate-900">
                    {lead.nextFollowUpAt ? formatCrmDateTime(lead.nextFollowUpAt) : "Not scheduled"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {lead.nextFollowUpAt ? "Already queued in the task list." : "Add a follow-up when ready."}
                  </p>
                </LeadMetric>
              </div>

              <div className="border-t border-slate-200/80 px-4 py-4">
                <LeadActions
                  leadId={lead.id}
                  email={lead.email}
                  phone={lead.phone}
                  whatsappHref={whatsappHref}
                />
              </div>
            </article>
          );
        })}
      </div>

      <div className={cn("hidden gap-3 md:grid", leads.length === 0 && "hidden")}>
        {leads.map((lead) => {
          const whatsappHref = buildWhatsAppHref(lead.phone);
          const leadSummary = formatLeadSummary(lead);
          const websiteContext = getWebsiteLeadContext(lead);
          const websiteContextLine = [websiteContext?.routeId, websiteContext?.nigeriaState]
            .filter(Boolean)
            .join(" • ");

          return (
            <article
              key={lead.id}
              className="admin-surface-muted relative overflow-hidden rounded-[32px] p-0 transition hover:-translate-y-[1px] hover:border-slate-300 hover:shadow-[0_22px_44px_rgba(15,23,42,0.07)]"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_top,rgba(111,140,255,0.18),transparent_72%)]" />

              <div className="relative bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,250,255,0.94)_100%)] px-5 py-5 sm:px-6">
                <div className="grid gap-5">
                  <LeadHeader
                    lead={lead}
                    badgeClassName="px-3 py-1.5 text-xs shadow-[0_6px_14px_rgba(15,23,42,0.04)]"
                  />

                  <div className="grid gap-3 xl:items-start xl:grid-cols-[minmax(0,1.22fr)_minmax(320px,0.9fr)]">
                    <LeadMetric icon={FileText} label="Lead summary" tone="blue" className="self-start">
                      <p className="font-medium text-slate-900 [overflow-wrap:anywhere]">{leadSummary}</p>
                      {websiteContextLine ? (
                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
                          {websiteContextLine}
                        </p>
                      ) : null}
                      <p className="mt-2 text-sm font-medium text-slate-700">{formatPotentialValue(lead)}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {lead.fitSignalLabel !== "Not provided"
                          ? `Fit: ${lead.fitSignalLabel}`
                          : "Fit will appear after more details are captured."}
                      </p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                            Category
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-700 [overflow-wrap:anywhere]">
                            {lead.categoryLabel}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                            Created
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-700">
                            {formatCrmDateTime(lead.createdAt)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                            State
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-700 [overflow-wrap:anywhere]">
                            {lead.stateLabel}
                          </p>
                        </div>
                      </div>
                    </LeadMetric>

                    <div className="grid gap-3">
                  <LeadProgressPanel
                    stage={lead.stage ?? "new"}
                    stageLabel={lead.stageLabel}
                    priority={lead.priority}
                    source={lead.source}
                    sourceLabel={lead.sourceLabel}
                    lastActivityAt={lead.lastActivityAt}
                  />

                      <div className="grid gap-3">
                        <LeadMetric icon={UserRound} label="Owner" tone="violet">
                          <p className="font-medium text-slate-900 [overflow-wrap:anywhere]">
                            {lead.assignedUserName}
                          </p>
                          {assigneeOptions.length > 0 ? (
                            <div className="mt-3">
                              <LeadOwnerQuickAssign
                                leadId={lead.id}
                                initialAssignedTo={lead.assignedTo}
                                stage={lead.stage ?? "new"}
                                priority={lead.priority}
                                assigneeOptions={assigneeOptions}
                              />
                            </div>
                          ) : (
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                              Clear ownership keeps follow-ups moving.
                            </p>
                          )}
                        </LeadMetric>

                        <LeadMetric icon={CalendarDays} label="Next touch" tone="emerald">
                          <p className="font-medium text-slate-900">
                            {lead.nextFollowUpAt ? formatCrmDateTime(lead.nextFollowUpAt) : "Not scheduled"}
                          </p>
                          {lead.nextFollowUpAt ? (
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                              Already queued in the task list.
                            </p>
                          ) : (
                            <div className="mt-3 space-y-3">
                              <p className="text-sm leading-6 text-slate-500">
                                Add the next follow-up now so this lead does not go quiet.
                              </p>
                              <Link
                                href={buildFollowUpHref(lead.id)}
                                className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-medium"
                              >
                                Add follow-up
                              </Link>
                            </div>
                          )}
                        </LeadMetric>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
                    <LeadMetric icon={Mail} label="Contact" tone="amber">
                      <div className="space-y-3">
                        <div>
                          <p className="font-medium text-slate-900 [overflow-wrap:anywhere]">
                            {lead.email || "No email yet"}
                          </p>
                          <p className="mt-1 text-sm text-slate-500 [overflow-wrap:anywhere]">
                            {lead.phone || "No phone yet"}
                          </p>
                        </div>
                      </div>
                    </LeadMetric>

                    <LeadActions
                      leadId={lead.id}
                      email={lead.email}
                      phone={lead.phone}
                      whatsappHref={whatsappHref}
                      className="xl:justify-end xl:pt-1"
                    />
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </AdminCollapsibleSection>
  );
}
