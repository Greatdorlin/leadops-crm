import Link from "next/link";
import { CheckCircle2, Clock3 } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatCrmDateTime, formatLeadStateLabel } from "@/lib/crm/formatters";
import { appRoutes } from "@/lib/app-routes";
import type { LeadTaskQueueRecord } from "@/lib/storage/types";
import { EmptyState } from "./EmptyState";
import { LeadTaskCompleteButton } from "./LeadTaskCompleteButton";

function getTaskState(task: LeadTaskQueueRecord) {
  if (task.completedAt) {
    return {
      label: "Completed",
      className:
        "border-emerald-300/26 bg-[linear-gradient(135deg,rgba(16,185,129,0.2),rgba(16,185,129,0.08))] text-emerald-50 shadow-[0_14px_28px_rgba(16,185,129,0.14)]",
      icon: CheckCircle2,
    };
  }

  if (task.dueAt && new Date(task.dueAt).getTime() < Date.now()) {
    return {
      label: "Overdue",
      className:
        "border-rose-300/26 bg-[linear-gradient(135deg,rgba(244,63,94,0.2),rgba(244,63,94,0.08))] text-rose-50 shadow-[0_14px_28px_rgba(244,63,94,0.14)]",
      icon: Clock3,
    };
  }

  return {
    label: task.dueAt ? "Scheduled" : "Open",
    className:
      "border-[var(--ld-color-primary)]/20 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--ld-color-primary)_18%,transparent),rgba(139,92,246,0.08))] text-white shadow-[0_14px_28px_color-mix(in_srgb,var(--ld-color-primary)_12%,transparent)]",
    icon: Clock3,
  };
}

function getTaskLeadName(task: LeadTaskQueueRecord) {
  const personName = `${task.lead.firstName} ${task.lead.lastName}`.trim();
  return personName || task.lead.companyName || "Lead";
}

function getTaskLeadLocation(task: LeadTaskQueueRecord) {
  return task.lead.state || task.lead.city || task.lead.region || task.lead.country;
}

function formatTaskOwner(value?: string | null) {
  if (!value) return "Unassigned";
  const localPart = value.split("@")[0] ?? value;
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export function TaskQueueTable({
  tasks,
  emptyTitle,
  emptyDescription,
  canCompleteTasks = true,
}: {
  tasks: LeadTaskQueueRecord[];
  emptyTitle: string;
  emptyDescription: string;
  canCompleteTasks?: boolean;
}) {
  if (tasks.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => {
        const state = getTaskState(task);
        const StateIcon = state.icon;
        const leadLocation = getTaskLeadLocation(task);

        return (
          <article
            key={task.id}
            className="admin-surface-muted rounded-[24px] p-4 transition hover:border-[var(--ld-color-primary)]/22 hover:bg-white/[0.075] sm:p-5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold", state.className)}>
                <StateIcon className="h-3.5 w-3.5" />
                {state.label}
              </span>
            </div>

            <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(210px,0.72fr)] lg:items-start">
              <div className="min-w-0">
                <p className="text-lg font-semibold leading-tight text-white">{task.title}</p>
                {task.description ? (
                  <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-6 text-white/70">{task.description}</p>
                ) : (
                  <p className="mt-2 text-sm leading-7 text-white/70">
                    Keep the next step visible so the handoff stays clean.
                  </p>
                )}
              </div>

              <dl className="grid min-w-0 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-1">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">Lead</dt>
                  <dd className="mt-1 text-white">{getTaskLeadName(task)}</dd>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-white/70">
                    {leadLocation
                      ? formatLeadStateLabel(leadLocation)
                      : "Region not captured yet"}
                  </p>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">Owner</dt>
                  <dd className="mt-1 text-white/72" title={task.assignedTo || undefined}>{formatTaskOwner(task.assignedTo)}</dd>
                </div>
              </dl>

              <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end lg:grid-cols-1">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">Due</p>
                  <p className="mt-1 text-sm font-medium text-white">{formatCrmDateTime(task.dueAt)}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:grid lg:grid-cols-2">
                  <Link
                    href={appRoutes.lead(task.leadId)}
                    className="admin-button-secondary inline-flex h-10 min-w-0 items-center justify-center rounded-full px-3 text-sm font-medium"
                  >
                    Open lead
                  </Link>
                  {canCompleteTasks && !task.completedAt ? (
                    <LeadTaskCompleteButton taskId={task.id} />
                  ) : null}
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
