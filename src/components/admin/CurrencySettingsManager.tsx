"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { SmoothButton } from "@/components/admin/ui";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { InfoTip } from "@/components/admin/ui/InfoTip";
import { CurrencySelect } from "./CurrencySelect";
import { isSupportedCurrency } from "@/lib/currency";

export function CurrencySettingsManager({
  initialGlobalCurrency,
  demoMode = false,
}: {
  initialGlobalCurrency: string;
  demoMode?: boolean;
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

    if (demoMode) {
      setMessage("Currency updated for this preview.");
      setIsSaving(false);
      return;
    }

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

      <div className="grid gap-4 sm:grid-cols-[minmax(0,420px)_auto] sm:items-end">
        <CurrencySelect value={currency} onChange={setCurrency} label="Workspace currency" />
        <div className="pb-2">
          <InfoTip
            label="This currency formats lead values, pipeline reports, and new targets. An individual target may still use a different currency."
            align="left"
          />
        </div>
      </div>
    </div>
  );
}
