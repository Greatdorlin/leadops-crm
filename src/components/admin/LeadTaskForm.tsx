"use client";

import { CalendarDays, Clock3 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatedCard } from "./ui/AnimatedCard";
import { SmoothButton } from "./ui/SmoothButton";
import { GradientText } from "./ui/GradientText";
import { AdminSelect } from "./AdminSelect";

interface TaskOption {
  label: string;
  value: string;
}

const monthOptions = [
  { value: "01", label: "Jan" },
  { value: "02", label: "Feb" },
  { value: "03", label: "Mar" },
  { value: "04", label: "Apr" },
  { value: "05", label: "May" },
  { value: "06", label: "Jun" },
  { value: "07", label: "Jul" },
  { value: "08", label: "Aug" },
  { value: "09", label: "Sep" },
  { value: "10", label: "Oct" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dec" },
] as const;

const hourOptions = Array.from({ length: 12 }, (_, index) => {
  const value = String(index + 1).padStart(2, "0");
  return { value, label: value };
});

const minuteOptions = Array.from({ length: 60 }, (_, index) => {
  const value = String(index).padStart(2, "0");
  return { value, label: value };
});

const periodOptions = ["AM", "PM"] as const;
const labelClass = "text-xs font-semibold uppercase tracking-[0.16em] text-white/70";
const subtleTextClass = "text-xs text-white/70";

function getDayOptions(year: string, month: string) {
  const maxDays =
    year && month ? new Date(Number(year), Number(month), 0).getDate() : 31;

  return Array.from({ length: maxDays }, (_, index) => {
    const value = String(index + 1).padStart(2, "0");
    return { value, label: value };
  });
}

function buildDueAtValue(
  year: string,
  month: string,
  day: string,
  hour: string,
  minute: string,
  period: string,
) {
  if (!year || !month || !day || !hour || !minute || !period) {
    return "";
  }

  const normalizedHour = Number(hour) % 12 + (period === "PM" ? 12 : 0);
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    normalizedHour,
    Number(minute),
  ).toISOString();
}

function splitDateForControls(date: Date) {
  const hour24 = date.getHours();
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;

  return {
    month: String(date.getMonth() + 1).padStart(2, "0"),
    day: String(date.getDate()).padStart(2, "0"),
    year: String(date.getFullYear()),
    hour: String(hour12).padStart(2, "0"),
    minute: String(date.getMinutes()).padStart(2, "0"),
    period,
  };
}

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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [dueMonth, setDueMonth] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [dueYear, setDueYear] = useState("");
  const [dueHour, setDueHour] = useState("");
  const [dueMinute, setDueMinute] = useState("");
  const [duePeriod, setDuePeriod] = useState("");
  const [assignedTo, setAssignedTo] = useState(defaultAssignedTo);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const yearOptions = Array.from({ length: 6 }, (_, index) => String(new Date().getFullYear() + index));
  const dayOptions = getDayOptions(dueYear, dueMonth);

  function updateDueDate(next: {
    month?: string;
    day?: string;
    year?: string;
    hour?: string;
    minute?: string;
    period?: string;
  }) {
    const month = next.month ?? dueMonth;
    const day = next.day ?? dueDay;
    const year = next.year ?? dueYear;
    const hour = next.hour ?? dueHour;
    const minute = next.minute ?? dueMinute;
    const period = next.period ?? duePeriod;

    if (next.month !== undefined) {
      setDueMonth(next.month);
    }

    if (next.day !== undefined) {
      setDueDay(next.day);
    }

    if (next.year !== undefined) {
      setDueYear(next.year);
    }

    if (next.hour !== undefined) {
      setDueHour(next.hour);
    }

    if (next.minute !== undefined) {
      setDueMinute(next.minute);
    }

    if (next.period !== undefined) {
      setDuePeriod(next.period);
    }

    setDueAt(buildDueAtValue(year, month, day, hour, minute, period));
  }

  function clearDueDate() {
    setDueMonth("");
    setDueDay("");
    setDueYear("");
    setDueHour("");
    setDueMinute("");
    setDuePeriod("");
    setDueAt("");
  }

  function applyQuickDueDate(offsetDays: number) {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    date.setHours(offsetDays === 0 ? 16 : 10, 0, 0, 0);
    const next = splitDateForControls(date);

    setDueMonth(next.month);
    setDueDay(next.day);
    setDueYear(next.year);
    setDueHour(next.hour);
    setDueMinute(next.minute);
    setDuePeriod(next.period);
    setDueAt(buildDueAtValue(next.year, next.month, next.day, next.hour, next.minute, next.period));
  }

  async function saveTask() {
    if (!selectedLeadId) {
      setMessage("Choose a lead before saving this task.");
      return;
    }

    if (!title.trim()) {
      setMessage("Add a task title before saving.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/leads/${selectedLeadId}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          dueAt: dueAt || null,
          assignedTo: assignedTo || null,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessage(payload?.error ?? "We couldn't create this task right now.");
        setIsSaving(false);
        return;
      }

      setTitle("");
      setDescription("");
      clearDueDate();
      setAssignedTo(defaultAssignedTo);
      setMessage("Task created.");
      setIsSaving(false);
      router.refresh();
    } catch {
      setMessage("We couldn't create this task right now.");
      setIsSaving(false);
    }
  }

  return (
    <AnimatedCard animation="fadeInUp" variant="subtle" className="space-y-5">
      <div className="grid gap-3">
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
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </AdminSelect>
          </label>
        )}
        <label className="space-y-2">
          <span className={labelClass}>Task title</span>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Call back after the demo"
            className="admin-input ld-focus-ring h-11 w-full rounded-2xl px-4 text-sm outline-none"
          />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Task note</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            placeholder="Add context for the next person touching this lead."
            className="admin-textarea ld-focus-ring min-h-[132px] w-full rounded-2xl px-4 py-3 text-sm outline-none"
          />
        </label>
        <div className="grid gap-3">
          <label className="space-y-2">
            <span className={labelClass}>Due</span>
            <div className="space-y-3 rounded-[24px] border border-white/10 bg-white/[0.045] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { label: "Today", offset: 0 },
                  { label: "Tomorrow", offset: 1 },
                  { label: "Next week", offset: 7 },
                ].map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => applyQuickDueDate(option.offset)}
                    className="ld-floating-control h-10 rounded-2xl px-3 text-xs font-semibold"
                  >
                    {option.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={clearDueDate}
                  className="ld-floating-control h-10 rounded-2xl px-3 text-xs font-semibold"
                >
                  No follow-up
                </button>
              </div>

              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
                <CalendarDays className="h-3.5 w-3.5" />
                Date
              </div>
              <div className="grid grid-cols-[1.15fr_0.9fr_1fr] gap-2">
                <AdminSelect
                  value={dueMonth}
                  onChange={(event) => updateDueDate({ month: event.target.value })}
                >
                  <option value="">Month</option>
                  {monthOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </AdminSelect>
                <AdminSelect
                  value={dueDay}
                  onChange={(event) => updateDueDate({ day: event.target.value })}
                >
                  <option value="">Day</option>
                  {dayOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </AdminSelect>
                <AdminSelect
                  value={dueYear}
                  onChange={(event) => updateDueDate({ year: event.target.value })}
                >
                  <option value="">Year</option>
                  {yearOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </AdminSelect>
              </div>

              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
                <Clock3 className="h-3.5 w-3.5" />
                Time
              </div>
              <div className="grid grid-cols-3 gap-2">
                <AdminSelect
                  value={dueHour}
                  onChange={(event) => updateDueDate({ hour: event.target.value })}
                >
                  <option value="">Hour</option>
                  {hourOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </AdminSelect>
                <AdminSelect
                  value={dueMinute}
                  onChange={(event) => updateDueDate({ minute: event.target.value })}
                >
                  <option value="">Min</option>
                  {minuteOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </AdminSelect>
                <AdminSelect
                  value={duePeriod}
                  onChange={(event) => updateDueDate({ period: event.target.value })}
                >
                  <option value="">AM/PM</option>
                  {periodOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </AdminSelect>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                <p className={subtleTextClass}>
                  Optional. Use quick choices or set an exact due time.
                </p>
                {(dueMonth || dueDay || dueYear || dueHour || dueMinute || duePeriod) ? (
                  <button
                    type="button"
                    onClick={clearDueDate}
                    className="text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:text-white"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Owner</span>
            <AdminSelect
              value={assignedTo}
              onChange={(event) => setAssignedTo(event.target.value)}
              className="h-11"
            >
              <option value="">Assign later</option>
              {assigneeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </AdminSelect>
          </label>
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-end sm:justify-between">
        <p className="max-w-[18rem] text-sm leading-6 text-white/70">
          Tasks stay linked to the lead record so handoffs and exports stay consistent.
        </p>
        <SmoothButton
          variant="primary"
          size="md"
          onClick={() => void saveTask()}
          loading={isSaving}
        >
          Create task
        </SmoothButton>
      </div>
      {message ? <p className="text-sm text-white/70">{message}</p> : null}
    </AnimatedCard>
  );
}
