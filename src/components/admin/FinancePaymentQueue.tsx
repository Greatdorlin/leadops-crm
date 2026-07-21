"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, CircleDollarSign, ShieldCheck } from "lucide-react";
import type { FinanceBatchAction, PaymentClaimRecord } from "@/lib/crm/payment-claims";
import { formatCurrencyValue } from "@/lib/currency";
import { SmoothButton } from "@/components/admin/ui";
import { GlassSurface } from "@/components/admin/ui/GlassSurface";
import { SectionHeader } from "@/components/admin/SectionHeader";

export function FinancePaymentQueue({ claims }: { claims: PaymentClaimRecord[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
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
        body: JSON.stringify({ claimIds: selected, action, rejectionReason: reason }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessage(payload?.error ?? "Finance action could not be completed.");
      } else {
        setMessage(`${selected.length} payment claim${selected.length === 1 ? "" : "s"} updated.`);
        setSelected([]);
        setRejectOpen(false);
        setRejectionReason("");
        startTransition(() => router.refresh());
      }
    } catch {
      setMessage("Finance action could not be completed.");
    } finally {
      setBusy(false);
    }
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
        <SmoothButton variant="primary" size="md" disabled={!canReviewSelection || busy} onClick={() => void applyAction("approve")}>
          <ShieldCheck className="h-4 w-4" /> Approve payments
        </SmoothButton>
        <SmoothButton variant="secondary" size="md" disabled={!canConfirmSelection || busy} onClick={() => void applyAction("confirm_commission")}>
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
            <SmoothButton variant="danger" size="md" disabled={!rejectionReason.trim() || busy} onClick={() => void applyAction("reject")}>
              Confirm rejection
            </SmoothButton>
            <SmoothButton variant="secondary" size="md" disabled={busy} onClick={() => setRejectOpen(false)}>
              Cancel
            </SmoothButton>
          </div>
        </div>
      ) : null}
    </section>
  );
}
