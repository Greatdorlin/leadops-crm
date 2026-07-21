"use client";

import { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import { AdminOverlayPortal } from "./AdminOverlayPortal";
import { cn } from "@/lib/cn";

export function ActionConfirmationDialog({
  confirmLabel,
  description,
  error,
  isPending = false,
  onCancel,
  onConfirm,
  open,
  title,
  tone = "danger",
}: {
  confirmLabel: string;
  description: string;
  error?: string;
  isPending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
  tone?: "danger" | "primary";
}) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isPending, onCancel, open]);

  if (!open) return null;

  return (
    <AdminOverlayPortal>
      <div
        className="fixed inset-0 z-[180] flex items-end justify-center bg-[#02040c]/78 p-0 backdrop-blur-md sm:items-center sm:p-6"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isPending) onCancel();
        }}
      >
        <section
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="action-confirmation-title"
          aria-describedby="action-confirmation-description"
          className="ld-glass-panel ld-inner-highlight w-full max-w-md rounded-t-[30px] border border-white/14 bg-[#070b18]/[0.97] p-5 shadow-[0_32px_100px_rgba(0,0,0,0.62)] sm:rounded-[30px] sm:p-7"
        >
          <div className="flex items-start justify-between gap-4">
            <span className={cn(
              "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border",
              tone === "danger"
                ? "border-rose-300/22 bg-rose-400/12 text-rose-100"
                : "border-white/14 bg-white/[0.08] text-[color:var(--ld-color-accent)]",
            )}>
              <AlertTriangle className="h-5 w-5" />
            </span>
            <button
              type="button"
              disabled={isPending}
              onClick={onCancel}
              className="ld-focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/70 transition hover:bg-white/[0.11] hover:text-white"
              aria-label="Close confirmation"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <h2 id="action-confirmation-title" className="mt-5 text-2xl font-bold tracking-[-0.04em] text-white">
            {title}
          </h2>
          <p id="action-confirmation-description" className="mt-2 text-sm leading-6 text-white/68">
            {description}
          </p>
          {error ? (
            <p role="alert" className="mt-4 rounded-2xl border border-rose-300/22 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </p>
          ) : null}

          <div className="mt-7 grid grid-cols-2 gap-3">
            <button type="button" disabled={isPending} onClick={onCancel} className="admin-button-secondary h-12 rounded-[18px] px-4 text-sm font-semibold">
              Cancel
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={onConfirm}
              className={cn(
                "ld-focus-ring inline-flex h-12 items-center justify-center rounded-[18px] border px-4 text-sm font-semibold text-white transition disabled:cursor-wait disabled:opacity-55",
                tone === "danger"
                  ? "border-rose-300/25 bg-rose-500/80 hover:bg-rose-500"
                  : "admin-button-primary",
              )}
            >
              {isPending ? "Working..." : confirmLabel}
            </button>
          </div>
        </section>
      </div>
    </AdminOverlayPortal>
  );
}
