"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCheck, Layers3, UsersRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { AdminOverlayPortal } from "./AdminOverlayPortal";
import { AdminSelect } from "./AdminSelect";

type BulkAction = "assign" | "stage";

type BulkOption = {
  label: string;
  value: string;
};

function selectedLeadIds() {
  return [...document.querySelectorAll<HTMLInputElement>("[data-lead-bulk-checkbox]:checked")]
    .map((checkbox) => checkbox.value)
    .filter((value, index, values) => values.indexOf(value) === index);
}

function setPageSelection(checked: boolean) {
  document.querySelectorAll<HTMLInputElement>("[data-lead-bulk-checkbox]").forEach((checkbox) => {
    checkbox.checked = checked;
  });
  document.dispatchEvent(new CustomEvent("lead-bulk-selection-changed"));
}

export function LeadBulkActions({
  assigneeOptions,
  stageOptions,
  allowAssignment,
  previewMode = false,
}: {
  assigneeOptions: BulkOption[];
  stageOptions: BulkOption[];
  allowAssignment: boolean;
  previewMode?: boolean;
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [action, setAction] = useState<BulkAction>(allowAssignment ? "assign" : "stage");
  const [destination, setDestination] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    const update = () => setSelectedIds(selectedLeadIds());
    document.addEventListener("change", update);
    document.addEventListener("lead-bulk-selection-changed", update);
    return () => {
      document.removeEventListener("change", update);
      document.removeEventListener("lead-bulk-selection-changed", update);
    };
  }, []);

  const options = useMemo(
    () => action === "assign" ? assigneeOptions : stageOptions,
    [action, assigneeOptions, stageOptions],
  );
  const requiresMassConfirmation = selectedIds.length > 5;
  const canOpen = selectedIds.length > 0 && Boolean(destination);
  const canSubmit = canOpen && !isPending && (!requiresMassConfirmation || (reason.trim().length >= 5 && confirmation === "MAX CHANGE"));

  function changeAction(nextAction: BulkAction) {
    setAction(nextAction);
    setDestination("");
    setError("");
  }

  async function initiate() {
    if (!canSubmit) return;
    setIsPending(true);
    setError("");
    try {
      const response = await fetch("/api/admin/leads/bulk-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadIds: selectedIds,
          action,
          ...(action === "assign" ? { assignedTo: destination } : { stageId: destination }),
          ...(requiresMassConfirmation ? { reason: reason.trim(), confirmation } : {}),
        }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "The mass change could not be completed.");

      setPageSelection(false);
      setIsConfirming(false);
      setDestination("");
      setReason("");
      setConfirmation("");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The mass change could not be completed.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <div className="ld-glass-card ld-glass-soft flex flex-col gap-3 rounded-[24px] p-3 sm:flex-row sm:items-center sm:p-4">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setPageSelection(selectedIds.length === 0)} className="admin-button-secondary inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold">
            <CheckCheck className="h-4 w-4" />
            {selectedIds.length > 0 ? "Unselect all" : "Select all"}
          </button>
          {selectedIds.length > 0 ? <span className="inline-flex h-11 items-center rounded-full border border-white/10 bg-white/[0.05] px-3 text-xs font-semibold text-white/68">{selectedIds.length} selected</span> : null}
        </div>

        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[180px_minmax(220px,320px)_auto] sm:justify-end">
          <AdminSelect className="text-[13px] sm:text-sm" value={action} onChange={(event) => changeAction(event.target.value as BulkAction)} aria-label="Mass change type">
            {allowAssignment ? <option value="assign">Assign owner</option> : null}
            <option value="stage">Change stage</option>
          </AdminSelect>
          <AdminSelect value={destination} onChange={(event) => setDestination(event.target.value)} aria-label={action === "assign" ? "Choose owner" : "Choose stage"}>
            <option value="">{action === "assign" ? "Choose owner" : "Choose stage"}</option>
            {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </AdminSelect>
          <button
            type="button"
            disabled={!canOpen || previewMode}
            onClick={() => requiresMassConfirmation ? setIsConfirming(true) : void initiate()}
            className="admin-button-primary inline-flex h-12 items-center justify-center rounded-[18px] px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isPending ? "Applying..." : "Apply change"}
          </button>
        </div>
      </div>

      {isConfirming ? (
        <AdminOverlayPortal onClose={() => { if (!isPending) setIsConfirming(false); }}>
          <div className="fixed inset-0 z-[170] flex items-end justify-center bg-slate-950/78 p-0 backdrop-blur-md sm:items-center sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isPending) setIsConfirming(false); }}>
            <section role="dialog" aria-modal="true" aria-labelledby="mass-change-title" className="admin-surface max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-[30px] p-5 shadow-2xl sm:rounded-[30px] sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.07] text-[color:var(--ld-color-accent)]">
                    {action === "assign" ? <UsersRound className="h-5 w-5" /> : <Layers3 className="h-5 w-5" />}
                  </span>
                  <h2 id="mass-change-title" className="mt-4 text-2xl font-bold tracking-[-0.04em] text-white">Confirm mass change</h2>
                  <p className="mt-2 text-sm leading-6 text-white/68">This will update {selectedIds.length} leads together and record the action in each lead activity and the notification log.</p>
                </div>
                <button type="button" disabled={isPending} onClick={() => setIsConfirming(false)} className="ld-focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] text-white" aria-label="Close mass change">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-6 grid gap-5">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-white">Reason</span>
                  <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} maxLength={500} className="admin-input min-h-24 w-full resize-y rounded-[20px] px-4 py-3 text-sm outline-none" placeholder="Why are these leads being changed?" />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-white">Type MAX CHANGE to continue</span>
                  <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" className="admin-input h-12 w-full rounded-[18px] px-4 text-sm font-semibold tracking-[0.08em] outline-none" placeholder="MAX CHANGE" />
                </label>
                {error ? <p role="alert" className="rounded-2xl border border-rose-300/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</p> : null}
              </div>

              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button type="button" disabled={isPending} onClick={() => setIsConfirming(false)} className="admin-button-secondary inline-flex h-12 items-center justify-center rounded-[18px] px-5 text-sm font-semibold">Cancel</button>
                <button type="button" disabled={!canSubmit} onClick={initiate} className="admin-button-primary inline-flex h-12 items-center justify-center rounded-[18px] px-6 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45">{isPending ? "Initiating..." : "Initiate"}</button>
              </div>
            </section>
          </div>
        </AdminOverlayPortal>
      ) : null}
    </>
  );
}
