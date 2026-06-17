import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function FilterBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(249,251,255,0.9)_100%)] p-3 shadow-[0_18px_38px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:p-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
