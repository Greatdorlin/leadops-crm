"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import type { AdminAccessLevel } from "@/lib/admin-permissions";
import { LeadsDeskWordmark } from "@/components/brand/LeadsDeskWordmark";
import { cn } from "@/lib/cn";
import { useAdminWorkspaceSettings } from "@/components/admin/AdminWorkspaceSettingsProvider";
import type { CrmUserRole } from "@/lib/crm/types";
import { appRoutes } from "@/lib/app-routes";
import { getAdminNavigation } from "./navigation";
import { TeamAvatar } from "./TeamAvatar";
import { GlassSurface } from "./ui/GlassSurface";
import { SmoothButton } from "./ui/SmoothButton";
import { MobileSidebarDrawer } from "./ui/MobileSidebarDrawer";

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
  const subtitle = isRep
    ? "My leads"
    : accessLevel === "lead_sales_rep"
      ? "Team lead"
      : "Workspace access";
  const router = useRouter();

  return (
    <div className={cn("space-y-3", "ld-animate-fade-in-up")}>
      <Link
        href={appRoutes.settingsAppearance}
        className="group relative block"
      >
        <GlassSurface
          intensity="soft"
          border
          highlight
          className="overflow-hidden rounded-[22px] p-3.5 transition hover:border-white/20 hover:bg-white/[0.08]"
        >
          <span className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-[var(--ld-color-primary)]/12 blur-2xl transition group-hover:bg-[var(--ld-color-primary)]/18" />
          <span className="pointer-events-none absolute -bottom-10 left-8 h-24 w-24 rounded-full bg-[var(--ld-color-accent)]/14 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] border border-white/16 bg-white/[0.07] text-white shadow-[0_12px_26px_rgba(0,0,0,0.15)]">
              <SlidersHorizontal className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                Customize workspace
              </p>
              <p className="truncate text-xs text-white/70">
                {isRep ? "Make it yours" : "Brand, glass, and layout"}
              </p>
            </div>
            <ChevronRight className="ml-auto h-4 w-4 text-white/70 transition group-hover:translate-x-0.5 group-hover:text-white" />
          </div>
        </GlassSurface>
      </Link>

      <GlassSurface
        intensity="soft"
        border
        highlight
        className="overflow-hidden rounded-[22px] p-3"
      >
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-4 w-4 text-white/80" />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-white">
              Today&apos;s focus
            </p>
            <p className="truncate text-[11px] text-white/70">
              {isRep ? "Follow up fast" : "Keep revenue moving"}
            </p>
          </div>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.08]">
          <span className="block h-full w-[68%] rounded-full bg-[linear-gradient(90deg,var(--ld-color-primary),var(--ld-color-accent))] shadow-[0_0_18px_color-mix(in_srgb,var(--ld-color-primary)_35%,transparent)]" />
        </div>
      </GlassSurface>

      <SmoothButton
        variant="ghost"
        size="md"
        className="group h-auto w-full justify-start gap-3 rounded-[22px] border border-white/10 bg-white/[0.035] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] hover:border-white/20 hover:bg-white/[0.08]"
        onClick={() => router.push(appRoutes.profile)}
      >
        <TeamAvatar
          name={displayName}
          email={userEmail}
          avatarUrl={avatarUrl}
          size="md"
        />
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-semibold text-white">
            {displayName}
          </p>
          <p className="truncate text-xs text-white/70">{subtitle}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-white/70 transition group-hover:translate-x-0.5 group-hover:text-white" />
      </SmoothButton>
    </div>
  );
}

interface SidebarContentProps {
  activeKey: string;
  accessLevel: AdminAccessLevel;
  role?: CrmUserRole | null;
  footer?: ReactNode;
  collapsed?: boolean;
  companyName?: string;
  logoUrl?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  userAvatarUrl?: string | null;
  onToggleCollapse?: () => void;
}

function SidebarContent({
  activeKey,
  accessLevel,
  role,
  footer,
  collapsed = false,
  companyName,
  logoUrl,
  userName,
  userEmail,
  userAvatarUrl,
  onToggleCollapse,
}: SidebarContentProps) {
  const workspaceSettings = useAdminWorkspaceSettings();
  const navigation = getAdminNavigation(
    accessLevel,
    role,
    workspaceSettings.navigation,
  );
  const resolvedCompanyName = companyName ?? workspaceSettings.companyName;

  return (
    <>
      <div
        className={cn(
          "relative flex min-w-0 items-center px-2 py-2 ld-animate-fade-in-up",
          collapsed ? "justify-center" : "justify-between gap-2",
        )}
      >
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
            {collapsed ? (
              <PanelLeftOpen className="h-3.5 w-3.5" />
            ) : (
              <PanelLeftClose className="h-3.5 w-3.5" />
            )}
          </button>
        ) : null}
      </div>

      <nav
        className={cn(
          "relative mt-6 min-h-0 flex-1 space-y-1 overflow-y-auto ld-sidebar-nav-scroll",
          collapsed && "w-full",
        )}
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(255,255,255,0.15) transparent",
        }}
      >
        {navigation.map((item, index) => {
          const Icon = item.icon;
          const isActive = item.key === activeKey;

          return (
            <Link
              key={item.key}
              href={item.href}
              title={collapsed ? item.label : undefined}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group relative flex min-h-[44px] items-center gap-3 overflow-hidden rounded-[16px] border px-2.5 py-2 transition duration-200",
                "ld-animate-fade-in-up",
                isActive
                  ? "border-white/20 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--ld-color-primary)_30%,transparent),color-mix(in_srgb,var(--ld-color-accent)_22%,transparent))] text-white shadow-[0_12px_28px_color-mix(in_srgb,var(--ld-color-primary)_18%,transparent),inset_0_1px_0_rgba(255,255,255,0.16)] ld-hover-lift"
                  : "border-transparent text-white/80 hover:border-white/14 hover:bg-white/[0.08] hover:text-white",
                collapsed && "justify-center px-0",
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {isActive ? (
                <>
                  <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-[var(--ld-color-primary)] shadow-[0_0_18px_color-mix(in_srgb,var(--ld-color-primary)_60%,transparent),0_0_8px_color-mix(in_srgb,var(--ld-color-primary)_40%,transparent)]" />
                  <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_50%,color-mix(in_srgb,var(--ld-color-primary)_30%,transparent),transparent_30%)]" />
                  <span className="pointer-events-none absolute inset-x-5 top-0 h-px bg-white/24" />
                  <span className="pointer-events-none absolute inset-0 ld-glow-primary rounded-[16px]" />
                </>
              ) : null}
              <span
                className={cn(
                  "relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] border transition duration-200 ld-focus-ring",
                  isActive
                    ? "border-white/20 bg-white/[0.13] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                    : "border-transparent bg-transparent text-white/70 group-hover:bg-white/[0.08] group-hover:text-white/90",
                )}
              >
                <Icon
                  className={cn(
                    "h-[18px] w-[18px] transition-transform duration-200",
                    isActive &&
                      "drop-shadow-[0_0_10px_color-mix(in_srgb,var(--ld-color-accent)_45%,transparent)]",
                    "group-hover:scale-105",
                  )}
                />
              </span>
              {collapsed ? null : (
                <span className="relative min-w-0">
                  <span className="block truncate text-[13px] font-semibold tracking-[-0.01em]">
                    {item.label}
                  </span>
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
    </>
  );
}

export function AdminSidebarMobileDrawer({
  isOpen,
  onClose,
  activeKey,
  accessLevel,
  role,
  footer,
  companyName,
  logoUrl,
  userName,
  userEmail,
  userAvatarUrl,
}: {
  isOpen: boolean;
  onClose: () => void;
  activeKey: string;
  accessLevel: AdminAccessLevel;
  role?: CrmUserRole | null;
  footer?: ReactNode;
  companyName?: string;
  logoUrl?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  userAvatarUrl?: string | null;
}) {
  const workspaceSettings = useAdminWorkspaceSettings();

  return (
    <MobileSidebarDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={workspaceSettings.companyName ?? "Leads Desk"}
    >
      <div className="flex h-full flex-col p-3">
        <SidebarContent
          activeKey={activeKey}
          accessLevel={accessLevel}
          role={role}
          footer={footer}
          collapsed={false}
          companyName={companyName}
          logoUrl={logoUrl}
          userName={userName}
          userEmail={userEmail}
          userAvatarUrl={userAvatarUrl}
        />
      </div>
    </MobileSidebarDrawer>
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
  return (
    <aside className="hidden xl:block">
      <div
        className={cn(
          "admin-sidebar-panel ld-glass-sidebar sticky top-4 flex min-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[28px] p-3 text-white shadow-[0_26px_70px_rgba(1,6,18,0.36)] transition-[width,padding,opacity] duration-[350ms]",
          "ease-[cubic-bezier(0.32,0.72,0,1.02)]",
          collapsed && "items-center px-2.5",
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.075),transparent_18%,rgba(255,255,255,0.026)_100%)]" />
        <div className="pointer-events-none absolute -left-24 top-16 h-52 w-52 rounded-full bg-[var(--ld-color-primary)]/14 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-28 h-56 w-56 rounded-full bg-[var(--ld-color-accent)]/16 blur-3xl" />

        <SidebarContent
          activeKey={activeKey}
          accessLevel={accessLevel}
          role={role}
          footer={footer}
          collapsed={collapsed}
          companyName={companyName}
          logoUrl={logoUrl}
          userName={userName}
          userEmail={userEmail}
          userAvatarUrl={userAvatarUrl}
          onToggleCollapse={onToggleCollapse}
        />
      </div>
    </aside>
  );
}
