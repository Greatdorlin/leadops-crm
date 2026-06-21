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
        "ld-glass-panel rounded-[28px] p-3 sm:p-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
