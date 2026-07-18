"use client";

import { startTransition, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Check, ListTodo, NotebookPen, PhoneCall, Plus, X } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  resolveQuickScheduleDate,
  type QuickSchedulePreset,
} from "@/lib/crm/schedule-presets";
import { ResponsivePopover } from "./ResponsivePopover";

type QuickMode = "note" | "task";

const taskTypes = [
  { label: "Call", title: "Call lead", icon: PhoneCall },
  { label: "Follow up", title: "Follow up with lead", icon: CalendarClock },
  { label: "Next step", title: "Complete next step", icon: ListTodo },
];

const dueOptions: Array<{ id: QuickSchedulePreset | "none"; label: string }> = [
  { id: "later_today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "in_3_days", label: "3 days" },
  { id: "next_week", label: "Next week" },
  { id: "none", label: "No date" },
];

export function LeadQuickActions({
  assignedTo,
  leadId,
  leadName,
  previewMode = false,
}: {
  assignedTo: string | null;
  leadId: string;
  leadName: string;
  previewMode?: boolean;
}) {
  const router = useRouter();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<QuickMode>("note");
  const [note, setNote] = useState("");
  const [taskTitle, setTaskTitle] = useState("Call lead");
  const [taskDetail, setTaskDetail] = useState("");
  const [duePreset, setDuePreset] = useState<QuickSchedulePreset | "none">("tomorrow");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [hasError, setHasError] = useState(false);

  async function saveNote() {
    if (note.trim().length < 2) {
      setHasError(true);
      setMessage("Write a short note first.");
      return;
    }

    setIsSaving(true);
    setHasError(false);
    setMessage("");
    if (previewMode) {
      setNote("");
      setMessage("Note added.");
      setIsSaving(false);
      return;
    }
    try {
      const response = await fetch(`/api/admin/leads/${leadId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setHasError(true);
        setMessage(payload?.error ?? "We couldn't save this note.");
        setIsSaving(false);
        return;
      }

      setNote("");
      setMessage("Note added.");
      setIsSaving(false);
      startTransition(() => router.refresh());
    } catch {
      setHasError(true);
      setMessage("We couldn't save this note.");
      setIsSaving(false);
    }
  }

  async function saveTask() {
    if (taskTitle.trim().length < 2) {
      setHasError(true);
      setMessage("Add a task title first.");
      return;
    }

    const dueAt = duePreset === "none"
      ? null
      : resolveQuickScheduleDate(duePreset).toISOString();
    setIsSaving(true);
    setHasError(false);
    setMessage("");
    if (previewMode) {
      setTaskDetail("");
      setMessage("Task created.");
      setIsSaving(false);
      return;
    }
    try {
      const response = await fetch(`/api/admin/leads/${leadId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle,
          description: taskDetail || null,
          dueAt,
          assignedTo,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setHasError(true);
        setMessage(payload?.error ?? "We couldn't create this task.");
        setIsSaving(false);
        return;
      }

      setTaskDetail("");
      setMessage("Task created.");
      setIsSaving(false);
      startTransition(() => router.refresh());
    } catch {
      setHasError(true);
      setMessage("We couldn't create this task.");
      setIsSaving(false);
    }
  }

  return (
    <div className="min-w-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="admin-button-primary ld-focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-full px-3.5 text-sm font-semibold"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`Quick add for ${leadName}`}
      >
        <Plus className="h-4 w-4" />
        <span>Quick add</span>
      </button>

      <ResponsivePopover
        anchorRef={buttonRef}
        ariaLabel={`Quick actions for ${leadName}`}
        desktopWidth={390}
        onClose={() => setIsOpen(false)}
        open={isOpen}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3 px-2 pb-2 pt-1">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{leadName}</p>
              <p className="mt-0.5 text-xs text-white/64">Add context or the next action.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="ld-focus-ring inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/70 transition hover:bg-white/[0.1] hover:text-white"
              aria-label="Close quick actions"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 rounded-[16px] border border-white/10 bg-black/15 p-1">
            {([
              { id: "note" as const, label: "Note", icon: NotebookPen },
              { id: "task" as const, label: "Task or call", icon: PhoneCall },
            ]).map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setMode(item.id);
                    setMessage("");
                    setHasError(false);
                  }}
                  className={cn(
                    "ld-focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-[12px] text-sm font-semibold transition",
                    mode === item.id
                      ? "bg-white/[0.11] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                      : "text-white/64 hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>

          {mode === "note" ? (
            <div className="mt-3 space-y-3">
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={4}
                maxLength={2_000}
                placeholder="Objection, context, or handoff note..."
                className="admin-textarea ld-focus-ring min-h-[112px] w-full rounded-[18px] px-4 py-3 text-sm"
              />
              <button
                type="button"
                onClick={() => void saveNote()}
                disabled={isSaving}
                className="admin-button-primary inline-flex h-11 w-full items-center justify-center gap-2 rounded-[16px] text-sm font-semibold disabled:opacity-60"
              >
                <NotebookPen className="h-4 w-4" />
                {isSaving ? "Saving..." : "Add note"}
              </button>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {taskTypes.map((taskType) => {
                  const Icon = taskType.icon;
                  return (
                    <button
                      key={taskType.label}
                      type="button"
                      onClick={() => setTaskTitle(taskType.title)}
                      className="ld-focus-ring rounded-[14px] border border-white/10 bg-white/[0.05] px-2 py-2.5 text-xs font-semibold text-white/72 transition hover:bg-white/[0.09] hover:text-white"
                    >
                      <Icon className="mx-auto mb-1 h-4 w-4" />
                      {taskType.label}
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                maxLength={160}
                className="admin-input h-11 w-full rounded-[16px] px-4 text-sm"
                aria-label="Task title"
              />
              <div className="flex flex-wrap gap-2">
                {dueOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setDuePreset(option.id)}
                    className={cn(
                      "ld-focus-ring rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                      duePreset === option.id
                        ? "border-white/22 bg-white/[0.12] text-white"
                        : "border-white/10 bg-white/[0.045] text-white/64 hover:text-white",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={taskDetail}
                onChange={(event) => setTaskDetail(event.target.value)}
                maxLength={2_000}
                placeholder="Optional detail"
                className="admin-input h-11 w-full rounded-[16px] px-4 text-sm"
              />
              <button
                type="button"
                onClick={() => void saveTask()}
                disabled={isSaving}
                className="admin-button-primary inline-flex h-11 w-full items-center justify-center gap-2 rounded-[16px] text-sm font-semibold disabled:opacity-60"
              >
                <Check className="h-4 w-4" />
                {isSaving ? "Creating..." : "Create task"}
              </button>
            </div>
          )}

          <p
            className={cn(
              "min-h-5 px-1 pt-2 text-xs",
              hasError ? "text-rose-200" : "text-emerald-200",
            )}
            role={hasError ? "alert" : "status"}
            aria-live="polite"
          >
            {message}
          </p>
        </div>
      </ResponsivePopover>
    </div>
  );
}
