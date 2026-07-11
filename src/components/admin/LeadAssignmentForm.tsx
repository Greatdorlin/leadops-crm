"use client";

import { startTransition, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Gauge, Layers3, Search, UserRound } from "lucide-react";
import { CRM_STATUSES, LEAD_PRIORITIES } from "@/lib/crm/constants";
import { crmLabelize } from "@/lib/crm/formatters";
import type { LeadPriority } from "@/lib/crm/types";
import { cn } from "@/lib/cn";
import { GlassSurface } from "./ui/GlassSurface";
import { SmoothButton } from "./ui/SmoothButton";
import { GradientText } from "./ui/GradientText";
import type { LeadAssigneeOption } from "./LeadOwnerQuickAssign";

export interface LeadAssignmentOption {
  value: string;
  label: string;
  assignedTo: string | null;
  stage: string;
  priority: LeadPriority;
}

function matchText(value: string, query: string) {
  return value.toLowerCase().includes(query.trim().toLowerCase());
}

function getInitials(label: string) {
  const parts = label
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return "LD";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function LeadAssignmentForm({
  leadOptions,
  assigneeOptions,
}: {
  leadOptions: LeadAssignmentOption[];
  assigneeOptions: LeadAssigneeOption[];
}) {
  const router = useRouter();
  const [selectedLeadId, setSelectedLeadId] = useState(leadOptions[0]?.value ?? "");
  const [assignedTo, setAssignedTo] = useState(leadOptions[0]?.assignedTo ?? "");
  const [stage, setStage] = useState<string>(leadOptions[0]?.stage ?? "new");
  const [priority, setPriority] = useState<LeadPriority>(leadOptions[0]?.priority ?? "medium");
  const [leadQuery, setLeadQuery] = useState("");
  const [assigneeQuery, setAssigneeQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [routingByLead, setRoutingByLead] = useState(() =>
    Object.fromEntries(
      leadOptions.map((lead) => [
        lead.value,
        {
          assignedTo: lead.assignedTo,
          stage: lead.stage,
          priority: lead.priority,
        },
      ]),
    ) as Record<
      string,
      { assignedTo: string | null; stage: string; priority: LeadPriority }
    >,
  );

  const filteredLeadOptions = useMemo(() => {
    if (!leadQuery.trim()) {
      return leadOptions;
    }

    return leadOptions.filter((option) => matchText(option.label, leadQuery));
  }, [leadOptions, leadQuery]);

  const ownerChoices = useMemo(
    () =>
      [
        { value: "", label: "Unassigned" },
        ...assigneeOptions,
      ].filter((option) => matchText(option.label, assigneeQuery)),
    [assigneeOptions, assigneeQuery],
  );

  function handleLeadChange(nextLeadId: string) {
    setSelectedLeadId(nextLeadId);
    const selectedLead = routingByLead[nextLeadId];
    if (!selectedLead) {
      return;
    }

    setAssignedTo(selectedLead.assignedTo ?? "");
    setStage(selectedLead.stage);
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
      const response = await fetch(`/api/admin/leads/${selectedLeadId}/workflow`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stage,
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

      setMessage("Lead routing updated.");
      setRoutingByLead((current) => ({
        ...current,
        [selectedLeadId]: {
          assignedTo: assignedTo || null,
          stage,
          priority,
        },
      }));
      setIsSaving(false);
      startTransition(() => router.refresh());
    } catch {
      setMessage("We couldn't save this assignment right now.");
      setIsSaving(false);
    }
  }

  if (leadOptions.length === 0) {
    return (
      <p className="rounded-[24px] border border-dashed border-white/14 bg-white/[0.05] px-4 py-5 text-sm leading-6 text-white/70">
        No action-ready leads are waiting in this routing lane right now.
      </p>
    );
  }

  return (
    <GlassSurface intensity="medium" className="ld-animate-fade-in-up space-y-5 rounded-[24px] p-5">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-white/80">
          <GradientText>Route lead</GradientText>
        </h3>
      </div>
      <section className="space-y-3 rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Lead</p>
            <p className="mt-1 text-sm text-white/70">Search and pick the lead you want to route.</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.07] px-2.5 py-1 text-xs text-white/70">
            {filteredLeadOptions.length} visible
          </span>
        </div>

        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" />
          <input
            type="text"
            value={leadQuery}
            onChange={(event) => setLeadQuery(event.target.value)}
            placeholder="Search leads by name or company"
            className="admin-input ld-focus-ring h-11 w-full rounded-2xl pl-11 pr-4 text-sm outline-none"
          />
        </label>

        <div className="relative grid max-h-56 gap-3 overflow-y-auto pr-1">
          {filteredLeadOptions.map((option) => {
            const isActive = selectedLeadId === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleLeadChange(option.value)}
                className={cn(
                  "rounded-[22px] border px-4 py-3 text-left transition",
                  isActive
                    ? "border-white/16 bg-[linear-gradient(140deg,color-mix(in_srgb,var(--ld-color-primary)_20%,transparent),color-mix(in_srgb,var(--ld-color-accent)_14%,transparent))] text-white shadow-[0_18px_34px_rgba(0,0,0,0.18)]"
                    : "border-white/10 bg-white/[0.045] text-white/72 hover:border-white/16 hover:bg-white/[0.075]",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{option.label}</p>
                    <p className="mt-1 text-xs text-white/70">
                      {crmLabelize(option.stage)} • {crmLabelize(option.priority)}
                    </p>
                  </div>
                  {isActive ? (
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/12 bg-white/10 text-white/80">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3 rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Owner</p>
            <p className="mt-1 text-sm text-white/70">Search the team and assign with one tap.</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.07] px-2.5 py-1 text-xs text-white/70">
            {ownerChoices.length} matches
          </span>
        </div>

        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" />
          <input
            type="text"
            value={assigneeQuery}
            onChange={(event) => setAssigneeQuery(event.target.value)}
            placeholder="Search owners by name"
            className="admin-input ld-focus-ring h-11 w-full rounded-2xl pl-11 pr-4 text-sm outline-none"
          />
        </label>

        <div className="relative grid gap-3 sm:grid-cols-2">
          {ownerChoices.map((option) => {
            const isActive = assignedTo === option.value;
            return (
              <button
                key={option.value || "unassigned"}
                type="button"
                onClick={() => setAssignedTo(option.value)}
                className={cn(
                  "flex items-center gap-3 rounded-[22px] border px-4 py-3 text-left transition",
                  isActive
                    ? "border-violet-200/24 bg-[linear-gradient(145deg,rgba(91,124,250,0.22),rgba(139,92,246,0.16))] text-white shadow-[0_18px_34px_rgba(0,0,0,0.16)]"
                    : "border-white/10 bg-white/[0.045] text-white/72 hover:border-white/16 hover:bg-white/[0.075]",
                )}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/12 bg-[linear-gradient(145deg,color-mix(in_srgb,var(--ld-color-primary)_34%,transparent),color-mix(in_srgb,var(--ld-color-accent)_26%,transparent))] text-xs font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
                  {option.value ? getInitials(option.label) : <UserRound className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{option.label}</p>
                  <p className="mt-1 text-xs text-white/70">
                    {option.value ? "Team member" : "No owner selected"}
                  </p>
                </div>
                {isActive ? (
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/12 bg-white/10 text-violet-100">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3 rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center gap-2">
            <Layers3 className="h-4 w-4 text-white/80" />
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Stage</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {CRM_STATUSES.map((option) => {
              const isActive = stage === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setStage(option)}
                  className={cn(
                    "rounded-[18px] border px-4 py-3 text-left text-sm font-medium transition",
                    isActive
                      ? "border-[var(--ld-color-primary)]/24 bg-[var(--ld-color-primary)]/12 text-white"
                      : "border-white/10 bg-white/[0.04] text-white/70 hover:border-white/16 hover:bg-white/[0.075]",
                  )}
                >
                  {crmLabelize(option)}
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3 rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-violet-200/80" />
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Priority</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {LEAD_PRIORITIES.map((option) => {
              const isActive = priority === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setPriority(option)}
                  className={cn(
                    "rounded-[18px] border px-4 py-3 text-left text-sm font-medium transition",
                    isActive
                      ? "border-violet-200/24 bg-violet-300/12 text-white"
                      : "border-white/10 bg-white/[0.04] text-white/70 hover:border-white/16 hover:bg-white/[0.075]",
                  )}
                >
                  {crmLabelize(option)}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-end sm:justify-between">
        <p className="max-w-[20rem] text-sm leading-6 text-white/70">
          Fast routing only. Full profile editing still happens inside the lead record when needed.
        </p>
        <SmoothButton
          variant="primary"
          size="md"
          onClick={() => void saveAssignment()}
          loading={isSaving}
        >
          Save routing
        </SmoothButton>
      </div>
      {message ? <p className="text-sm text-white/70">{message}</p> : null}
    </GlassSurface>
  );
}
