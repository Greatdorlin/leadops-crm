"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CelebrationPanel } from "@/components/admin/CelebrationPanel";
import { useAdminWorkspaceSettings } from "@/components/admin/AdminWorkspaceSettingsProvider";
import { buildLeadStageCelebration, type CelebrationMoment } from "@/lib/crm/celebrations";
import { crmLabelize } from "@/lib/crm/formatters";
import type { LeadPriority } from "@/lib/crm/types";
import { AdminSelect } from "./AdminSelect";
import { InfoTip } from "./ui/InfoTip";
import { GlassSurface } from "./ui/GlassSurface";
import { SmoothButton } from "./ui/SmoothButton";

const stageKeys = [
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
] as const;

const priorityOptions: LeadPriority[] = ["low", "medium", "high", "urgent"];

function formatDateTimeLocalValue(value?: string | null) {
  if (!value) {
    return "";
  }

  return value.slice(0, 16);
}

export function LeadStatusForm({
  leadId,
  initialStage,
  initialPriority,
  initialAssignedTo,
  initialAssignedToList,
  initialNextFollowUpAt,
  assigneeOptions,
  stageOptions = stageKeys.map((status, index) => ({
    value: status,
    label: crmLabelize(status),
    sortOrder: index,
  })),
}: {
  leadId: string;
  initialStage: string;
  initialPriority: LeadPriority;
  initialAssignedTo: string | null;
  initialAssignedToList: string[];
  initialNextFollowUpAt?: string | null;
  assigneeOptions: Array<{ label: string; value: string }>;
  stageOptions?: Array<{
    value: string;
    label: string;
    sortOrder?: number;
    isWon?: boolean;
    isLost?: boolean;
  }>;
}) {
  const router = useRouter();
  const workspaceSettings = useAdminWorkspaceSettings();
  const [stage, setStage] = useState<string>(initialStage);
  const [priority, setPriority] = useState<LeadPriority>(initialPriority);
  const [assignedTo, setAssignedTo] = useState(initialAssignedTo ?? "");
  const [assignedToList, setAssignedToList] = useState<string[]>(initialAssignedToList);
  const [nextFollowUpAt, setNextFollowUpAt] = useState(formatDateTimeLocalValue(initialNextFollowUpAt));
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [celebration, setCelebration] = useState<CelebrationMoment | null>(null);

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
          stage,
          priority,
          assignedTo: assignedTo || null,
          assignedToList: assignedToList.filter(Boolean),
          nextFollowUpAt: nextFollowUpAt || null,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setMessage(payload?.error ?? "We couldn't update this lead right now.");
        setIsSaving(false);
        return;
      }

      if (workspaceSettings.celebrationsEnabled && workspaceSettings.stageCelebrationsEnabled) {
        const activeStageLabel =
          stageOptions.find((option) => option.value === stage)?.label ?? crmLabelize(stage);
        const nextCelebration = buildLeadStageCelebration({
          previousStatus: initialStage as Parameters<typeof buildLeadStageCelebration>[0]["previousStatus"],
          nextStatus: stage as Parameters<typeof buildLeadStageCelebration>[0]["nextStatus"],
          stageLabel: activeStageLabel,
        });
        setCelebration(nextCelebration);
      } else {
        setCelebration(null);
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
    <GlassSurface intensity="medium" className="ld-animate-fade-in-up rounded-[24px] p-4">
      <CelebrationPanel celebration={celebration} onClose={() => setCelebration(null)} className="mb-4" />
      <div className="mb-4 flex items-start justify-between gap-3 rounded-[18px] border border-white/10 bg-white/[0.06] px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-white">Lead routing</p>
          <p className="mt-1 text-sm leading-6 text-white/70">
            Keep the next owner, stage, and follow-up clean before the next touch.
          </p>
        </div>
        <InfoTip
          label="Use offer tracking below to remove pipeline value from unqualified or lost offers without losing the full lead record."
          align="right"
        />
      </div>
      <div className="grid gap-4">
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Stage</span>
          <AdminSelect
            value={stage}
            onChange={(event) => setStage(event.target.value)}
            className="h-12"
          >
            {stageOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </AdminSelect>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Priority</span>
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
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Assigned owner</span>
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

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Next follow-up</span>
          <input
            type="datetime-local"
            value={nextFollowUpAt}
            onChange={(event) => setNextFollowUpAt(event.target.value)}
            className="admin-input ld-focus-ring h-12 w-full rounded-2xl px-4 text-sm outline-none"
          />
        </label>

        {assigneeOptions.length > 1 ? (
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
              Also share with
            </span>
            <div className="grid gap-2 rounded-[18px] border border-white/10 bg-white/[0.06] p-3">
              {assigneeOptions
                .filter((option) => option.value !== assignedTo)
                .map((option) => {
                  const checked = assignedToList.includes(option.value);
                  return (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 px-3 py-2 text-sm text-white/70"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAdditionalOwner(option.value)}
                        className="h-4 w-4 rounded border-white/15 text-white"
                      />
                      <span>{option.label}</span>
                    </label>
                  );
                })}
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-white/10/80 pt-4">
          <SmoothButton
            variant="primary"
            size="lg"
            onClick={() => void updateLead()}
            loading={isSaving}
            className="w-full"
          >
            Save changes
          </SmoothButton>
        </div>
      </div>
      {message ? <p className="mt-3 text-sm text-white/70">{message}</p> : null}
    </GlassSurface>
  );
}
