"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { crmLabelize } from "@/lib/crm/formatters";
import type { CrmStatus, LeadPriority } from "@/lib/pathway-engine/types";
import { AdminSelect } from "./AdminSelect";

const crmStatuses: CrmStatus[] = [
  "new",
  "contacted",
  "qualified",
  "consultation_booked",
  "application_started",
  "documents_pending",
  "payment_pending",
  "converted",
  "lost",
  "unresponsive",
  "unqualified",
  "closed",
];

const priorityOptions: LeadPriority[] = ["low", "medium", "high", "urgent"];

export function LeadStatusForm({
  leadId,
  initialStatus,
  initialPriority,
  initialAssignedTo,
  initialAssignedToList,
  assigneeOptions,
}: {
  leadId: string;
  initialStatus: CrmStatus;
  initialPriority: LeadPriority;
  initialAssignedTo: string | null;
  initialAssignedToList: string[];
  assigneeOptions: Array<{ label: string; value: string }>;
}) {
  const router = useRouter();
  const [crmStatus, setCrmStatus] = useState<CrmStatus>(initialStatus);
  const [priority, setPriority] = useState<LeadPriority>(initialPriority);
  const [assignedTo, setAssignedTo] = useState(initialAssignedTo ?? "");
  const [assignedToList, setAssignedToList] = useState<string[]>(initialAssignedToList);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  function toggleAdditionalOwner(email: string) {
    setAssignedToList((current) => {
      const next = new Set(current);
      if (next.has(email)) {
        next.delete(email);
      } else {
        next.add(email);
      }

      if (assignedTo) {
        next.add(assignedTo);
      }

      return [...next];
    });
  }

  async function updateLead() {
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
          assignedTo: assignedTo || null,
          assignedToList: assignedToList.filter(Boolean),
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setMessage(payload?.error ?? "We couldn't update this lead right now.");
        setIsSaving(false);
        return;
      }

      setMessage("Lead details updated.");
      setIsSaving(false);
      router.refresh();
    } catch {
      setMessage("We couldn't update this lead right now.");
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-slate-200/85 bg-[linear-gradient(180deg,rgba(250,251,255,0.98)_0%,rgba(255,252,247,0.95)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
      <div className="mb-4 rounded-[18px] border border-slate-200/70 bg-white/72 px-4 py-3 text-sm leading-6 text-slate-500">
        Update routing before the next touch so ownership and status stay clean.
      </div>
      <div className="grid gap-4">
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Stage</span>
          <AdminSelect
            value={crmStatus}
            onChange={(event) => setCrmStatus(event.target.value as CrmStatus)}
            className="h-12"
          >
            {crmStatuses.map((status) => (
              <option key={status} value={status}>
                {crmLabelize(status)}
              </option>
            ))}
          </AdminSelect>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Priority</span>
          <AdminSelect
            value={priority}
            onChange={(event) => setPriority(event.target.value as LeadPriority)}
            className="h-12"
          >
            {priorityOptions.map((option) => (
              <option key={option} value={option}>
                {crmLabelize(option)}
              </option>
            ))}
          </AdminSelect>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Assigned owner</span>
          <AdminSelect
            value={assignedTo}
            onChange={(event) => {
              const nextPrimary = event.target.value;
              setAssignedTo(nextPrimary);
              setAssignedToList((current) => {
                const next = current.filter(Boolean).filter((email) => email !== assignedTo);
                if (nextPrimary) {
                  return [nextPrimary, ...next.filter((email) => email !== nextPrimary)];
                }

                return [];
              });
            }}
            className="h-12"
          >
            <option value="">Unassigned</option>
            {assigneeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </AdminSelect>
        </label>

        {assigneeOptions.length > 1 ? (
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Also share with
            </span>
            <div className="grid gap-2 rounded-[18px] border border-slate-200/80 bg-white/82 p-3">
              {assigneeOptions
                .filter((option) => option.value !== assignedTo)
                .map((option) => {
                  const checked = assignedToList.includes(option.value);
                  return (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 rounded-2xl border border-slate-200/80 px-3 py-2 text-sm text-slate-600"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAdditionalOwner(option.value)}
                        className="h-4 w-4 rounded border-slate-300 text-slate-900"
                      />
                      <span>{option.label}</span>
                    </label>
                  );
                })}
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-slate-200/80 pt-4">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void updateLead()}
            className="admin-button-primary h-12 w-full rounded-2xl px-5 text-sm"
          >
            {isSaving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
    </div>
  );
}
