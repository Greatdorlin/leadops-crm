import { cn } from "@/lib/cn";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

export interface AnimatedCardProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode;
  variant?: "default" | "elevated" | "subtle";
  animation?: "fadeInUp" | "fadeIn" | "scaleIn" | "none";
  delay?: number;
  glow?: "none" | "primary" | "accent";
}

export function AnimatedCard({
  children,
  className,
  variant = "default",
  animation = "fadeInUp",
  delay = 0,
  glow = "none",
  ...props
}: AnimatedCardProps) {
  const variantClass = {
    default: "ld-glass-card",
    elevated: "ld-surface-elevated",
    subtle: "ld-glass ld-glass-soft",
  }[variant];

  const animationClass = {
    fadeInUp: "ld-animate-fade-in-up",
    fadeIn: "ld-animate-fade-in",
    scaleIn: "ld-animate-scale-in",
    none: "",
  }[animation];

  const glowClass = {
    none: "",
    primary: "ld-glow-primary",
    accent: "ld-glow-accent",
  }[glow];

  return (
    <div
      {...props}
      className={cn(
        variantClass,
        "ld-hover-lift",
        animationClass,
        glowClass,
        className
      )}
      style={{
        animationDelay: delay > 0 ? `${delay}ms` : undefined,
        ...props.style,
      }}
    >
      {children}
    </div>
  );
}
