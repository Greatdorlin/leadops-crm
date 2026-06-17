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
        "admin-surface relative overflow-hidden rounded-[30px] transition-[padding,box-shadow] duration-200",
        isOpen ? "p-5 sm:p-6" : "p-4 sm:p-5",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,rgba(255,190,0,0.1),transparent_44%)]" />

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0b123f]/54">
              {eyebrow}
            </p>
          ) : null}
          <h2
            className={cn(
              "mt-2 max-w-2xl font-[family:var(--font-heading)] leading-[1.02] tracking-[-0.05em] text-slate-950 transition-all duration-200",
              isOpen ? "text-[1.45rem] sm:text-[1.65rem]" : "text-[1.25rem] sm:text-[1.38rem]",
            )}
          >
            {title}
          </h2>
          {description && isOpen ? (
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">{description}</p>
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
            className="admin-icon-button shrink-0"
          >
            <ChevronDown className={cn("h-4 w-4 transition", isOpen ? "rotate-180" : "")} />
          </button>
        </div>
      </div>

      {isOpen ? <div className={cn("relative mt-4", bodyClassName)}>{children}</div> : null}
    </section>
  );
}
