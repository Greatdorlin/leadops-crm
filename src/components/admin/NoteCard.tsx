import { formatCrmDateTime } from "@/lib/crm/formatters";
import type { LeadNoteRecord } from "@/lib/crm/types";
import { AnimatedCard } from "./ui/AnimatedCard";
import { cn } from "@/lib/cn";

function getAuthorBorderColor(author?: string | null): string {
  if (!author) return "border-l-[var(--ld-color-primary)]/40";
  const colors = [
    "border-l-[var(--ld-color-primary)]/40",
    "border-l-violet-300/40",
    "border-l-emerald-300/40",
    "border-l-amber-300/40",
    "border-l-rose-300/40",
    "border-l-sky-300/40",
  ];
  let hash = 0;
  for (let i = 0; i < author.length; i++) {
    hash = author.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function NoteCard({ note, index = 0 }: { note: LeadNoteRecord; index?: number }) {
  return (
    <AnimatedCard
      animation="fadeInUp"
      delay={index * 80}
      variant="subtle"
      className={cn(
        "rounded-[22px] p-4 border-l-4",
        getAuthorBorderColor(note.createdBy)
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.16em] text-white/70">
          {note.createdBy || "Team note"}
        </p>
        <p className="text-xs text-white/70">{formatCrmDateTime(note.createdAt)}</p>
      </div>
      <p className="mt-3 text-sm leading-6 text-white/80">{note.note}</p>
    </AnimatedCard>
  );
}
