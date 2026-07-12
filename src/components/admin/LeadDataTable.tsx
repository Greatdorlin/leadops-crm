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
import {
  LeadOwnerQuickAssign,
  type LeadAssigneeOption,
} from "./LeadOwnerQuickAssign";
import { appRoutes } from "@/lib/app-routes";
import { LeadPriorityQuickChange } from "./LeadPriorityQuickChange";
import { LeadFollowUpQuickChange } from "./LeadFollowUpQuickChange";
import { LeadQuickActions } from "./LeadQuickActions";
import { PriorityBadge } from "./PriorityBadge";
import {
  LeadStatusQuickChange,
  type LeadStageQuickOption,
} from "./LeadStatusQuickChange";
import { SourceBadge } from "./SourceBadge";
import { StatusBadge } from "./StatusBadge";

function resolveLegacyStageBadge(stage?: string | null) {
  return (stage ?? "new") as Parameters<typeof StatusBadge>[0]["status"];
}

function formatMoney(value: number | null | undefined, currency: string) {
  if (value === null || value === undefined) {
    return "Not set";
  }

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
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

const previewFieldWidthClasses: Partial<Record<LeadPreviewFieldKey, string>> = {
  source: "min-w-[132px]",
  stage: "min-w-[142px]",
  owner: "min-w-[190px]",
  priority: "min-w-[110px]",
  next_follow_up: "min-w-[210px]",
  follow_up_status: "min-w-[150px]",
  estimated_value: "min-w-[150px]",
  expected_close_date: "min-w-[190px]",
  created_date: "min-w-[190px]",
  last_activity: "min-w-[190px]",
  company: "min-w-[180px]",
  email: "min-w-[210px]",
  phone: "min-w-[170px]",
};

function previewFieldWidthClass(field: LeadPreviewFieldKey) {
  return field.startsWith("custom:")
    ? "min-w-[170px]"
    : previewFieldWidthClasses[field] ?? "min-w-[140px]";
}

const priorityBorderMap: Record<LeadPriority, string> = {
  urgent: "border-l-2 border-l-rose-500",
  high: "border-l-2 border-l-amber-500",
  medium: "border-l-2 border-l-emerald-500",
  low: "border-l-2 border-l-white/20",
};

function resolvePreviewFieldValue(
  lead: AdminLeadListItem,
  key: LeadPreviewFieldKey,
  assigneeOptions: LeadAssigneeOption[],
  stageOptions: LeadStageQuickOption[],
  interactiveWorkflow: boolean,
  currency: string,
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
      return interactiveWorkflow ? (
        <LeadStatusQuickChange
          key={`${lead.id}-${lead.lastActivityAt}-stage`}
          leadId={lead.id}
          initialStageId={lead.stageDisplay.id}
          initialStageLabel={lead.stageLabel}
          initialStageColor={lead.stageDisplay.color}
          stageOptions={stageOptions}
        />
      ) : (
        <StatusBadge
          status={resolveLegacyStageBadge(lead.stage)}
          label={lead.stageLabel}
          color={lead.stageDisplay.color}
        />
      );
    case "owner":
      return interactiveWorkflow ? (
        <LeadOwnerQuickAssign
          key={`${lead.id}-${lead.lastActivityAt}-owner`}
          leadId={lead.id}
          initialAssignedTo={lead.assignedTo}
          assigneeOptions={assigneeOptions}
          variant="compact"
        />
      ) : (
        lead.assignedUserName
      );
    case "priority":
      return interactiveWorkflow ? (
        <LeadPriorityQuickChange
          key={`${lead.id}-${lead.lastActivityAt}-priority`}
          leadId={lead.id}
          initialPriority={lead.priority}
        />
      ) : (
        <PriorityBadge priority={lead.priority} />
      );
    case "next_follow_up":
      return interactiveWorkflow ? (
        <LeadFollowUpQuickChange
          key={`${lead.id}-${lead.lastActivityAt}-follow-up`}
          leadId={lead.id}
          initialFollowUpAt={lead.nextFollowUpAt ?? null}
          initialLabel={followUpLabel(lead)}
        />
      ) : followUpLabel(lead);
    case "follow_up_status":
      return lead.nextFollowUpStatus.replace(/_/g, " ");
    case "estimated_value":
      return formatMoney(lead.expectedValue ?? lead.estimatedValue, currency);
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
  stageOptions = [],
  interactiveWorkflow = true,
  renderActions,
  previewConfig = DEFAULT_LEAD_PREVIEW_CONFIG,
  currency = "USD",
}: {
  leads: AdminLeadListItem[];
  emptyTitle: string;
  emptyDescription: string;
  assigneeOptions?: LeadAssigneeOption[];
  stageOptions?: LeadStageQuickOption[];
  interactiveWorkflow?: boolean;
  renderActions?: (lead: AdminLeadListItem) => ReactNode;
  previewConfig?: LeadPreviewCustomizationConfig;
  currency?: string;
}) {
  if (leads.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const customFieldColumns = buildLeadTableCustomFieldColumns(leads, {
    limit: previewConfig.maxCustomFieldColumns,
  });
  const configuredDesktopColumns = previewConfig.desktopColumns
    .filter((column) => column !== "name")
    .filter((column) =>
      column.startsWith("custom:")
        ? customFieldColumns.some((field) => `custom:${field.fieldId}` === column)
        : true,
    );
  const requiredWorkflowColumns: LeadPreviewFieldKey[] = interactiveWorkflow
    ? ["stage", "owner", "priority", "next_follow_up"]
    : [];
  const desktopColumns = [
    ...requiredWorkflowColumns,
    ...configuredDesktopColumns.filter(
      (column) => !requiredWorkflowColumns.includes(column),
    ),
  ].slice(0, 8);
  const mobileFieldsAlreadyShown = new Set<LeadPreviewFieldKey>([
    "name",
    "owner",
    "priority",
    "source",
    "stage",
    "next_follow_up",
  ]);
  const mobileFields = previewConfig.mobileFields
    .filter((column) => !mobileFieldsAlreadyShown.has(column))
    .filter((column) =>
      column.startsWith("custom:")
        ? customFieldColumns.some((field) => `custom:${field.fieldId}` === column)
        : true,
    );

  return (
    <>
      <div className="ld-glass-card ld-glass-soft overflow-hidden rounded-[28px] lg:hidden">
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
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <Link
                  href={appRoutes.lead(lead.id)}
                  prefetch={false}
                  className="text-lg font-semibold tracking-[-0.03em] text-white transition hover:text-[color:var(--ld-color-accent)]"
                >
                  {lead.displayName}
                </Link>
                <p className="mt-1 text-sm leading-6 text-white/70 [overflow-wrap:anywhere]">
                  {lead.interestLabel}
                </p>
              </div>
              <div className="min-w-0 self-start">
                {interactiveWorkflow ? (
                  <LeadStatusQuickChange
                    key={`${lead.id}-${lead.lastActivityAt}-mobile-stage`}
                    leadId={lead.id}
                    initialStageId={lead.stageDisplay.id}
                    initialStageLabel={lead.stageLabel}
                    initialStageColor={lead.stageDisplay.color}
                    stageOptions={stageOptions}
                  />
                ) : (
                  <StatusBadge
                    status={resolveLegacyStageBadge(lead.stage)}
                    label={lead.stageLabel}
                    color={lead.stageDisplay.color}
                  />
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <SourceBadge source={lead.source} label={lead.sourceLabel} />
              {interactiveWorkflow ? (
                <LeadPriorityQuickChange
                  key={`${lead.id}-${lead.lastActivityAt}-mobile-priority`}
                  leadId={lead.id}
                  initialPriority={lead.priority}
                />
              ) : (
                <PriorityBadge priority={lead.priority} />
              )}
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
              <div className="grid gap-3 text-xs uppercase tracking-[0.14em] text-white/70 sm:grid-cols-2">
                <div>
                  <p>Category</p>
                  <p className="mt-1 text-sm font-medium normal-case tracking-normal text-white/76">
                    {lead.categoryLabel}
                  </p>
                </div>
                <div>
                  <p>Owner</p>
                  {interactiveWorkflow ? (
                    <div className="mt-1">
                      <LeadOwnerQuickAssign
                        key={`${lead.id}-${lead.lastActivityAt}-mobile-owner`}
                        leadId={lead.id}
                        initialAssignedTo={lead.assignedTo}
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
                  <div className="mt-1 normal-case tracking-normal">
                    {interactiveWorkflow ? (
                      <LeadFollowUpQuickChange
                        key={`${lead.id}-${lead.lastActivityAt}-mobile-follow-up`}
                        leadId={lead.id}
                        initialFollowUpAt={lead.nextFollowUpAt ?? null}
                        initialLabel={followUpLabel(lead)}
                      />
                    ) : (
                      <p className="text-sm font-medium text-white/76">{followUpLabel(lead)}</p>
                    )}
                  </div>
                </div>
                <div>
                  <p>Pipeline</p>
                  <p className="mt-1 text-sm font-medium normal-case tracking-normal text-white/76">
                    {formatMoney(lead.expectedValue ?? lead.estimatedValue, currency)}
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
                          {resolvePreviewFieldValue(
                            lead,
                            fieldKey,
                            assigneeOptions,
                            stageOptions,
                            interactiveWorkflow,
                            currency,
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-4">
              {renderActions || interactiveWorkflow ? (
                <div className="flex flex-wrap gap-2">
                  {interactiveWorkflow ? (
                    <LeadQuickActions
                      assignedTo={lead.assignedTo}
                      leadId={lead.id}
                      leadName={lead.displayName}
                    />
                  ) : null}
                  {renderActions?.(lead)}
                </div>
              ) : (
                <Link
                  href={appRoutes.lead(lead.id)}
                  prefetch={false}
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

      <div className="ld-glass-card ld-glass-soft hidden overflow-hidden rounded-[30px] lg:block">
        <div className="ld-scroll-region overflow-x-auto">
          <table className="ld-readable-table min-w-full border-collapse">
            <thead>
              <tr className="text-left">
                <th className="ld-table-sticky-lead sticky left-0 top-0 z-30 min-w-[280px] border-b border-white/10 px-4 py-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70 backdrop-blur-md">
                  Lead
                </th>
                <th className="ld-table-sticky-action sticky left-[280px] top-0 z-30 min-w-[250px] border-b border-white/10 px-4 py-3.5 text-left align-middle text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70 backdrop-blur-md">
                  <GradientText>Action</GradientText>
                </th>
                {desktopColumns.map((column) => (
                  <th
                    key={column}
                    className={cn(
                      "sticky top-0 z-10 border-b border-white/10 bg-[color:color-mix(in_srgb,var(--ld-color-background)_94%,#060812_6%)] px-4 py-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70 backdrop-blur-md",
                      previewFieldWidthClass(column),
                    )}
                  >
                    {column.startsWith("custom:")
                      ? customFieldColumns.find((field) => `custom:${field.fieldId}` === column)?.label ?? "Custom field"
                      : previewFieldLabels[column]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map((lead, index) => (
                <tr
                  key={lead.id}
                  className={cn(
                    "group align-middle transition-all duration-200 hover:bg-white/[0.06] ld-animate-fade-in-up",
                    priorityBorderMap[lead.priority],
                    index < leads.length - 1 ? "border-b border-white/10" : "",
                  )}
                  style={{ animationDelay: `${Math.min(index * 50, 400)}ms` }}
                >
                  <td className="ld-table-sticky-lead sticky left-0 z-20 px-4 py-3.5 transition-colors group-hover:bg-[color:color-mix(in_srgb,var(--ld-color-card-strong)_97%,white_3%)]">
                    <div className="min-w-0">
                      <Link
                        href={appRoutes.lead(lead.id)}
                        prefetch={false}
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
                        {lead.companyName || "No company set"} • {formatMoney(lead.expectedValue ?? lead.estimatedValue, currency)}
                      </p>
                      <p className="mt-1.5 text-xs font-medium uppercase tracking-[0.14em] text-white/70">
                        {lead.completionLabel}
                      </p>
                    </div>
                  </td>
                  <td className="ld-table-sticky-action sticky left-[280px] z-20 px-4 py-3.5 text-left align-middle whitespace-nowrap transition-colors group-hover:bg-[color:color-mix(in_srgb,var(--ld-color-card-strong)_97%,white_3%)]">
                    {renderActions || interactiveWorkflow ? (
                      <div className="flex min-w-0 justify-start gap-2">
                        {interactiveWorkflow ? (
                          <LeadQuickActions
                            assignedTo={lead.assignedTo}
                            leadId={lead.id}
                            leadName={lead.displayName}
                          />
                        ) : null}
                        {renderActions?.(lead)}
                      </div>
                    ) : (
                      <Link
                        href={appRoutes.lead(lead.id)}
                        prefetch={false}
                        className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium"
                      >
                        Open
                      </Link>
                    )}
                  </td>
                  {desktopColumns.map((column) => {
                    return (
                      <td
                        key={column}
                        className={cn(
                          "px-4 py-3.5 text-sm leading-5 text-white/80",
                          previewFieldWidthClass(column),
                        )}
                      >
                        <div className="min-w-0 [overflow-wrap:anywhere]">
                          {resolvePreviewFieldValue(
                            lead,
                            column,
                            assigneeOptions,
                            stageOptions,
                            interactiveWorkflow,
                            currency,
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
