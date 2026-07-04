import { cn } from "@/lib/cn";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

export interface GlassSurfaceProps extends Omit<ComponentPropsWithoutRef<"div">, "as"> {
  as?: "div" | "section" | "article";
  intensity?: "soft" | "medium" | "strong";
  border?: boolean;
  highlight?: boolean;
  children: ReactNode;
}

export function GlassSurface({
  children,
  className,
  as: Component = "div",
  intensity = "medium",
  border = true,
  highlight = true,
  ...props
}: GlassSurfaceProps) {
  const intensityClass = {
    soft: "ld-glass-soft",
    medium: "",
    strong: "ld-glass-vibrant",
  }[intensity];

  return (
    <Component
      {...props}
      className={cn(
        "ld-glass",
        intensityClass,
        border && "ld-luminous-border",
        highlight && "ld-inner-highlight",
        className
      )}
    >
      {children}
    </Component>
  );
}
