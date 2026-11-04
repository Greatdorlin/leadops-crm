"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { SmoothButton } from "@/components/admin/ui";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { InfoTip } from "@/components/admin/ui/InfoTip";
import { CurrencySelect } from "./CurrencySelect";
import { isSupportedCurrency } from "@/lib/currency";
import type { CurrencyExchangeRateRecord } from "@/lib/crm/currency-exchange";

export function CurrencySettingsManager({
  initialGlobalCurrency,
  initialExchangeRates,
  demoMode = false,
}: {
  initialGlobalCurrency: string;
  initialExchangeRates: CurrencyExchangeRateRecord[];
  demoMode?: boolean;
}) {
  const router = useRouter();
  const [currency, setCurrency] = useState<string>(
    isSupportedCurrency(initialGlobalCurrency) ? initialGlobalCurrency : "USD"
  );
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [savedCurrency, setSavedCurrency] = useState(initialGlobalCurrency);
  const [rateBaseCurrency, setRateBaseCurrency] = useState(initialGlobalCurrency);
  const [rateQuoteCurrency, setRateQuoteCurrency] = useState("USD");
  const [manualRate, setManualRate] = useState("");
  const [rates, setRates] = useState(initialExchangeRates);

  async function saveSettings() {
    setIsSaving(true);
    setMessage("");

    if (demoMode) {
      setMessage("Currency updated for this preview.");
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/settings/currency", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          globalCurrency: currency,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; result?: { previousCurrency: string; converted: boolean } } | null;
      if (!response.ok) {
        setMessage(payload?.error ?? "We couldn't save currency settings right now.");
        setIsSaving(false);
        return;
      }

      setSavedCurrency(currency);
      setMessage(payload?.result?.converted
        ? `Values converted from ${payload.result.previousCurrency} to ${currency}.`
        : `Workspace currency saved as ${currency}.`);

      setIsSaving(false);
      startTransition(() => router.refresh());
    } catch {
      setMessage("We couldn't save currency settings right now.");
      setIsSaving(false);
    }
  }

  async function saveManualRate() {
    setIsSaving(true);
    setMessage("");
    if (demoMode) {
      setMessage("Exchange rate saved for this preview.");
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/settings/currency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseCurrency: rateBaseCurrency,
          quoteCurrency: rateQuoteCurrency,
          rate: manualRate,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        exchangeRate?: CurrencyExchangeRateRecord;
      } | null;
      if (!response.ok || !payload?.exchangeRate) {
        setMessage(payload?.error ?? "We couldn't save this exchange rate.");
      } else {
        setRates((current) => [
          payload.exchangeRate!,
          ...current.filter(
            (rate) =>
              rate.baseCurrency !== payload.exchangeRate!.baseCurrency ||
              rate.quoteCurrency !== payload.exchangeRate!.quoteCurrency,
          ),
        ]);
        setManualRate("");
        setMessage("Manual exchange rate saved.");
      }
    } catch {
      setMessage("We couldn't save this exchange rate.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Currency"
        title="Default workspace currency"
        description="Choose the currency used for sales targets, lead values, and reporting across your workspace."
        actions={
          <SmoothButton variant="primary" size="md" loading={isSaving} onClick={() => void saveSettings()}>
            {isSaving ? "Saving..." : "Save currency"}
          </SmoothButton>
        }
      />

      {message ? (
        <p
          className={`text-sm font-medium ${message.includes("couldn't") ? "text-rose-200" : "text-emerald-200"}`}
        >
          {message}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-[minmax(0,420px)_auto] sm:items-end">
        <CurrencySelect value={currency} onChange={setCurrency} label="Workspace currency" />
        <div className="pb-2">
          <InfoTip
            label="This currency formats lead values, pipeline reports, and new targets. An individual target may still use a different currency."
            align="left"
          />
        </div>
      </div>

      {currency !== savedCurrency ? (
        <p className="text-sm text-white/65">
          If you have existing values to convert, Leads Desk uses the saved rate between {savedCurrency} and {currency}.
        </p>
      ) : null}

      <div className="border-t border-white/10 pt-5">
        <SectionHeader
          eyebrow="Rates"
          title="Manual exchange-rate overrides"
          description="Add rates for currencies you use in reports."
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(160px,0.7fr)_auto] sm:items-end">
          <CurrencySelect value={rateBaseCurrency} onChange={setRateBaseCurrency} label="From" />
          <CurrencySelect value={rateQuoteCurrency} onChange={setRateQuoteCurrency} label="To" />
          <label className="block text-sm font-semibold text-white/80">
            Rate
            <input
              className="admin-input mt-2 h-12 w-full px-4 text-base"
              inputMode="decimal"
              min="0"
              step="any"
              type="number"
              value={manualRate}
              onChange={(event) => setManualRate(event.target.value)}
              placeholder="0.00065"
            />
          </label>
          <SmoothButton variant="secondary" size="md" loading={isSaving} onClick={() => void saveManualRate()}>
            Save rate
          </SmoothButton>
        </div>
        {rates.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {rates.map((rate) => (
              <span key={rate.id} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium text-white/75">
                1 {rate.baseCurrency} = {rate.rate.toLocaleString(undefined, { maximumFractionDigits: 8 })} {rate.quoteCurrency} · {rate.source}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
