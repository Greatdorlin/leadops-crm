import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

export interface SmoothButtonProps extends ComponentPropsWithoutRef<"button"> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  loading?: boolean;
  children: ReactNode;
}

export function SmoothButton({
  children,
  className,
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  disabled,
  ...props
}: SmoothButtonProps) {
  return (
    <Button
      {...props}
      variant={variant}
      size={size}
      disabled={disabled || loading}
      aria-busy={loading || props["aria-busy"]}
      className={cn("ld-focus-ring", loading && "cursor-wait", className)}
    >
      {loading ? (
        <span aria-hidden="true" className="size-4 shrink-0 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin" />
      ) : icon ? (
        <span aria-hidden="true" className="inline-flex shrink-0">{icon}</span>
      ) : null}
      {children}
    </Button>
  );
}
