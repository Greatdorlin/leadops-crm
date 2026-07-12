import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { DashboardSettingsManager } from "@/components/admin/DashboardSettingsManager";
import { getAdminAccessContext } from "@/lib/admin";
import { isLocalAdminPreviewEmail } from "@/lib/admin-access";
import { appRoutes } from "@/lib/app-routes";
import { canManageDashboardSettings } from "@/lib/crm/authz";
import { resolveStoredWorkspaceSettings } from "@/lib/crm/workspace-settings";
import { getCompanySettings } from "@/lib/crm/workspace-settings-server";

export const dynamic = "force-dynamic";

export default async function DashboardSettingsPage() {
  const { session, role, accessLevel, actualAccessLevel, canSwitchAccessViews, permissions } =
    await getAdminAccessContext(appRoutes.settingsDashboard);

  if (!canManageDashboardSettings({ accessLevel, permissions, role })) {
    redirect(appRoutes.settings);
  }

  const settings = isLocalAdminPreviewEmail(session.user?.email)
    ? resolveStoredWorkspaceSettings(null)
    : await getCompanySettings();

  return (
    <AdminShell
      activeNav="settings"
      accessLevel={accessLevel}
      role={role}
      actualAccessLevel={actualAccessLevel}
      canSwitchAccessViews={canSwitchAccessViews}
      title="Dashboard"
      description="Choose which widgets stay visible and how the overview opens each day."
      actions={
        <>
          <Link
            href={appRoutes.settings}
            prefetch={false}
            className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium"
          >
            Back to settings
          </Link>
          <AdminSignOutButton />
        </>
      }
    >
      <DashboardSettingsManager initialSettings={settings} demoMode={isLocalAdminPreviewEmail(session.user?.email)} />
    </AdminShell>
  );
}
