import { cn } from "@/lib/cn";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

export interface SmoothButtonProps
  extends ComponentPropsWithoutRef<"button"> {
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
  const variantClass = {
    primary: "admin-button-primary",
    secondary: "admin-button-secondary",
    ghost: "admin-button-ghost",
    danger: "admin-button-danger",
  }[variant];

  const sizeClass = {
    sm: "h-10 px-3 text-sm rounded-xl sm:h-8 sm:rounded-lg",
    md: "h-10 px-4 text-sm rounded-xl",
    lg: "h-12 px-6 text-base rounded-xl",
  }[size];

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap transition-all duration-200",
        "ld-focus-ring",
        variantClass,
        sizeClass,
        loading && "opacity-70 cursor-wait",
        className
      )}
    >
      {loading ? (
        <>
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {children}
        </>
      ) : (
        <>
          {icon && <span className="inline-flex shrink-0">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}
