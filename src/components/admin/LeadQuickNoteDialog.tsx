"use client";

import { useEffect, useRef, useState } from "react";
import { NotebookPen, X } from "lucide-react";
import { LeadNoteForm } from "./LeadNoteForm";
import { AdminOverlayPortal } from "./AdminOverlayPortal";

export function LeadQuickNoteDialog({ leadId }: { leadId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) closeButtonRef.current?.focus({ preventScroll: true });
  }, [isOpen]);

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className="admin-button-secondary ld-focus-ring inline-flex h-12 w-full items-center justify-center rounded-2xl px-5 text-base font-medium sm:w-auto">
        <NotebookPen className="mr-2 h-5 w-5" />
        Quick note
      </button>
      {isOpen ? (
        <AdminOverlayPortal>
          <div className="fixed inset-0 z-[160] flex items-end justify-center bg-slate-950/72 p-0 backdrop-blur-md sm:items-center sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }}>
            <section role="dialog" aria-modal="true" aria-labelledby="quick-note-title" className="admin-surface max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-t-[28px] p-5 shadow-2xl sm:rounded-[28px] sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">Lead note</p>
                  <h2 id="quick-note-title" className="mt-1 text-xl font-bold text-white">Add context without leaving this spot</h2>
                </div>
                <button ref={closeButtonRef} type="button" onClick={() => setIsOpen(false)} className="ld-focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] text-white" aria-label="Close quick note">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <LeadNoteForm leadId={leadId} onSaved={() => setIsOpen(false)} />
            </section>
          </div>
        </AdminOverlayPortal>
      ) : null}
    </>
  );
}
