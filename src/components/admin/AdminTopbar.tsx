"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";
import type { AdminAccessLevel } from "@/lib/admin-permissions";
import { cn } from "@/lib/cn";
import type { CrmUserRole } from "@/lib/crm/types";
import { useAdminWorkspaceSettings } from "./AdminWorkspaceSettingsProvider";
import { AdminAccessViewSwitcher } from "./AdminAccessViewSwitcher";
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
  actualAccessLevel,
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
  const showPageHeading = activeNav !== "dashboard";
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
            <div className="min-w-0 max-w-3xl">
              {showPageHeading ? (
                <>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/48">
                    {activeNav.replaceAll("_", " ")}
                  </p>
                  <h1 className="font-[family:var(--font-heading)] text-[1.85rem] leading-[0.98] tracking-[-0.05em] text-white sm:text-[2.2rem]">
                    {title}
                  </h1>
                  {!isCollapsed && description ? (
                    <p className="mt-1.5 text-sm leading-6 text-white/64 sm:text-[15px]">{description}</p>
                  ) : null}
                </>
              ) : null}
            </div>

            <div className={cn("flex w-full flex-col gap-3 xl:w-auto xl:min-w-[420px]", isDashboard && "xl:min-w-[720px] 2xl:min-w-[820px]")}>
              {actions || canCollapse ? (
                <div className="flex flex-wrap items-center justify-start gap-3 xl:justify-end">
                  {actions}
                  {canCollapse ? (
                    <button
                      type="button"
                      onClick={() => updateCollapseState(!isCollapsed)}
                      className="admin-button-secondary inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium"
                      aria-expanded={!isCollapsed}
                    >
                      {isCollapsed ? "Expand" : "Collapse"}
                      <ChevronDown className={cn("h-4 w-4 transition", !isCollapsed && "rotate-180")} />
                    </button>
                  ) : null}
                </div>
              ) : null}
              {!isCollapsed && searchSlot ? <div className="w-full">{searchSlot}</div> : null}
            </div>
          </div>

          {!isCollapsed ? (
            <nav className="flex gap-2 overflow-x-auto pb-1 xl:hidden">
              {navigation.map((item) => {
                const isActive = item.key === activeNav;

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={
                      isActive
                        ? "inline-flex shrink-0 items-center rounded-full border border-white/12 bg-white/14 px-4 py-2 text-sm font-medium text-white"
                        : "inline-flex shrink-0 items-center rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-medium text-white/66"
                    }
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          ) : null}

          {!isCollapsed && canSwitchAccessViews && actualAccessLevel ? (
            <AdminAccessViewSwitcher
              actualAccessLevel={actualAccessLevel}
              activeAccessLevel={accessLevel}
            />
          ) : null}
        </div>
      </div>
    </header>
  );
}
