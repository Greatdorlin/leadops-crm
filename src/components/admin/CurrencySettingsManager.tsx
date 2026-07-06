"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { SmoothButton } from "@/components/admin/ui";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { CurrencySelect } from "./CurrencySelect";
import { isSupportedCurrency } from "@/lib/currency";

export function CurrencySettingsManager({
  initialGlobalCurrency,
}: {
  initialGlobalCurrency: string;
}) {
  const router = useRouter();
  const [currency, setCurrency] = useState<string>(
    isSupportedCurrency(initialGlobalCurrency) ? initialGlobalCurrency : "USD"
  );
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function saveSettings() {
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/settings/currency", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ globalCurrency: currency }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessage(payload?.error ?? "We couldn't save currency settings right now.");
        setIsSaving(false);
        return;
      }

      setMessage("Currency settings saved.");
      setIsSaving(false);
      startTransition(() => router.refresh());
    } catch {
      setMessage("We couldn't save currency settings right now.");
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

      <div className="grid gap-4 sm:grid-cols-2">
        <CurrencySelect value={currency} onChange={setCurrency} label="Workspace currency" />
      </div>

      <div className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4 text-sm text-white/70">
        <p className="font-semibold text-white/80">How this works</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 leading-6">
          <li>The default currency applies to sales targets, lead estimated values, and pipeline reporting.</li>
          <li>Individual sales targets can still use a different currency if needed.</li>
          <li>Currency formatting adapts to the locale of each selected currency for proper display.</li>
        </ul>
      </div>
    </div>
  );
}
