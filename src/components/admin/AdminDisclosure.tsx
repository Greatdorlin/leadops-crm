"use client";

import type { ReactNode } from "react";
import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export function AdminDisclosure({
  children,
  className,
  defaultOpen = false,
  label,
  optional = false,
}: {
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
  label: string;
  optional?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <section className={cn("min-w-0 overflow-hidden rounded-[18px] border border-white/10 bg-white/[0.035]", className)}>
      <button
        type="button"
        aria-controls={contentId}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className="ld-focus-ring flex w-full min-w-0 items-center justify-between gap-3 rounded-[17px] px-4 py-3 text-left text-sm font-semibold text-white/76 transition hover:bg-white/[0.045] hover:text-white"
      >
        <span className="min-w-0 break-words">
          {label}
          {optional ? <span className="ml-1 font-normal text-white/42">(optional)</span> : null}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-white/54 transition-transform", isOpen && "rotate-180")} />
      </button>
      <div id={contentId} hidden={!isOpen} className="min-w-0 px-4 pb-4 pt-1">
        {children}
      </div>
    </section>
  );
}
