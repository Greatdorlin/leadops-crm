"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LeadNoteForm({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function saveNote() {
    if (!note.trim()) {
      setMessage("Write a note before saving.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/leads/${leadId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ note }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessage(payload?.error ?? "We couldn't save this note right now.");
        setIsSaving(false);
        return;
      }

      setNote("");
      setMessage("Note added.");
      setIsSaving(false);
      router.refresh();
    } catch {
      setMessage("We couldn't save this note right now.");
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-slate-200/85 bg-[linear-gradient(180deg,rgba(250,251,255,0.98)_0%,rgba(255,252,247,0.95)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
      <div className="mb-3 rounded-[18px] border border-slate-200/70 bg-white/72 px-4 py-3 text-sm leading-6 text-slate-500">
        Capture objections, nuance, and handoff context in one concise note.
      </div>
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={4}
        placeholder="Capture context, objections, next steps, or important handoff notes."
        className="admin-textarea min-h-[156px] w-full rounded-2xl px-4 py-3 text-sm outline-none"
      />
      <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-h-[1.5rem] text-sm text-slate-500">
          {message ?? ""}
        </div>
        <button
          type="button"
          onClick={() => void saveNote()}
          disabled={isSaving}
          className="admin-button-primary h-11 self-start rounded-2xl px-5 text-sm"
        >
          {isSaving ? "Saving..." : "Add note"}
        </button>
      </div>
    </div>
  );
}
