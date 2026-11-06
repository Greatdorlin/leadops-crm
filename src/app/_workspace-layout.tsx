import { getAdminRequestContext } from "@/lib/admin";
import { AdminAuthorizationProvider } from "@/components/admin/AdminAuthorizationProvider";
import type { ReactNode } from "react";
import { AdminWorkspaceSettingsProvider } from "@/components/admin/AdminWorkspaceSettingsProvider";
import { getCompanySettings } from "@/lib/crm/workspace-settings-server";

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const [settings, authorization] = await Promise.all([getCompanySettings(), getAdminRequestContext()]);

  return (
    <AdminWorkspaceSettingsProvider initialSettings={settings}>
      <AdminAuthorizationProvider permissions={authorization?.permissions ?? null} identity={{ name: authorization?.crmUser?.fullName || authorization?.session.user?.name, email: authorization?.session.user?.email, avatarUrl: authorization?.crmUser?.avatarUrl }}>{children}</AdminAuthorizationProvider>
    </AdminWorkspaceSettingsProvider>
  );
}
