"use client";

import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { startTransition, useState } from "react";
import type { AdminAccessLevel } from "@/lib/admin-permissions";
import { cn } from "@/lib/cn";
import { formatAdminAccessLevelLabel } from "@/lib/crm/formatters";

export function AdminAccessViewSwitcher({
  actualAccessLevel,
  activeAccessLevel,
}: {
  actualAccessLevel: AdminAccessLevel;
  activeAccessLevel: AdminAccessLevel;
}) {
  const router = useRouter();
  const [pendingLevel, setPendingLevel] = useState<AdminAccessLevel | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  async function updateAccessView(nextAccessLevel: AdminAccessLevel) {
    setPendingLevel(nextAccessLevel);

    try {
      await fetch("/api/admin/access-view", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accessLevel: nextAccessLevel,
        }),
      });

      startTransition(() => {
        router.refresh();
      });
    } finally {
      setPendingLevel(null);
    }
  }

  return (
    <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#080b2e]/55">
            View mode
          </p>
          <p className="mt-1 text-sm leading-5 text-slate-600">
            Signed in as {formatAdminAccessLevelLabel(actualAccessLevel)}. Viewing as{" "}
            {formatAdminAccessLevelLabel(activeAccessLevel)}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="admin-button-secondary inline-flex h-10 items-center justify-center gap-2 self-start rounded-full px-4 text-sm font-medium"
        >
          {isOpen ? "Hide options" : "Change view"}
          <ChevronDown className={cn("h-4 w-4 transition", isOpen ? "rotate-180" : "")} />
        </button>
      </div>

      {isOpen ? (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-200 pt-3">
          {(
            ["master_admin", "general_admin", "lead_sales_rep", "sales_rep"] as AdminAccessLevel[]
          ).map((level) => {
            const isActive = level === activeAccessLevel;
            const isPending = pendingLevel === level;

            return (
              <button
                key={level}
                type="button"
                disabled={pendingLevel !== null}
                onClick={() => void updateAccessView(level)}
                className={cn(
                  "inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-medium transition",
                  isActive
                    ? "border-[#080b2e] bg-[#080b2e] text-white shadow-[0_12px_24px_rgba(8,11,46,0.16)]"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950",
                  isPending && "opacity-70",
                )}
              >
                {isPending ? "Switching..." : formatAdminAccessLevelLabel(level)}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
