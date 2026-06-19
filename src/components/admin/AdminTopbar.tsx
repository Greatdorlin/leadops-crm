"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";
import type { AdminAccessLevel } from "@/lib/admin-permissions";
import { cn } from "@/lib/cn";
import type { CrmUserRole } from "@/lib/crm/types";
import { AdminAccessViewSwitcher } from "./AdminAccessViewSwitcher";
import { getAdminNavigation } from "./navigation";

const TOPBAR_COLLAPSE_KEY = "fc_admin_topbar_collapsed";
const TOPBAR_COLLAPSE_EVENT = "fc-admin-topbar-collapse";

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
  const navigation = getAdminNavigation(accessLevel, role);
  const isCollapsed = useSyncExternalStore(
    subscribeTopbarCollapse,
    getTopbarCollapseSnapshot,
    () => false,
  );
  const canCollapse = Boolean(searchSlot || canSwitchAccessViews);

  function updateCollapseState(nextValue: boolean) {
    window.localStorage.setItem(TOPBAR_COLLAPSE_KEY, nextValue ? "1" : "0");
    window.dispatchEvent(new Event(TOPBAR_COLLAPSE_EVENT));
  }

  return (
    <header className="sticky top-0 z-20">
      <div
        className={cn(
          "relative overflow-hidden rounded-[28px] border border-white/82 bg-[rgba(255,255,255,0.88)] shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-all duration-200",
          isCollapsed ? "px-4 py-3 sm:px-5 lg:px-6" : "px-4 py-4 sm:px-5 lg:px-6",
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,rgba(255,190,0,0.14),transparent_34%),radial-gradient(circle_at_top_right,rgba(111,140,255,0.1),transparent_30%)]" />

        <div className="relative flex flex-col gap-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0b123f]/44">
                {activeNav.replaceAll("_", " ")}
              </p>
              <h1 className="font-[family:var(--font-heading)] text-[2rem] leading-[0.98] tracking-[-0.05em] text-slate-950 sm:text-[2.4rem]">
                {title}
              </h1>
              {!isCollapsed && description ? (
                <p className="mt-2 text-sm leading-7 text-slate-600 sm:text-base">{description}</p>
              ) : null}
            </div>

            <div className="flex w-full flex-col gap-3 xl:w-auto xl:min-w-[420px]">
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
                        ? "inline-flex shrink-0 items-center rounded-full border border-[#0b123f] bg-[#0b123f] px-4 py-2 text-sm font-medium text-white"
                        : "inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600"
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
