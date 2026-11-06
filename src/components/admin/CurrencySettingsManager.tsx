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
    isSupportedCurrency(initialGlobalCurrency) ? initialGlobalCurrency : "USD",
  );
  const [changeRate, setChangeRate] = useState("");
  const [hasError, setHasError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [savedCurrency, setSavedCurrency] = useState(initialGlobalCurrency);
  const [rateBaseCurrency, setRateBaseCurrency] = useState(
    initialGlobalCurrency,
  );
  const [rateQuoteCurrency, setRateQuoteCurrency] = useState(
    initialGlobalCurrency === "USD" ? "EUR" : "USD",
  );
  const [manualRate, setManualRate] = useState("");
  const [rates, setRates] = useState(initialExchangeRates);

  async function saveSettings() {
    setIsSaving(true);
    setMessage("");
    setHasError(false);

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
          ...(changeRate.trim() ? { exchangeRate: Number(changeRate) } : {}),
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        result?: { previousCurrency: string; converted: boolean };
      } | null;
      if (!response.ok) {
        setHasError(true);
        setMessage(
          payload?.error ?? "We couldn't save currency settings right now.",
        );
        setIsSaving(false);
        return;
      }

      setSavedCurrency(currency);
      setRateBaseCurrency(currency);
      if (currency !== savedCurrency) setRateQuoteCurrency(savedCurrency);
      setChangeRate("");
      window.dispatchEvent(new Event("workspace:settings-saved"));
      const channel =
        typeof BroadcastChannel !== "undefined"
          ? new BroadcastChannel("leads-desk-settings")
          : null;
      channel?.postMessage("changed");
      channel?.close();
      setMessage(
        payload?.result?.converted
          ? `Values converted from ${payload.result.previousCurrency} to ${currency}.`
          : `Workspace currency saved as ${currency}.`,
      );

      setIsSaving(false);
      startTransition(() => router.refresh());
    } catch {
      setHasError(true);
      setMessage("We couldn't save currency settings right now.");
      setIsSaving(false);
    }
  }

  async function saveManualRate() {
    setIsSaving(true);
    setMessage("");
    setHasError(false);
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
        setHasError(true);
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
      setHasError(true);
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
          <SmoothButton
            variant="primary"
            size="md"
            loading={isSaving}
            onClick={() => void saveSettings()}
          >
            {isSaving ? "Saving..." : "Save currency"}
          </SmoothButton>
        }
      />

      {message ? (
        <p
          role={hasError ? "alert" : "status"}
          className={`text-sm font-medium ${hasError ? "text-rose-200" : "text-emerald-200"}`}
        >
          {message}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-[minmax(0,420px)_auto] sm:items-end">
        <CurrencySelect
          value={currency}
          onChange={setCurrency}
          label="Workspace currency"
        />
        <div className="pb-2">
          <InfoTip
            label="This currency formats lead values, pipeline reports, and new targets. An individual target may still use a different currency."
            align="left"
          />
        </div>
      </div>

      <p className="text-sm text-white/65">
        Saved reporting currency: <strong>{savedCurrency}</strong>. Existing
        offers, targets and payments keep their explicitly selected currency.
      </p>
      {currency !== savedCurrency ? (
        <label className="block max-w-md text-sm">
          Conversion rate (optional if a saved rate exists)
          <span className="mt-2 flex items-center gap-3">
            <span className="shrink-0">1 {savedCurrency} =</span>
            <input
              className="admin-input min-h-11"
              aria-label={`Conversion rate from ${savedCurrency} to ${currency}`}
              type="number"
              inputMode="decimal"
              min="0.00000001"
              step="any"
              value={changeRate}
              onChange={(e) => setChangeRate(e.target.value)}
              placeholder="Saved rate"
            />
            <span>{currency}</span>
          </span>
          <span className="mt-2 block text-xs text-white/60">
            A successful change converts reporting amounts. If no rate is
            available, the change is rejected and {savedCurrency} remains saved.
          </span>
        </label>
      ) : null}

      <div className="border-t border-white/10 pt-5">
        <SectionHeader
          eyebrow="Rates"
          title="Manual exchange-rate overrides"
          description="Add rates for currencies you use in reports."
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(160px,0.7fr)_auto] sm:items-end">
          <CurrencySelect
            value={rateBaseCurrency}
            onChange={setRateBaseCurrency}
            label="From"
          />
          <CurrencySelect
            value={rateQuoteCurrency}
            onChange={setRateQuoteCurrency}
            label="To"
          />
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
          <SmoothButton
            variant="secondary"
            size="md"
            loading={isSaving}
            onClick={() => void saveManualRate()}
          >
            Save rate
          </SmoothButton>
        </div>
        {rates.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {rates.map((rate) => (
              <span
                key={rate.id}
                className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium text-white/75"
              >
                1 {rate.baseCurrency} ={" "}
                {rate.rate.toLocaleString(undefined, {
                  maximumFractionDigits: 8,
                })}{" "}
                {rate.quoteCurrency} · {rate.source}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
