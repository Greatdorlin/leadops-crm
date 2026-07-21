"use client";

import { startTransition, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Plus, RotateCcw, Trash2 } from "lucide-react";
import { crmLabelize } from "@/lib/crm/formatters";
import {
  buildLeadOpportunityRollup,
  LEAD_OPPORTUNITY_STATUSES,
} from "@/lib/crm/lead-opportunity-contract";
import type { LeadOpportunityRecord, LeadOpportunityStatus } from "@/lib/crm/types";
import { AdminSelect } from "./AdminSelect";
import { AdminDateTimeInput } from "./AdminDateTimeInput";
import { InfoTip } from "./ui/InfoTip";
import { CurrencySelect } from "./CurrencySelect";
import { useAdminWorkspaceSettings } from "./AdminWorkspaceSettingsProvider";
import {
  resolveQuickScheduleDate,
  type QuickSchedulePreset,
} from "@/lib/crm/schedule-presets";

type OpportunityDraft = {
  id?: string;
  localId: string;
  offerLabel: string;
  status: LeadOpportunityStatus;
  estimatedValue: string;
  currency: string;
  exchangeRateToGlobal: string;
  closeProbability: string;
  expectedCloseDate: string;
  reason: string;
  notes: string;
  isPrimary: boolean;
};

function toDateTimeLocalValue(value?: string | null) {
  return value ? value.slice(0, 16) : "";
}

function createDraft(input?: LeadOpportunityRecord, defaultCurrency = "USD"): OpportunityDraft {
  return {
    id: input?.id,
    localId: input?.id || crypto.randomUUID(),
    offerLabel: input?.offerLabel ?? "",
    status: input?.status ?? "active",
    estimatedValue: input?.estimatedValue == null ? "" : String(input.estimatedValue),
    currency: input?.currency ?? defaultCurrency,
    exchangeRateToGlobal:
      input?.exchangeRateToGlobal == null ? "" : String(input.exchangeRateToGlobal),
    closeProbability: input?.closeProbability == null ? "" : String(input.closeProbability),
    expectedCloseDate: toDateTimeLocalValue(input?.expectedCloseDate),
    reason: input?.reason ?? "",
    notes: input?.notes ?? "",
    isPrimary: input?.isPrimary ?? false,
  };
}

function formatMoney(value: number | null | undefined, currency: string) {
  if (value == null) {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(0);
  }

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function inputClassName() {
  return "admin-input h-11 w-full min-w-0 max-w-full rounded-2xl px-4 text-sm outline-none";
}

function isPipelineStatus(status: LeadOpportunityStatus) {
  return status === "active" || status === "qualified" || status === "on_hold";
}

export function LeadOpportunityManager({
  leadId,
  initialOpportunities,
  defaultCurrency,
}: {
  leadId: string;
  initialOpportunities: LeadOpportunityRecord[];
  defaultCurrency?: string;
}) {
  const router = useRouter();
  const workspaceSettings = useAdminWorkspaceSettings();
  const currency = workspaceSettings.globalCurrency;
  const offerDefaultCurrency = defaultCurrency || currency;
  const [opportunities, setOpportunities] = useState<OpportunityDraft[]>(
    initialOpportunities.length > 0
      ? initialOpportunities.map((item) => createDraft(item, offerDefaultCurrency))
      : [createDraft(undefined, offerDefaultCurrency)],
  );
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [createCallTasks, setCreateCallTasks] = useState(true);
  const [callDuePreset, setCallDuePreset] = useState<QuickSchedulePreset>("tomorrow");
  const [collapsedOffers, setCollapsedOffers] = useState<Set<string>>(new Set());

  const rollup = useMemo(
    () =>
      buildLeadOpportunityRollup(
        opportunities.map((item) => {
          const parsedRate = item.currency === currency ? 1 : Number(item.exchangeRateToGlobal);
          const reportingRate = Number.isFinite(parsedRate) && parsedRate > 0 ? parsedRate : 0;
          return {
            status: item.status,
            estimatedValue: item.estimatedValue
              ? Number(item.estimatedValue) * reportingRate
              : null,
            expectedValue: null,
            closeProbability: item.closeProbability ? Number(item.closeProbability) : null,
            expectedCloseDate: item.expectedCloseDate || null,
            reason: item.reason || null,
          };
        }),
      ),
    [currency, opportunities],
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
        return [createDraft(undefined, offerDefaultCurrency)];
      }

      if (!next.some((item) => item.isPrimary)) {
        next[0] = { ...next[0], isPrimary: true };
      }

      return next;
    });
    setMessage("Offer removed. Save offer tracking to apply this change.");
  }

  function addOpportunity() {
    setOpportunities((current) => [
      ...current,
      {
        ...createDraft(undefined, offerDefaultCurrency),
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
              currency: item.currency,
              exchangeRateToGlobal: item.exchangeRateToGlobal
                ? Number(item.exchangeRateToGlobal)
                : item.currency === currency
                  ? 1
                  : null,
              closeProbability: item.closeProbability ? Number(item.closeProbability) : null,
              expectedCloseDate: item.expectedCloseDate || null,
              reason: item.reason.trim() || null,
              notes: item.notes.trim() || null,
              isPrimary: item.isPrimary,
            }))
            .filter((item) => item.offerLabel.length > 0),
          createCallTasksForNewlyQualified: createCallTasks,
          callTaskDueAt: createCallTasks
            ? resolveQuickScheduleDate(callDuePreset).toISOString()
            : null,
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        createdCallTaskCount?: number;
      } | null;
      if (!response.ok) {
        setMessage(payload?.error ?? "We couldn't save these offer opportunities.");
        setIsSaving(false);
        return;
      }

      setMessage(
        payload?.createdCallTaskCount
          ? `Offer tracking saved. ${payload.createdCallTaskCount} call task${payload.createdCallTaskCount === 1 ? "" : "s"} created.`
          : "Offer opportunities saved.",
      );
      setIsSaving(false);
      startTransition(() => router.refresh());
    } catch {
      setMessage("We couldn't save these offer opportunities.");
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4">
        {[
          ["Pipeline value", formatMoney(rollup.expectedValue ?? rollup.estimatedValue, currency)],
          ["Open offers", String(rollup.activeCount)],
          ["Qualified", String(rollup.qualifiedCount)],
          ["Removed", String(rollup.inactiveCount)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="border-b border-white/10 px-1 py-3"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
              {label}
            </p>
            <p className="mt-2 text-lg font-semibold tracking-[-0.04em] text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-[22px] border border-white/10 bg-white/[0.045] p-4">
        <label className="flex items-center justify-between gap-4">
          <span>
            <span className="block text-sm font-semibold text-white">Create calls for newly qualified offers</span>
            <span className="mt-1 block text-xs text-white/60">One owner task per offer, created once.</span>
          </span>
          <input
            type="checkbox"
            checked={createCallTasks}
            onChange={(event) => setCreateCallTasks(event.target.checked)}
            className="admin-toggle shrink-0"
          />
        </label>
        {createCallTasks ? (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">
            {([
              ["later_today", "Today"],
              ["tomorrow", "Tomorrow"],
              ["in_3_days", "In 3 days"],
              ["next_week", "Next week"],
            ] as Array<[QuickSchedulePreset, string]>).map(([preset, label]) => (
              <button
                key={preset}
                type="button"
                onClick={() => setCallDuePreset(preset)}
                className={[
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                  callDuePreset === preset
                    ? "border-white/22 bg-white/[0.12] text-white"
                    : "border-white/10 bg-white/[0.045] text-white/64 hover:text-white",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
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
          const countsTowardPipeline = isPipelineStatus(opportunity.status);
          const hasValue = opportunity.estimatedValue.trim().length > 0;
          const isCollapsed = collapsedOffers.has(opportunity.localId);

          return (
            <div
              key={opportunity.localId}
              className="min-w-0 rounded-[24px] border border-white/10 bg-white/[0.045] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-4"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                    Offer {index + 1}
                  </p>
                  <p className="mt-1 text-base font-semibold text-white">
                    {opportunity.offerLabel.trim() || "Untitled offer"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    aria-expanded={!isCollapsed}
                    onClick={() => setCollapsedOffers((current) => {
                      const next = new Set(current);
                      if (next.has(opportunity.localId)) next.delete(opportunity.localId);
                      else next.add(opportunity.localId);
                      return next;
                    })}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 text-xs font-semibold text-white/72 transition hover:bg-white/[0.09] hover:text-white"
                  >
                    {isCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                    {isCollapsed ? "Expand" : "Collapse"}
                  </button>
                  <span
                    className={[
                      "inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                      countsTowardPipeline
                        ? "border-cyan-300/22 bg-cyan-400/10 text-cyan-100"
                        : "border-rose-300/22 bg-rose-400/10 text-rose-100",
                    ].join(" ")}
                  >
                    {countsTowardPipeline ? "Counts in pipeline" : "Removed from pipeline"}
                  </span>
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
                        ? "border-[var(--ld-color-primary)]/28 bg-[var(--ld-color-primary)]/14 text-white"
                        : "border-white/10 bg-white/[0.05] text-white/70 hover:bg-white/[0.08]",
                    ].join(" ")}
                  >
                    {opportunity.isPrimary ? "Primary offer" : "Make primary"}
                  </button>
                  {opportunity.id ? (
                    <button
                      type="button"
                      onClick={() => removeOpportunity(opportunity.localId)}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-rose-300/22 bg-rose-400/10 px-3 text-xs font-semibold text-rose-100 transition hover:bg-rose-400/16"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  ) : null}
                </div>
              </div>

              {!isCollapsed ? <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
                <label className="min-w-0 space-y-2 md:col-span-2 xl:col-span-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
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
                <label className="min-w-0 space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
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
                <label className="min-w-0 space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                    Potential value
                  </span>
                  <div className="space-y-2">
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
                    {!countsTowardPipeline ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-white/55">
                          This offer no longer counts toward live pipeline.
                        </span>
                        {hasValue ? (
                          <button
                            type="button"
                            onClick={() =>
                              updateOpportunity(opportunity.localId, {
                                estimatedValue: "",
                                closeProbability: "",
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold text-white/70 transition hover:bg-white/[0.08] hover:text-white"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Clear potential value
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </label>
                <div className="space-y-2">
                  <CurrencySelect
                    value={opportunity.currency}
                    onChange={(value) =>
                      updateOpportunity(opportunity.localId, {
                        currency: value,
                        exchangeRateToGlobal: value === currency ? "1" : "",
                      })
                    }
                    label="Offer currency"
                  />
                </div>
                {opportunity.currency !== currency ? (
                  <label className="space-y-2">
                    <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                      Rate to {currency}
                      <InfoTip label={`How many ${currency} one ${opportunity.currency} is worth. This snapshot keeps reports stable when rates change.`} />
                    </span>
                    <input
                      type="number"
                      min="0.00000001"
                      step="any"
                      required
                      value={opportunity.exchangeRateToGlobal}
                      onChange={(event) =>
                        updateOpportunity(opportunity.localId, {
                          exchangeRateToGlobal: event.target.value,
                        })
                      }
                      placeholder={`1 ${opportunity.currency} in ${currency}`}
                      className={inputClassName()}
                    />
                  </label>
                ) : null}
                <label className="min-w-0 space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
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
                <label className="min-w-0 space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                    Expected close
                  </span>
                  <AdminDateTimeInput
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
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                    Expected value
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">{formatMoney(expectedValue, opportunity.currency)}</p>
                </div>
                <label className="space-y-2 md:col-span-2 xl:col-span-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                    {opportunity.status === "lost"
                      ? "Reason for loss"
                      : opportunity.status === "unqualified"
                        ? "Reason not qualified"
                        : "Qualification reason"}
                    {requiresReason ? " *" : ""}
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
                    required={requiresReason}
                    aria-required={requiresReason}
                    className="h-11 rounded-2xl"
                  />
                </label>
                <label className="space-y-2 md:col-span-2 xl:col-span-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
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
              </div> : null}

            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={addOpportunity}
          className="admin-button-secondary inline-flex h-11 w-full items-center justify-center rounded-2xl px-5 text-sm font-semibold sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add another offer
        </button>
        <button
          type="button"
          disabled={isSaving}
          onClick={() => void saveOpportunities()}
          className="admin-button-primary h-11 w-full rounded-2xl px-5 text-sm sm:w-auto"
        >
          {isSaving ? "Saving..." : "Save offer tracking"}
        </button>
      </div>

      {message ? <p className="text-sm text-white/70">{message}</p> : null}
    </div>
  );
}
