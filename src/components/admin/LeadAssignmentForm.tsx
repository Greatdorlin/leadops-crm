"use client";

import { startTransition } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { crmLabelize } from "@/lib/crm/formatters";
import type { CrmStatus, LeadPriority } from "@/lib/pathway-engine/types";
import { CRM_STATUSES, LEAD_PRIORITIES } from "@/lib/pathway-engine/types";
import { AdminSelect } from "./AdminSelect";

export interface LeadAssignmentOption {
  value: string;
  label: string;
  assignedTo: string | null;
  crmStatus: CrmStatus;
  priority: LeadPriority;
}

export function LeadAssignmentForm({
  leadOptions,
  assigneeOptions,
}: {
  leadOptions: LeadAssignmentOption[];
  assigneeOptions: Array<{ label: string; value: string }>;
}) {
  const router = useRouter();
  const [selectedLeadId, setSelectedLeadId] = useState(leadOptions[0]?.value ?? "");
  const [assignedTo, setAssignedTo] = useState(leadOptions[0]?.assignedTo ?? "");
  const [crmStatus, setCrmStatus] = useState<CrmStatus>(leadOptions[0]?.crmStatus ?? "new");
  const [priority, setPriority] = useState<LeadPriority>(leadOptions[0]?.priority ?? "medium");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  function handleLeadChange(nextLeadId: string) {
    setSelectedLeadId(nextLeadId);
    const selectedLead = leadOptions.find((option) => option.value === nextLeadId);
    if (!selectedLead) {
      return;
    }

    setAssignedTo(selectedLead.assignedTo ?? "");
    setCrmStatus(selectedLead.crmStatus);
    setPriority(selectedLead.priority);
  }

  async function saveAssignment() {
    if (!selectedLeadId) {
      setMessage("Choose a lead before saving.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/leads/${selectedLeadId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          crmStatus,
          priority,
          assignedTo: assignedTo || null,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessage(payload?.error ?? "We couldn't save this assignment right now.");
        setIsSaving(false);
        return;
      }

      setMessage("Lead assignment updated.");
      setIsSaving(false);
      startTransition(() => router.refresh());
    } catch {
      setMessage("We couldn't save this assignment right now.");
      setIsSaving(false);
    }
  }

  if (leadOptions.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm leading-6 text-slate-500">
        No unassigned or action-ready leads are in this quick-assign list right now.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <label className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Lead</span>
        <AdminSelect
          value={selectedLeadId}
          onChange={(event) => handleLeadChange(event.target.value)}
          className="h-11"
        >
          {leadOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </AdminSelect>
      </label>

      <div className="grid gap-3">
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Owner</span>
          <AdminSelect
            value={assignedTo}
            onChange={(event) => setAssignedTo(event.target.value)}
            className="h-11"
          >
            <option value="">Unassigned</option>
            {assigneeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </AdminSelect>
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Stage</span>
          <AdminSelect
            value={crmStatus}
            onChange={(event) => setCrmStatus(event.target.value as CrmStatus)}
            className="h-11"
          >
            {CRM_STATUSES.map((option) => (
              <option key={option} value={option}>
                {crmLabelize(option)}
              </option>
            ))}
          </AdminSelect>
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Priority</span>
          <AdminSelect
            value={priority}
            onChange={(event) => setPriority(event.target.value as LeadPriority)}
            className="h-11"
          >
            {LEAD_PRIORITIES.map((option) => (
              <option key={option} value={option}>
                {crmLabelize(option)}
              </option>
            ))}
          </AdminSelect>
        </label>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-end sm:justify-between">
        <p className="max-w-[18rem] text-sm leading-6 text-slate-500">
          Quick routing only.
        </p>
        <button
          type="button"
          onClick={() => void saveAssignment()}
          disabled={isSaving}
          className="admin-button-primary h-11 min-w-[136px] self-start rounded-2xl px-5 text-sm"
        >
          {isSaving ? "Saving..." : "Save assignment"}
        </button>
      </div>
      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
    </div>
  );
}
