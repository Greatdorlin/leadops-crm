"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";
import type { AdminAccessLevel } from "@/lib/admin-permissions";
import { cn } from "@/lib/cn";
import type { CrmUserRole } from "@/lib/crm/types";
import { SmoothButton } from "./ui/SmoothButton";
import { useAdminWorkspaceSettings } from "./AdminWorkspaceSettingsProvider";
import { getAdminNavigation } from "./navigation";

const TOPBAR_COLLAPSE_KEY = "ld_admin_topbar_collapsed";
const TOPBAR_COLLAPSE_EVENT = "ld-admin-topbar-collapse";

function subscribeTopbarCollapse(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: Event) => {
    if (
      event instanceof StorageEvent &&
      event.key !== null &&
      event.key !== TOPBAR_COLLAPSE_KEY
    ) {
      return;
    }

    onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(TOPBAR_COLLAPSE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(TOPBAR_COLLAPSE_EVENT, onStoreChange);
  };
}

function getTopbarCollapseSnapshot() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(TOPBAR_COLLAPSE_KEY) === "1";
}

export function AdminTopbar({
  activeNav,
  accessLevel,
  role,
  canSwitchAccessViews,
  title,
  description,
  actions,
  searchSlot,
}: {
  activeNav: string;
  accessLevel: AdminAccessLevel;
  role?: CrmUserRole | null;
  actualAccessLevel?: AdminAccessLevel;
  canSwitchAccessViews?: boolean;
  title: string;
  description?: string;
  actions?: ReactNode;
  searchSlot?: ReactNode;
}) {
  const workspaceSettings = useAdminWorkspaceSettings();
  const navigation = getAdminNavigation(accessLevel, role, workspaceSettings.navigation);
  const isCollapsed = useSyncExternalStore(
    subscribeTopbarCollapse,
    getTopbarCollapseSnapshot,
    () => false,
  );
  const canCollapse = Boolean(searchSlot || canSwitchAccessViews);
  const isDashboard = activeNav === "dashboard";

  function updateCollapseState(nextValue: boolean) {
    window.localStorage.setItem(TOPBAR_COLLAPSE_KEY, nextValue ? "1" : "0");
    window.dispatchEvent(new Event(TOPBAR_COLLAPSE_EVENT));
  }

  return (
    <header className="relative z-20">
      <div
        className={cn(
          "relative overflow-visible rounded-none border-0 bg-transparent px-1 py-2 shadow-none transition-all duration-200",
        )}
      >
        <div className={cn("relative flex flex-col gap-3", isDashboard && "gap-2")}>
          <div className={cn("flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between", isDashboard && "xl:gap-5")}>
            <div className="min-w-0 max-w-3xl ld-animate-fade-in-up">
              <div className="flex items-center gap-3">
                <div className="min-w-0">
                  <h1 className="font-[family:var(--font-heading)] text-[1.85rem] leading-[0.98] tracking-[-0.05em] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] sm:text-[2.2rem]">
                    {title}
                  </h1>
                  {!isCollapsed && description ? (
                    <p className="mt-1.5 text-sm leading-relaxed text-white/70 sm:text-[15px]">{description}</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className={cn("flex w-full flex-col gap-3 xl:w-auto xl:min-w-[420px]", isDashboard && "xl:min-w-[720px] 2xl:min-w-[820px]")}>
              {actions || canCollapse ? (
                <div className="flex flex-wrap items-center justify-start gap-3 xl:justify-end">
                  {actions}
                  {canCollapse ? (
                    <SmoothButton
                      variant="ghost"
                      size="sm"
                      onClick={() => updateCollapseState(!isCollapsed)}
                      aria-expanded={!isCollapsed}
                      icon={<ChevronDown className={cn("h-4 w-4 transition", !isCollapsed && "rotate-180")} />}
                    >
                      {isCollapsed ? "Expand" : "Collapse"}
                    </SmoothButton>
                  ) : null}
                </div>
              ) : null}
              {!isCollapsed && searchSlot ? (
                <div className="ld-surface-elevated w-full">
                  {searchSlot}
                </div>
              ) : null}
            </div>
          </div>

          {!isCollapsed ? (
            <nav className="ld-glass ld-glass-soft flex gap-2 overflow-x-auto rounded-2xl p-1.5 xl:hidden">
              {navigation.map((item) => {
                const isActive = item.key === activeNav;

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={cn(
                      "ld-animate-fade-in inline-flex shrink-0 items-center rounded-full border px-4 py-2 text-sm font-medium transition duration-200",
                      isActive
                        ? "border-white/20 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--ld-color-primary)_30%,transparent),color-mix(in_srgb,var(--ld-color-accent)_22%,transparent))] text-white shadow-[0_12px_28px_color-mix(in_srgb,var(--ld-color-primary)_18%,transparent),inset_0_1px_0_rgba(255,255,255,0.16)]"
                        : "border-white/10 bg-white/[0.05] text-white/80 hover:border-white/14 hover:bg-white/[0.08] hover:text-white"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          ) : null}
        </div>
      </div>
    </header>
  );
}
