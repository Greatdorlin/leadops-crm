"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import type { AdminAccessLevel } from "@/lib/admin-permissions";
import { LeadsDeskWordmark } from "@/components/brand/LeadsDeskWordmark";
import { cn } from "@/lib/cn";
import { useAdminWorkspaceSettings } from "@/components/admin/AdminWorkspaceSettingsProvider";
import type { CrmUserRole } from "@/lib/crm/types";
import type { PermissionKey } from "@/lib/crm/role-permissions-contract";
import { appRoutes } from "@/lib/app-routes";
import { getAdminNavigation } from "./navigation";
import { TeamAvatar } from "./TeamAvatar";
import { GlassSurface } from "./ui/GlassSurface";
import { SmoothButton } from "./ui/SmoothButton";

function DefaultSidebarFooter({
  accessLevel,
  userName,
  userEmail,
  avatarUrl,
  canCustomize,
}: {
  accessLevel: AdminAccessLevel;
  userName?: string | null;
  userEmail?: string | null;
  avatarUrl?: string | null;
  canCustomize: boolean;
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
      {canCustomize ? (
        <Link
          href={appRoutes.settingsAppearance}
          prefetch={false}
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
      ) : null}

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
  permissions: readonly PermissionKey[];
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
  permissions,
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
  const resolvedCompanyName = companyName ?? workspaceSettings.companyName;

  return (
    <>
      <div
        className={cn(
          "relative flex min-w-0 items-center px-2 py-2 ld-animate-fade-in-up",
          collapsed ? "flex-col justify-center gap-2 px-0" : "justify-between gap-2",
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
            aria-expanded={!collapsed}
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

      <SidebarNavigation
        activeKey={activeKey}
        accessLevel={accessLevel}
        role={role}
        permissions={permissions}
        collapsed={collapsed}
        className="mt-5 min-h-0 w-full flex-1 overflow-y-auto ld-sidebar-nav-scroll"
      />

      {collapsed ? (
        <Link href={appRoutes.profile} prefetch={false} aria-label="My profile" title="My profile" className="ld-focus-ring mt-2 grid size-11 shrink-0 place-items-center rounded-lg text-white/70 hover:bg-white/8 hover:text-white">
          <UserRound aria-hidden="true" className="size-[18px]" />
        </Link>
      ) : (
        <div className="relative mt-auto border-t border-white/[0.07] pt-3">
          {footer ?? (
            <DefaultSidebarFooter
              accessLevel={accessLevel}
              canCustomize={permissions.includes("canManageAppearance")}
              userName={userName}
              userEmail={userEmail}
              avatarUrl={userAvatarUrl}
            />
          )}
        </div>
      )}
    </>
  );
}

export function SidebarNavigation({
  activeKey, accessLevel, role, permissions, collapsed = false, onNavigate, className,
}: Pick<SidebarContentProps, "activeKey" | "accessLevel" | "role" | "permissions" | "collapsed"> & {
  onNavigate?: () => void;
  className?: string;
}) {
  const settings = useAdminWorkspaceSettings();
  const navigation = getAdminNavigation(accessLevel, role, settings.navigation, permissions);

  return (
    <nav aria-label="Workspace" className={cn("space-y-1", className)}>
      {navigation.map(({ key, href, label, icon: Icon }) => (
        <Link
          key={key}
          href={href}
          prefetch={false}
          onClick={onNavigate}
          title={collapsed ? label : undefined}
          aria-current={key === activeKey ? "page" : undefined}
          className={cn(
            "ld-focus-ring flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
            key === activeKey
              ? "bg-white/12 text-white"
              : "text-white/70 hover:bg-white/7 hover:text-white",
            collapsed && "justify-center px-0",
          )}
        >
          <Icon aria-hidden="true" className={cn("size-[18px] shrink-0", key === activeKey && "text-[var(--ld-color-primary)]")} />
          <span className={collapsed ? "sr-only" : "min-w-0 truncate"}>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

export function AdminSidebar({
  activeKey,
  accessLevel,
  role,
  permissions,
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
  permissions: readonly PermissionKey[];
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
    <aside className="hidden lg:block">
      <div
        className={cn(
          "sticky top-4 flex h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[color:color-mix(in_srgb,var(--ld-color-sidebar)_85%,#14151b)] p-3 text-white",
          "ease-[cubic-bezier(0.32,0.72,0,1.02)]",
          collapsed && "items-center px-2.5",
        )}
      >
        <SidebarContent
          activeKey={activeKey}
          accessLevel={accessLevel}
          role={role}
          permissions={permissions}
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
