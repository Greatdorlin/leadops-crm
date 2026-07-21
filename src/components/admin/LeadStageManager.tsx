"use client";

import { startTransition, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, RotateCcw, Trash2 } from "lucide-react";
import type { AdminLeadStageRecord } from "@/lib/crm/lead-stages-admin";

type StageDraft = {
  name: string;
  key: string;
  color: string;
  sortOrder: number;
  isWon: boolean;
  isLost: boolean;
};

const STAGE_COLORS = [
  "#2563eb",
  "#0891b2",
  "#0d9488",
  "#16a34a",
  "#ca8a04",
  "#ea580c",
  "#e11d48",
  "#db2777",
  "#9333ea",
  "#4f46e5",
] as const;

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
    <div className="admin-surface-soft space-y-4 rounded-[28px] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-base font-semibold text-white">{title}</p>
        {extraAction}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Stage Name</span>
          <input
            type="text"
            value={draft.name}
            onChange={(event) => onChange({ ...draft, name: event.target.value })}
            placeholder="Qualified"
            className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Stage Key</span>
          <input
            type="text"
            value={draft.key}
            onChange={(event) => onChange({ ...draft, key: event.target.value })}
            placeholder="qualified"
            className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
          />
        </label>
        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Color</legend>
          <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-black/10 p-2">
            {STAGE_COLORS.map((color) => {
              const selected = draft.color.toLowerCase() === color;
              return (
                <button
                  key={color}
                  type="button"
                  aria-label={`Use stage color ${color}`}
                  aria-pressed={selected}
                  onClick={() => onChange({ ...draft, color })}
                  className="relative h-8 w-8 rounded-xl border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  style={{ backgroundColor: color }}
                >
                  {selected ? <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" /> : null}
                </button>
              );
            })}
            <label className="relative inline-flex h-8 min-w-24 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.06] px-3 text-xs font-semibold text-white/76 transition hover:bg-white/[0.1]">
              <span className="h-4 w-4 rounded-full border border-white/25" style={{ backgroundColor: draft.color }} />
              Custom
              <input
                type="color"
                value={draft.color || STAGE_COLORS[0]}
                onChange={(event) => onChange({ ...draft, color: event.target.value })}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label="Choose a custom stage color"
              />
            </label>
          </div>
        </fieldset>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Order</span>
          <input
            type="number"
            value={draft.sortOrder}
            onChange={(event) => onChange({ ...draft, sortOrder: Number(event.target.value || 0) })}
            className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="inline-flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-semibold text-white/70">
          <span>Mark as won</span>
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
            className="admin-toggle"
          />
        </label>
        <label className="inline-flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-semibold text-white/70">
          <span>Mark as lost</span>
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
        {message ? <p className="text-sm text-white/70">{message}</p> : null}
      </div>
    </div>
  );
}

export function LeadStageManager({
  initialStages,
  demoMode = false,
}: {
  initialStages: AdminLeadStageRecord[];
  demoMode?: boolean;
}) {
  const router = useRouter();
  const [newDraft, setNewDraft] = useState<StageDraft>(createEmptyStageDraft());
  const [newMessage, setNewMessage] = useState("");
  const [newSaving, setNewSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, StageDraft>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [savingById, setSavingById] = useState<Record<string, boolean>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const activeStages = useMemo(
    () => initialStages.filter((stage) => !stage.archived),
    [initialStages],
  );
  const archivedStages = useMemo(
    () => initialStages.filter((stage) => stage.archived),
    [initialStages],
  );

  async function createStage() {
    if (demoMode) { setNewMessage("Stage added for this preview."); return; }
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
    if (demoMode) { setMessages((current) => ({ ...current, [stageId]: "Stage updated for this preview." })); return; }

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
    if (demoMode) { setMessages((current) => ({ ...current, [stageId]: `Stage ${action === "archive" ? "archived" : "restored"} for this preview.` })); return; }
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

  async function deleteStage(stageId: string) {
    if (confirmDeleteId !== stageId) {
      setConfirmDeleteId(stageId);
      setMessages((current) => ({ ...current, [stageId]: "Select delete again to confirm permanent removal." }));
      return;
    }
    if (demoMode) {
      setMessages((current) => ({ ...current, [stageId]: "Permanent deletion is disabled in preview mode." }));
      return;
    }

    setSavingById((current) => ({ ...current, [stageId]: true }));
    setMessages((current) => ({ ...current, [stageId]: "" }));
    try {
      const response = await fetch(`/api/admin/lead-stages/${stageId}`, { method: "DELETE" });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessages((current) => ({ ...current, [stageId]: payload?.error ?? "We couldn't delete this stage." }));
        setSavingById((current) => ({ ...current, [stageId]: false }));
        setConfirmDeleteId(null);
        return;
      }
      setConfirmDeleteId(null);
      setSavingById((current) => ({ ...current, [stageId]: false }));
      startTransition(() => router.refresh());
    } catch {
      setMessages((current) => ({ ...current, [stageId]: "We couldn't delete this stage right now." }));
      setSavingById((current) => ({ ...current, [stageId]: false }));
      setConfirmDeleteId(null);
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
            <div key={stage.id} className="admin-surface-soft rounded-[24px] p-4">
              <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="h-10 w-2 shrink-0 rounded-full" style={{ backgroundColor: stage.color ?? STAGE_COLORS[0] }} />
                  <div className="min-w-0">
                  <p className="text-base font-semibold text-white">{stage.name}</p>
                  <p className="mt-1 truncate text-sm text-white/62">{stage.key}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  {stage.isWon ? (
                    <span className="rounded-full border border-emerald-300/24 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                      Won
                    </span>
                  ) : null}
                  {stage.isLost ? (
                    <span className="rounded-full border border-rose-300/24 bg-rose-400/10 px-3 py-1 text-xs font-semibold text-rose-100">
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
                    className="inline-flex h-10 items-center justify-center rounded-2xl border border-rose-300/24 bg-rose-400/10 px-4 text-sm font-medium text-rose-100 transition hover:bg-rose-400/16"
                  >
                      Archive
                  </button>
                  <button
                    type="button"
                    disabled={savingById[stage.id]}
                    onClick={() => void deleteStage(stage.id)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-rose-300/24 bg-transparent px-4 text-sm font-medium text-rose-100 transition hover:bg-rose-400/12"
                  >
                    <Trash2 className="h-4 w-4" />
                    {confirmDeleteId === stage.id ? "Confirm delete" : "Delete"}
                  </button>
                </div>
              </div>

              {messages[stage.id] && !isEditing ? <p className="mt-3 text-sm text-white/70">{messages[stage.id]}</p> : null}

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/70">
                <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1">
                  Order {stage.sortOrder}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1">
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
          <p className="text-base font-semibold text-white">Archived stages</p>
          <p className="mt-1 text-sm text-white/70">
            Restore archived stages when you want them available again.
          </p>
        </div>
        {archivedStages.length > 0 ? (
          archivedStages.map((stage) => (
            <div key={stage.id} className="admin-surface-soft rounded-[24px] p-4 opacity-90">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div>
                  <p className="text-base font-semibold text-white">{stage.name}</p>
                  <p className="mt-1 text-sm text-white/70">{stage.key}</p>
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end"><button
                  type="button"
                  disabled={savingById[stage.id]}
                  onClick={() => void toggleArchive(stage.id, "restore")}
                  className="inline-flex h-10 items-center justify-center rounded-2xl border border-emerald-300/24 bg-emerald-400/10 px-4 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/16"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restore
                </button>
                <button
                  type="button"
                  disabled={savingById[stage.id]}
                  onClick={() => void deleteStage(stage.id)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-rose-300/24 bg-rose-400/8 px-4 text-sm font-medium text-rose-100 transition hover:bg-rose-400/14"
                >
                  <Trash2 className="h-4 w-4" />
                  {confirmDeleteId === stage.id ? "Confirm delete" : "Delete"}
                </button></div>
              </div>
              {messages[stage.id] ? <p className="mt-3 text-sm text-white/70">{messages[stage.id]}</p> : null}
            </div>
          ))
        ) : (
          <div className="rounded-[24px] border border-dashed border-white/12 bg-white/[0.035] px-4 py-4 text-sm text-white/70">
            No archived stages yet.
          </div>
        )}
      </div>
    </div>
  );
}
