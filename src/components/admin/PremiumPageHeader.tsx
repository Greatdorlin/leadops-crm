import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { InfoTip } from "./ui/InfoTip";

export function PremiumPageHeader({
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
    <div className={cn("flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between", className)}>
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ld-color-accent)]">
            {eyebrow}
          </p>
        ) : null}
        <div className="mt-2 flex items-center gap-2.5">
          <h2 className="break-words text-[2rem] font-semibold leading-[1.08] tracking-[-0.055em] text-white sm:text-[2.45rem]">
            {title}
          </h2>
          {useDescriptionTip && description ? <InfoTip label={description} align="left" /> : null}
        </div>
        {description && !useDescriptionTip ? (
          <p className="mt-3 text-sm leading-6 text-white/70">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}
