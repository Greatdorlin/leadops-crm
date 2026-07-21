"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { CurrencySelect } from "@/components/admin/CurrencySelect";
import { SmoothButton } from "@/components/admin/ui";

export function PaymentClaimForm({
  leadId,
  defaultCurrency,
  recipientOptions,
}: {
  leadId: string;
  defaultCurrency: string;
  recipientOptions: Array<{ value: string; label: string }>;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [commissionAmount, setCommissionAmount] = useState("");
  const [commissionRecipientUserId, setCommissionRecipientUserId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submitClaim() {
    const parsedAmount = Number(amount);
    if (!amount.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setMessage("Enter a payment amount greater than zero before submitting to finance.");
      return;
    }
    if (Boolean(commissionAmount.trim()) !== Boolean(commissionRecipientUserId)) {
      setMessage("Add both a commission amount and recipient, or leave both empty.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/payment-claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          amount,
          currency,
          commissionAmount: commissionAmount || null,
          commissionRecipientUserId: commissionRecipientUserId || null,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessage(payload?.error ?? "Payment could not be submitted for review.");
        return;
      }
      setAmount("");
      setCommissionAmount("");
      setCommissionRecipientUserId("");
      setMessage("Payment submitted to finance.");
      startTransition(() => router.refresh());
    } catch {
      setMessage("Payment could not be submitted for review.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-t border-white/10 pt-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">Payment review</p>
          <p className="mt-1 text-xs text-white/60">Submit a reported payment for finance approval.</p>
        </div>
      </div>
      <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="min-w-0 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/65">Amount</span>
          <input
            className="admin-input h-12 w-full min-w-0 px-5 text-base"
            inputMode="decimal"
            min="0"
            step="0.01"
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
          />
        </label>
        <CurrencySelect value={currency} onChange={setCurrency} />
        <label className="min-w-0 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/65">Commission</span>
          <input
            className="admin-input h-12 w-full min-w-0 px-4 text-base"
            inputMode="decimal"
            min="0"
            step="0.01"
            type="number"
            value={commissionAmount}
            onChange={(event) => setCommissionAmount(event.target.value)}
            placeholder="Optional"
          />
        </label>
        <label className="min-w-0 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/65">Recipient</span>
          <AdminSelect
            value={commissionRecipientUserId}
            onChange={(event) => setCommissionRecipientUserId(event.target.value)}
          >
            <option value="">No commission</option>
            {recipientOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </AdminSelect>
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <SmoothButton variant="secondary" size="md" loading={busy} disabled={busy} onClick={() => void submitClaim()}>
          Submit to finance
        </SmoothButton>
        {message ? <p role="status" aria-live="polite" className="text-sm text-white/70">{message}</p> : null}
      </div>
    </div>
  );
}
