"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Search } from "lucide-react";
import type { LeadPriority } from "@/lib/crm/types";
import { cn } from "@/lib/cn";
import { TeamAvatar } from "./TeamAvatar";

export function LeadOwnerQuickAssign({
  leadId,
  initialAssignedTo,
  stage,
  priority,
  assigneeOptions,
  variant = "stacked",
}: {
  leadId: string;
  initialAssignedTo: string | null;
  stage: string;
  priority: LeadPriority;
  assigneeOptions: Array<{ label: string; value: string }>;
  variant?: "stacked" | "compact";
}) {
  const router = useRouter();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [assignedTo, setAssignedTo] = useState(initialAssignedTo ?? "");
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const selectedOption = assigneeOptions.find((option) => option.value === assignedTo) ?? null;
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return assigneeOptions;
    }

    return assigneeOptions.filter((option) =>
      `${option.label} ${option.value}`.toLowerCase().includes(normalizedQuery),
    );
  }, [assigneeOptions, query]);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [isOpen]);

  useEffect(() => {
    function handleScroll() {
      if (isOpen) {
        setIsOpen(false);
      }
    }
    function handleResize() {
      if (isOpen) {
        setIsOpen(false);
      }
    }
    function handleClickOutside(event: MouseEvent) {
      if (
        isOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  async function saveAssignment(nextAssignedTo = assignedTo) {
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/leads/${leadId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stage,
          priority,
          assignedTo: nextAssignedTo || null,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setMessage(payload?.error ?? "We couldn't update the owner right now.");
        setIsSaving(false);
        return;
      }

      setMessage("Owner updated.");
      setIsSaving(false);
      startTransition(() => router.refresh());
    } catch {
      setMessage("We couldn't update the owner right now.");
      setIsSaving(false);
    }
  }

  function handleAssignedToChange(nextAssignedTo: string) {
    setAssignedTo(nextAssignedTo);
    setIsOpen(false);
    setQuery("");

    if (variant === "compact") {
      void saveAssignment(nextAssignedTo);
    }
  }

  return (
    <div className={variant === "compact" ? "space-y-2" : "space-y-3"}>
      <div className="grid gap-2">
        <div className="relative">
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setIsOpen((current) => !current)}
            className={cn(
              "group flex w-full items-center justify-between gap-2 border border-white/12 bg-white/[0.055] text-left text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_12px_24px_rgba(0,0,0,0.18)] transition hover:border-white/22 hover:bg-white/[0.08]",
              variant === "compact" ? "h-10 rounded-full py-1 pl-1.5 pr-2.5" : "h-12 rounded-[20px] py-1.5 pl-2 pr-3",
            )}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-label="Assign lead owner"
          >
            <span className="flex min-w-0 items-center gap-2">
              <TeamAvatar
                name={selectedOption?.label ?? "Unassigned"}
                email={selectedOption?.value}
                size="sm"
                className={variant === "compact" ? "h-7 w-7 text-[10px]" : undefined}
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">
                  {selectedOption?.label ?? "Unassigned"}
                </span>
                {variant === "stacked" ? (
                  <span className="block truncate text-xs text-white/70">
                    {selectedOption?.value ?? "Assign later"}
                  </span>
                ) : null}
              </span>
            </span>
            <ChevronDown className={cn("h-4 w-4 shrink-0 text-white/70 transition", isOpen && "rotate-180")} />
          </button>

          {isOpen ? (
            <div
              ref={dropdownRef}
              className="ld-glass-panel fixed z-[100] overflow-hidden rounded-[22px] border border-white/12 bg-[#070b18]/95 p-2 shadow-[0_24px_70px_rgba(0,0,0,0.5)]"
              style={{
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                width: dropdownPosition.width,
              }}
            >
              <label className="flex h-10 items-center gap-2 rounded-[16px] border border-white/10 bg-white/[0.055] px-3 text-white/70">
                <Search className="h-4 w-4 shrink-0" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search people"
                  className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/60"
                  autoFocus
                />
              </label>
              <div className="mt-2 max-h-64 overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => handleAssignedToChange("")}
                  className="flex w-full items-center gap-2 rounded-[16px] px-2 py-2.5 text-left text-sm text-white/76 transition hover:bg-white/[0.08] hover:text-white"
                  role="option"
                  aria-selected={!assignedTo}
                >
                  <TeamAvatar name="Unassigned" size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">Unassigned</span>
                    <span className="block text-xs text-white/70">No owner yet</span>
                  </span>
                  {!assignedTo ? <Check className="h-4 w-4 text-white" /> : null}
                </button>
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleAssignedToChange(option.value)}
                      className="flex w-full items-center gap-2 rounded-[16px] px-2 py-2.5 text-left text-sm text-white/76 transition hover:bg-white/[0.08] hover:text-white"
                      role="option"
                      aria-selected={option.value === assignedTo}
                    >
                      <TeamAvatar name={option.label} email={option.value} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{option.label}</span>
                        <span className="block truncate text-xs text-white/70">{option.value}</span>
                      </span>
                      {option.value === assignedTo ? <Check className="h-4 w-4 text-white" /> : null}
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-4 text-sm text-white/70">No matching team member.</p>
                )}
              </div>
            </div>
          ) : null}
        </div>
        {variant === "stacked" ? (
          <button
            type="button"
            onClick={() => void saveAssignment()}
            disabled={isSaving}
            className="admin-button-primary h-11 w-full rounded-[18px] px-4 text-sm"
          >
            {isSaving ? "Saving..." : "Assign"}
          </button>
        ) : null}
      </div>
      {variant === "compact" ? (
        <p className="min-h-[1.25rem] text-xs leading-5 text-white/70">
          {isSaving ? "Saving owner..." : message}
        </p>
      ) : message ? (
        <p className="text-xs leading-5 text-white/70">{message}</p>
      ) : null}
    </div>
  );
}
