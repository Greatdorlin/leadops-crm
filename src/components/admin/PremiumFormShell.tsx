import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { GlassCard } from "./GlassCard";

export function PremiumFormShell({
  children,
  title,
  description,
  className,
}: {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <GlassCard glassStyle="vibrant" className={cn("p-5 sm:p-6", className)}>
      {title || description ? (
        <div className="mb-5 border-b border-white/10 pb-4">
          {title ? <h2 className="text-xl font-semibold tracking-[-0.04em] text-white">{title}</h2> : null}
          {description ? <p className="mt-1 text-sm leading-6 text-white/70">{description}</p> : null}
        </div>
      ) : null}
      <div className="space-y-4">{children}</div>
    </GlassCard>
  );
}
