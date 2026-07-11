"use client";

import { startTransition, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Check, ChevronDown, LoaderCircle, X } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  localDateTimeInputToIso,
  resolveQuickScheduleDate,
  toLocalDateTimeInputValue,
  type QuickSchedulePreset,
} from "@/lib/crm/schedule-presets";
import { formatCrmDateTime } from "@/lib/crm/formatters";
import { ResponsivePopover } from "./ResponsivePopover";

const presetOptions: Array<{ id: QuickSchedulePreset; label: string }> = [
  { id: "later_today", label: "Later today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "in_3_days", label: "In 3 days" },
  { id: "next_week", label: "Next week" },
];

function resolveStatus(value: string | null) {
  if (!value) return "none" as const;
  const dueAt = new Date(value);
  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  if (dueAt < now) return "overdue" as const;
  if (dueAt <= endOfToday) return "due_today" as const;
  return "upcoming" as const;
}

const statusColor = {
  none: "#94a3b8",
  overdue: "#fb7185",
  due_today: "#fbbf24",
  upcoming: "#38bdf8",
};

export function LeadFollowUpQuickChange({
  initialFollowUpAt,
  initialLabel,
  leadId,
}: {
  initialFollowUpAt: string | null;
  initialLabel: string;
  leadId: string;
}) {
  const router = useRouter();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [followUpAt, setFollowUpAt] = useState(initialFollowUpAt);
  const [savedFollowUpAt, setSavedFollowUpAt] = useState(initialFollowUpAt);
  const [exactValue, setExactValue] = useState(toLocalDateTimeInputValue(initialFollowUpAt));
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [hasError, setHasError] = useState(false);
  const status = resolveStatus(followUpAt);
  const label = followUpAt === initialFollowUpAt
    ? initialLabel
    : followUpAt
      ? formatCrmDateTime(followUpAt)
      : "No follow-up";

  async function saveFollowUp(nextValue: string | null) {
    if (nextValue === savedFollowUpAt) {
      setIsOpen(false);
      return;
    }

    const previous = savedFollowUpAt;
    setFollowUpAt(nextValue);
    setExactValue(toLocalDateTimeInputValue(nextValue));
    setIsSaving(true);
    setHasError(false);
    setMessage("Saving follow-up...");

    try {
      const response = await fetch(`/api/admin/leads/${leadId}/workflow`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextFollowUpAt: nextValue }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setFollowUpAt(previous);
        setExactValue(toLocalDateTimeInputValue(previous));
        setHasError(true);
        setMessage(payload?.error ?? "We couldn't update this follow-up.");
        setIsSaving(false);
        return;
      }

      setSavedFollowUpAt(nextValue);
      setMessage(nextValue ? "Follow-up scheduled." : "Follow-up cleared.");
      setIsSaving(false);
      setIsOpen(false);
      startTransition(() => router.refresh());
    } catch {
      setFollowUpAt(previous);
      setExactValue(toLocalDateTimeInputValue(previous));
      setHasError(true);
      setMessage("We couldn't update this follow-up.");
      setIsSaving(false);
    }
  }

  function applyPreset(preset: QuickSchedulePreset) {
    void saveFollowUp(resolveQuickScheduleDate(preset).toISOString());
  }

  return (
    <div className="min-w-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        disabled={isSaving}
        className="ld-focus-ring inline-flex max-w-full items-center gap-2 rounded-full border border-white/14 bg-white/[0.075] px-3 py-1.5 text-xs font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_8px_18px_rgba(2,6,23,0.16)] transition hover:border-white/24 hover:bg-white/[0.11] disabled:cursor-wait disabled:opacity-70"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`Schedule follow-up. Current value: ${label}`}
        data-testid="lead-follow-up-quick-change"
      >
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: statusColor[status] }} />
        <span className="truncate">{label}</span>
        {isSaving ? (
          <LoaderCircle className="h-3.5 w-3.5 shrink-0 animate-spin text-white/64" />
        ) : (
          <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-white/60 transition", isOpen && "rotate-180")} />
        )}
      </button>

      <ResponsivePopover
        anchorRef={buttonRef}
        ariaLabel="Schedule lead follow-up"
        desktopWidth={340}
        onClose={() => setIsOpen(false)}
        open={isOpen}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3 px-2 pb-2 pt-1">
            <div>
              <p className="text-sm font-semibold text-white">Schedule follow-up</p>
              <p className="mt-0.5 text-xs text-white/64">Pick a shortcut or exact time.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="ld-focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/70 transition hover:bg-white/[0.1] hover:text-white"
              aria-label="Close follow-up scheduler"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {presetOptions.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                className="ld-focus-ring rounded-[16px] border border-white/10 bg-white/[0.055] px-3 py-3 text-left text-sm font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/[0.09] hover:text-white"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <label className="mt-3 space-y-2 rounded-[18px] border border-white/10 bg-white/[0.045] p-3">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/64">
              <CalendarClock className="h-3.5 w-3.5" />
              Exact time
            </span>
            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={exactValue}
                min={toLocalDateTimeInputValue(new Date())}
                onChange={(event) => setExactValue(event.target.value)}
                className="admin-input h-11 min-w-0 flex-1 rounded-[14px] px-3 text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  const nextValue = localDateTimeInputToIso(exactValue);
                  if (!nextValue) {
                    setHasError(true);
                    setMessage("Choose a valid follow-up time.");
                    return;
                  }
                  void saveFollowUp(nextValue);
                }}
                className="admin-button-primary inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]"
                aria-label="Save exact follow-up time"
              >
                <Check className="h-4 w-4" />
              </button>
            </div>
          </label>

          <button
            type="button"
            onClick={() => void saveFollowUp(null)}
            className="mt-2 rounded-[16px] px-3 py-2.5 text-left text-sm font-semibold text-white/64 transition hover:bg-white/[0.07] hover:text-white"
          >
            Clear follow-up
          </button>
        </div>
      </ResponsivePopover>

      <p
        className={cn("sr-only", hasError && "not-sr-only mt-1 max-w-56 text-xs text-rose-200")}
        role={hasError ? "alert" : "status"}
        aria-live="polite"
      >
        {message}
      </p>
    </div>
  );
}
