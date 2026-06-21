"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Sparkles } from "lucide-react";
import type { ResolvedWorkspaceSettings } from "@/lib/crm/workspace-settings";
import {
  getVerticalPreset,
  INDUSTRY_PRESETS,
  type IndustryPresetKey,
} from "@/lib/crm/workspace-settings";

export function IndustryPresetManager({
  initialSettings,
}: {
  initialSettings: ResolvedWorkspaceSettings;
}) {
  const router = useRouter();
  const [presetKey, setPresetKey] = useState<IndustryPresetKey>(initialSettings.industryPreset);
  const [applyMissingDefaults, setApplyMissingDefaults] = useState(false);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const preset = getVerticalPreset(presetKey);

  async function saveSettings() {
    setIsSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/settings/industry", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industryPreset: presetKey, applyMissingDefaults }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessage(payload?.error ?? "We couldn't apply this industry preset right now.");
        setIsSaving(false);
        return;
      }

      setMessage("Industry preset applied.");
      setIsSaving(false);
      startTransition(() => router.refresh());
    } catch {
      setMessage("We couldn't apply this industry preset right now.");
      setIsSaving(false);
    }
  }

  return (
    <section className="admin-surface space-y-5 rounded-[32px] p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ld-color-accent)]">
            Industry preset
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">Start with the right sales language</h2>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-xs font-semibold text-white/58">
          <Sparkles className="h-3.5 w-3.5 text-cyan-100" />
          Safe defaults
        </span>
      </div>
      <label className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">Choose preset</span>
        <select
          value={presetKey}
          onChange={(event) => setPresetKey(event.target.value as IndustryPresetKey)}
          className="admin-select h-11 w-full rounded-2xl px-4 text-sm outline-none"
        >
          {INDUSTRY_PRESETS.map((key) => (
            <option key={key} value={key}>
              {getVerticalPreset(key).label}
            </option>
          ))}
        </select>
      </label>

      <div className="admin-surface-soft rounded-[24px] p-4">
        <p className="text-sm font-semibold text-white">{preset.label}</p>
        <p className="mt-2 text-sm leading-6 text-white/60">{preset.description}</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/48">Stages</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {preset.stageNames.map((item) => (
                <span key={item} className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 text-xs font-medium text-white/70">
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/48">Sources</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {preset.sourceNames.map((item) => (
                <span key={item} className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 text-xs font-medium text-white/70">
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/48">Recommended fields</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {preset.recommendedCustomFields.map((field) => (
                <span key={field.key} className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 text-xs font-medium text-white/70">
                  {field.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <label className="inline-flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-semibold text-white/70">
        <span className="inline-flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-200" />
          Apply missing stages, sources, and recommended fields
        </span>
        <input
          type="checkbox"
          checked={applyMissingDefaults}
          onChange={(event) => setApplyMissingDefaults(event.target.checked)}
          className="admin-toggle"
        />
      </label>

      <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-white/54">Existing settings stay in place unless you choose to apply missing defaults.</p>
        <button
          type="button"
          onClick={() => void saveSettings()}
          disabled={isSaving}
          className="admin-button-primary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold"
        >
          {isSaving ? "Applying..." : "Apply preset"}
        </button>
      </div>
      {message ? <p className="text-sm text-white/62">{message}</p> : null}
    </section>
  );
}
