"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SmoothButton } from "./ui/SmoothButton";
import { NotebookPen } from "lucide-react";
import { AdminSelect } from "./AdminSelect";

const noteCategories = ["General note", "Customer context", "Qualification", "Follow-up", "Reason for loss"];

export function LeadNoteForm({ leadId, onSaved }: { leadId: string; onSaved?: () => void }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [category, setCategory] = useState(noteCategories[0]);
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
        body: JSON.stringify({ note: `[${category}] ${note.trim()}` }),
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
      onSaved?.();
    } catch {
      setMessage("We couldn't save this note right now.");
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Note category</span>
        <AdminSelect value={category} onChange={(event) => setCategory(event.target.value)} className="h-11" aria-label="Note category">
          {noteCategories.map((option) => <option key={option} value={option}>{option}</option>)}
        </AdminSelect>
      </div>
      <label className="block space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Note</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          maxLength={1960}
          placeholder={category === "Reason for loss" ? "Why was this lead or offer lost?" : "Add the context your team needs."}
          className="admin-textarea ld-focus-ring min-h-[112px] w-full rounded-2xl px-4 py-3 text-sm outline-none"
        />
      </label>
      <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-h-[1.5rem] text-sm text-white/70">
          {message ?? ""}
        </div>
        <SmoothButton
          variant="primary"
          size="md"
          onClick={() => void saveNote()}
          loading={isSaving}
          icon={<NotebookPen className="h-4 w-4" />}
        >
          Add note
        </SmoothButton>
      </div>
    </div>
  );
}
