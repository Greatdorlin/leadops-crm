"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, CircleDollarSign, ShieldCheck, X } from "lucide-react";
import type { FinanceBatchAction, PaymentClaimRecord } from "@/lib/crm/payment-claims";
import { formatCurrencyValue } from "@/lib/currency";
import { SmoothButton } from "@/components/admin/ui";
import { GlassSurface } from "@/components/admin/ui/GlassSurface";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { AdminOverlayPortal } from "@/components/admin/AdminOverlayPortal";

export function FinancePaymentQueue({ claims }: { claims: PaymentClaimRecord[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [pendingAction, setPendingAction] = useState<FinanceBatchAction | null>(null);
  const [changeReason, setChangeReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const pendingClaims = claims.filter((claim) => claim.status === "pending");
  const approvedCommissionClaims = claims.filter(
    (claim) => claim.status === "approved" && claim.commissionAmount !== null && !claim.commissionConfirmedAt,
  );
  const selectedClaims = claims.filter((claim) => selected.includes(claim.id));
  const canReviewSelection = selectedClaims.length > 0 && selectedClaims.every((claim) => claim.status === "pending");
  const canConfirmSelection = selectedClaims.length > 0 && selectedClaims.every(
    (claim) => claim.status === "approved" && claim.commissionAmount !== null && !claim.commissionConfirmedAt,
  );

  async function applyAction(action: FinanceBatchAction) {
    if (selected.length === 0) return;
    const reason = action === "reject" ? rejectionReason.trim() : undefined;
    if (action === "reject" && !reason) {
      setMessage("Add a reason before rejecting payment.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/payment-claims/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimIds: selected, action, rejectionReason: reason, reason: changeReason.trim(), confirmation }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessage(payload?.error ?? "Finance action could not be completed.");
      } else {
        setMessage(`${selected.length} payment claim${selected.length === 1 ? "" : "s"} updated.`);
        setSelected([]);
        setRejectOpen(false);
        setRejectionReason("");
        setPendingAction(null);
        setChangeReason("");
        setConfirmation("");
        startTransition(() => router.refresh());
      }
    } catch {
      setMessage("Finance action could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  function requestAction(action: FinanceBatchAction) {
    if (action === "reject" && !rejectionReason.trim()) {
      setMessage("Add a reason before rejecting payment.");
      return;
    }
    setPendingAction(action);
    setChangeReason(action === "reject" ? rejectionReason.trim() : "");
    setConfirmation("");
    setMessage("");
  }

  return (
    <section className="space-y-4 ld-animate-fade-in-up">
      <SectionHeader
        eyebrow="Finance"
        title="Payment approvals"
        description="Approve verified payments before commission is confirmed."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <GlassSurface intensity="soft" className="p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/55">Pending review</p>
          <p className="mt-2 text-2xl font-semibold text-white">{pendingClaims.length}</p>
        </GlassSurface>
        <GlassSurface intensity="soft" className="p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/55">Commission ready</p>
          <p className="mt-2 text-2xl font-semibold text-white">{approvedCommissionClaims.length}</p>
        </GlassSurface>
        <GlassSurface intensity="soft" className="p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/55">Selected</p>
          <p className="mt-2 text-2xl font-semibold text-white">{selected.length}</p>
        </GlassSurface>
      </div>

      {message ? <p className="text-sm font-medium text-white/75">{message}</p> : null}
      {claims.length === 0 ? (
        <GlassSurface intensity="soft" className="p-6 text-sm text-white/65">
          No payment claims need finance review.
        </GlassSurface>
      ) : (
        <div className="grid gap-3">
          {claims.map((claim) => (
            <label key={claim.id} className="flex min-w-0 cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-4 transition hover:bg-white/[0.07]">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 accent-[var(--ld-color-accent)]"
                checked={selected.includes(claim.id)}
                onChange={(event) =>
                  setSelected((current) =>
                    event.target.checked ? [...current, claim.id] : current.filter((id) => id !== claim.id),
                  )
                }
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-white">{claim.leadLabel}</span>
                <span className="mt-1 block text-sm text-white/65">
                  {formatCurrencyValue(claim.amount, claim.currency)} · {claim.status}
                </span>
                {claim.commissionAmount !== null ? (
                  <span className="mt-1 block text-xs text-white/50">
                    Commission {formatCurrencyValue(claim.commissionAmount, claim.currency)}
                  </span>
                ) : null}
              </span>
            </label>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <SmoothButton variant="primary" size="md" disabled={!canReviewSelection || busy} onClick={() => requestAction("approve")}>
          <ShieldCheck className="h-4 w-4" /> Approve payments
        </SmoothButton>
        <SmoothButton variant="secondary" size="md" disabled={!canConfirmSelection || busy} onClick={() => requestAction("confirm_commission")}>
          <CheckCheck className="h-4 w-4" /> Confirm commissions
        </SmoothButton>
        <SmoothButton variant="danger" size="md" disabled={!canReviewSelection || busy} onClick={() => setRejectOpen((current) => !current)}>
          <CircleDollarSign className="h-4 w-4" /> Reject
        </SmoothButton>
      </div>
      {rejectOpen && canReviewSelection ? (
        <div className="rounded-2xl border border-rose-300/20 bg-rose-400/[0.06] p-4">
          <label className="block text-sm font-semibold text-white">
            Reason for rejection
            <textarea
              className="admin-input mt-2 min-h-24 w-full resize-y py-3"
              maxLength={500}
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              placeholder="Explain what needs to be corrected"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <SmoothButton variant="danger" size="md" disabled={!rejectionReason.trim() || busy} onClick={() => requestAction("reject")}>
              Confirm rejection
            </SmoothButton>
            <SmoothButton variant="secondary" size="md" disabled={busy} onClick={() => setRejectOpen(false)}>
              Cancel
            </SmoothButton>
          </div>
        </div>
      ) : null}
      {pendingAction ? (
        <AdminOverlayPortal>
          <div className="fixed inset-0 z-[170] flex items-end justify-center bg-slate-950/78 p-0 backdrop-blur-md sm:items-center sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setPendingAction(null); }}>
            <section role="dialog" aria-modal="true" aria-labelledby="finance-mass-title" className="admin-surface max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[30px] p-5 shadow-2xl sm:rounded-[30px] sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">Finance control</p>
                  <h2 id="finance-mass-title" className="mt-2 text-2xl font-bold tracking-[-0.04em] text-white">Confirm mass change</h2>
                  <p className="mt-2 text-sm leading-6 text-white/68">This affects {selected.length} payment claim{selected.length === 1 ? "" : "s"} and will be recorded in lead activity and notification logs.</p>
                </div>
                <button type="button" disabled={busy} onClick={() => setPendingAction(null)} className="ld-focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] text-white" aria-label="Close finance confirmation"><X className="h-4 w-4" /></button>
              </div>
              <div className="mt-6 grid gap-4">
                <label className="grid gap-2 text-sm font-semibold text-white">Reason
                  <textarea value={changeReason} onChange={(event) => setChangeReason(event.target.value)} maxLength={500} rows={3} className="admin-input min-h-24 w-full resize-y px-4 py-3 text-sm font-normal" placeholder="Why is finance making this change?" />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-white">Type MAX CHANGE to continue
                  <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" className="admin-input h-12 w-full px-4 text-sm tracking-[0.08em]" placeholder="MAX CHANGE" />
                </label>
              </div>
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <SmoothButton variant="secondary" size="md" disabled={busy} onClick={() => setPendingAction(null)}>Cancel</SmoothButton>
                <SmoothButton variant="primary" size="md" disabled={busy || changeReason.trim().length < 5 || confirmation !== "MAX CHANGE"} onClick={() => void applyAction(pendingAction)}>Initiate</SmoothButton>
              </div>
            </section>
          </div>
        </AdminOverlayPortal>
      ) : null}
    </section>
  );
}
