import { formatCrmDateTime } from "@/lib/crm/formatters";
import type { LeadNoteRecord } from "@/lib/pathway-engine/types";

export function NoteCard({ note }: { note: LeadNoteRecord }) {
  return (
    <article className="admin-surface-soft rounded-[22px] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
          {note.createdBy || "Team note"}
        </p>
        <p className="text-xs text-slate-500">{formatCrmDateTime(note.createdAt)}</p>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-700">{note.note}</p>
    </article>
  );
}
