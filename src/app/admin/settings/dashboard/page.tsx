import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { DashboardSettingsManager } from "@/components/admin/DashboardSettingsManager";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { getAdminAccessContext } from "@/lib/admin";
import { appRoutes } from "@/lib/app-routes";
import { canManageDashboardSettings } from "@/lib/crm/authz";
import { getCompanySettings } from "@/lib/crm/workspace-settings";

export const dynamic = "force-dynamic";

export default async function DashboardSettingsPage() {
  const { role, accessLevel, actualAccessLevel, canSwitchAccessViews } =
    await getAdminAccessContext(appRoutes.settingsDashboard);

  if (!canManageDashboardSettings({ accessLevel, role })) {
    redirect(appRoutes.settings);
  }

  const settings = await getCompanySettings();

  return (
    <AdminShell
      activeNav="settings"
      accessLevel={accessLevel}
      role={role}
      actualAccessLevel={actualAccessLevel}
      canSwitchAccessViews={canSwitchAccessViews}
      title="Dashboard"
      description="Choose which widgets stay visible and how the overview opens each day."
      actions={<AdminSignOutButton />}
    >
      <div className="space-y-6">
        <SectionHeader
          eyebrow="Workspace"
          title="Dashboard widgets"
          description="Keep the overview focused on the metrics your team acts on every day."
          actions={
            <Link
              href={appRoutes.settings}
              className="admin-button-secondary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-medium"
            >
              Back to settings
            </Link>
          }
        />
        <DashboardSettingsManager initialSettings={settings} />
      </div>
    </AdminShell>
  );
}
