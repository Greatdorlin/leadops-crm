import { cn } from "@/lib/cn";
import type { ReactNode } from "react";
import { GradientText } from "./GradientText";

export interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  variant?: "default" | "large" | "compact";
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
  variant = "default",
  className,
}: SectionHeaderProps) {
  const isLarge = variant === "large";

  return (
    <div className={cn("ld-animate-fade-in-up", className)}>
      {eyebrow ? (
        <p className="ld-text-gradient text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
          {eyebrow}
        </p>
      ) : null}
      <div
        className={cn(
          "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
          variant === "compact" && "gap-2"
        )}
      >
        <div className="min-w-0">
          {isLarge ? (
            <h1 className="font-[family:var(--font-heading)] text-[1.85rem] leading-[0.98] tracking-[-0.05em] text-white sm:text-[2.2rem]">
              <GradientText>{title}</GradientText>
            </h1>
          ) : (
            <h2
              className={cn(
                "font-[family:var(--font-heading)] tracking-[-0.04em] text-white",
                variant === "compact"
                  ? "text-lg leading-tight"
                  : "text-[1.35rem] leading-tight"
              )}
            >
              {title}
            </h2>
          )}
          {description ? (
            <p
              className={cn(
                "mt-1.5 max-w-2xl text-sm leading-6 text-white/70",
                variant === "compact" && "mt-1 text-xs leading-5"
              )}
            >
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2 max-sm:mt-2 max-sm:flex-wrap">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
