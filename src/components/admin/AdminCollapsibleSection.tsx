"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { SmoothButton } from "./ui/SmoothButton";
import { GradientText } from "./ui/GradientText";

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
        "ld-glass-panel relative overflow-hidden rounded-[var(--ld-card-radius)] transition-[padding,box-shadow,transform,border-color] duration-200",
        isOpen ? "p-5 sm:p-6" : "p-3 sm:p-4",
        !isOpen && "border-white/25",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--ld-color-accent)_22%,transparent),transparent_46%)]" />

      <div className="relative flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
              {eyebrow}
            </p>
          ) : null}
          <h2
            className={cn(
              "mt-2 min-w-0 max-w-2xl font-[family:var(--font-heading)] leading-[1.02] tracking-[-0.05em] text-white transition-all duration-200",
              isOpen ? "text-[1.45rem] sm:text-[1.65rem]" : "text-[1.25rem] sm:text-[1.38rem]",
            )}
          >
            <GradientText variant="subtle">{title}</GradientText>
          </h2>
          {description && isOpen ? (
            <p className="mt-2 min-w-0 max-w-2xl text-sm leading-6 text-white/70">{description}</p>
          ) : null}
        </div>

        <div className="flex w-full min-w-0 items-center justify-between gap-3 lg:w-auto lg:justify-end">
          {actions ? <div className="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">{actions}</div> : <span />}
          <SmoothButton
            variant="ghost"
            size="sm"
            icon={<ChevronDown className={cn("h-4 w-4 transition", isOpen ? "rotate-180" : "")} />}
            onClick={() => setIsOpen((current) => !current)}
            aria-expanded={isOpen}
            aria-label={isOpen ? "Collapse section" : "Expand section"}
            title={isOpen ? "Collapse section" : "Expand section"}
            className="h-10 w-10 px-0"
          >
            <span className="sr-only">{isOpen ? "Collapse section" : "Expand section"}</span>
          </SmoothButton>
        </div>
      </div>

      {isOpen ? (
        <>
          <div className={cn("relative mt-4 ld-animate-fade-in-up", bodyClassName)}>{children}</div>
          <div className="ld-divider mt-5" />
        </>
      ) : null}
    </section>
  );
}
