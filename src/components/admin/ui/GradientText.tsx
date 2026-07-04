import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

export interface GradientTextProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "subtle" | "bold";
}

export function GradientText({
  children,
  className,
  variant = "default",
}: GradientTextProps) {
  const variantClass = {
    default: "ld-text-gradient",
    subtle: "ld-text-gradient-subtle",
    bold: "ld-text-gradient-bold",
  }[variant];

  return (
    <span className={cn(variantClass, className)}>
      {children}
    </span>
  );
}
