"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { AdminAccessLevel } from "@/lib/admin-permissions";
import { LeadsDeskWordmark } from "@/components/brand/LeadsDeskWordmark";
import { cn } from "@/lib/cn";
import type { CrmUserRole } from "@/lib/crm/types";
import { getAdminNavigation } from "./navigation";

export function AdminSidebar({
  activeKey,
  accessLevel,
  role,
  footer,
  collapsed = false,
  onToggleCollapse,
}: {
  activeKey: string;
  accessLevel: AdminAccessLevel;
  role?: CrmUserRole | null;
  footer?: ReactNode;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const navigation = getAdminNavigation(accessLevel, role);

  return (
    <aside className="hidden xl:block">
      <div
        className={cn(
          "sticky top-4 flex min-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[32px] border border-white/6 bg-[linear-gradient(180deg,#0b1438_0%,#101a48_38%,#0a1234_100%)] p-4 text-white shadow-[0_24px_56px_rgba(2,6,23,0.24)] transition-[width,padding] duration-200",
          collapsed && "items-center px-3",
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(255,190,0,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(111,140,255,0.16),transparent_30%)]" />

        <div className="relative space-y-4">
          <div className={cn("rounded-[22px] border border-white/10 bg-white/[0.04] p-4", collapsed && "w-full px-2 py-3")}>
            <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between gap-3")}>
              <LeadsDeskWordmark tone="light" variant={collapsed ? "mark" : "full"} />
              {onToggleCollapse ? (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                  title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                  className="admin-icon-button h-9 w-9 border-white/10 bg-white/[0.08] text-white shadow-none hover:bg-white/[0.12] hover:text-white"
                >
                  {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                </button>
              ) : null}
            </div>
            {!collapsed ? (
              <>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
                  {accessLevel === "sales_rep" ? "My workspace" : "Leads Desk"}
                </p>
                <p className="mt-2 text-sm leading-6 text-white/66">
                  {accessLevel === "sales_rep"
                    ? "Leads, tasks, follow-ups."
                    : "Leads, tasks, team activity."}
                </p>
              </>
            ) : null}
          </div>
        </div>

        <nav className={cn("relative mt-5 space-y-2", collapsed && "w-full")}>
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = item.key === activeKey;

            return (
              <Link
                key={item.key}
                href={item.href}
                title={item.label}
                className={cn(
                  "group flex items-center gap-3 rounded-[20px] border px-3.5 py-3 transition",
                  isActive
                    ? "border-white/12 bg-white/[0.1] text-white"
                    : "border-transparent text-white/74 hover:border-white/10 hover:bg-white/[0.06] hover:text-white",
                  collapsed && "justify-center px-0",
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border transition",
                    isActive
                      ? "border-[color:var(--fc-yellow)]/40 bg-[color:var(--fc-yellow)]/12 text-[color:var(--fc-yellow)]"
                      : "border-white/10 bg-white/[0.04] text-white/58 group-hover:text-white/82",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                {collapsed ? null : (
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{item.label}</span>
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {footer && !collapsed ? <div className="relative mt-auto pt-4">{footer}</div> : null}
      </div>
    </aside>
  );
}
