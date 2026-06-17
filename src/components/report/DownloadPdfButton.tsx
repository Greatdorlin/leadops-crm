"use client";

import { Download } from "lucide-react";
import { cn } from "@/lib/cn";

export function DownloadPdfButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/10 px-6 text-white/78 transition hover:bg-white/[0.04] print:hidden",
        className,
      )}
    >
      <Download className="h-4 w-4" />
      Download Report PDF
    </button>
  );
}
