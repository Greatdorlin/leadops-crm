import Link from "next/link";
import { CheckCircle2, Clock3 } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatCrmDateTime, formatLeadStateLabel } from "@/lib/crm/formatters";
import type { LeadTaskRecord } from "@/lib/pathway-engine/types";
import { EmptyState } from "./EmptyState";
import { LeadTaskCompleteButton } from "./LeadTaskCompleteButton";

function getTaskState(task: LeadTaskRecord) {
  if (task.completedAt) {
    return {
      label: "Completed",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      icon: CheckCircle2,
    };
  }

  if (task.dueAt && new Date(task.dueAt).getTime() < Date.now()) {
    return {
      label: "Overdue",
      className: "border-rose-200 bg-rose-50 text-rose-700",
      icon: Clock3,
    };
  }

  return {
    label: task.dueAt ? "Scheduled" : "Open",
    className: "border-slate-200 bg-white text-slate-700",
    icon: Clock3,
  };
}

export function TaskQueueTable({
  tasks,
  leadNamesById,
  leadStateById = {},
  emptyTitle,
  emptyDescription,
}: {
  tasks: LeadTaskRecord[];
  leadNamesById: Record<string, string>;
  leadStateById?: Record<string, string | null | undefined>;
  emptyTitle: string;
  emptyDescription: string;
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
            className="admin-surface-muted rounded-[24px] p-4 transition hover:border-slate-300 hover:bg-white sm:p-5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold", state.className)}>
                <StateIcon className="h-3.5 w-3.5" />
                {state.label}
              </span>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(180px,0.82fr)] xl:grid-cols-[minmax(0,1.2fr)_minmax(180px,0.8fr)_minmax(180px,0.8fr)_auto] xl:items-start">
              <div className="min-w-0">
                <p className="text-lg font-semibold leading-tight text-slate-950">{task.title}</p>
                {task.description ? (
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">{task.description}</p>
                ) : (
                  <p className="mt-2 text-sm leading-7 text-slate-500">
                    Keep the next action visible so the handoff stays clear.
                  </p>
                )}
              </div>

              <dl className="grid gap-3 text-sm">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Lead</dt>
                  <dd className="mt-1 text-slate-900">{leadNamesById[task.leadId] || "Lead"}</dd>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">
                    {leadStateById[task.leadId]
                      ? formatLeadStateLabel(leadStateById[task.leadId])
                      : "State not captured yet"}
                  </p>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Owner</dt>
                  <dd className="mt-1 break-words text-slate-700">{task.assignedTo || "Unassigned"}</dd>
                </div>
              </dl>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Due</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{formatCrmDateTime(task.dueAt)}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                <Link
                  href={`/admin/leads/${task.leadId}`}
                  className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium"
                >
                  Open lead
                </Link>
                {!task.completedAt ? <LeadTaskCompleteButton taskId={task.id} /> : null}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
