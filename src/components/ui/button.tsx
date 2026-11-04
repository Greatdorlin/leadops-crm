import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex min-w-0 max-w-full items-center justify-center gap-2 rounded-lg text-center font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 disabled:opacity-55",
  {
    variants: {
      variant: {
        default: "bg-white text-zinc-950 enabled:hover:bg-zinc-200",
        outline: "border border-white/15 bg-transparent text-white enabled:hover:bg-white/10",
        primary: "admin-button-primary",
        secondary: "admin-button-secondary",
        ghost: "admin-button-ghost",
        danger: "admin-button-danger",
      },
      size: {
        sm: "min-h-10 px-3 text-sm",
        md: "min-h-11 px-4 text-sm",
        lg: "min-h-12 px-6 text-base",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return <button {...props} type={type} data-slot="button" className={cn(buttonVariants({ variant, size }), className)} />;
}
