"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import type { CrmStatus, LeadPriority } from "@/lib/pathway-engine/types";
import { AdminSelect } from "./AdminSelect";

export function LeadOwnerQuickAssign({
  leadId,
  initialAssignedTo,
  crmStatus,
  priority,
  assigneeOptions,
  variant = "stacked",
}: {
  leadId: string;
  initialAssignedTo: string | null;
  crmStatus: CrmStatus;
  priority: LeadPriority;
  assigneeOptions: Array<{ label: string; value: string }>;
  variant?: "stacked" | "compact";
}) {
  const router = useRouter();
  const [assignedTo, setAssignedTo] = useState(initialAssignedTo ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

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
          crmStatus,
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

    if (variant === "compact") {
      void saveAssignment(nextAssignedTo);
    }
  }

  return (
    <div className={variant === "compact" ? "space-y-2" : "space-y-3"}>
      <div className="grid gap-2">
        <AdminSelect
          value={assignedTo}
          onChange={(event) => handleAssignedToChange(event.target.value)}
          className={
            variant === "compact"
              ? "h-10 rounded-full border-slate-200 bg-white/95 pr-12 text-sm font-medium shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
              : "h-11 rounded-[18px] bg-white"
          }
          aria-label="Assign lead owner"
        >
          <option value="">Unassigned</option>
          {assigneeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </AdminSelect>
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
        <p className="min-h-[1.25rem] text-xs leading-5 text-slate-500">
          {isSaving ? "Saving owner..." : message}
        </p>
      ) : message ? (
        <p className="text-xs leading-5 text-slate-500">{message}</p>
      ) : null}
    </div>
  );
}
