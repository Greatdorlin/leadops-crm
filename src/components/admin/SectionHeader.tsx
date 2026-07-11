import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { InfoTip } from "./ui/InfoTip";

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
  const useDescriptionTip = Boolean(description && description.length > 48);

  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div>
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
            {eyebrow}
          </p>
        ) : null}
        <div className="mt-2 flex items-center gap-2.5">
          <h2 className="break-words font-[family:var(--font-heading)] text-[1.5rem] leading-[1.12] tracking-[-0.045em] text-white">
            {title}
          </h2>
          {useDescriptionTip && description ? <InfoTip label={description} align="left" /> : null}
        </div>
        {description && !useDescriptionTip ? (
          <p className="mt-2 max-w-3xl text-sm leading-7 text-white/70">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}
