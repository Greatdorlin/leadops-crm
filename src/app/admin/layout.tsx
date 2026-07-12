import type { ReactNode } from "react";
import { AdminAuthorizationProvider } from "@/components/admin/AdminAuthorizationProvider";
import { AdminWorkspaceSettingsProvider } from "@/components/admin/AdminWorkspaceSettingsProvider";
import { getAdminRequestContext } from "@/lib/admin";
import { isLocalAdminPreviewEmail } from "@/lib/admin-access";
import { resolveStoredWorkspaceSettings } from "@/lib/crm/workspace-settings";
import { getCompanySettings } from "@/lib/crm/workspace-settings-server";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const authorization = await getAdminRequestContext();
  const settings = isLocalAdminPreviewEmail(authorization?.session.user?.email)
    ? resolveStoredWorkspaceSettings(null)
    : await getCompanySettings();

  return (
    <AdminWorkspaceSettingsProvider initialSettings={settings}>
      <AdminAuthorizationProvider permissions={authorization?.permissions ?? null}>
        {children}
      </AdminAuthorizationProvider>
    </AdminWorkspaceSettingsProvider>
  );
}
