import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

const buttonVariants = {
  default: "bg-white text-zinc-950 hover:bg-zinc-200",
  outline: "border border-white/15 bg-transparent text-white hover:bg-white/10",
};

export function Button({
  className,
  variant = "default",
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: keyof typeof buttonVariants }) {
  return (
    <button
      type={type}
      data-slot="button"
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1b1c21] disabled:pointer-events-none disabled:opacity-60",
        buttonVariants[variant],
        className,
      )}
      {...props}
    />
  );
}
