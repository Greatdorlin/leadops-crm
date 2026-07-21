"use client";

import type { ComponentPropsWithoutRef } from "react";
import { useRef } from "react";
import { CalendarDays, CalendarClock, Clock3 } from "lucide-react";
import { cn } from "@/lib/cn";

type AdminDateTimeInputProps = Omit<ComponentPropsWithoutRef<"input">, "type"> & {
  mode?: "date" | "datetime-local" | "time";
  pickerLabel?: string;
};

export function AdminDateTimeInput({
  className,
  mode = "datetime-local",
  pickerLabel = "Open date and time picker",
  ...props
}: AdminDateTimeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    const input = inputRef.current;
    if (!input) return;
    input.focus({ preventScroll: true });
    try {
      input.showPicker?.();
    } catch {
      // Focus still exposes the browser's accessible date/time control.
    }
  }

  return (
    <div className="group relative min-w-0 flex-1">
      <input
        {...props}
        ref={inputRef}
        type={mode}
        className={cn(
          "admin-input ld-datetime-input ld-focus-ring h-11 w-full min-w-0 rounded-[14px] py-0 pl-3 pr-12 text-sm outline-none",
          className,
        )}
      />
      <button
        type="button"
        onClick={openPicker}
        className="ld-focus-ring absolute inset-y-1.5 right-1.5 inline-flex w-9 items-center justify-center rounded-[11px] border border-white/10 bg-white/[0.08] text-white/68 transition group-focus-within:border-white/20 group-focus-within:bg-white/[0.12] hover:bg-white/[0.14] hover:text-white"
        aria-label={pickerLabel}
      >
        {mode === "date" ? <CalendarDays className="h-4 w-4" /> : mode === "time" ? <Clock3 className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />}
      </button>
    </div>
  );
}
