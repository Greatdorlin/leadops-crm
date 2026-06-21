import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function GlassCard({
  children,
  className,
  glassStyle = "soft",
}: {
  children: ReactNode;
  className?: string;
  glassStyle?: "soft" | "vibrant" | "bold";
}) {
  const styleClass = {
    soft: "ld-glass-soft",
    vibrant: "ld-glass-vibrant",
    bold: "ld-glass-bold",
  }[glassStyle];

  return (
    <section className={cn("ld-glass ld-glass-card ld-inner-highlight", styleClass, className)}>
      {children}
    </section>
  );
}
