"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { AdminOverlayPortal } from "./AdminOverlayPortal";

export function WorkspaceImpactConfirmation({
  open,
  title,
  description,
  actionLabel = "Yes, proceed",
  confirmationPhrase = "PROCEED",
  busy = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  actionLabel?: string;
  confirmationPhrase?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [confirmation, setConfirmation] = useState("");
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) {
        setConfirmation("");
        onCancel();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [busy, onCancel, open]);
  if (!open) return null;

  return (
    <AdminOverlayPortal>
      <div className="fixed inset-0 z-[175] flex items-end justify-center bg-slate-950/80 p-0 backdrop-blur-md sm:items-center sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) { setConfirmation(""); onCancel(); } }}>
        <section role="dialog" aria-modal="true" aria-labelledby="workspace-impact-title" className="admin-surface w-full max-w-lg rounded-t-[30px] p-5 shadow-2xl sm:rounded-[30px] sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-300/10 text-amber-100"><AlertTriangle className="h-5 w-5" /></span>
              <h2 id="workspace-impact-title" className="mt-4 text-2xl font-bold tracking-[-0.04em] text-white">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-white/68">{description}</p>
            </div>
            <button type="button" disabled={busy} onClick={() => { setConfirmation(""); onCancel(); }} className="ld-focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] text-white" aria-label="Close confirmation"><X className="h-4 w-4" /></button>
          </div>
          <label className="mt-6 grid gap-2 text-sm font-semibold text-white">
            Type {confirmationPhrase} to continue
            <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" className="admin-input h-12 w-full px-4 text-sm tracking-[0.08em]" placeholder={confirmationPhrase} />
          </label>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" disabled={busy} onClick={() => { setConfirmation(""); onCancel(); }} className="admin-button-secondary inline-flex h-12 items-center justify-center rounded-[18px] px-5 text-sm font-semibold">Cancel</button>
            <button type="button" disabled={busy || confirmation !== confirmationPhrase} onClick={() => { onConfirm(); }} className="inline-flex h-12 items-center justify-center rounded-[18px] border border-rose-300/25 bg-rose-400/14 px-5 text-sm font-semibold text-rose-50 transition hover:bg-rose-400/20 disabled:cursor-not-allowed disabled:opacity-45">{busy ? "Applying..." : actionLabel}</button>
          </div>
        </section>
      </div>
    </AdminOverlayPortal>
  );
}
