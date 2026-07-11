import type { ReactNode } from "react";
import { AdminWorkspaceSettingsProvider } from "@/components/admin/AdminWorkspaceSettingsProvider";
import { getCompanySettings } from "@/lib/crm/workspace-settings-server";

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const settings = await getCompanySettings();

  return (
    <AdminWorkspaceSettingsProvider initialSettings={settings}>
      {children}
    </AdminWorkspaceSettingsProvider>
  );
}
