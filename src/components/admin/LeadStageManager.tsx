"use client";

import { startTransition, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import type { AdminLeadStageRecord } from "@/lib/crm/lead-stages-admin";

type StageDraft = {
  name: string;
  key: string;
  color: string;
  sortOrder: number;
  isWon: boolean;
  isLost: boolean;
};

function createEmptyStageDraft(): StageDraft {
  return {
    name: "",
    key: "",
    color: "#2563eb",
    sortOrder: 0,
    isWon: false,
    isLost: false,
  };
}

function buildStageDraft(stage: AdminLeadStageRecord): StageDraft {
  return {
    name: stage.name,
    key: stage.key,
    color: stage.color ?? "",
    sortOrder: stage.sortOrder,
    isWon: stage.isWon,
    isLost: stage.isLost,
  };
}

function buildPayload(draft: StageDraft) {
  return {
    name: draft.name,
    key: draft.key || null,
    color: draft.color || null,
    sortOrder: draft.sortOrder,
    isWon: draft.isWon,
    isLost: draft.isLost,
  };
}

function StageEditor({
  title,
  draft,
  onChange,
  onSave,
  isSaving,
  message,
  saveLabel,
  extraAction,
}: {
  title: string;
  draft: StageDraft;
  onChange: (next: StageDraft) => void;
  onSave: () => void;
  isSaving: boolean;
  message: string;
  saveLabel: string;
  extraAction?: React.ReactNode;
}) {
  return (
    <div className="space-y-4 rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,255,0.94)_100%)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-base font-semibold text-slate-950">{title}</p>
        {extraAction}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Stage Name</span>
          <input
            type="text"
            value={draft.name}
            onChange={(event) => onChange({ ...draft, name: event.target.value })}
            placeholder="Qualified"
            className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Stage Key</span>
          <input
            type="text"
            value={draft.key}
            onChange={(event) => onChange({ ...draft, key: event.target.value })}
            placeholder="qualified"
            className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Color</span>
          <input
            type="text"
            value={draft.color}
            onChange={(event) => onChange({ ...draft, color: event.target.value })}
            placeholder="#2563eb"
            className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Order</span>
          <input
            type="number"
            value={draft.sortOrder}
            onChange={(event) => onChange({ ...draft, sortOrder: Number(event.target.value || 0) })}
            className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={draft.isWon}
            onChange={(event) =>
              onChange({
                ...draft,
                isWon: event.target.checked,
                isLost: event.target.checked ? false : draft.isLost,
              })
            }
            className="h-4 w-4 rounded border-slate-300"
          />
          Mark as won
        </label>
        <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={draft.isLost}
            onChange={(event) =>
              onChange({
                ...draft,
                isLost: event.target.checked,
                isWon: event.target.checked ? false : draft.isWon,
              })
            }
            className="h-4 w-4 rounded border-slate-300"
          />
          Mark as lost
        </label>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200/80 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          disabled={isSaving}
          onClick={onSave}
          className="admin-button-primary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold"
        >
          {isSaving ? "Saving..." : saveLabel}
        </button>
        {message ? <p className="text-sm text-slate-600">{message}</p> : null}
      </div>
    </div>
  );
}

export function LeadStageManager({
  initialStages,
}: {
  initialStages: AdminLeadStageRecord[];
}) {
  const router = useRouter();
  const [newDraft, setNewDraft] = useState<StageDraft>(createEmptyStageDraft());
  const [newMessage, setNewMessage] = useState("");
  const [newSaving, setNewSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, StageDraft>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [savingById, setSavingById] = useState<Record<string, boolean>>({});

  const activeStages = useMemo(
    () => initialStages.filter((stage) => !stage.archived),
    [initialStages],
  );
  const archivedStages = useMemo(
    () => initialStages.filter((stage) => stage.archived),
    [initialStages],
  );

  async function createStage() {
    setNewSaving(true);
    setNewMessage("");
    try {
      const response = await fetch("/api/admin/lead-stages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(newDraft)),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setNewMessage(payload?.error ?? "We couldn't save this stage right now.");
        setNewSaving(false);
        return;
      }

      setNewDraft(createEmptyStageDraft());
      setNewMessage("Stage saved.");
      setNewSaving(false);
      startTransition(() => router.refresh());
    } catch {
      setNewMessage("We couldn't save this stage right now.");
      setNewSaving(false);
    }
  }

  async function updateStage(stageId: string) {
    const draft = drafts[stageId];
    if (!draft) {
      return;
    }

    setSavingById((current) => ({ ...current, [stageId]: true }));
    setMessages((current) => ({ ...current, [stageId]: "" }));

    try {
      const response = await fetch(`/api/admin/lead-stages/${stageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(draft)),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessages((current) => ({
          ...current,
          [stageId]: payload?.error ?? "We couldn't update this stage right now.",
        }));
        setSavingById((current) => ({ ...current, [stageId]: false }));
        return;
      }

      setMessages((current) => ({ ...current, [stageId]: "Stage updated." }));
      setSavingById((current) => ({ ...current, [stageId]: false }));
      startTransition(() => router.refresh());
    } catch {
      setMessages((current) => ({
        ...current,
        [stageId]: "We couldn't update this stage right now.",
      }));
      setSavingById((current) => ({ ...current, [stageId]: false }));
    }
  }

  async function toggleArchive(stageId: string, action: "archive" | "restore") {
    setSavingById((current) => ({ ...current, [stageId]: true }));
    setMessages((current) => ({ ...current, [stageId]: "" }));

    try {
      const response = await fetch(`/api/admin/lead-stages/${stageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessages((current) => ({
          ...current,
          [stageId]: payload?.error ?? "We couldn't update this stage right now.",
        }));
        setSavingById((current) => ({ ...current, [stageId]: false }));
        return;
      }

      setSavingById((current) => ({ ...current, [stageId]: false }));
      startTransition(() => router.refresh());
    } catch {
      setMessages((current) => ({
        ...current,
        [stageId]: "We couldn't update this stage right now.",
      }));
      setSavingById((current) => ({ ...current, [stageId]: false }));
    }
  }

  return (
    <div className="space-y-6">
      <StageEditor
        title="Add Stage"
        draft={newDraft}
        onChange={setNewDraft}
        onSave={() => void createStage()}
        isSaving={newSaving}
        message={newMessage}
        saveLabel="Save stage"
      />

      <div className="space-y-4">
        {activeStages.map((stage) => {
          const isEditing = editingId === stage.id;
          const draft = drafts[stage.id] ?? buildStageDraft(stage);
          return (
            <div key={stage.id} className="rounded-[24px] border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-950">{stage.name}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {stage.key}
                    {stage.color ? ` • ${stage.color}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {stage.isWon ? (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      Won
                    </span>
                  ) : null}
                  {stage.isLost ? (
                    <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                      Lost
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(isEditing ? null : stage.id);
                      setDrafts((current) => ({ ...current, [stage.id]: buildStageDraft(stage) }));
                    }}
                    className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-medium"
                  >
                    {isEditing ? "Close" : "Edit"}
                  </button>
                  <button
                    type="button"
                    disabled={savingById[stage.id]}
                    onClick={() => void toggleArchive(stage.id, "archive")}
                    className="inline-flex h-10 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                  >
                    Archive Stage
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="rounded-full border border-slate-200 px-3 py-1">
                  Order {stage.sortOrder}
                </span>
                <span className="rounded-full border border-slate-200 px-3 py-1">
                  {stage.updatedAt ? "Active" : "Saved"}
                </span>
              </div>

              {isEditing ? (
                <div className="mt-4">
                  <StageEditor
                    title="Edit Stage"
                    draft={draft}
                    onChange={(next) => setDrafts((current) => ({ ...current, [stage.id]: next }))}
                    onSave={() => void updateStage(stage.id)}
                    isSaving={Boolean(savingById[stage.id])}
                    message={messages[stage.id] ?? ""}
                    saveLabel="Save changes"
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-base font-semibold text-slate-950">Archived stages</p>
          <p className="mt-1 text-sm text-slate-500">
            Restore archived stages when you want them available again.
          </p>
        </div>
        {archivedStages.length > 0 ? (
          archivedStages.map((stage) => (
            <div key={stage.id} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-950">{stage.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{stage.key}</p>
                </div>
                <button
                  type="button"
                  disabled={savingById[stage.id]}
                  onClick={() => void toggleArchive(stage.id, "restore")}
                  className="inline-flex h-10 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restore Stage
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 px-4 py-4 text-sm text-slate-500">
            No archived stages yet.
          </div>
        )}
      </div>
    </div>
  );
}
