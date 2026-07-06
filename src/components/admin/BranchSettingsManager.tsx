"use client";

import { useCallback, useEffect, useState } from "react";
import { GlassSurface } from "@/components/admin/ui";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { CurrencySelect } from "@/components/admin/CurrencySelect";
import type { BranchRow } from "@/lib/db/schema";
import { getCurrencySymbol } from "@/lib/currency";

function BranchCurrencyRow({ branch, onSaved }: { branch: BranchRow; onSaved: () => void }) {
  const [currency, setCurrency] = useState<string>(branch.currency ?? "USD");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/branches/${branch.id}/currency`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessage(payload?.error ?? "Could not update branch currency.");
        setSaving(false);
        return;
      }
      setMessage("Saved.");
      onSaved();
      setSaving(false);
    } catch {
      setMessage("Could not update branch currency.");
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{branch.name}</p>
        {branch.location ? (
          <p className="mt-1 truncate text-sm text-white/70">{branch.location}</p>
        ) : null}
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
          Current: {getCurrencySymbol(branch.currency ?? "USD")} {branch.currency ?? "USD"}
        </p>
      </div>
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <CurrencySelect value={currency} onChange={setCurrency} label="Branch currency" />
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="admin-button-primary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
      {message ? (
        <p className={`text-sm font-medium ${message.includes("Could") ? "text-rose-200" : "text-emerald-200"}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function BranchSettingsManager() {
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchBranches = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/branches");
      const payload = (await response.json().catch(() => null)) as { branches?: BranchRow[] } | null;
      if (!response.ok) {
        setError("Could not load branches.");
        setLoading(false);
        return;
      }
      setBranches(payload?.branches ?? []);
      setError("");
      setLoading(false);
    } catch {
      setError("Could not load branches.");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchBranches();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchBranches]);

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Branches"
        title="Branch settings"
        description="Manage branch locations and set the currency used for each branch."
      />

      {error ? <p className="text-sm font-medium text-rose-200">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-white/70">Loading branches…</p>
      ) : branches.length === 0 ? (
        <GlassSurface className="p-6 text-center">
          <p className="text-sm font-semibold text-white">No branches yet</p>
          <p className="mt-2 text-sm text-white/70">
            Branches will appear here once they are added to your workspace.
          </p>
        </GlassSurface>
      ) : (
        <div className="space-y-3">
          {branches.map((branch) => (
            <BranchCurrencyRow key={branch.id} branch={branch} onSaved={fetchBranches} />
          ))}
        </div>
      )}
    </div>
  );
}
