"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import type { CrmStatus, LeadPriority } from "@/lib/crm/types";
import { CRM_STATUSES } from "@/lib/crm/constants";
import { crmLabelize } from "@/lib/crm/formatters";
import { cn } from "@/lib/cn";

const statusDotMap: Record<CrmStatus, string> = {
  new: "bg-sky-400",
  contacted: "bg-amber-400",
  qualified: "bg-emerald-400",
  consultation_booked: "bg-violet-400",
  application_started: "bg-[var(--ld-color-primary)]",
  documents_pending: "bg-orange-400",
  payment_pending: "bg-amber-400",
  converted: "bg-emerald-400",
  lost: "bg-rose-400",
  unresponsive: "bg-white/60",
  unqualified: "bg-rose-400",
  closed: "bg-white/60",
};

export function LeadStatusQuickChange({
  leadId,
  initialStage,
  priority,
  assignedTo,
}: {
  leadId: string;
  initialStage: string;
  priority: LeadPriority;
  assignedTo: string | null;
}) {
  const router = useRouter();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState(initialStage);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: Math.max(rect.width, 200),
      });
    }
  }, [isOpen]);

  useEffect(() => {
    function handleScroll() {
      if (isOpen) setIsOpen(false);
    }
    function handleResize() {
      if (isOpen) setIsOpen(false);
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

  async function saveStage(nextStage: string) {
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: nextStage,
          priority,
          assignedTo: assignedTo || null,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setMessage(payload?.error ?? "We couldn't update the status right now.");
        setIsSaving(false);
        return;
      }

      setMessage("Status updated.");
      setIsSaving(false);
      startTransition(() => router.refresh());
    } catch {
      setMessage("We couldn't update the status right now.");
      setIsSaving(false);
    }
  }

  function handleStageChange(nextStage: string) {
    setStage(nextStage);
    setIsOpen(false);
    void saveStage(nextStage);
  }

  const currentLabel = crmLabelize(stage as CrmStatus);
  const currentDot = statusDotMap[stage as CrmStatus] ?? "bg-white/50";

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        disabled={isSaving}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.055] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.09)] transition hover:border-white/22 hover:bg-white/[0.08]",
          isSaving && "opacity-60"
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Change lead status"
        title="Change status"
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", currentDot)} />
        <span className="min-w-0 truncate">{currentLabel}</span>
        <ChevronDown className={cn("h-3 w-3 shrink-0 text-white/60 transition", isOpen && "rotate-180")} />
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
          <div className="max-h-64 overflow-y-auto pr-1">
            {CRM_STATUSES.map((status) => {
              const dot = statusDotMap[status];
              const isCurrent = status === stage;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => handleStageChange(status)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-[16px] px-2 py-2 text-left text-sm transition hover:bg-white/[0.08] hover:text-white",
                    isCurrent ? "text-white" : "text-white/76"
                  )}
                  role="option"
                  aria-selected={isCurrent}
                >
                  <span className={cn("h-2 w-2 rounded-full", dot)} />
                  <span className="min-w-0 flex-1 font-semibold">{crmLabelize(status)}</span>
                  {isCurrent ? <Check className="h-4 w-4 text-white" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      {message ? <p className="mt-1 text-xs leading-5 text-white/70">{message}</p> : null}
    </div>
  );
}
