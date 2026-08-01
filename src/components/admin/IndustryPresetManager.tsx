"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Building2, Plane, Briefcase, Stethoscope, GraduationCap, Shield, ShoppingCart, Car, Code, Scale, Dumbbell, X, ChevronRight, Eye, LayoutTemplate, ListTree } from "lucide-react";
import type { IndustryPreset } from "@/lib/crm/industry-presets";
import { SmoothButton } from "./ui/SmoothButton";
import { AdminOverlayPortal } from "./AdminOverlayPortal";

const presetIcons: Record<string, React.ReactNode> = {
  real_estate: <Building2 className="h-5 w-5" />,
  travel: <Plane className="h-5 w-5" />,
  service: <Briefcase className="h-5 w-5" />,
  "healthcare-clinics": <Stethoscope className="h-5 w-5" />,
  "education-elearning": <GraduationCap className="h-5 w-5" />,
  "insurance-brokerage": <Shield className="h-5 w-5" />,
  "ecommerce-retail-b2b": <ShoppingCart className="h-5 w-5" />,
  "automotive-dealership": <Car className="h-5 w-5" />,
  "saas-b2b-software": <Code className="h-5 w-5" />,
  "legal-law-firm": <Scale className="h-5 w-5" />,
  "fitness-wellness-gym": <Dumbbell className="h-5 w-5" />,
};

export function IndustryPresetManager({ presets }: { presets: IndustryPreset[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const activePreset = presets.find((p) => p.id === selected);

  async function applyPreset() {
    if (!selected) return;
    setApplying(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/settings/industry-preset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presetId: selected }),
      });
      const payload = (await res.json().catch(() => null)) as {
        error?: string;
        created?: { stages: number; sources: number; customFields: number; options: number };
      } | null;
      if (!res.ok) {
        setMessage(payload?.error ?? "Preset could not be applied.");
        return;
      }
      const created = payload?.created;
      const total = created ? created.stages + created.sources + created.customFields : 0;
      setApplied(true);
      setMessage(total > 0 ? `${total} settings added. Existing settings were preserved.` : "This preset is already applied.");
      router.refresh();
    } catch {
      setMessage("Preset could not be applied. Try again.");
    } finally {
      setApplying(false);
    }
  }

  function handleSelect(id: string) {
    setSelected(id);
    setApplied(false);
    setMessage("");
    setShowPreview(true);
  }

  function closePreview() {
    setShowPreview(false);
    setSelected(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-wider text-white/50 font-medium">Industry setup</p>
        <h2 className="text-2xl font-semibold text-white mt-1">Choose your industry</h2>
        <p className="text-sm text-white/50 mt-1">
          Pick a preset to add recommended stages, sources, and custom fields without replacing existing setup.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => handleSelect(preset.id)}
            className={`relative rounded-2xl border p-4 text-left transition-all duration-200 ${
              selected === preset.id
                ? "border-[color:var(--ld-color-accent)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--ld-color-primary)_12%,transparent),color-mix(in_srgb,var(--ld-color-accent)_8%,transparent))]"
                : "border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.06]"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-white/60">{presetIcons[preset.id] || <LayoutTemplate className="h-5 w-5" />}</div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{preset.name}</p>
                <p className="mt-0.5 text-xs text-white/50 line-clamp-2">{preset.description}</p>
              </div>
            </div>
            {selected === preset.id && (
              <div className="absolute right-3 top-3">
                <Check className="h-4 w-4 text-[color:var(--ld-color-accent)]" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Modal Preview */}
      {showPreview && activePreset && (
        <AdminOverlayPortal onClose={closePreview}>
        <div className="fixed inset-0 z-[160] flex items-end justify-center sm:items-center sm:p-6">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closePreview}
          />
          {/* Modal */}
          <div role="dialog" aria-modal="true" aria-label="Industry preset preview" className="admin-surface ld-premium-scrollbar relative max-h-[90dvh] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-t-[28px] shadow-2xl sm:rounded-3xl">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#101421]/95 px-5 py-4 backdrop-blur-xl sm:px-6">
              <div className="flex items-center gap-3">
                <div className="text-white/60">{presetIcons[activePreset.id] || <LayoutTemplate className="h-5 w-5" />}</div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{activePreset.name}</h3>
                  <p className="text-xs text-white/50">{activePreset.description}</p>
                </div>
              </div>
              <button
                onClick={closePreview}
                className="rounded-lg p-2 text-white/40 hover:bg-white/10 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-6 p-5 sm:p-6">
              {/* Stages */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-white/40" />
                  <p className="text-sm font-medium text-white/80">Pipeline Stages ({activePreset.stages.length})</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activePreset.stages.map((s) => (
                    <span
                      key={s.value}
                      className="rounded-full px-3 py-1.5 text-xs font-medium text-white"
                      style={{ backgroundColor: s.color || "#64748b" }}
                    >
                      {s.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Sources */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ChevronRight className="h-4 w-4 text-white/40" />
                  <p className="text-sm font-medium text-white/80">Lead Sources ({activePreset.sources.length})</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activePreset.sources.map((s) => (
                    <span key={s.value} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white/70">
                      {s.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Custom Fields */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ListTree className="h-4 w-4 text-white/40" />
                  <p className="text-sm font-medium text-white/80">Custom Fields ({activePreset.customFields.length})</p>
                </div>
                <div className="grid gap-2">
                  {activePreset.customFields.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
                      <span className="text-xs font-medium text-white/80">{f.label}</span>
                      <span className="text-[10px] uppercase tracking-wider text-white/30">{f.fieldType}</span>
                      {f.isRequired && <span className="text-[10px] text-red-400">required</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggested preview fields */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-white/40" />
                  <p className="text-sm font-medium text-white/80">Suggested lead card fields</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activePreset.leadPreviewFields.map((field) => (
                    <span key={field} className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-white/60">
                      {field}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-white/45">Use these suggestions when arranging lead cards in Settings.</p>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 z-10 border-t border-white/10 bg-[#101421]/95 px-5 py-4 backdrop-blur-xl sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <SmoothButton
                  variant="primary"
                  size="sm"
                  onClick={applyPreset}
                  disabled={applying || applied}
                  icon={applied ? <Check className="h-4 w-4" /> : undefined}
                >
                  {applied ? "Applied" : applying ? "Applying..." : "Apply this preset"}
                </SmoothButton>
                <button
                  onClick={closePreview}
                  className="text-sm text-white/50 hover:text-white transition"
                >
                  Cancel
                </button>
                {message ? <p className={applied ? "text-sm text-emerald-300" : "text-sm text-rose-200"} role="status">{message}</p> : null}
              </div>
            </div>
          </div>
        </div>
        </AdminOverlayPortal>
      )}
    </div>
  );
}
