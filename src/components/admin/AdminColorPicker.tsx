"use client";

import { Check, Pipette } from "lucide-react";
import { cn } from "@/lib/cn";

const DEFAULT_SWATCHES = [
  "#2563eb",
  "#0ea5e9",
  "#14b8a6",
  "#22c55e",
  "#f4b400",
  "#f97316",
  "#ec4899",
  "#8b5cf6",
];

export function AdminColorPicker({
  label,
  value,
  onChange,
  swatches = DEFAULT_SWATCHES,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  swatches?: string[];
}) {
  const safeValue = /^#[0-9a-f]{6}$/i.test(value) ? value : swatches[0];

  return (
    <fieldset className="min-w-0 space-y-2.5">
      <legend className="text-sm font-medium text-white/90">{label}</legend>
      <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-[18px] border border-white/10 bg-black/15 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        {swatches.map((swatch) => {
          const selected = safeValue.toLowerCase() === swatch.toLowerCase();
          return (
            <button
              key={swatch}
              type="button"
              aria-label={`Use ${label.toLowerCase()} ${swatch}`}
              aria-pressed={selected}
              onClick={() => onChange(swatch)}
              className={cn(
                "relative h-9 w-9 shrink-0 rounded-[13px] border transition duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
                selected
                  ? "border-white shadow-[0_0_0_3px_rgba(255,255,255,0.12),0_10px_24px_rgba(0,0,0,0.28)]"
                  : "border-white/14 hover:border-white/40",
              )}
              style={{ backgroundColor: swatch }}
            >
              {selected ? (
                <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
              ) : null}
            </button>
          );
        })}
        <label className="relative inline-flex h-9 min-w-28 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[13px] border border-white/12 bg-white/[0.06] px-3 text-xs font-semibold text-white/76 transition hover:border-white/24 hover:bg-white/[0.1]">
          <span
            className="h-4 w-4 rounded-full border border-white/30"
            style={{ backgroundColor: safeValue }}
          />
          <Pipette className="h-3.5 w-3.5" />
          Custom
          <input
            type="color"
            value={safeValue}
            onChange={(event) => onChange(event.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label={`Choose custom ${label.toLowerCase()}`}
          />
        </label>
      </div>
    </fieldset>
  );
}
