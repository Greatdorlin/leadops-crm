import type { ReactNode } from "react";
import { AdminWorkspaceSettingsProvider } from "@/components/admin/AdminWorkspaceSettingsProvider";
import { getCompanySettings } from "@/lib/crm/workspace-settings";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const settings = await getCompanySettings();

  return (
    <AdminWorkspaceSettingsProvider initialSettings={settings}>
      {children}
    </AdminWorkspaceSettingsProvider>
  );
}
