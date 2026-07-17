"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Check, ListTodo, Mail, PhoneCall } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  localDateTimeInputToIso,
  resolveQuickScheduleDate,
  toLocalDateTimeInputValue,
  type QuickSchedulePreset,
} from "@/lib/crm/schedule-presets";
import { SmoothButton } from "./ui/SmoothButton";
import { AdminSelect } from "./AdminSelect";

interface TaskOption {
  label: string;
  value: string;
}

const taskTypes = [
  { label: "Call", title: "Call lead", icon: PhoneCall },
  { label: "Email", title: "Email lead", icon: Mail },
  { label: "Follow up", title: "Follow up with lead", icon: CalendarClock },
  { label: "Next step", title: "Complete next step", icon: ListTodo },
];

const dueOptions: Array<{ id: QuickSchedulePreset | "none"; label: string }> = [
  { id: "later_today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "in_3_days", label: "In 3 days" },
  { id: "next_week", label: "Next week" },
  { id: "none", label: "No date" },
];

const labelClass = "text-xs font-semibold uppercase tracking-[0.14em] text-white/64";
type DueSelection = QuickSchedulePreset | "none" | "custom";

export function LeadTaskForm({
  leadId,
  leadOptions,
  assigneeOptions,
  defaultAssignedTo = "",
}: {
  leadId?: string;
  leadOptions?: TaskOption[];
  assigneeOptions: TaskOption[];
  defaultAssignedTo?: string;
}) {
  const router = useRouter();
  const [selectedLeadId, setSelectedLeadId] = useState(leadId ?? leadOptions?.[0]?.value ?? "");
  const [title, setTitle] = useState("Call lead");
  const [description, setDescription] = useState("");
  const [duePreset, setDuePreset] = useState<DueSelection>("tomorrow");
  const [dueAtLocal, setDueAtLocal] = useState(
    toLocalDateTimeInputValue(resolveQuickScheduleDate("tomorrow")),
  );
  const [assignedTo, setAssignedTo] = useState(defaultAssignedTo);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [hasError, setHasError] = useState(false);

  function chooseDuePreset(preset: QuickSchedulePreset | "none") {
    setDuePreset(preset);
    setDueAtLocal(
      preset === "none" ? "" : toLocalDateTimeInputValue(resolveQuickScheduleDate(preset)),
    );
  }

  async function saveTask() {
    if (!selectedLeadId) {
      setHasError(true);
      setMessage("Choose a lead first.");
      return;
    }
    if (title.trim().length < 2) {
      setHasError(true);
      setMessage("Add a task title first.");
      return;
    }

    const dueAt = dueAtLocal ? localDateTimeInputToIso(dueAtLocal) : null;
    if (dueAtLocal && !dueAt) {
      setHasError(true);
      setMessage("Choose a valid due time.");
      return;
    }

    setIsSaving(true);
    setHasError(false);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/leads/${selectedLeadId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || null,
          dueAt,
          assignedTo: assignedTo || null,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setHasError(true);
        setMessage(payload?.error ?? "We couldn't create this task.");
        setIsSaving(false);
        return;
      }

      setDescription("");
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
    <div className="space-y-4">
      {leadId ? null : (
        <label className="space-y-2">
          <span className={labelClass}>Lead</span>
          <AdminSelect
            value={selectedLeadId}
            onChange={(event) => setSelectedLeadId(event.target.value)}
            className="h-11"
          >
            <option value="">Choose a lead</option>
            {leadOptions?.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </AdminSelect>
        </label>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {taskTypes.map((taskType) => {
          const Icon = taskType.icon;
          const selected = title === taskType.title;
          return (
            <button
              key={taskType.label}
              type="button"
              onClick={() => setTitle(taskType.title)}
              className={cn(
                "ld-focus-ring rounded-[18px] border px-3 py-3 text-sm font-semibold transition",
                selected
                  ? "border-white/22 bg-white/[0.12] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                  : "border-white/10 bg-white/[0.045] text-white/68 hover:bg-white/[0.08] hover:text-white",
              )}
            >
              <Icon className="mx-auto mb-1.5 h-4 w-4" />
              {taskType.label}
            </button>
          );
        })}
      </div>

      <label className="space-y-2">
        <span className={labelClass}>Task</span>
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={160}
          placeholder="What needs to happen?"
          className="admin-input ld-focus-ring h-12 w-full rounded-[18px] px-4 text-sm outline-none"
        />
      </label>

      <div className="space-y-2">
        <span className={labelClass}>Due</span>
        <div className="flex flex-wrap gap-2">
          {dueOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => chooseDuePreset(option.id)}
              className={cn(
                "ld-focus-ring rounded-full border px-3.5 py-2 text-xs font-semibold transition",
                duePreset === option.id
                  ? "border-white/22 bg-white/[0.12] text-white"
                  : "border-white/10 bg-white/[0.045] text-white/64 hover:text-white",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-3 rounded-[18px] border border-white/10 bg-white/[0.045] p-3">
          <CalendarClock className="h-4 w-4 shrink-0 text-white/64" />
          <input
            type="datetime-local"
            value={dueAtLocal}
            min={toLocalDateTimeInputValue(new Date())}
            onChange={(event) => {
              setDueAtLocal(event.target.value);
              setDuePreset(event.target.value ? "custom" : "none");
            }}
            className="admin-input h-10 min-w-0 flex-1 rounded-[13px] px-3 text-sm"
            aria-label="Exact task due time"
          />
        </label>
      </div>

      <details className="group rounded-[18px] border border-white/10 bg-white/[0.035] px-4 py-3">
        <summary className="cursor-pointer list-none text-sm font-semibold text-white/72 marker:hidden">
          Details and owner <span className="text-white/42 group-open:hidden">(optional)</span>
        </summary>
        <div className="mt-4 grid gap-3">
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            maxLength={2_000}
            placeholder="Context for this task"
            className="admin-textarea ld-focus-ring min-h-[96px] w-full rounded-[16px] px-4 py-3 text-sm"
          />
          <AdminSelect
            value={assignedTo}
            onChange={(event) => setAssignedTo(event.target.value)}
            className="h-11"
            aria-label="Task owner"
          >
            <option value="">Assign later</option>
            {assigneeOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </AdminSelect>
        </div>
      </details>

      <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p
          className={cn("min-h-5 text-sm", hasError ? "text-rose-200" : "text-emerald-200")}
          role={hasError ? "alert" : "status"}
          aria-live="polite"
        >
          {message}
        </p>
        <SmoothButton
          variant="primary"
          size="md"
          onClick={() => void saveTask()}
          loading={isSaving}
          icon={<Check className="h-4 w-4" />}
        >
          Create task
        </SmoothButton>
      </div>
    </div>
  );
}
