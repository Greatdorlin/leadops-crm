import type { ReactNode } from "react";
import { AdminAuthorizationProvider } from "@/components/admin/AdminAuthorizationProvider";
import { AdminWorkspaceSettingsProvider } from "@/components/admin/AdminWorkspaceSettingsProvider";
import { getAdminRequestContext } from "@/lib/admin";
import { getCompanySettings } from "@/lib/crm/workspace-settings-server";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const [settings, authorization] = await Promise.all([
    getCompanySettings(),
    getAdminRequestContext(),
  ]);

  return (
    <AdminWorkspaceSettingsProvider initialSettings={settings}>
      <AdminAuthorizationProvider permissions={authorization?.permissions ?? null}>
        {children}
      </AdminAuthorizationProvider>
    </AdminWorkspaceSettingsProvider>
  );
}
