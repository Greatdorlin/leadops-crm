"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SmoothButton } from "@/components/admin/ui";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { InfoTip } from "@/components/admin/ui/InfoTip";
import { CurrencySelect } from "./CurrencySelect";
import { isSupportedCurrency } from "@/lib/currency";
import type { CurrencyExchangeRateRecord, ExchangeRateQuote } from "@/lib/crm/currency-exchange";

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
  const [rateRevision,setRateRevision] = useState(0);
  const [changeRate, setChangeRate] = useState("");
  const [savedCurrency, setSavedCurrency] = useState(initialGlobalCurrency);
  const [quoteState, setQuoteState] = useState<{key:string; quote?:ExchangeRateQuote; error?:string}>({key:""});
  useEffect(() => {
    if (currency === savedCurrency || demoMode) return;
    const controller = new AbortController();
    const key = `${savedCurrency}:${currency}`;
    fetch(`/api/admin/settings/currency?base=${savedCurrency}&quote=${currency}`, {cache:"no-store", signal:controller.signal})
      .then(async r => {const d=await r.json(); if(!r.ok) throw new Error(d.error); return d.quote as ExchangeRateQuote;})
      .then(quote => setQuoteState({key,quote}))
      .catch(e => {if(!controller.signal.aborted) setQuoteState({key,error:e.message || "Rate unavailable. Try again or use your own rate."});});
    return () => controller.abort();
  }, [currency,savedCurrency,demoMode,rateRevision]);
  const [hasError, setHasError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const quoteKey = `${savedCurrency}:${currency}`;
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
        setRateRevision(v=>v+1);
        window.dispatchEvent(new Event("workspace:settings-saved"));
        startTransition(()=>router.refresh());
        setMessage("Manual exchange rate saved.");
      }
    } catch {
      setHasError(true);
      setMessage("We couldn't save this exchange rate.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveAutomaticRate() {
    setIsSaving(true); setMessage(""); setHasError(false);
    try {
      if (demoMode) { setMessage("Automatic rates selected for this preview."); return; }
      const r=await fetch("/api/admin/settings/currency",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:"automatic",baseCurrency:rateBaseCurrency,quoteCurrency:rateQuoteCurrency})});
      const d=await r.json(); if(!r.ok) throw new Error(d.error);
      setRates(d.exchangeRates); setManualRate(""); setRateRevision(v=>v+1); setMessage("Latest rate saved. Future rates update automatically.");
      window.dispatchEvent(new Event("workspace:settings-saved")); router.refresh();
    } catch(e) {setHasError(true);setMessage(e instanceof Error ? e.message : "Rate unavailable. Try again.");}
    finally {setIsSaving(false);}
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Currency"
        title="Default workspace currency"
        description="Choose a currency. We’ll fetch the latest rate and convert your reporting values."
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
          onChange={next => {setCurrency(next);setChangeRate("");}}
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
        <div className="max-w-xl space-y-3">
          <p role="status" className="text-sm text-white/75">
            {quoteState.key !== quoteKey ? "Finding the latest rate…" : quoteState.quote ?
              `1 ${savedCurrency} = ${quoteState.quote.rate.toLocaleString(undefined,{maximumFractionDigits:8})} ${currency} · ${quoteState.quote.source === "manual" ? "Your saved override" : "Latest published rate"} · ${new Date(quoteState.quote.asOf).toLocaleDateString()}` : quoteState.error}
          </p>
          <details onToggle={e=>{if(!e.currentTarget.open) setChangeRate("");}}>
            <summary className="cursor-pointer py-2 text-sm text-white/65 underline underline-offset-4">Use my own rate</summary>
            <label className="mt-2 block text-sm">
              1 {savedCurrency} equals ({currency})
              <input className="admin-input mt-2 min-h-11 w-full" aria-label={`Conversion rate from ${savedCurrency} to ${currency}`} type="number" inputMode="decimal" min="0.00000001" step="any" value={changeRate} onChange={e=>setChangeRate(e.target.value)} placeholder="Leave blank for automatic rates" />
            </label>
          </details>
        </div>
      ) : null}

      <details className="border-t border-white/10 pt-5">
        <summary className="cursor-pointer py-2 text-sm font-medium">Manage exchange rates</summary>
        <p className="mt-2 text-sm text-white/60">Rates update automatically when needed. Add your own rate only if you prefer it. Use latest rate to replace a saved override.</p>
        <SectionHeader
          eyebrow="Rates"
          title="Optional overrides"
          description="Your saved rate takes priority for this currency pair."
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
        <SmoothButton variant="secondary" className="mt-3" loading={isSaving} onClick={() => void saveAutomaticRate()}>Use latest rate</SmoothButton>
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
                {rate.quoteCurrency} · {rate.source === "manual" ? "Your override" : "Automatic"}{rate.fetchedAt ? ` · ${new Date(rate.fetchedAt).toLocaleDateString()}` : ""}
              </span>
            ))}
          </div>
        ) : null}
      </details>
    </div>
  );
}
