import type { ReactNode } from "react";
import Link from "next/link";
import { formatCrmDateTime } from "@/lib/crm/formatters";
import type { LeadTaskRecord } from "@/lib/crm/types";
import { PriorityBadge } from "./PriorityBadge";

function getTaskStatus(task: LeadTaskRecord) {
  if (task.completedAt) {
    return {
      label: "Completed",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (task.dueAt && new Date(task.dueAt).getTime() < Date.now()) {
    return {
      label: "Overdue",
      className: "border-rose-200 bg-rose-50 text-rose-700",
    };
  }

  return {
    label: task.dueAt ? "Scheduled" : "Open",
    className: "border-slate-200 bg-white text-slate-700",
  };
}

export function TaskCard({
  task,
  leadHref,
  leadLabel,
  actions,
}: {
  task: LeadTaskRecord;
  leadHref?: string;
  leadLabel?: string;
  actions?: ReactNode;
}) {
  const status = getTaskStatus(task);

  return (
    <article className="admin-surface-soft rounded-2xl p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-slate-950">{task.title}</p>
          {task.description ? <p className="mt-1.5 text-sm leading-6 text-slate-600">{task.description}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${status.className}`}>
            {status.label}
          </span>
          <PriorityBadge priority={task.completedAt ? "low" : task.dueAt ? "high" : "medium"} />
        </div>
      </div>
      <div className="mt-4 grid gap-2 text-sm text-slate-500">
        {leadLabel ? <p>Lead: <span className="text-slate-800">{leadLabel}</span></p> : null}
        <p>Owner: <span className="text-slate-800">{task.assignedTo || "Unassigned"}</span></p>
        <p>Due: <span className="text-slate-800">{formatCrmDateTime(task.dueAt)}</span></p>
      </div>
      {leadHref || actions ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {leadHref ? (
            <Link
              href={leadHref}
              className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium"
            >
              Open lead
            </Link>
          ) : null}
          {actions}
        </div>
      ) : null}
    </article>
  );
}
