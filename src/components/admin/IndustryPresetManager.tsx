"use client";

import { useState } from "react";
import { Check, Building2, Plane, Briefcase } from "lucide-react";
import type { IndustryPreset } from "@/lib/crm/industry-presets";
import { GlassSurface } from "./ui/GlassSurface";
import { SmoothButton } from "./ui/SmoothButton";
import { SectionHeader } from "./ui/SectionHeader";

const presetIcons: Record<string, React.ReactNode> = {
  real_estate: <Building2 className="h-6 w-6" />,
  travel: <Plane className="h-6 w-6" />,
  service: <Briefcase className="h-6 w-6" />,
};

export function IndustryPresetManager({ presets }: { presets: IndustryPreset[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  const activePreset = presets.find((p) => p.id === selected);

  async function applyPreset() {
    if (!selected) return;
    setApplying(true);
    try {
      const res = await fetch("/api/admin/settings/industry-preset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presetId: selected }),
      });
      if (res.ok) setApplied(true);
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Industry setup"
        title="Choose your industry"
        description="Pick a preset that matches your business. This will create recommended stages, sources, and custom fields."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => { setSelected(preset.id); setApplied(false); }}
            className={`relative rounded-[24px] border p-5 text-left transition ${
              selected === preset.id
                ? "border-[color:var(--ld-color-accent)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--ld-color-primary)_12%,transparent),color-mix(in_srgb,var(--ld-color-accent)_8%,transparent))]"
                : "border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.06]"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="text-white/70">{presetIcons[preset.id]}</div>
              <div>
                <p className="text-base font-semibold text-white">{preset.name}</p>
                <p className="mt-1 text-sm text-white/60">{preset.description}</p>
              </div>
            </div>
            {selected === preset.id && (
              <div className="absolute right-4 top-4">
                <Check className="h-5 w-5 text-[color:var(--ld-color-accent)]" />
              </div>
            )}
          </button>
        ))}
      </div>

      {activePreset && (
        <GlassSurface intensity="medium" border className="p-5 space-y-4">
          <h3 className="text-base font-semibold text-white">Preview: {activePreset.name}</h3>
          
          <div className="space-y-3">
            <p className="text-sm font-medium text-white/80">Stages ({activePreset.stages.length})</p>
            <div className="flex flex-wrap gap-2">
              {activePreset.stages.map((s) => (
                <span
                  key={s.value}
                  className="rounded-full px-3 py-1 text-xs font-medium text-white"
                  style={{ backgroundColor: s.color || "#64748b" }}
                >
                  {s.label}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-white/80">Sources ({activePreset.sources.length})</p>
            <div className="flex flex-wrap gap-2">
              {activePreset.sources.map((s) => (
                <span key={s.value} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-medium text-white/70">
                  {s.label}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-white/80">Custom Fields ({activePreset.customFields.length})</p>
            <div className="flex flex-wrap gap-2">
              {activePreset.customFields.map((f, i) => (
                <span key={i} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-medium text-white/70">
                  {f.label} {f.isRequired && "*"}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <SmoothButton
              variant="primary"
              size="sm"
              onClick={applyPreset}
              disabled={applying || applied}
              icon={applied ? <Check className="h-4 w-4" /> : undefined}
            >
              {applied ? "Applied" : applying ? "Applying..." : "Apply this preset"}
            </SmoothButton>
            {applied && (
              <p className="text-sm text-emerald-400">Preset applied successfully. Review your settings.</p>
            )}
          </div>
        </GlassSurface>
      )}
    </div>
  );
}
