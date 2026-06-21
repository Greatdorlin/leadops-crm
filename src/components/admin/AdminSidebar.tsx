"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, PanelLeftClose, PanelLeftOpen, SlidersHorizontal, Sparkles } from "lucide-react";
import type { AdminAccessLevel } from "@/lib/admin-permissions";
import { LeadsDeskWordmark } from "@/components/brand/LeadsDeskWordmark";
import { cn } from "@/lib/cn";
import { useAdminWorkspaceSettings } from "@/components/admin/AdminWorkspaceSettingsProvider";
import type { CrmUserRole } from "@/lib/crm/types";
import { getAdminNavigation } from "./navigation";
import { TeamAvatar } from "./TeamAvatar";

function DefaultSidebarFooter({
  accessLevel,
  userName,
  userEmail,
  avatarUrl,
}: {
  accessLevel: AdminAccessLevel;
  userName?: string | null;
  userEmail?: string | null;
  avatarUrl?: string | null;
}) {
  const isRep = accessLevel === "sales_rep";
  const displayName = userName || userEmail || "My profile";
  const subtitle = isRep ? "My leads" : accessLevel === "lead_sales_rep" ? "Team lead" : "Workspace access";

  return (
    <div className="space-y-3">
      <Link
        href="/admin/settings/appearance"
        className="group relative block overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.04] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-cyan-200/24 hover:bg-white/[0.065]"
      >
        <span className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-cyan-300/12 blur-2xl transition group-hover:bg-cyan-300/18" />
        <span className="pointer-events-none absolute -bottom-10 left-8 h-24 w-24 rounded-full bg-violet-400/14 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] border border-cyan-200/18 bg-cyan-300/10 text-cyan-100 shadow-[0_12px_26px_rgba(34,211,238,0.12)]">
            <SlidersHorizontal className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">Customize workspace</p>
            <p className="truncate text-xs text-white/58">
              {isRep ? "Make it yours" : "Brand, glass, and layout"}
            </p>
          </div>
          <ChevronRight className="ml-auto h-4 w-4 text-white/42 transition group-hover:translate-x-0.5 group-hover:text-cyan-100" />
        </div>
      </Link>

      <div className="rounded-[22px] border border-white/[0.08] bg-black/[0.12] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-4 w-4 text-cyan-100/86" />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-white">Today&apos;s focus</p>
            <p className="truncate text-[11px] text-white/52">{isRep ? "Follow up fast" : "Keep revenue moving"}</p>
          </div>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.08]">
          <span className="block h-full w-[68%] rounded-full bg-[linear-gradient(90deg,#60a5fa,#8b5cf6,#67e8f9)] shadow-[0_0_18px_rgba(103,232,249,0.35)]" />
        </div>
      </div>

      <Link
        href="/admin/profile"
        className="group flex items-center gap-3 rounded-[22px] border border-white/10 bg-white/[0.035] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] transition hover:border-cyan-200/22 hover:bg-white/[0.065]"
      >
        <TeamAvatar name={displayName} email={userEmail} avatarUrl={avatarUrl} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{displayName}</p>
          <p className="truncate text-xs text-white/55">{subtitle}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-white/42 transition group-hover:translate-x-0.5 group-hover:text-cyan-100" />
      </Link>
    </div>
  );
}

export function AdminSidebar({
  activeKey,
  accessLevel,
  role,
  footer,
  collapsed = false,
  onToggleCollapse,
  companyName,
  logoUrl,
  userName,
  userEmail,
  userAvatarUrl,
}: {
  activeKey: string;
  accessLevel: AdminAccessLevel;
  role?: CrmUserRole | null;
  footer?: ReactNode;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  companyName?: string;
  logoUrl?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  userAvatarUrl?: string | null;
}) {
  const workspaceSettings = useAdminWorkspaceSettings();
  const navigation = getAdminNavigation(accessLevel, role, workspaceSettings.navigation);
  const resolvedCompanyName = companyName ?? workspaceSettings.companyName;

  return (
    <aside className="hidden xl:block">
      <div
        className={cn(
          "admin-sidebar-panel ld-glass-sidebar sticky top-4 flex min-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[28px] border p-3 text-white shadow-[0_26px_70px_rgba(1,6,18,0.36)] transition-[width,padding] duration-200",
          collapsed && "items-center px-2.5",
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.075),transparent_18%,rgba(255,255,255,0.026)_100%)]" />
        <div className="pointer-events-none absolute -left-24 top-16 h-52 w-52 rounded-full bg-cyan-300/14 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-28 h-56 w-56 rounded-full bg-violet-400/16 blur-3xl" />

        <div className={cn("relative flex min-w-0 items-center px-2 py-2", collapsed ? "justify-center" : "justify-between gap-2")}>
              <LeadsDeskWordmark
                tone="light"
                variant={collapsed ? "mark" : "full"}
                companyName={resolvedCompanyName}
                subtitle=""
                logoUrl={logoUrl ?? workspaceSettings.logoUrl}
                logoUrlLightMode={workspaceSettings.logoUrlLightMode}
                logoUrlDarkMode={workspaceSettings.logoUrlDarkMode}
                surfaceMode="dark"
                className="min-w-0"
              />
              {onToggleCollapse ? (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                  title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                  className="admin-icon-button h-8 w-8 shrink-0 border-white/10 bg-white/[0.06] text-white/70 shadow-none hover:bg-white/[0.12] hover:text-white"
                >
                  {collapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
                </button>
              ) : null}
        </div>

        <nav className={cn("relative mt-6 space-y-1", collapsed && "w-full")}>
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = item.key === activeKey;

            return (
              <Link
                key={item.key}
                href={item.href}
                title={item.label}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group relative flex min-h-[46px] items-center gap-3 overflow-hidden rounded-[17px] border px-2.5 py-2 transition duration-200",
                  isActive
                    ? "border-cyan-200/22 bg-[linear-gradient(135deg,rgba(76,116,255,0.34),rgba(139,92,246,0.28),rgba(103,232,249,0.08))] text-white shadow-[0_16px_34px_rgba(59,130,246,0.22),inset_0_1px_0_rgba(255,255,255,0.16)]"
                    : "border-transparent text-white/66 hover:border-white/10 hover:bg-white/[0.055] hover:text-white",
                  collapsed && "justify-center px-0",
                )}
              >
                {isActive ? (
                  <>
                    <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-cyan-200/90 shadow-[0_0_18px_rgba(103,232,249,0.9)]" />
                    <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_50%,rgba(103,232,249,0.3),transparent_30%)]" />
                    <span className="pointer-events-none absolute inset-x-5 top-0 h-px bg-white/24" />
                  </>
                ) : null}
                <span
                  className={cn(
                    "relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] border transition duration-200",
                    isActive
                      ? "border-cyan-100/22 bg-white/[0.13] text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                      : "border-white/[0.075] bg-white/[0.028] text-white/52 group-hover:bg-white/[0.065] group-hover:text-white/86",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                {collapsed ? null : (
                  <span className="relative min-w-0">
                    <span className="block truncate text-[13px] font-semibold tracking-[-0.01em]">{item.label}</span>
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {!collapsed ? (
          <div className="relative mt-auto border-t border-white/[0.07] pt-3">
            {footer ?? (
              <DefaultSidebarFooter
                accessLevel={accessLevel}
                userName={userName}
                userEmail={userEmail}
                avatarUrl={userAvatarUrl}
              />
            )}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
