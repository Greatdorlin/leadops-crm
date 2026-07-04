"use client";

import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { startTransition, useState } from "react";
import type { AdminAccessLevel } from "@/lib/admin-permissions";
import { cn } from "@/lib/cn";
import { formatAdminAccessLevelLabel } from "@/lib/crm/formatters";
import { SmoothButton } from "./ui/SmoothButton";

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
    <div className="admin-surface-soft rounded-[20px] px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/70">
            View mode
          </p>
          <p className="mt-1 text-sm leading-5 text-white/70">
            Signed in as {formatAdminAccessLevelLabel(actualAccessLevel)}. Viewing as{" "}
            {formatAdminAccessLevelLabel(activeAccessLevel)}.
          </p>
        </div>
        <SmoothButton
          variant="secondary"
          size="sm"
          onClick={() => setIsOpen((current) => !current)}
          icon={<ChevronDown className={cn("h-4 w-4 transition", isOpen ? "rotate-180" : "")} />}
        >
          {isOpen ? "Hide options" : "Change view"}
        </SmoothButton>
      </div>

      {isOpen ? (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">
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
                    ? "border-[color:var(--ld-color-accent)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--ld-color-primary)_30%,transparent),color-mix(in_srgb,var(--ld-color-accent)_22%,transparent))] text-white shadow-[0_12px_28px_color-mix(in_srgb,var(--ld-color-primary)_18%,transparent),inset_0_1px_0_rgba(255,255,255,0.16)]"
                    : "border-white/10 bg-white/[0.045] text-white/70 hover:border-white/20 hover:bg-white/[0.08] hover:text-white",
                  isPending && "opacity-70",
                )}
              >
                <span className="relative inline-flex items-center gap-2">
                  {isActive && !isPending ? (
                    <span className="h-2 w-2 rounded-full bg-[color:var(--ld-color-accent)] shadow-[0_0_8px_color-mix(in_srgb,var(--ld-color-accent)_60%,transparent)]" />
                  ) : null}
                  {isPending ? "Switching..." : formatAdminAccessLevelLabel(level)}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
