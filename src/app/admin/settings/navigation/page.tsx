import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { NavigationSettingsManager } from "@/components/admin/NavigationSettingsManager";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { getAdminAccessContext } from "@/lib/admin";
import { canManageNavigationSettings } from "@/lib/crm/authz";
import { getCompanySettings } from "@/lib/crm/workspace-settings";

export const dynamic = "force-dynamic";

export default async function NavigationSettingsPage() {
  const { role, accessLevel, actualAccessLevel, canSwitchAccessViews } =
    await getAdminAccessContext("/admin/settings/navigation");

  if (!canManageNavigationSettings({ accessLevel, role })) {
    redirect("/admin/settings");
  }

  const settings = await getCompanySettings();

  return (
    <AdminShell
      activeNav="settings"
      accessLevel={accessLevel}
      role={role}
      actualAccessLevel={actualAccessLevel}
      canSwitchAccessViews={canSwitchAccessViews}
      title="Navigation"
      description="Show, rename, and reorder the sidebar safely."
      actions={<AdminSignOutButton />}
    >
      <div className="space-y-6">
        <SectionHeader
          eyebrow="Workspace"
          title="Sidebar navigation"
          description="Keep the workspace focused without hiding the pages your team must always reach."
          actions={
            <Link
              href="/admin/settings"
              className="admin-button-secondary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-medium"
            >
              Back to settings
            </Link>
          }
        />
        <NavigationSettingsManager initialSettings={settings} />
      </div>
    </AdminShell>
  );
}
