"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, LoaderCircle, Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { ResponsivePopover } from "./ResponsivePopover";
import { TeamAvatar } from "./TeamAvatar";

export interface LeadAssigneeOption {
  avatarUrl?: string | null;
  detail?: string;
  label: string;
  value: string;
}

export function LeadOwnerQuickAssign({
  leadId,
  initialAssignedTo,
  assigneeOptions,
  variant = "stacked",
}: {
  leadId: string;
  initialAssignedTo: string | null;
  assigneeOptions: LeadAssigneeOption[];
  variant?: "stacked" | "compact";
}) {
  const listboxId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [assignedTo, setAssignedTo] = useState(initialAssignedTo ?? "");
  const [savedAssignedTo, setSavedAssignedTo] = useState(initialAssignedTo ?? "");
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [hasError, setHasError] = useState(false);
  const selectedOption = assigneeOptions.find((option) => option.value === assignedTo) ?? null;
  const selectedLabel = selectedOption?.label ?? (assignedTo || "Unassigned");
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return assigneeOptions;
    }

    return assigneeOptions.filter((option) =>
      `${option.label} ${option.value} ${option.detail ?? ""}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [assigneeOptions, query]);

  function closePopover() {
    setIsOpen(false);
    setQuery("");
  }

  async function saveAssignment(nextAssignedTo: string) {
    const previousAssignedTo = savedAssignedTo;
    setAssignedTo(nextAssignedTo);
    setIsSaving(true);
    setHasError(false);
    setMessage("Saving owner...");

    try {
      const response = await fetch(`/api/admin/leads/${leadId}/workflow`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assignedTo: nextAssignedTo || null,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setAssignedTo(previousAssignedTo);
        setHasError(true);
        setMessage(payload?.error ?? "We couldn't update the owner right now.");
        setIsSaving(false);
        return;
      }

      setSavedAssignedTo(nextAssignedTo);
      setMessage("Owner updated.");
      setIsSaving(false);
    } catch {
      setAssignedTo(previousAssignedTo);
      setHasError(true);
      setMessage("We couldn't update the owner right now.");
      setIsSaving(false);
    }
  }

  function handleAssignedToChange(nextAssignedTo: string) {
    closePopover();

    if (variant === "compact") {
      void saveAssignment(nextAssignedTo);
      return;
    }

    setAssignedTo(nextAssignedTo);
    setHasError(false);
    setMessage("");
  }

  return (
    <div className={cn("min-w-0", variant === "compact" ? "space-y-1" : "space-y-3")}>
      <div className="grid gap-2">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          disabled={isSaving}
          className={cn(
            "group flex w-full min-w-0 items-center justify-between gap-2 border border-white/12 bg-white/[0.06] text-left text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_12px_24px_rgba(0,0,0,0.18)] transition hover:border-white/22 hover:bg-white/[0.09] disabled:cursor-wait disabled:opacity-75",
            variant === "compact"
              ? "h-10 max-w-[13rem] rounded-full py-1 pl-1.5 pr-2.5"
              : "h-12 rounded-[18px] py-1.5 pl-2 pr-3",
          )}
          aria-controls={listboxId}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-label={`Assign lead owner. Current owner: ${selectedLabel}`}
          aria-busy={isSaving}
          data-lead-id={leadId}
          data-testid="lead-owner-quick-assign"
        >
          <span className="flex min-w-0 items-center gap-2">
            <TeamAvatar
              name={selectedLabel}
              email={selectedOption?.value ?? assignedTo}
              avatarUrl={selectedOption?.avatarUrl}
              size="sm"
              className={variant === "compact" ? "h-7 w-7 text-[10px]" : undefined}
            />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{selectedLabel}</span>
              {variant === "stacked" ? (
                <span className="block truncate text-xs text-white/70">
                  {selectedOption?.detail ?? selectedOption?.value ?? "No owner selected"}
                </span>
              ) : null}
            </span>
          </span>
          {isSaving ? (
            <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-white/72" />
          ) : (
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-white/70 transition",
                isOpen && "rotate-180",
              )}
            />
          )}
        </button>

      <ResponsivePopover
          anchorRef={buttonRef}
          ariaLabel="Choose lead owner"
          desktopWidth={340}
          onClose={closePopover}
          open={isOpen}
        >
          <div id={listboxId} className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between gap-3 px-2 pb-2 pt-1">
              <div>
                <p className="text-sm font-semibold text-white">Assign owner</p>
                <p className="mt-0.5 text-xs text-white/64">Choose who handles this lead.</p>
              </div>
              <button
                type="button"
                onClick={closePopover}
                className="ld-focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/70 transition hover:bg-white/[0.1] hover:text-white"
                aria-label="Close owner picker"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="flex h-11 shrink-0 items-center gap-2 rounded-[16px] border border-white/10 bg-white/[0.06] px-3 text-white/70 focus-within:border-white/22 focus-within:bg-white/[0.08]">
              <Search className="h-4 w-4 shrink-0" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search people"
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/52"
                autoFocus
              />
            </label>

            <div className="mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1" role="listbox">
              <button
                type="button"
                onClick={() => handleAssignedToChange("")}
                className="ld-focus-ring flex w-full items-center gap-3 rounded-[16px] px-2 py-2.5 text-left text-sm text-white/76 transition hover:bg-white/[0.08] hover:text-white"
                role="option"
                aria-selected={!assignedTo}
              >
                <TeamAvatar name="Unassigned" size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">Unassigned</span>
                  <span className="block text-xs text-white/60">No owner yet</span>
                </span>
                {!assignedTo ? <Check className="h-4 w-4 text-[var(--ld-color-accent)]" /> : null}
              </button>
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleAssignedToChange(option.value)}
                    className="ld-focus-ring flex w-full items-center gap-3 rounded-[16px] px-2 py-2.5 text-left text-sm text-white/76 transition hover:bg-white/[0.08] hover:text-white"
                    role="option"
                    aria-selected={option.value === assignedTo}
                  >
                    <TeamAvatar
                      name={option.label}
                      email={option.value}
                      avatarUrl={option.avatarUrl}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{option.label}</span>
                      <span className="block truncate text-xs text-white/60">
                        {option.detail ?? option.value}
                      </span>
                    </span>
                    {option.value === assignedTo ? (
                      <Check className="h-4 w-4 text-[var(--ld-color-accent)]" />
                    ) : null}
                  </button>
                ))
              ) : (
                <p className="px-3 py-5 text-sm text-white/64">No matching team member.</p>
              )}
            </div>
          </div>
        </ResponsivePopover>

        {variant === "stacked" ? (
          <button
            type="button"
            onClick={() => void saveAssignment(assignedTo)}
            disabled={isSaving || assignedTo === savedAssignedTo}
            className="admin-button-primary h-11 w-full rounded-[18px] px-4 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Saving..." : assignedTo === savedAssignedTo ? "Owner saved" : "Save owner"}
          </button>
        ) : null}
      </div>

      <p
        className={cn(
          variant === "compact" ? "sr-only" : "min-h-5 text-xs leading-5",
          hasError ? "text-rose-200" : "text-white/64",
        )}
        role={hasError ? "alert" : "status"}
        aria-live="polite"
      >
        {message}
      </p>
    </div>
  );
}
