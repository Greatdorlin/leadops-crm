import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-x-5 gap-y-3", className)}>
      <div className="min-w-0 flex-[1_1_14rem]">
        {eyebrow ? <p className="mb-1 text-xs font-medium text-white/60">{eyebrow}</p> : null}
        <h2 className="break-words text-xl font-semibold leading-tight tracking-[-0.025em] text-white">{title}</h2>
        {description ? <p className="mt-1 max-w-2xl text-sm leading-6 text-white/70">{description}</p> : null}
      </div>
      {actions ? <div className="flex min-w-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
