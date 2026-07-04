import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, Mail, MapPin, PhoneCall } from "lucide-react";
import { buildLeadTableCustomFieldColumns } from "@/lib/crm/custom-field-values";
import { formatCrmDateTime } from "@/lib/crm/formatters";
import type { AdminLeadListItem } from "@/lib/crm/view-models";
import type { LeadPriority } from "@/lib/crm/types";
import { cn } from "@/lib/cn";
import { GradientText } from "./ui/GradientText";
import {
  DEFAULT_LEAD_PREVIEW_CONFIG,
  type LeadPreviewCustomizationConfig,
  type LeadPreviewFieldKey,
} from "@/lib/crm/workspace-settings";
import { EmptyState } from "./EmptyState";
import { LeadOwnerQuickAssign } from "./LeadOwnerQuickAssign";
import { appRoutes } from "@/lib/app-routes";
import { PriorityBadge } from "./PriorityBadge";
import { SourceBadge } from "./SourceBadge";
import { StatusBadge } from "./StatusBadge";

function resolveLegacyStageBadge(stage?: string | null) {
  return (stage ?? "new") as Parameters<typeof StatusBadge>[0]["status"];
}

function formatMoney(value?: number | null) {
  if (value === null || value === undefined) {
    return "Not set";
  }

  return `NGN ${value.toLocaleString()}`;
}

function followUpLabel(lead: AdminLeadListItem) {
  if (!lead.nextFollowUpAt) {
    return "No follow-up";
  }

  if (lead.nextFollowUpStatus === "overdue") {
    return `Overdue • ${formatCrmDateTime(lead.nextFollowUpAt)}`;
  }

  if (lead.nextFollowUpStatus === "due_today") {
    return `Due today • ${formatCrmDateTime(lead.nextFollowUpAt)}`;
  }

  return `Upcoming • ${formatCrmDateTime(lead.nextFollowUpAt)}`;
}

const previewFieldLabels: Record<string, string> = {
  name: "Lead",
  phone: "Phone",
  email: "Email",
  company: "Company",
  customer_type: "Lead type",
  source: "Source",
  stage: "Stage",
  owner: "Owner",
  priority: "Priority",
  next_follow_up: "Next follow-up",
  follow_up_status: "Follow-up status",
  estimated_value: "Estimated value",
  expected_close_date: "Expected close date",
  created_date: "Created",
  last_activity: "Last activity",
  campaign: "Campaign",
  team: "Team",
  branch: "Branch",
  department: "Department",
};

const priorityBorderMap: Record<LeadPriority, string> = {
  urgent: "border-l-2 border-l-rose-500",
  high: "border-l-2 border-l-amber-500",
  medium: "border-l-2 border-l-emerald-500",
  low: "border-l-2 border-l-white/20",
};

function resolvePreviewFieldValue(
  lead: AdminLeadListItem,
  key: LeadPreviewFieldKey,
  assigneeOptions: Array<{ label: string; value: string }>,
) {
  if (key.startsWith("custom:")) {
    const fieldId = key.slice("custom:".length);
    return lead.customFieldDisplayValues.find((field) => field.fieldId === fieldId)?.displayValue ?? "—";
  }

  switch (key) {
    case "name":
      return lead.displayName;
    case "phone":
      return lead.phone || "No phone yet";
    case "email":
      return lead.email || "No email yet";
    case "company":
      return lead.companyName || "No company";
    case "customer_type":
      return (
        <span className="inline-flex rounded-full border border-white/10 bg-white/[0.07] px-2.5 py-1 text-xs font-semibold text-white/78">
          {lead.leadCustomerTypeLabel}
        </span>
      );
    case "source":
      return <SourceBadge source={lead.source} label={lead.sourceLabel} />;
    case "stage":
      return <StatusBadge status={resolveLegacyStageBadge(lead.stage)} label={lead.stageLabel} />;
    case "owner":
      return assigneeOptions.length > 0 ? (
        <LeadOwnerQuickAssign
          leadId={lead.id}
          initialAssignedTo={lead.assignedTo}
          stage={lead.stage ?? "new"}
          priority={lead.priority}
          assigneeOptions={assigneeOptions}
          variant="compact"
        />
      ) : (
        lead.assignedUserName
      );
    case "priority":
      return <PriorityBadge priority={lead.priority} />;
    case "next_follow_up":
      return followUpLabel(lead);
    case "follow_up_status":
      return lead.nextFollowUpStatus.replace(/_/g, " ");
    case "estimated_value":
      return formatMoney(lead.expectedValue ?? lead.estimatedValue);
    case "expected_close_date":
      return lead.expectedCloseDate ? formatCrmDateTime(lead.expectedCloseDate) : "Not set";
    case "created_date":
      return formatCrmDateTime(lead.createdAt);
    case "last_activity":
      return formatCrmDateTime(lead.lastActivityAt);
    case "campaign":
      return lead.routeLabel || lead.routeId || "Not set";
    case "team":
      return "Not set";
    case "branch":
      return "Not set";
    case "department":
      return "Not set";
    default:
      return "—";
  }
}

export function LeadDataTable({
  leads,
  emptyTitle,
  emptyDescription,
  assigneeOptions = [],
  renderActions,
  previewConfig = DEFAULT_LEAD_PREVIEW_CONFIG,
}: {
  leads: AdminLeadListItem[];
  emptyTitle: string;
  emptyDescription: string;
  assigneeOptions?: Array<{ label: string; value: string }>;
  renderActions?: (lead: AdminLeadListItem) => ReactNode;
  previewConfig?: LeadPreviewCustomizationConfig;
}) {
  if (leads.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const customFieldColumns = buildLeadTableCustomFieldColumns(leads, {
    limit: previewConfig.maxCustomFieldColumns,
  });
  const desktopColumns = previewConfig.desktopColumns
    .filter((column) => column !== "name")
    .filter((column) =>
      column.startsWith("custom:")
        ? customFieldColumns.some((field) => `custom:${field.fieldId}` === column)
        : true,
    )
    .slice(0, 8);
  const mobileFields = previewConfig.mobileFields.filter((column) =>
    column.startsWith("custom:")
      ? customFieldColumns.some((field) => `custom:${field.fieldId}` === column)
      : true,
  );

  return (
    <>
      <div className="ld-glass-card ld-glass-soft overflow-hidden rounded-[28px] md:hidden">
        {leads.map((lead, index) => (
          <article
            key={lead.id}
            className={cn(
              "px-4 py-5 ld-animate-fade-in-up transition-colors duration-200 hover:bg-white/[0.04]",
              priorityBorderMap[lead.priority],
              index < leads.length - 1 ? "border-b border-white/10" : "",
            )}
            style={{ animationDelay: `${Math.min(index * 50, 400)}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={appRoutes.lead(lead.id)}
                  className="text-lg font-semibold tracking-[-0.03em] text-white transition hover:text-[color:var(--ld-color-accent)]"
                >
                  {lead.displayName}
                </Link>
                <p className="mt-1 text-sm leading-6 text-white/70 [overflow-wrap:anywhere]">
                  {lead.interestLabel}
                </p>
              </div>
              <StatusBadge status={resolveLegacyStageBadge(lead.stage)} label={lead.stageLabel} className="shrink-0" />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <SourceBadge source={lead.source} label={lead.sourceLabel} />
              <PriorityBadge priority={lead.priority} />
              {lead.stateRaw ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/14 bg-white/[0.07] px-3 py-1 text-xs font-semibold text-white/90">
                  <MapPin className="h-3.5 w-3.5" />
                  {lead.stateLabel}
                </span>
              ) : null}
            </div>

            <div className="mt-4 grid gap-4 rounded-[22px] border border-white/10 bg-white/[0.06] p-4 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <div className="flex items-start gap-2.5">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-white/70" />
                <p className="min-w-0 text-white/76 [overflow-wrap:anywhere]">
                  {lead.email || "No email yet"}
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <PhoneCall className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <p className="min-w-0 text-white/76 [overflow-wrap:anywhere]">
                  {lead.phone || "No phone yet"}
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-white/70" />
                <p className="min-w-0 text-white/76 [overflow-wrap:anywhere]">{lead.stateLabel}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs uppercase tracking-[0.14em] text-white/70">
                <div>
                  <p>Category</p>
                  <p className="mt-1 text-sm font-medium normal-case tracking-normal text-white/76">
                    {lead.categoryLabel}
                  </p>
                </div>
                <div>
                  <p>Owner</p>
                  {assigneeOptions.length > 0 ? (
                    <div className="mt-1">
                      <LeadOwnerQuickAssign
                        leadId={lead.id}
                        initialAssignedTo={lead.assignedTo}
                        stage={lead.stage ?? "new"}
                        priority={lead.priority}
                        assigneeOptions={assigneeOptions}
                        variant="compact"
                      />
                    </div>
                  ) : (
                    <p className="mt-1 text-sm font-medium normal-case tracking-normal text-white/76 [overflow-wrap:anywhere]">
                      {lead.assignedUserName}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid gap-3 text-xs uppercase tracking-[0.14em] text-white/70 sm:grid-cols-2">
                <div>
                  <p>Follow-up</p>
                  <p className="mt-1 text-sm font-medium normal-case tracking-normal text-white/76">
                    {followUpLabel(lead)}
                  </p>
                </div>
                <div>
                  <p>Pipeline</p>
                  <p className="mt-1 text-sm font-medium normal-case tracking-normal text-white/76">
                    {formatMoney(lead.expectedValue ?? lead.estimatedValue)}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p>Updated</p>
                  <p className="mt-1 text-sm font-medium normal-case tracking-normal text-white/76">
                    {formatCrmDateTime(lead.lastActivityAt)}
                  </p>
                </div>
              </div>
              {mobileFields.length > 0 ? (
                <div className="grid gap-3 text-xs uppercase tracking-[0.14em] text-white/70">
                  <p>Preview fields</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {mobileFields.map((fieldKey) => (
                      <div key={fieldKey}>
                        <p>
                          {fieldKey.startsWith("custom:")
                            ? customFieldColumns.find((field) => `custom:${field.fieldId}` === fieldKey)?.label ?? "Custom field"
                            : previewFieldLabels[fieldKey]}
                        </p>
                        <div className="mt-1 text-sm font-medium normal-case tracking-normal text-white/76 [overflow-wrap:anywhere]">
                          {resolvePreviewFieldValue(lead, fieldKey, assigneeOptions)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-4">
              {renderActions ? (
                <div className="flex flex-wrap gap-2">{renderActions(lead)}</div>
              ) : (
                <Link
                  href={appRoutes.lead(lead.id)}
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

      <div className="ld-glass-card ld-glass-soft hidden overflow-hidden rounded-[30px] md:block">
        <div className="overflow-x-auto">
          <table className="ld-readable-table min-w-full border-collapse">
            <thead>
              <tr className="text-left">
                <th className="sticky top-0 z-10 bg-white/[0.06] backdrop-blur-md border-b border-white/10 px-4 py-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                  Lead
                </th>
                {desktopColumns.map((column) => (
                  <th
                    key={column}
                    className="sticky top-0 z-10 bg-white/[0.06] backdrop-blur-md border-b border-white/10 px-4 py-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70"
                  >
                    {column.startsWith("custom:")
                      ? customFieldColumns.find((field) => `custom:${field.fieldId}` === column)?.label ?? "Custom field"
                      : previewFieldLabels[column]}
                  </th>
                ))}
                <th className="sticky top-0 z-10 bg-white/[0.06] backdrop-blur-md border-b border-white/10 px-4 py-3.5 text-right align-middle text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                  <GradientText>Action</GradientText>
                </th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead, index) => (
                <tr
                  key={lead.id}
                  className={cn(
                    "align-middle transition-all duration-200 hover:bg-white/[0.06] ld-animate-fade-in-up",
                    priorityBorderMap[lead.priority],
                    index < leads.length - 1 ? "border-b border-white/10" : "",
                  )}
                  style={{ animationDelay: `${Math.min(index * 50, 400)}ms` }}
                >
                  <td className="px-4 py-3.5">
                    <div className="min-w-0">
                      <Link
                        href={appRoutes.lead(lead.id)}
                        className="text-base font-semibold tracking-[-0.03em] text-white transition hover:text-[color:var(--ld-color-accent)]"
                      >
                        {lead.displayName}
                      </Link>
                      <p className="mt-1 text-sm leading-5 text-white/70 [overflow-wrap:anywhere]">
                        {lead.email || lead.phone || "No contact yet"}
                      </p>
                      <p className="mt-1.5 text-xs font-medium uppercase tracking-[0.14em] text-white/70">
                        {lead.stateLabel}
                      </p>
                      <p className="mt-1.5 text-sm leading-5 text-white/70 [overflow-wrap:anywhere]">{lead.interestLabel}</p>
                      <p className="mt-1.5 text-sm leading-5 text-white/70 [overflow-wrap:anywhere]">
                        {lead.companyName || "No company set"} • {formatMoney(lead.expectedValue ?? lead.estimatedValue)}
                      </p>
                      <p className="mt-1.5 text-xs font-medium uppercase tracking-[0.14em] text-white/70">
                        {lead.completionLabel}
                      </p>
                    </div>
                  </td>
                  {desktopColumns.map((column) => {
                    return (
                      <td key={column} className="px-4 py-3.5 text-sm leading-5 text-white/80">
                        <div className="min-w-0 [overflow-wrap:anywhere]">
                          {resolvePreviewFieldValue(lead, column, assigneeOptions)}
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-4 py-3.5 text-right align-middle whitespace-nowrap">
                    {renderActions ? (
                      <div className="flex min-w-0 justify-end gap-2">{renderActions(lead)}</div>
                    ) : (
                      <Link
                        href={appRoutes.lead(lead.id)}
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
