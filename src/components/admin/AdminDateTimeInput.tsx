"use client";

import type { ComponentPropsWithoutRef } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, CalendarClock, ChevronDown, ChevronLeft, ChevronRight, Clock3, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { AdminPickerHeader } from "./AdminPickerPanel";
import { ResponsivePopover } from "./ResponsivePopover";

type AdminDateTimeInputProps = Omit<ComponentPropsWithoutRef<"input">, "type"> & {
  mode?: "date" | "datetime-local" | "time";
  pickerLabel?: string;
};

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function pad(value: number) { return String(value).padStart(2, "0"); }
function dateKey(date: Date) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; }
function parseValue(value: string, mode: AdminDateTimeInputProps["mode"]) {
  if (!value) return null;
  if (mode === "time") {
    const [hours = "0", minutes = "0"] = value.split(":");
    const date = new Date();
    date.setHours(Number(hours), Number(minutes), 0, 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const [datePart, timePart = "00:00"] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);
  const date = new Date(year, month - 1, day, hours || 0, minutes || 0);
  return Number.isNaN(date.getTime()) ? null : date;
}
function serialize(date: Date, mode: AdminDateTimeInputProps["mode"]) {
  if (mode === "time") return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const day = dateKey(date);
  return mode === "date" ? day : `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function setNativeInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
}
function formatValue(value: string, mode: AdminDateTimeInputProps["mode"]) {
  const date = parseValue(value, mode);
  if (!date) return "";
  if (mode === "time") return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const day = date.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
  return mode === "date" ? day : `${day} · ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

export function AdminDateTimeInput({
  className,
  mode = "datetime-local",
  pickerLabel = "Choose date and time",
  value,
  defaultValue,
  onChange,
  disabled,
  max,
  min,
  readOnly,
  placeholder,
  ...props
}: AdminDateTimeInputProps) {
  const hiddenRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const initialValue = String(value ?? defaultValue ?? "");
  const [internalValue, setInternalValue] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const selectedValue = value === undefined ? internalValue : String(value);
  const selectedDate = parseValue(selectedValue, mode);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const source = parseValue(initialValue, mode) ?? new Date();
    return new Date(source.getFullYear(), source.getMonth(), 1);
  });
  const [draftTime, setDraftTime] = useState(() => parseValue(initialValue, mode) ?? new Date());
  const minimumDate = min === undefined ? null : parseValue(String(min), mode);
  const maximumDate = max === undefined ? null : parseValue(String(max), mode);

  useEffect(() => {
    const form = hiddenRef.current?.form;
    if (!form || value !== undefined) return;
    const handleReset = () => requestAnimationFrame(() => {
      const resetValue = String(defaultValue ?? "");
      setInternalValue(resetValue);
      const resetDate = parseValue(resetValue, mode) ?? new Date();
      setDraftTime(resetDate);
      setVisibleMonth(new Date(resetDate.getFullYear(), resetDate.getMonth(), 1));
      setOpen(false);
    });
    form.addEventListener("reset", handleReset);
    return () => form.removeEventListener("reset", handleReset);
  }, [defaultValue, mode, value]);

  const days = useMemo(() => {
    const first = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const mondayOffset = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(first.getDate() - mondayOffset);
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [visibleMonth]);

  function commit(next: Date | null, close = true) {
    if (next && !isValueAllowed(next)) return;
    const nextValue = next ? serialize(next, mode) : "";
    const input = hiddenRef.current;
    if (!input) return;
    setNativeInputValue(input, nextValue);
    setInternalValue(nextValue);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    if (close) setOpen(false);
  }

  function openPicker() {
    const source = selectedDate ?? new Date();
    setVisibleMonth(new Date(source.getFullYear(), source.getMonth(), 1));
    setDraftTime(source);
    setOpen(true);
  }

  function chooseDay(day: Date) {
    if (!isDateAllowed(day)) return;
    const next = new Date(day);
    next.setHours(draftTime.getHours(), draftTime.getMinutes(), 0, 0);
    setDraftTime(next);
    commit(next, mode === "date");
  }

  function isDateAllowed(day: Date) {
    const candidate = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
    const minimum = minimumDate
      ? new Date(minimumDate.getFullYear(), minimumDate.getMonth(), minimumDate.getDate()).getTime()
      : null;
    const maximum = maximumDate
      ? new Date(maximumDate.getFullYear(), maximumDate.getMonth(), maximumDate.getDate()).getTime()
      : null;
    return (minimum === null || candidate >= minimum) && (maximum === null || candidate <= maximum);
  }

  function isValueAllowed(candidate: Date) {
    const timestamp = candidate.getTime();
    return (!minimumDate || timestamp >= minimumDate.getTime()) && (!maximumDate || timestamp <= maximumDate.getTime());
  }

  function focusDay(day: Date) {
    const targetMonth = new Date(day.getFullYear(), day.getMonth(), 1);
    if (targetMonth.getTime() !== visibleMonth.getTime()) {
      setVisibleMonth(targetMonth);
    }
    requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>(`[data-calendar-day="${dateKey(day)}"]`)?.focus({ preventScroll: true });
    });
  }

  function handleDayKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, day: Date) {
    let next: Date | null = null;
    if (event.key === "ArrowLeft") next = new Date(day.getFullYear(), day.getMonth(), day.getDate() - 1);
    if (event.key === "ArrowRight") next = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
    if (event.key === "ArrowUp") next = new Date(day.getFullYear(), day.getMonth(), day.getDate() - 7);
    if (event.key === "ArrowDown") next = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 7);
    if (event.key === "Home") next = new Date(day.getFullYear(), day.getMonth(), day.getDate() - ((day.getDay() + 6) % 7));
    if (event.key === "End") next = new Date(day.getFullYear(), day.getMonth(), day.getDate() + (6 - ((day.getDay() + 6) % 7)));
    if (event.key === "PageUp") next = new Date(day.getFullYear(), day.getMonth() - 1, day.getDate());
    if (event.key === "PageDown") next = new Date(day.getFullYear(), day.getMonth() + 1, day.getDate());
    if (!next) return;
    event.preventDefault();
    if (isDateAllowed(next)) focusDay(next);
  }

  function updateTime(part: "hour" | "minute" | "period", raw: string) {
    const next = new Date(draftTime);
    if (part === "hour") {
      const hour = Math.max(1, Math.min(12, Number(raw) || 12));
      next.setHours((next.getHours() >= 12 ? 12 : 0) + (hour % 12));
    } else if (part === "minute") {
      next.setMinutes(Math.max(0, Math.min(59, Number(raw) || 0)));
    } else {
      next.setHours((next.getHours() % 12) + (raw === "PM" ? 12 : 0));
    }
    setDraftTime(next);
  }

  function stepTime(part: "hour" | "minute", direction: -1 | 1) {
    const next = new Date(draftTime);
    if (part === "hour") next.setHours(next.getHours() + direction);
    else next.setMinutes(next.getMinutes() + direction * 5);
    setDraftTime(next);
  }

  function chooseQuickDate(daysFromToday: number) {
    const next = new Date();
    next.setDate(next.getDate() + daysFromToday);
    next.setHours(draftTime.getHours(), draftTime.getMinutes(), 0, 0);
    if (!isDateAllowed(next)) return;
    setDraftTime(next);
    setVisibleMonth(new Date(next.getFullYear(), next.getMonth(), 1));
    if (mode === "date") commit(next);
  }

  const Icon = mode === "date" ? CalendarDays : mode === "time" ? Clock3 : CalendarClock;
  const monthLabel = visibleMonth.toLocaleDateString([], { month: "long", year: "numeric" });
  const draftWithinRange = isValueAllowed(draftTime);

  return (
    <div className="relative min-w-0 flex-1">
      <input
        {...props}
        ref={hiddenRef}
        type="text"
        min={min}
        max={max}
        readOnly={readOnly}
        value={value}
        defaultValue={value === undefined ? defaultValue : undefined}
        onChange={(event) => {
          setInternalValue(event.target.value);
          onChange?.(event);
        }}
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute h-px w-px opacity-0"
      />
      <button
        ref={triggerRef}
        type="button"
        data-date-time-trigger="true"
        disabled={disabled || readOnly}
        onClick={openPicker}
        aria-label={props["aria-label"] ?? pickerLabel}
        aria-expanded={open}
        className={cn(
          "admin-input ld-focus-ring group flex h-11 w-full min-w-0 items-center rounded-[14px] py-0 pl-3 pr-1.5 text-left text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      >
        <Icon className="mr-2 h-4 w-4 shrink-0 text-white/52" aria-hidden="true" />
        <span className={cn("min-w-0 flex-1 truncate", selectedValue ? "text-white/90" : "text-white/42")}>
          {formatValue(selectedValue, mode) || placeholder || (mode === "time" ? "Choose time" : "Choose date")}
        </span>
        <span className="ml-2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-white/10 bg-white/[0.08] text-white/68 transition group-hover:bg-white/[0.14] group-hover:text-white">
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </span>
      </button>
      <ResponsivePopover anchorRef={triggerRef} ariaLabel={pickerLabel} desktopMaxHeight={660} desktopWidth={360} onClose={() => setOpen(false)} open={open} scrollable className="p-3">
        <AdminPickerHeader
          title={pickerLabel}
          description={mode === "time" ? "Set a clear local time." : mode === "date" ? "Choose a date or use a quick option." : "Choose the date, then confirm the time."}
          onClose={() => setOpen(false)}
        />
        <div className="mb-3 flex items-center gap-3 rounded-[18px] border border-white/10 bg-white/[0.045] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] border border-white/10 bg-white/[0.07] text-[color:var(--ld-color-accent)]"><Icon className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/42">Selected</p>
            <p className="mt-0.5 truncate text-sm font-semibold text-white">{formatValue(selectedValue, mode) || "No date selected"}</p>
          </div>
        </div>
        {mode !== "time" ? (
          <div className="rounded-[20px] border border-white/10 bg-black/15 p-2.5">
            <div className="mb-2 flex items-center justify-between">
              <button type="button" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))} className="ld-focus-ring grid h-9 w-9 place-items-center rounded-[12px] text-white/62 hover:bg-white/[0.08] hover:text-white" aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></button>
              <span className="text-sm font-semibold text-white/90">{monthLabel}</span>
              <button type="button" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))} className="ld-focus-ring grid h-9 w-9 place-items-center rounded-[12px] text-white/62 hover:bg-white/[0.08] hover:text-white" aria-label="Next month"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((day) => <span key={day} className="grid h-7 place-items-center text-[10px] font-semibold uppercase tracking-[0.08em] text-white/38">{day}</span>)}
              {days.map((day) => {
                const key = dateKey(day);
                const selectedDay = selectedDate && key === dateKey(selectedDate);
                const today = key === dateKey(new Date());
                const inMonth = day.getMonth() === visibleMonth.getMonth();
                const allowed = isDateAllowed(day);
                return <button key={key} type="button" data-calendar-day={key} onClick={() => chooseDay(day)} onKeyDown={(event) => handleDayKeyDown(event, day)} disabled={!allowed} aria-label={day.toLocaleDateString([], { dateStyle: "long" })} aria-pressed={Boolean(selectedDay)} className={cn("ld-focus-ring relative grid aspect-square min-h-10 place-items-center rounded-[13px] text-sm font-medium transition", selectedDay ? "bg-[color:var(--ld-color-primary)] text-white shadow-[0_8px_24px_color-mix(in_srgb,var(--ld-color-primary)_35%,transparent),inset_0_1px_0_rgba(255,255,255,0.18)]" : inMonth ? "text-white/82 hover:bg-white/[0.09]" : "text-white/28 hover:bg-white/[0.05]", today && !selectedDay && "ring-1 ring-inset ring-[color:var(--ld-color-accent)]/65 text-white", !allowed && "cursor-not-allowed opacity-20 hover:bg-transparent")}>{day.getDate()}</button>;
              })}
            </div>
          </div>
        ) : null}
        {mode !== "date" ? (
          <div className={cn("rounded-[18px] border border-white/10 bg-white/[0.035] p-2.5", mode === "datetime-local" && "mt-3")}>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/42">Time</p>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              {(["hour", "minute"] as const).map((part, index) => (
                <div key={part} className={cn("grid grid-cols-[2.5rem_1fr_2.5rem] items-center gap-1 rounded-[14px] border border-white/10 bg-black/15 p-1", index === 1 && "col-start-3")}>
                  <button type="button" onClick={() => stepTime(part, -1)} className="ld-focus-ring grid h-9 w-9 place-items-center rounded-[10px] text-white/58 hover:bg-white/[0.08] hover:text-white" aria-label={`Decrease ${part}`}><Minus className="h-3.5 w-3.5" /></button>
                  <input aria-label={part === "hour" ? "Hour" : "Minute"} inputMode="numeric" type="number" min={part === "hour" ? 1 : 0} max={part === "hour" ? 12 : 59} value={part === "hour" ? (draftTime.getHours() % 12) || 12 : pad(draftTime.getMinutes())} onChange={(event) => updateTime(part, event.target.value)} className="h-9 min-w-0 bg-transparent text-center text-base font-semibold text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
                  <button type="button" onClick={() => stepTime(part, 1)} className="ld-focus-ring grid h-9 w-9 place-items-center rounded-[10px] text-white/58 hover:bg-white/[0.08] hover:text-white" aria-label={`Increase ${part}`}><Plus className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-2 rounded-[13px] border border-white/10 bg-black/15 p-1">{["AM", "PM"].map((period) => <button key={period} type="button" onClick={() => updateTime("period", period)} className={cn("h-9 rounded-[9px] px-3 text-xs font-semibold transition", (draftTime.getHours() >= 12 ? "PM" : "AM") === period ? "bg-white/[0.13] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]" : "text-white/45 hover:text-white")}>{period}</button>)}</div>
          </div>
        ) : null}
        {!draftWithinRange ? <p className="mt-2 text-xs font-medium text-rose-200" role="alert">Choose a value within the allowed range.</p> : null}
        <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3 sm:items-center sm:justify-between">
          <button type="button" onClick={() => commit(null)} className="ld-focus-ring h-10 min-w-0 flex-1 basis-[calc(50%-0.25rem)] rounded-full px-3 text-sm font-medium text-white/55 hover:bg-white/[0.06] hover:text-white sm:basis-auto sm:flex-none">Clear</button>
          {mode !== "time" ? <button type="button" onClick={() => chooseQuickDate(0)} className="admin-button-secondary ld-focus-ring h-10 min-w-0 flex-1 basis-[calc(50%-0.25rem)] rounded-full px-3 text-sm font-semibold sm:basis-auto sm:flex-none">Today</button> : null}
          {mode !== "time" ? <button type="button" onClick={() => chooseQuickDate(1)} className="admin-button-secondary ld-focus-ring h-10 min-w-0 flex-1 basis-[calc(50%-0.25rem)] rounded-full px-3 text-sm font-semibold sm:basis-auto sm:flex-none">Tomorrow</button> : null}
          {mode !== "time" ? <button type="button" onClick={() => chooseQuickDate(7)} className="admin-button-secondary ld-focus-ring h-10 min-w-0 flex-1 basis-[calc(50%-0.25rem)] rounded-full px-3 text-sm font-semibold sm:basis-auto sm:flex-none">Next week</button> : null}
          {mode !== "date" ? <button type="button" onClick={() => commit(draftTime)} disabled={!draftWithinRange} className="admin-button-primary ld-focus-ring h-10 basis-full rounded-full px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45 sm:ml-auto sm:basis-auto">Apply</button> : null}
        </div>
      </ResponsivePopover>
    </div>
  );
}
