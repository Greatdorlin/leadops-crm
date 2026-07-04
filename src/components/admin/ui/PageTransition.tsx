import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

export interface PageTransitionProps {
  children: ReactNode;
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
  className?: string;
}

export function PageTransition({
  children,
  delay = 0,
  direction = "up",
  className,
}: PageTransitionProps) {
  const animationClass = {
    up: "ld-animate-fade-in-up",
    down: "ld-animate-fade-in-down",
    left: "ld-animate-slide-in-left",
    right: "ld-animate-slide-in-right",
  }[direction];

  return (
    <div
      className={cn(animationClass, className)}
      style={{
        animationDelay: delay > 0 ? `${delay}ms` : undefined,
      }}
    >
      {children}
    </div>
  );
}
