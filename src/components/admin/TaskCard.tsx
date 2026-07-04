import type { ReactNode } from "react";
import Link from "next/link";
import { formatCrmDateTime } from "@/lib/crm/formatters";
import type { LeadTaskRecord } from "@/lib/crm/types";
import { PriorityBadge } from "./PriorityBadge";

function getTaskStatus(task: LeadTaskRecord) {
  if (task.completedAt) {
    return {
      label: "Completed",
      className: "border-emerald-300/20 bg-emerald-500/10 text-emerald-100",
    };
  }

  if (task.dueAt && new Date(task.dueAt).getTime() < Date.now()) {
    return {
      label: "Overdue",
      className: "border-rose-300/20 bg-rose-500/10 text-rose-100",
    };
  }

  return {
    label: task.dueAt ? "Scheduled" : "Open",
    className: "border-white/10 bg-white/[0.08] text-white/80",
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
          <p className="text-base font-semibold text-white">{task.title}</p>
          {task.description ? <p className="mt-1.5 text-sm leading-6 text-white/70">{task.description}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${status.className}`}>
            {status.label}
          </span>
          <PriorityBadge priority={task.completedAt ? "low" : task.dueAt ? "high" : "medium"} />
        </div>
      </div>
      <div className="mt-4 grid gap-2 text-sm text-white/70">
        {leadLabel ? <p>Lead: <span className="text-white/90">{leadLabel}</span></p> : null}
        <p>Owner: <span className="text-white/90">{task.assignedTo || "Unassigned"}</span></p>
        <p>Due: <span className="text-white/90">{formatCrmDateTime(task.dueAt)}</span></p>
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
