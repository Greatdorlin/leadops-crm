import Link from "next/link";
import { CheckCircle2, Clock3 } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatCrmDateTime, formatLeadStateLabel } from "@/lib/crm/formatters";
import { appRoutes } from "@/lib/app-routes";
import type { LeadTaskRecord } from "@/lib/crm/types";
import { EmptyState } from "./EmptyState";
import { LeadTaskCompleteButton } from "./LeadTaskCompleteButton";

function getTaskState(task: LeadTaskRecord) {
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

export function TaskQueueTable({
  tasks,
  leadNamesById,
  leadStateById = {},
  emptyTitle,
  emptyDescription,
  canCompleteTasks = true,
}: {
  tasks: LeadTaskRecord[];
  leadNamesById: Record<string, string>;
  leadStateById?: Record<string, string | null | undefined>;
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

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(180px,0.82fr)] xl:grid-cols-[minmax(0,1.2fr)_minmax(180px,0.8fr)_minmax(180px,0.8fr)_auto] xl:items-start">
              <div className="min-w-0">
                <p className="text-lg font-semibold leading-tight text-white">{task.title}</p>
                {task.description ? (
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-white/70">{task.description}</p>
                ) : (
                  <p className="mt-2 text-sm leading-7 text-white/70">
                    Keep the next step visible so the handoff stays clean.
                  </p>
                )}
              </div>

              <dl className="grid gap-3 text-sm">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">Lead</dt>
                  <dd className="mt-1 text-white">{leadNamesById[task.leadId] || "Lead"}</dd>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-white/70">
                    {leadStateById[task.leadId]
                      ? formatLeadStateLabel(leadStateById[task.leadId])
                      : "Region not captured yet"}
                  </p>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">Owner</dt>
                  <dd className="mt-1 break-words text-white/72">{task.assignedTo || "Unassigned"}</dd>
                </div>
              </dl>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">Due</p>
                <p className="mt-1 text-sm font-medium text-white">{formatCrmDateTime(task.dueAt)}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                <Link
                  href={appRoutes.lead(task.leadId)}
                  className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium"
                >
                  Open lead
                </Link>
                {canCompleteTasks && !task.completedAt ? (
                  <LeadTaskCompleteButton taskId={task.id} />
                ) : null}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
