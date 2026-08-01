"use client";

import { useState } from "react";
import { ListTodo, X } from "lucide-react";
import { AdminOverlayPortal } from "./AdminOverlayPortal";
import { LeadTaskForm } from "./LeadTaskForm";

type TaskOption = { label: string; value: string };

export function TaskCreateDialog({
  leadOptions,
  assigneeOptions,
  defaultAssignedTo,
  defaultLeadId,
  canAssignOtherTasks,
}: {
  leadOptions: TaskOption[];
  assigneeOptions: TaskOption[];
  defaultAssignedTo: string;
  defaultLeadId?: string;
  canAssignOtherTasks: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="admin-button-primary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold"
      >
        {canAssignOtherTasks ? "Assign task" : "Create task"}
      </button>

      {open ? (
        <AdminOverlayPortal onClose={() => setOpen(false)}>
          <div
            className="fixed inset-0 z-[170] flex items-end justify-center bg-[#02040c]/78 backdrop-blur-md sm:items-center sm:p-6"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="task-create-title"
              className="admin-surface flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] sm:rounded-[28px]"
            >
              <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-[color:var(--ld-color-accent)]/25 bg-[color:var(--ld-color-accent)]/12 text-[color:var(--ld-color-accent)]">
                    <ListTodo className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <h2 id="task-create-title" className="text-lg font-bold text-white sm:text-xl">
                      {canAssignOtherTasks ? "Assign task" : "Create task"}
                    </h2>
                    <p className="mt-0.5 text-xs text-white/60">Choose a lead and schedule the next action.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close task creator"
                  className="ld-focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/72"
                >
                  <X className="h-4 w-4" />
                </button>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
                <LeadTaskForm
                  leadId={defaultLeadId}
                  leadOptions={leadOptions}
                  assigneeOptions={assigneeOptions}
                  defaultAssignedTo={defaultAssignedTo}
                />
              </div>
            </section>
          </div>
        </AdminOverlayPortal>
      ) : null}
    </>
  );
}
