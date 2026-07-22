"use client";

import type { ComponentPropsWithoutRef } from "react";
import { useMemo, useRef, useState } from "react";
import { CalendarDays, CalendarClock, ChevronLeft, ChevronRight, Clock3, X } from "lucide-react";
import { cn } from "@/lib/cn";
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
    const next = new Date(day);
    next.setHours(draftTime.getHours(), draftTime.getMinutes(), 0, 0);
    setDraftTime(next);
    commit(next, mode === "date");
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

  const Icon = mode === "date" ? CalendarDays : mode === "time" ? Clock3 : CalendarClock;
  const monthLabel = visibleMonth.toLocaleDateString([], { month: "long", year: "numeric" });

  return (
    <div className="relative min-w-0 flex-1">
      <input
        {...props}
        ref={hiddenRef}
        type="text"
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
        disabled={disabled || readOnly}
        onClick={openPicker}
        aria-label={props["aria-label"] ?? pickerLabel}
        aria-expanded={open}
        className={cn(
          "admin-input ld-focus-ring group flex h-11 w-full min-w-0 items-center rounded-[14px] py-0 pl-3 pr-1.5 text-left text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      >
        <span className={cn("min-w-0 flex-1 truncate", selectedValue ? "text-white/90" : "text-white/42")}>
          {formatValue(selectedValue, mode) || placeholder || (mode === "time" ? "Choose time" : "Choose date")}
        </span>
        <span className="ml-2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-white/10 bg-white/[0.08] text-white/68 transition group-hover:bg-white/[0.14] group-hover:text-white">
          <Icon className="h-4 w-4" />
        </span>
      </button>
      <ResponsivePopover anchorRef={triggerRef} ariaLabel={pickerLabel} desktopWidth={340} onClose={() => setOpen(false)} open={open} className="p-3">
        <div className="flex items-center justify-between px-1 pb-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/44">{mode === "time" ? "Time" : "Date"}</p>
            <p className="mt-1 text-sm font-semibold text-white">{mode === "time" ? draftTime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : monthLabel}</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="ld-focus-ring grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-white/62 hover:bg-white/[0.1] hover:text-white" aria-label="Close picker"><X className="h-4 w-4" /></button>
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
                return <button key={key} type="button" onClick={() => chooseDay(day)} aria-label={day.toLocaleDateString([], { dateStyle: "long" })} aria-pressed={Boolean(selectedDay)} className={cn("ld-focus-ring relative grid aspect-square min-h-9 place-items-center rounded-[12px] text-sm transition", selectedDay ? "bg-[color:var(--workspace-primary)] text-white shadow-[0_8px_24px_color-mix(in_srgb,var(--workspace-primary)_35%,transparent)]" : inMonth ? "text-white/82 hover:bg-white/[0.09]" : "text-white/28 hover:bg-white/[0.05]", today && !selectedDay && "ring-1 ring-inset ring-[color:var(--workspace-accent)]/60 text-white")}>{day.getDate()}</button>;
              })}
            </div>
          </div>
        ) : null}
        {mode !== "date" ? (
          <div className={cn("grid grid-cols-[1fr_auto_1fr_auto] items-end gap-2", mode === "datetime-local" && "mt-3")}>
            <label className="min-w-0"><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/42">Hour</span><input type="number" min={1} max={12} value={(draftTime.getHours() % 12) || 12} onChange={(event) => updateTime("hour", event.target.value)} className="admin-input h-11 w-full rounded-[13px] px-3 text-center text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" /></label>
            <span className="pb-3 text-white/35">:</span>
            <label className="min-w-0"><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/42">Minute</span><input type="number" min={0} max={59} value={pad(draftTime.getMinutes())} onChange={(event) => updateTime("minute", event.target.value)} className="admin-input h-11 w-full rounded-[13px] px-3 text-center text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" /></label>
            <div className="flex rounded-[13px] border border-white/10 bg-white/[0.04] p-1">{["AM", "PM"].map((period) => <button key={period} type="button" onClick={() => updateTime("period", period)} className={cn("h-9 rounded-[9px] px-2.5 text-xs font-semibold transition", (draftTime.getHours() >= 12 ? "PM" : "AM") === period ? "bg-white/[0.13] text-white" : "text-white/45 hover:text-white")}>{period}</button>)}</div>
          </div>
        ) : null}
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-3">
          <button type="button" onClick={() => commit(null)} className="ld-focus-ring h-10 rounded-full px-3 text-sm font-medium text-white/55 hover:bg-white/[0.06] hover:text-white">Clear</button>
          <div className="flex gap-2">
            {mode !== "time" ? <button type="button" onClick={() => { const now = new Date(); setDraftTime(now); setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1)); if (mode === "date") commit(now); }} className="admin-button-secondary ld-focus-ring h-10 rounded-full px-4 text-sm font-semibold">Today</button> : null}
            {mode !== "date" ? <button type="button" onClick={() => commit(draftTime)} className="admin-button-primary ld-focus-ring h-10 rounded-full px-4 text-sm font-semibold">Apply</button> : null}
          </div>
        </div>
      </ResponsivePopover>
    </div>
  );
}
