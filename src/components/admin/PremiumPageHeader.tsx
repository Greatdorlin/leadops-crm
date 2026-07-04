import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

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
  return (
    <div className={cn("flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between", className)}>
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ld-color-accent)]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-2 text-[2.4rem] font-semibold leading-[0.95] tracking-[-0.06em] text-white sm:text-[3rem]">
          {title}
        </h1>
        {description ? <p className="mt-3 text-base leading-7 text-white/70">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}
