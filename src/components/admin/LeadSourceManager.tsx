"use client";

import { startTransition, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import type { AdminLeadSourceRecord } from "@/lib/crm/lead-sources-admin";
import { crmLabelize } from "@/lib/crm/formatters";
import { AdminSelect } from "./AdminSelect";

const sourceTypeOptions = [
  "website",
  "wordpress",
  "ads",
  "social",
  "referral",
  "call",
  "walk_in",
  "import",
  "manual",
  "other",
] as const;

type SourceDraft = {
  name: string;
  key: string;
  type: string;
  color: string;
};

function createEmptySourceDraft(): SourceDraft {
  return {
    name: "",
    key: "",
    type: "website",
    color: "#2563eb",
  };
}

function buildSourceDraft(source: AdminLeadSourceRecord): SourceDraft {
  return {
    name: source.name,
    key: source.key,
    type: source.type ?? "other",
    color: source.color ?? "",
  };
}

function buildPayload(draft: SourceDraft) {
  return {
    name: draft.name,
    key: draft.key || null,
    type: draft.type || null,
    color: draft.color || null,
  };
}

function SourceEditor({
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
  draft: SourceDraft;
  onChange: (next: SourceDraft) => void;
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
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Source Name</span>
          <input
            type="text"
            value={draft.name}
            onChange={(event) => onChange({ ...draft, name: event.target.value })}
            placeholder="Website"
            className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Source Key</span>
          <input
            type="text"
            value={draft.key}
            onChange={(event) => onChange({ ...draft, key: event.target.value })}
            placeholder="website"
            className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Source Type</span>
          <AdminSelect
            value={draft.type}
            onChange={(event) => onChange({ ...draft, type: event.target.value })}
            className="h-11"
          >
            {sourceTypeOptions.map((type) => (
              <option key={type} value={type}>
                {crmLabelize(type)}
              </option>
            ))}
          </AdminSelect>
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Color</span>
          <input
            type="text"
            value={draft.color}
            onChange={(event) => onChange({ ...draft, color: event.target.value })}
            placeholder="#2563eb"
            className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
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

export function LeadSourceManager({
  initialSources,
}: {
  initialSources: AdminLeadSourceRecord[];
}) {
  const router = useRouter();
  const [newDraft, setNewDraft] = useState<SourceDraft>(createEmptySourceDraft());
  const [newMessage, setNewMessage] = useState("");
  const [newSaving, setNewSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, SourceDraft>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [savingById, setSavingById] = useState<Record<string, boolean>>({});

  const activeSources = useMemo(
    () => initialSources.filter((source) => !source.archived),
    [initialSources],
  );
  const archivedSources = useMemo(
    () => initialSources.filter((source) => source.archived),
    [initialSources],
  );

  async function createSource() {
    setNewSaving(true);
    setNewMessage("");
    try {
      const response = await fetch("/api/admin/lead-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(newDraft)),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setNewMessage(payload?.error ?? "We couldn't save this source right now.");
        setNewSaving(false);
        return;
      }

      setNewDraft(createEmptySourceDraft());
      setNewMessage("Source saved.");
      setNewSaving(false);
      startTransition(() => router.refresh());
    } catch {
      setNewMessage("We couldn't save this source right now.");
      setNewSaving(false);
    }
  }

  async function updateSource(sourceId: string) {
    const draft = drafts[sourceId];
    if (!draft) {
      return;
    }

    setSavingById((current) => ({ ...current, [sourceId]: true }));
    setMessages((current) => ({ ...current, [sourceId]: "" }));

    try {
      const response = await fetch(`/api/admin/lead-sources/${sourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(draft)),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessages((current) => ({
          ...current,
          [sourceId]: payload?.error ?? "We couldn't update this source right now.",
        }));
        setSavingById((current) => ({ ...current, [sourceId]: false }));
        return;
      }

      setMessages((current) => ({ ...current, [sourceId]: "Source updated." }));
      setSavingById((current) => ({ ...current, [sourceId]: false }));
      startTransition(() => router.refresh());
    } catch {
      setMessages((current) => ({
        ...current,
        [sourceId]: "We couldn't update this source right now.",
      }));
      setSavingById((current) => ({ ...current, [sourceId]: false }));
    }
  }

  async function toggleArchive(sourceId: string, action: "archive" | "restore") {
    setSavingById((current) => ({ ...current, [sourceId]: true }));
    setMessages((current) => ({ ...current, [sourceId]: "" }));

    try {
      const response = await fetch(`/api/admin/lead-sources/${sourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessages((current) => ({
          ...current,
          [sourceId]: payload?.error ?? "We couldn't update this source right now.",
        }));
        setSavingById((current) => ({ ...current, [sourceId]: false }));
        return;
      }

      setSavingById((current) => ({ ...current, [sourceId]: false }));
      startTransition(() => router.refresh());
    } catch {
      setMessages((current) => ({
        ...current,
        [sourceId]: "We couldn't update this source right now.",
      }));
      setSavingById((current) => ({ ...current, [sourceId]: false }));
    }
  }

  return (
    <div className="space-y-6">
      <SourceEditor
        title="Add Source"
        draft={newDraft}
        onChange={setNewDraft}
        onSave={() => void createSource()}
        isSaving={newSaving}
        message={newMessage}
        saveLabel="Save source"
      />

      <div className="space-y-4">
        {activeSources.map((source) => {
          const isEditing = editingId === source.id;
          const draft = drafts[source.id] ?? buildSourceDraft(source);
          return (
            <div key={source.id} className="admin-surface-soft rounded-[24px] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-white">{source.name}</p>
                  <p className="mt-1 text-sm text-white/70">
                    {crmLabelize(source.type || "other")}
                    {source.color ? ` • ${source.color}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(isEditing ? null : source.id);
                      setDrafts((current) => ({ ...current, [source.id]: buildSourceDraft(source) }));
                    }}
                    className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-medium"
                  >
                    {isEditing ? "Close" : "Edit"}
                  </button>
                  <button
                    type="button"
                    disabled={savingById[source.id]}
                    onClick={() => void toggleArchive(source.id, "archive")}
                    className="inline-flex h-10 items-center justify-center rounded-2xl border border-rose-300/24 bg-rose-400/10 px-4 text-sm font-medium text-rose-100 transition hover:bg-rose-400/16"
                  >
                    Archive Source
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/70">
                <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1">{source.key}</span>
              </div>

              {isEditing ? (
                <div className="mt-4">
                  <SourceEditor
                    title="Edit Source"
                    draft={draft}
                    onChange={(next) => setDrafts((current) => ({ ...current, [source.id]: next }))}
                    onSave={() => void updateSource(source.id)}
                    isSaving={Boolean(savingById[source.id])}
                    message={messages[source.id] ?? ""}
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
          <p className="text-base font-semibold text-white">Archived sources</p>
          <p className="mt-1 text-sm text-white/70">Restore archived sources when you want them back in active use.</p>
        </div>
        {archivedSources.length > 0 ? (
          archivedSources.map((source) => (
            <div key={source.id} className="admin-surface-soft rounded-[24px] p-4 opacity-90">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-white">{source.name}</p>
                  <p className="mt-1 text-sm text-white/70">{source.key}</p>
                </div>
                <button
                  type="button"
                  disabled={savingById[source.id]}
                  onClick={() => void toggleArchive(source.id, "restore")}
                  className="inline-flex h-10 items-center justify-center rounded-2xl border border-emerald-300/24 bg-emerald-400/10 px-4 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/16"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restore Source
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[24px] border border-dashed border-white/12 bg-white/[0.035] px-4 py-4 text-sm text-white/70">
            No archived sources yet.
          </div>
        )}
      </div>
    </div>
  );
}
