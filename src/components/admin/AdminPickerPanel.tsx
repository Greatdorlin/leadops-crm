"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export function AdminPickerHeader({
  description,
  onClose,
  title,
}: {
  description?: string;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="flex shrink-0 items-start justify-between gap-3 px-2 pb-2 pt-1">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{title}</p>
        {description ? <p className="mt-0.5 text-xs leading-5 text-white/60">{description}</p> : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="ld-focus-ring inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-white/70 transition hover:border-white/18 hover:bg-white/[0.1] hover:text-white"
        aria-label={`Close ${title.toLowerCase()}`}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function AdminPickerScrollArea({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      {...props}
      className={cn("ld-popover-scroll min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain", className)}
    >
      {children}
    </div>
  );
}
