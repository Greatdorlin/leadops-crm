"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GlassSurface } from "./ui/GlassSurface";
import { SmoothButton } from "./ui/SmoothButton";
import { GradientText } from "./ui/GradientText";
import { NotebookPen } from "lucide-react";

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
    <GlassSurface intensity="medium" className="ld-animate-fade-in-up rounded-[24px] p-4">
      <div className="mb-4 flex items-center gap-2">
        <NotebookPen className="h-4 w-4 text-white/70" />
        <h3 className="text-sm font-semibold text-white/80">
          <GradientText>Add a note</GradientText>
        </h3>
      </div>
      <div className="mb-3 rounded-[18px] border border-white/10 bg-white/[0.06] px-4 py-3 text-sm leading-6 text-white/70">
        Capture objections, nuance, and handoff context in one concise note.
      </div>
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={4}
        placeholder="Capture context, objections, next steps, or important handoff notes."
        className="admin-textarea ld-focus-ring min-h-[156px] w-full rounded-2xl px-4 py-3 text-sm outline-none"
      />
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
    </GlassSurface>
  );
}
