"use client";

import type { CSSProperties, PropsWithChildren, ReactNode } from "react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ArrowLeft, Menu, UserRound } from "lucide-react";
import Link from "next/link";
import { appRoutes } from "@/lib/app-routes";
import { useRouter } from "next/navigation";
import {
  getStoredRoleForAccessLevel,
  type AdminAccessLevel,
} from "@/lib/admin-permissions";
import type { CrmUserRole } from "@/lib/crm/types";
import {
  resolvePermissionList,
  type PermissionKey,
} from "@/lib/crm/role-permissions-contract";
import {
  buildThemeCssVariables,
  getDensityClass,
  getDesignStyleClass,
} from "@/lib/crm/workspace-settings";
import { LeadsDeskWordmark } from "@/components/brand/LeadsDeskWordmark";
import { AdminSectionNavigation } from "./AdminSectionNavigation";
import { AdminSidebar, SidebarNavigation } from "./AdminSidebar";
import { AdminSignOutButton } from "./AdminSignOutButton";
import { AdminTopbar } from "./AdminTopbar";
import { useAdminPermissions } from "./AdminAuthorizationProvider";
import { useAdminWorkspaceSettings } from "./AdminWorkspaceSettingsProvider";
import { MobileSidebarDrawer } from "./ui/MobileSidebarDrawer";
import { SmoothButton } from "./ui/SmoothButton";

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

const sidebarPreferenceKey = "ld_admin_sidebar_collapsed";

function subscribeSidebarPreference(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(sidebarPreferenceKey, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(sidebarPreferenceKey, callback);
  };
}

function readSidebarPreference() {
  return window.localStorage.getItem(sidebarPreferenceKey) === "1";
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
  const router = useRouter();
  const contextPermissions = useAdminPermissions();
  const fallbackRole = getStoredRoleForAccessLevel(accessLevel);
  const resolvedPermissions = resolvePermissionList(
    permissions ?? contextPermissions,
    fallbackRole,
  );
  const isSidebarCollapsed = useSyncExternalStore(subscribeSidebarPreference, readSidebarPreference, () => false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const adminThemeStyle = buildThemeCssVariables(workspaceSettings) as CSSProperties;
  const shellClasses = [
    "admin-shell text-white",
    getDesignStyleClass(workspaceSettings.designStyle),
    getDensityClass(workspaceSettings.density),
  ].join(" ");
  const glassStyle = getGlassStyle(workspaceSettings);

  function toggleSidebar() {
    window.localStorage.setItem(sidebarPreferenceKey, isSidebarCollapsed ? "0" : "1");
    window.dispatchEvent(new Event(sidebarPreferenceKey));
  }

  useEffect(() => {
    if (!mobileDrawerOpen) return;
    const desktop = window.matchMedia("(min-width: 64rem)");
    const closeOnDesktop = () => {
      if (desktop.matches) setMobileDrawerOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, [mobileDrawerOpen]);

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
      <div className="relative z-10 min-h-[100dvh] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-4">
        <a href="#workspace-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-lg focus:bg-zinc-900 focus:p-3">Skip to content</a>
        <div
          className={[
            "grid grid-cols-[minmax(0,1fr)] min-h-[calc(100vh-1.5rem)] gap-4 lg:gap-6",
            isSidebarCollapsed
              ? "lg:grid-cols-[76px_minmax(0,1fr)]"
              : "lg:grid-cols-[min(220px,var(--ld-sidebar-width))_minmax(0,1fr)] xl:grid-cols-[var(--ld-sidebar-width)_minmax(0,1fr)]",
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
          <div className="mx-auto w-full min-w-0 max-w-[100rem]">
            <div className="sticky top-0 z-40 mb-2 flex min-w-0 items-center gap-1 rounded-xl border border-white/10 bg-[color:var(--ld-color-background)] p-1.5 lg:hidden">
              <SmoothButton
                variant="ghost"
                size="sm"
                className="min-h-11 shrink-0"
                aria-haspopup="dialog"
                aria-expanded={mobileDrawerOpen}
                onClick={() => setMobileDrawerOpen(true)}
                icon={<Menu className="h-5 w-5" />}
              >
                Menu
              </SmoothButton>
              <SmoothButton
                variant="ghost"
                size="sm"
                className="min-h-11 shrink-0 px-3"
                onClick={() => {
                  if (window.history.length > 1) router.back();
                  else router.push(appRoutes.dashboard);
                }}
                icon={<ArrowLeft className="h-5 w-5" />}
                aria-label="Go back"
              >
                <span className="sr-only">Back</span>
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
                className="ml-auto min-w-0"
              />
            </div>
            <AdminTopbar
              title={title}
              description={description}
              actions={actions}
              searchSlot={searchSlot}
            />
            <main id="workspace-content" tabIndex={-1} className="min-w-0 max-w-full [overflow-wrap:anywhere] px-0 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 sm:pb-6 sm:pt-5">
              <AdminSectionNavigation />
              {children}
            </main>
          </div>
        </div>
      </div>

      <MobileSidebarDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        title="Navigation"
      >
        <SidebarNavigation
          activeKey={activeNav}
          accessLevel={accessLevel}
          role={role}
          permissions={resolvedPermissions}
          onNavigate={() => setMobileDrawerOpen(false)}
          className="p-3"
        />
        {sidebarFooter ? (
          <div className="border-t border-white/[0.07] p-3">{sidebarFooter}</div>
        ) : null}
        <div className="space-y-2 border-t border-white/[0.07] p-3">
          <Link href={appRoutes.profile} onClick={() => setMobileDrawerOpen(false)} className="ld-focus-ring flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-white/75 hover:bg-white/8 hover:text-white">
            <UserRound aria-hidden="true" className="size-[18px]" /> My profile
          </Link>
          <AdminSignOutButton mobile />
        </div>
      </MobileSidebarDrawer>
    </div>
  );
}
