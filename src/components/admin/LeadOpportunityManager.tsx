"use client";

import { startTransition, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { crmLabelize } from "@/lib/crm/formatters";
import {
  buildLeadOpportunityRollup,
  LEAD_OPPORTUNITY_STATUSES,
} from "@/lib/crm/lead-opportunities";
import type { LeadOpportunityRecord, LeadOpportunityStatus } from "@/lib/crm/types";
import { AdminSelect } from "./AdminSelect";

type OpportunityDraft = {
  id?: string;
  localId: string;
  offerLabel: string;
  status: LeadOpportunityStatus;
  estimatedValue: string;
  closeProbability: string;
  expectedCloseDate: string;
  reason: string;
  notes: string;
  isPrimary: boolean;
};

function toDateTimeLocalValue(value?: string | null) {
  return value ? value.slice(0, 16) : "";
}

function createDraft(input?: LeadOpportunityRecord): OpportunityDraft {
  return {
    id: input?.id,
    localId: input?.id || crypto.randomUUID(),
    offerLabel: input?.offerLabel ?? "",
    status: input?.status ?? "active",
    estimatedValue: input?.estimatedValue == null ? "" : String(input.estimatedValue),
    closeProbability: input?.closeProbability == null ? "" : String(input.closeProbability),
    expectedCloseDate: toDateTimeLocalValue(input?.expectedCloseDate),
    reason: input?.reason ?? "",
    notes: input?.notes ?? "",
    isPrimary: input?.isPrimary ?? false,
  };
}

function formatMoney(value?: number | null) {
  if (value == null) {
    return "NGN 0";
  }

  return `NGN ${value.toLocaleString()}`;
}

function inputClassName() {
  return "admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none";
}

export function LeadOpportunityManager({
  leadId,
  initialOpportunities,
}: {
  leadId: string;
  initialOpportunities: LeadOpportunityRecord[];
}) {
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<OpportunityDraft[]>(
    initialOpportunities.length > 0 ? initialOpportunities.map((item) => createDraft(item)) : [createDraft()],
  );
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const rollup = useMemo(
    () =>
      buildLeadOpportunityRollup(
        opportunities.map((item) => ({
          status: item.status,
          estimatedValue: item.estimatedValue ? Number(item.estimatedValue) : null,
          expectedValue: null,
          closeProbability: item.closeProbability ? Number(item.closeProbability) : null,
          expectedCloseDate: item.expectedCloseDate || null,
          reason: item.reason || null,
        })),
      ),
    [opportunities],
  );

  function updateOpportunity(localId: string, patch: Partial<OpportunityDraft>) {
    setOpportunities((current) =>
      current.map((item) => (item.localId === localId ? { ...item, ...patch } : item)),
    );
  }

  function removeOpportunity(localId: string) {
    setOpportunities((current) => {
      const next = current.filter((item) => item.localId !== localId);
      if (next.length === 0) {
        return [createDraft()];
      }

      if (!next.some((item) => item.isPrimary)) {
        next[0] = { ...next[0], isPrimary: true };
      }

      return next;
    });
  }

  function addOpportunity() {
    setOpportunities((current) => [
      ...current,
      {
        ...createDraft(),
        isPrimary: current.length === 0,
      },
    ]);
  }

  async function saveOpportunities() {
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/leads/${leadId}/opportunities`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunities: opportunities
            .map((item) => ({
              ...(item.id ? { id: item.id } : {}),
              offerLabel: item.offerLabel.trim(),
              status: item.status,
              estimatedValue: item.estimatedValue ? Number(item.estimatedValue) : null,
              closeProbability: item.closeProbability ? Number(item.closeProbability) : null,
              expectedCloseDate: item.expectedCloseDate || null,
              reason: item.reason.trim() || null,
              notes: item.notes.trim() || null,
              isPrimary: item.isPrimary,
            }))
            .filter((item) => item.offerLabel.length > 0),
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessage(payload?.error ?? "We couldn't save these offer opportunities.");
        setIsSaving(false);
        return;
      }

      setMessage("Offer opportunities saved.");
      setIsSaving(false);
      startTransition(() => router.refresh());
    } catch {
      setMessage("We couldn't save these offer opportunities.");
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        {[
          ["Pipeline value", formatMoney(rollup.expectedValue ?? rollup.estimatedValue)],
          ["Open offers", String(rollup.activeCount)],
          ["Qualified", String(rollup.qualifiedCount)],
          ["Removed", String(rollup.inactiveCount)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-[22px] border border-white/10 bg-white/[0.045] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/44">
              {label}
            </p>
            <p className="mt-2 text-lg font-semibold tracking-[-0.04em] text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-[22px] border border-cyan-200/16 bg-cyan-300/8 px-4 py-3 text-sm leading-6 text-white/68">
        Active, qualified, and on-hold offers stay in pipeline. Lost and unqualified offers keep history
        but stop inflating pipeline value.
      </div>

      <div className="space-y-3">
        {opportunities.map((opportunity, index) => {
          const expectedValue =
            opportunity.estimatedValue && opportunity.closeProbability
              ? (Number(opportunity.estimatedValue) * Number(opportunity.closeProbability)) / 100
              : opportunity.estimatedValue
                ? Number(opportunity.estimatedValue)
                : 0;

          const requiresReason =
            opportunity.status === "unqualified" || opportunity.status === "lost";

          return (
            <div
              key={opportunity.localId}
              className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/42">
                    Offer {index + 1}
                  </p>
                  <p className="mt-1 text-base font-semibold text-white">
                    {opportunity.offerLabel.trim() || "Untitled offer"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setOpportunities((current) =>
                        current.map((item) => ({
                          ...item,
                          isPrimary: item.localId === opportunity.localId,
                        })),
                      )
                    }
                    className={[
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                      opportunity.isPrimary
                        ? "border-cyan-200/28 bg-cyan-300/14 text-cyan-100"
                        : "border-white/10 bg-white/[0.05] text-white/58 hover:bg-white/[0.08]",
                    ].join(" ")}
                  >
                    {opportunity.isPrimary ? "Primary offer" : "Make primary"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeOpportunity(opportunity.localId)}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-rose-300/22 bg-rose-400/10 px-3 text-xs font-semibold text-rose-100 transition hover:bg-rose-400/16"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <label className="space-y-2 md:col-span-2 xl:col-span-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
                    Offer name
                  </span>
                  <input
                    value={opportunity.offerLabel}
                    onChange={(event) =>
                      updateOpportunity(opportunity.localId, { offerLabel: event.target.value })
                    }
                    placeholder="Premium consultation package"
                    className={inputClassName()}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
                    Status
                  </span>
                  <AdminSelect
                    value={opportunity.status}
                    onChange={(event) =>
                      updateOpportunity(opportunity.localId, {
                        status: event.target.value as LeadOpportunityStatus,
                      })
                    }
                    className="h-11"
                  >
                    {LEAD_OPPORTUNITY_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {crmLabelize(status)}
                      </option>
                    ))}
                  </AdminSelect>
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
                    Potential value
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={opportunity.estimatedValue}
                    onChange={(event) =>
                      updateOpportunity(opportunity.localId, { estimatedValue: event.target.value })
                    }
                    placeholder="450000"
                    className={inputClassName()}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
                    Close probability
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={opportunity.closeProbability}
                    onChange={(event) =>
                      updateOpportunity(opportunity.localId, {
                        closeProbability: event.target.value,
                      })
                    }
                    placeholder="60"
                    className={inputClassName()}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
                    Expected close
                  </span>
                  <input
                    type="datetime-local"
                    value={opportunity.expectedCloseDate}
                    onChange={(event) =>
                      updateOpportunity(opportunity.localId, {
                        expectedCloseDate: event.target.value,
                      })
                    }
                    className={inputClassName()}
                  />
                </label>
                <div className="rounded-[20px] border border-white/10 bg-black/10 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/42">
                    Expected value
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">{formatMoney(expectedValue)}</p>
                </div>
                <label className="space-y-2 md:col-span-2 xl:col-span-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
                    {requiresReason ? "Why it dropped out" : "Reason or qualification note"}
                  </span>
                  <input
                    value={opportunity.reason}
                    onChange={(event) =>
                      updateOpportunity(opportunity.localId, { reason: event.target.value })
                    }
                    placeholder={
                      requiresReason
                        ? "Budget is too low for this offer."
                        : "Qualified for the implementation package after discovery."
                    }
                    className={inputClassName()}
                  />
                </label>
                <label className="space-y-2 md:col-span-2 xl:col-span-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
                    Internal notes
                  </span>
                  <textarea
                    value={opportunity.notes}
                    onChange={(event) =>
                      updateOpportunity(opportunity.localId, { notes: event.target.value })
                    }
                    rows={3}
                    placeholder="Capture what makes this offer viable, blocked, or worth revisiting."
                    className="admin-textarea min-h-[104px] w-full rounded-2xl px-4 py-3 text-sm outline-none"
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={addOpportunity}
          className="admin-button-secondary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add another offer
        </button>
        <button
          type="button"
          disabled={isSaving}
          onClick={() => void saveOpportunities()}
          className="admin-button-primary h-11 rounded-2xl px-5 text-sm"
        >
          {isSaving ? "Saving..." : "Save offer tracking"}
        </button>
      </div>

      {message ? <p className="text-sm text-white/68">{message}</p> : null}
    </div>
  );
}
