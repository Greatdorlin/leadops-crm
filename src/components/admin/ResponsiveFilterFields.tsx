"use client";

import { ChevronDown, SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { useId, useState } from "react";
import { cn } from "@/lib/cn";

export function ResponsiveFilterFields({
  children,
  defaultOpen = false,
}: {
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <>
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="admin-button-secondary ld-focus-ring relative h-12 rounded-[20px] px-4 text-sm font-semibold"
          aria-controls={panelId}
          aria-expanded={isOpen}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {defaultOpen ? (
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[color:var(--ld-color-accent)] shadow-[0_0_10px_var(--ld-color-accent)]" />
          ) : null}
          <ChevronDown className={cn("h-4 w-4 transition", isOpen && "rotate-180")} />
        </button>
      </div>

      <div
        id={panelId}
        className={cn(
          "col-span-full gap-3 lg:contents",
          isOpen ? "grid" : "hidden lg:contents",
        )}
      >
        {children}
      </div>
    </>
  );
}
