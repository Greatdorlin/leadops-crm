"use client";

import type { CSSProperties, PropsWithChildren, ReactNode } from "react";
import { useState } from "react";
import type { AdminAccessLevel } from "@/lib/admin-permissions";
import type { CrmUserRole } from "@/lib/crm/types";
import {
  buildThemeCssVariables,
  getDensityClass,
  getDesignStyleClass,
} from "@/lib/crm/workspace-settings";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";
import { useAdminWorkspaceSettings } from "./AdminWorkspaceSettingsProvider";

interface AdminShellProps extends PropsWithChildren {
  activeNav: string;
  accessLevel?: AdminAccessLevel;
  role?: CrmUserRole | null;
  actualAccessLevel?: AdminAccessLevel;
  canSwitchAccessViews?: boolean;
  title: string;
  description?: string;
  actions?: ReactNode;
  sidebarFooter?: ReactNode;
  searchSlot?: ReactNode;
}

export function AdminShell({
  activeNav,
  accessLevel = "general_admin",
  role,
  actualAccessLevel,
  canSwitchAccessViews,
  title,
  description,
  actions,
  sidebarFooter,
  searchSlot,
  children,
}: AdminShellProps) {
  const workspaceSettings = useAdminWorkspaceSettings();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const adminThemeStyle = buildThemeCssVariables(workspaceSettings) as CSSProperties;
  const shellClasses = [
    "admin-shell text-slate-950",
    getDesignStyleClass(workspaceSettings.designStyle),
    getDensityClass(workspaceSettings.density),
  ].join(" ");

  function toggleSidebar() {
    setIsSidebarCollapsed((current) => !current);
  }

  return (
    <div
      className={shellClasses}
      style={adminThemeStyle}
      data-design-style={workspaceSettings.designStyle}
      data-density={workspaceSettings.density}
      data-theme-mode={workspaceSettings.themeMode}
      data-glass={workspaceSettings.glassEnabled ? "on" : "off"}
    >
      <div className="relative z-10 min-h-screen p-3 sm:p-4">
        <div
          className={[
            "grid min-h-[calc(100vh-1.5rem)] gap-4 xl:gap-5",
            isSidebarCollapsed
              ? "xl:grid-cols-[92px_minmax(0,1fr)]"
              : "xl:grid-cols-[248px_minmax(0,1fr)] 2xl:grid-cols-[260px_minmax(0,1fr)]",
          ].join(" ")}
        >
            <AdminSidebar
              activeKey={activeNav}
              accessLevel={accessLevel}
              role={role}
              footer={sidebarFooter}
              collapsed={isSidebarCollapsed}
              onToggleCollapse={toggleSidebar}
              companyName={workspaceSettings.companyName}
              logoUrl={workspaceSettings.logoUrl}
            />
          <div className="min-w-0">
            <AdminTopbar
              activeNav={activeNav}
              accessLevel={accessLevel}
              role={role}
              actualAccessLevel={actualAccessLevel}
              canSwitchAccessViews={canSwitchAccessViews}
              title={title}
              description={description}
              actions={actions}
              searchSlot={searchSlot}
            />
            <main className="px-0 pb-6 pt-4 sm:pt-5">
              <div className="w-full">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
