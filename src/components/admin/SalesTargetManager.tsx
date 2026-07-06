"use client";

import { startTransition, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import type {
  AdminSalesTargetRecord,
  SalesTargetReferenceData,
} from "@/lib/crm/sales-targets-admin";
import { crmLabelize } from "@/lib/crm/formatters";
import { SALES_TARGET_PERIODS, SALES_TARGET_SCOPES } from "@/lib/crm/domain";
import { AdminSelect } from "./AdminSelect";
import { CurrencySelect } from "./CurrencySelect";

type TargetDraft = {
  name: string;
  scope: (typeof SALES_TARGET_SCOPES)[number];
  scopeId: string;
  period: (typeof SALES_TARGET_PERIODS)[number];
  targetValue: string;
  currency: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

function formatDateValue(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function getCurrentMonthDraftDates() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function createEmptyTargetDraft(): TargetDraft {
  const dates = getCurrentMonthDraftDates();
  return {
    name: "Monthly sales target",
    scope: "global",
    scopeId: "",
    period: "monthly",
    targetValue: "",
    currency: "USD",
    startDate: dates.startDate,
    endDate: dates.endDate,
    isActive: true,
  };
}

function buildTargetDraft(target: AdminSalesTargetRecord): TargetDraft {
  return {
    name: target.name,
    scope: target.scope,
    scopeId: target.scopeId ?? "",
    period: target.period,
    targetValue: String(target.targetValue),
    currency: target.currency,
    startDate: formatDateValue(target.startDate),
    endDate: formatDateValue(target.endDate),
    isActive: target.isActive,
  };
}

function buildPayload(draft: TargetDraft) {
  return {
    name: draft.name,
    scope: draft.scope,
    scopeId: draft.scope === "global" ? null : draft.scopeId || null,
    period: draft.period,
    targetValue: Number(draft.targetValue || 0),
    currency: draft.currency || "USD",
    startDate: draft.startDate,
    endDate: draft.endDate,
    isActive: draft.isActive,
  };
}

function getScopeOptions(
  scope: TargetDraft["scope"],
  referenceData: SalesTargetReferenceData,
) {
  switch (scope) {
    case "team":
      return referenceData.teams.map((team) => ({ value: team.id, label: team.name }));
    case "branch":
      return referenceData.branches.map((branch) => ({ value: branch.id, label: branch.name }));
    case "department":
      return referenceData.departments.map((department) => ({ value: department.id, label: department.name }));
    case "user":
      return referenceData.users.map((user) => ({ value: user.id, label: user.label }));
    case "global":
    default:
      return [];
  }
}

function TargetEditor({
  panelId,
  title,
  draft,
  onChange,
  onSave,
  isSaving,
  message,
  saveLabel,
  referenceData,
  extraAction,
}: {
  panelId?: string;
  title: string;
  draft: TargetDraft;
  onChange: (next: TargetDraft) => void;
  onSave: () => void;
  isSaving: boolean;
  message: string;
  saveLabel: string;
  referenceData: SalesTargetReferenceData;
  extraAction?: React.ReactNode;
}) {
  const scopeOptions = getScopeOptions(draft.scope, referenceData);

  return (
    <div id={panelId} className="admin-surface space-y-4 rounded-[24px] p-5 scroll-mt-28">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-base font-semibold text-white">{title}</p>
        {extraAction}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-2 sm:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/52">Target name</span>
          <input
            type="text"
            value={draft.name}
            onChange={(event) => onChange({ ...draft, name: event.target.value })}
            placeholder="Monthly sales target"
            className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/52">Scope</span>
          <AdminSelect
            value={draft.scope}
            onChange={(event) =>
              onChange({
                ...draft,
                scope: event.target.value as TargetDraft["scope"],
                scopeId: "",
              })
            }
            className="h-11"
          >
            {SALES_TARGET_SCOPES.map((scope) => (
              <option key={scope} value={scope}>
                {crmLabelize(scope)}
              </option>
            ))}
          </AdminSelect>
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/52">Period</span>
          <AdminSelect
            value={draft.period}
            onChange={(event) => onChange({ ...draft, period: event.target.value as TargetDraft["period"] })}
            className="h-11"
          >
            {SALES_TARGET_PERIODS.map((period) => (
              <option key={period} value={period}>
                {crmLabelize(period)}
              </option>
            ))}
          </AdminSelect>
        </label>
        {draft.scope !== "global" ? (
          <label className="space-y-2 sm:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/52">Scope target</span>
            <AdminSelect
              value={draft.scopeId}
              onChange={(event) => onChange({ ...draft, scopeId: event.target.value })}
              className="h-11"
            >
              <option value="">Choose scope target</option>
              {scopeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </AdminSelect>
          </label>
        ) : null}
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/52">Target value</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={draft.targetValue}
            onChange={(event) => onChange({ ...draft, targetValue: event.target.value })}
            placeholder="500000"
            className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
          />
        </label>
        <CurrencySelect value={draft.currency} onChange={(value) => onChange({ ...draft, currency: value })} label="Currency" />
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/52">Start date</span>
          <input
            type="date"
            value={draft.startDate}
            onChange={(event) => onChange({ ...draft, startDate: event.target.value })}
            className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/52">End date</span>
          <input
            type="date"
            value={draft.endDate}
            onChange={(event) => onChange({ ...draft, endDate: event.target.value })}
            className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
          />
        </label>
        <label className="inline-flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-semibold text-white/72 sm:col-span-2">
          <span>Active target</span>
          <input
            type="checkbox"
            checked={draft.isActive}
            onChange={(event) => onChange({ ...draft, isActive: event.target.checked })}
            className="admin-toggle"
          />
        </label>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          disabled={isSaving}
          onClick={onSave}
          className="admin-button-primary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold"
        >
          {isSaving ? "Saving..." : saveLabel}
        </button>
        {message ? <p className="text-sm font-medium text-white/64">{message}</p> : null}
      </div>
    </div>
  );
}

export function SalesTargetManager({
  initialTargets,
  referenceData,
}: {
  initialTargets: AdminSalesTargetRecord[];
  referenceData: SalesTargetReferenceData;
}) {
  const router = useRouter();
  const [newDraft, setNewDraft] = useState<TargetDraft>(createEmptyTargetDraft());
  const [newMessage, setNewMessage] = useState("");
  const [newSaving, setNewSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, TargetDraft>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [savingById, setSavingById] = useState<Record<string, boolean>>({});

  const activeTargets = useMemo(
    () => initialTargets.filter((target) => !target.archived),
    [initialTargets],
  );
  const archivedTargets = useMemo(
    () => initialTargets.filter((target) => target.archived),
    [initialTargets],
  );

  async function createTarget() {
    setNewSaving(true);
    setNewMessage("");
    try {
      const response = await fetch("/api/admin/sales-targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(newDraft)),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setNewMessage(payload?.error ?? "We couldn't save this sales target right now.");
        setNewSaving(false);
        return;
      }

      setNewDraft(createEmptyTargetDraft());
      setNewMessage("Sales target saved.");
      setNewSaving(false);
      startTransition(() => router.refresh());
    } catch {
      setNewMessage("We couldn't save this sales target right now.");
      setNewSaving(false);
    }
  }

  async function updateTarget(targetId: string) {
    const draft = drafts[targetId];
    if (!draft) {
      return;
    }

    setSavingById((current) => ({ ...current, [targetId]: true }));
    setMessages((current) => ({ ...current, [targetId]: "" }));

    try {
      const response = await fetch(`/api/admin/sales-targets/${targetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(draft)),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessages((current) => ({
          ...current,
          [targetId]: payload?.error ?? "We couldn't update this sales target right now.",
        }));
        setSavingById((current) => ({ ...current, [targetId]: false }));
        return;
      }

      setMessages((current) => ({ ...current, [targetId]: "Sales target updated." }));
      setSavingById((current) => ({ ...current, [targetId]: false }));
      startTransition(() => router.refresh());
    } catch {
      setMessages((current) => ({
        ...current,
        [targetId]: "We couldn't update this sales target right now.",
      }));
      setSavingById((current) => ({ ...current, [targetId]: false }));
    }
  }

  async function toggleArchive(targetId: string, action: "archive" | "restore") {
    setSavingById((current) => ({ ...current, [targetId]: true }));
    setMessages((current) => ({ ...current, [targetId]: "" }));

    try {
      const response = await fetch(`/api/admin/sales-targets/${targetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessages((current) => ({
          ...current,
          [targetId]: payload?.error ?? "We couldn't update this sales target right now.",
        }));
        setSavingById((current) => ({ ...current, [targetId]: false }));
        return;
      }

      setSavingById((current) => ({ ...current, [targetId]: false }));
      startTransition(() => router.refresh());
    } catch {
      setMessages((current) => ({
        ...current,
        [targetId]: "We couldn't update this sales target right now.",
      }));
      setSavingById((current) => ({ ...current, [targetId]: false }));
    }
  }

  return (
    <div className="space-y-6">
      <TargetEditor
        panelId="create-target"
        title="Add Sales Target"
        draft={newDraft}
        onChange={setNewDraft}
        onSave={() => void createTarget()}
        isSaving={newSaving}
        message={newMessage}
        saveLabel="Save target"
        referenceData={referenceData}
      />

      <div className="space-y-4">
        {activeTargets.map((target) => {
          const isEditing = editingId === target.id;
          const draft = drafts[target.id] ?? buildTargetDraft(target);
          return (
            <div key={target.id} className="admin-surface-soft rounded-[24px] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-white">{target.name}</p>
                  <p className="mt-1 text-sm text-white/54">
                    {crmLabelize(target.scope)} • {crmLabelize(target.period)} • {target.currency} {target.targetValue.toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {target.isActive ? (
                    <span className="rounded-full border border-emerald-300/24 bg-emerald-300/12 px-3 py-1 text-xs font-semibold text-emerald-100">
                      Active
                    </span>
                  ) : (
                    <span className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-xs font-semibold text-white/60">
                      Paused
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(isEditing ? null : target.id);
                      setDrafts((current) => ({ ...current, [target.id]: buildTargetDraft(target) }));
                    }}
                    className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-medium"
                  >
                    {isEditing ? "Close" : "Edit"}
                  </button>
                  <button
                    type="button"
                    disabled={savingById[target.id]}
                    onClick={() => void toggleArchive(target.id, "archive")}
                    className="inline-flex h-10 items-center justify-center rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/16 disabled:opacity-60"
                  >
                    Archive
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/54">
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                  {target.startDate.slice(0, 10)} to {target.endDate.slice(0, 10)}
                </span>
              </div>

              {isEditing ? (
                <div className="mt-4">
                  <TargetEditor
                    title="Edit Sales Target"
                    draft={draft}
                    onChange={(next) => setDrafts((current) => ({ ...current, [target.id]: next }))}
                    onSave={() => void updateTarget(target.id)}
                    isSaving={Boolean(savingById[target.id])}
                    message={messages[target.id] ?? ""}
                    saveLabel="Save changes"
                    referenceData={referenceData}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-base font-semibold text-white">Archived targets</p>
          <p className="mt-1 text-sm text-white/52">Restore archived targets when you want them tracking again.</p>
        </div>
        {archivedTargets.length > 0 ? (
          archivedTargets.map((target) => (
            <div key={target.id} className="admin-surface-soft rounded-[24px] p-5 opacity-85">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-white">{target.name}</p>
                  <p className="mt-1 text-sm text-white/52">
                    {crmLabelize(target.scope)} • {target.currency} {target.targetValue.toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={savingById[target.id]}
                  onClick={() => void toggleArchive(target.id, "restore")}
                  className="inline-flex h-10 items-center justify-center rounded-2xl border border-emerald-300/24 bg-emerald-300/12 px-4 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/18 disabled:opacity-60"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restore
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[24px] border border-white/10 bg-white/[0.045] px-4 py-4 text-sm text-white/52">
            No archived targets yet.
          </div>
        )}
      </div>
    </div>
  );
}
