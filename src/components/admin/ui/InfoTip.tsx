"use client";

import { Info } from "lucide-react";
import { cn } from "@/lib/cn";

export function InfoTip({
  label,
  className,
  align = "center",
}: {
  label: string;
  className?: string;
  align?: "left" | "center" | "right";
}) {
  const alignmentClass = {
    left: "left-0 translate-x-0",
    center: "left-1/2 -translate-x-1/2",
    right: "right-0 translate-x-0",
  }[align];

  return (
    <span className={cn("group relative inline-flex", className)}>
      <button
        type="button"
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/55 transition hover:bg-white/[0.1] hover:text-white"
        aria-label={label}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      <span
        className={cn(
          "pointer-events-none absolute top-full z-20 mt-2 hidden w-56 rounded-2xl border border-white/12 bg-[#091326]/95 px-3 py-2 text-left text-xs leading-5 text-white/72 shadow-[0_18px_42px_rgba(0,0,0,0.32)] group-hover:block group-focus-within:block",
          alignmentClass,
        )}
      >
        {label}
      </span>
    </span>
  );
}
