"use client";

import type { CSSProperties, PropsWithChildren, ReactNode } from "react";
import { useState } from "react";
import { Menu } from "lucide-react";
import Link from "next/link";
import {
  getStoredRoleForAccessLevel,
  type AdminAccessLevel,
} from "@/lib/admin-permissions";
import type { CrmUserRole } from "@/lib/crm/types";
import {
  resolvePermissionList,
  type PermissionKey,
} from "@/lib/crm/role-permissions-contract";
import { cn } from "@/lib/cn";
import {
  buildThemeCssVariables,
  getDensityClass,
  getDesignStyleClass,
} from "@/lib/crm/workspace-settings";
import { LeadsDeskWordmark } from "@/components/brand/LeadsDeskWordmark";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";
import { useAdminPermissions } from "./AdminAuthorizationProvider";
import { useAdminWorkspaceSettings } from "./AdminWorkspaceSettingsProvider";
import { MobileSidebarDrawer } from "./ui/MobileSidebarDrawer";
import { SmoothButton } from "./ui/SmoothButton";
import { PageTransition } from "./ui/PageTransition";
import { getAdminNavigation } from "./navigation";

interface AdminShellProps extends PropsWithChildren {
  activeNav: string;
  accessLevel?: AdminAccessLevel;
  role?: CrmUserRole | null;
  permissions?: readonly PermissionKey[];
  actualAccessLevel?: AdminAccessLevel;
  canSwitchAccessViews?: boolean;
  title: string;
  description?: string;
  actions?: ReactNode;
  sidebarFooter?: ReactNode;
  searchSlot?: ReactNode;
  userName?: string | null;
  userEmail?: string | null;
  userAvatarUrl?: string | null;
}

function getGlassStyle(settings: ReturnType<typeof useAdminWorkspaceSettings>) {
  if (!settings.glassEnabled) {
    return "off";
  }

  if (settings.designStyle === "liquid_glass") {
    if (settings.glassOpacity >= 78 || settings.glassBlur >= 28) {
      return "bold";
    }

    if (settings.glassOpacity >= 62 || settings.glassBlur >= 22) {
      return "vibrant";
    }
  }

  return "soft";
}

export function AdminShell({
  activeNav,
  accessLevel = "general_admin",
  role,
  permissions,
  actualAccessLevel,
  canSwitchAccessViews,
  title,
  description,
  actions,
  sidebarFooter,
  searchSlot,
  userName,
  userEmail,
  userAvatarUrl,
  children,
}: AdminShellProps) {
  const workspaceSettings = useAdminWorkspaceSettings();
  const contextPermissions = useAdminPermissions();
  const fallbackRole = getStoredRoleForAccessLevel(accessLevel);
  const resolvedPermissions = resolvePermissionList(
    permissions ?? contextPermissions,
    fallbackRole,
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const adminThemeStyle = buildThemeCssVariables(workspaceSettings) as CSSProperties;
  const shellClasses = [
    "admin-shell text-white",
    getDesignStyleClass(workspaceSettings.designStyle),
    getDensityClass(workspaceSettings.density),
  ].join(" ");
  const glassStyle = getGlassStyle(workspaceSettings);

  function toggleSidebar() {
    setIsSidebarCollapsed((current) => !current);
  }

  const navigation = getAdminNavigation(
    accessLevel,
    role,
    workspaceSettings.navigation,
    resolvedPermissions,
  );

  return (
    <div
      className={shellClasses}
      style={adminThemeStyle}
      data-design-style={workspaceSettings.designStyle}
      data-density={workspaceSettings.density}
      data-theme-mode={workspaceSettings.themeMode}
      data-glass={workspaceSettings.glassEnabled ? "on" : "off"}
      data-glass-style={glassStyle}
    >
      <div className="ld-bg-overlay" aria-hidden="true" />
      <div className="relative z-10 min-h-screen p-3 sm:p-4">
        <div
          className={[
            "grid min-h-[calc(100vh-1.5rem)] gap-3 xl:gap-4",
            isSidebarCollapsed
              ? "xl:grid-cols-[92px_minmax(0,1fr)]"
              : "xl:grid-cols-[var(--ld-sidebar-width)_minmax(0,1fr)]",
          ].join(" ")}
        >
            <AdminSidebar
              activeKey={activeNav}
              accessLevel={accessLevel}
              role={role}
              permissions={resolvedPermissions}
              footer={sidebarFooter}
              collapsed={isSidebarCollapsed}
              onToggleCollapse={toggleSidebar}
              companyName={workspaceSettings.companyName}
              logoUrl={workspaceSettings.logoUrl}
              userName={userName}
              userEmail={userEmail}
              userAvatarUrl={userAvatarUrl}
            />
          <div className="min-w-0">
            <div className="flex items-center gap-3 pb-2 xl:hidden">
              <SmoothButton
                variant="ghost"
                size="sm"
                onClick={() => setMobileDrawerOpen(true)}
                icon={<Menu className="h-5 w-5" />}
              >
                Menu
              </SmoothButton>
              <LeadsDeskWordmark
                tone="light"
                variant="mark"
                companyName={workspaceSettings.companyName}
                subtitle=""
                logoUrl={workspaceSettings.logoUrl}
                logoUrlLightMode={workspaceSettings.logoUrlLightMode}
                logoUrlDarkMode={workspaceSettings.logoUrlDarkMode}
                surfaceMode="dark"
                className="min-w-0"
              />
            </div>
            <AdminTopbar
              activeNav={activeNav}
              accessLevel={accessLevel}
              role={role}
              permissions={resolvedPermissions}
              actualAccessLevel={actualAccessLevel}
              canSwitchAccessViews={canSwitchAccessViews}
              title={title}
              description={description}
              actions={actions}
              searchSlot={searchSlot}
            />
            <main className="scroll-smooth px-0 pb-6 pt-4 sm:pt-5">
              <PageTransition key={activeNav}>
                <div className="w-full">{children}</div>
              </PageTransition>
            </main>
          </div>
        </div>
      </div>

      <MobileSidebarDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        title="Navigation"
      >
        <nav className="space-y-1 p-3">
          {navigation.map((item) => {
            const isActive = item.key === activeNav;
            return (
              <Link
                key={item.key}
                href={item.href}
                prefetch={false}
                onClick={() => setMobileDrawerOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-[16px] border px-3 py-2.5 transition duration-200",
                  isActive
                    ? "border-white/20 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--ld-color-primary)_30%,transparent),color-mix(in_srgb,var(--ld-color-accent)_22%,transparent))] text-white shadow-[0_12px_28px_color-mix(in_srgb,var(--ld-color-primary)_18%,transparent),inset_0_1px_0_rgba(255,255,255,0.16)]"
                    : "border-transparent text-white/70 hover:border-white/10 hover:bg-white/[0.055] hover:text-white"
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] border transition duration-200",
                    isActive
                      ? "border-white/20 bg-white/[0.13] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                      : "border-transparent bg-transparent text-white/70"
                  )}
                >
                  <item.icon className="h-[18px] w-[18px]" />
                </span>
                <span className="relative min-w-0">
                  <span className="block truncate text-[13px] font-semibold tracking-[-0.01em]">{item.label}</span>
                </span>
              </Link>
            );
          })}
        </nav>
        {sidebarFooter ? (
          <div className="border-t border-white/[0.07] p-3">{sidebarFooter}</div>
        ) : null}
      </MobileSidebarDrawer>
    </div>
  );
}
