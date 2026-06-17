"use client";

import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/cn";
import type { AssessmentStepKey } from "@/lib/pathway-engine/types";

interface ProgressHeaderProps {
  currentStep: number;
  currentStepKey: AssessmentStepKey | "analysis";
  onBack?: () => void;
  totalSteps: number;
}

export function ProgressHeader({
  currentStep,
  onBack,
  totalSteps,
}: ProgressHeaderProps) {
  const percent = Math.min(100, Math.max(0, (currentStep / totalSteps) * 100));

  return (
    <div className="mx-auto max-w-[980px] space-y-4 px-1 md:px-2">
      <div className="flex items-center justify-between rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 [font-family:var(--font-body)] text-[0.68rem] uppercase tracking-[0.16em] text-white/72 shadow-[0_16px_40px_rgba(1,5,18,0.2)] md:px-5 md:text-[0.8rem]">
        <button
          type="button"
          onClick={onBack}
          disabled={!onBack}
          className={cn(
            "inline-flex items-center gap-2 transition",
            onBack ? "hover:text-[color:var(--fc-yellow)]" : "pointer-events-none opacity-0",
          )}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <span className="assessment-chip border-white/10 bg-white/[0.03] px-3 py-2 text-white/72">
          Step {currentStep} of {totalSteps}
        </span>
      </div>
      <div className="h-[3px] overflow-hidden rounded-full bg-white/12">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#FFBE00_0%,#FFD54D_42%,#FFFFFF_100%)] transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

