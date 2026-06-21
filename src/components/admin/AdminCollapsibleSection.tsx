"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export function AdminCollapsibleSection({
  eyebrow,
  title,
  description,
  actions,
  defaultOpen = true,
  className,
  bodyClassName,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section
      className={cn(
        "ld-glass-panel relative overflow-hidden rounded-[var(--ld-card-radius)] transition-[padding,box-shadow,transform] duration-200",
        isOpen ? "p-5 sm:p-6" : "p-4 sm:p-5",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--ld-color-accent)_22%,transparent),transparent_46%)]" />

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
              {eyebrow}
            </p>
          ) : null}
          <h2
            className={cn(
              "mt-2 max-w-2xl font-[family:var(--font-heading)] leading-[1.02] tracking-[-0.05em] text-white transition-all duration-200",
              isOpen ? "text-[1.45rem] sm:text-[1.65rem]" : "text-[1.25rem] sm:text-[1.38rem]",
            )}
          >
            {title}
          </h2>
          {description && isOpen ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/58">{description}</p>
          ) : null}
        </div>

        <div className="flex w-full items-center justify-between gap-3 lg:w-auto lg:justify-end">
          {actions ? <div className="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">{actions}</div> : <span />}

          <button
            type="button"
            onClick={() => setIsOpen((current) => !current)}
            aria-expanded={isOpen}
            aria-label={isOpen ? "Collapse section" : "Expand section"}
            title={isOpen ? "Collapse section" : "Expand section"}
            className="ld-floating-control inline-flex h-10 w-10 shrink-0 items-center justify-center transition hover:-translate-y-0.5 hover:bg-white/10"
          >
            <ChevronDown className={cn("h-4 w-4 transition", isOpen ? "rotate-180" : "")} />
          </button>
        </div>
      </div>

      {isOpen ? <div className={cn("relative mt-4", bodyClassName)}>{children}</div> : null}
    </section>
  );
}
