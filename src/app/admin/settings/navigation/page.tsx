import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { GlassSurface } from "@/components/admin/ui/GlassSurface";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { NavigationSettingsManager } from "@/components/admin/NavigationSettingsManager";
import { getAdminAccessContext } from "@/lib/admin";
import { appRoutes } from "@/lib/app-routes";
import { canManageNavigationSettings } from "@/lib/crm/authz";
import { getCompanySettings } from "@/lib/crm/workspace-settings";

export const dynamic = "force-dynamic";

export default async function NavigationSettingsPage() {
  const { role, accessLevel, actualAccessLevel, canSwitchAccessViews } =
    await getAdminAccessContext(appRoutes.settingsNavigation);

  if (!canManageNavigationSettings({ accessLevel, role })) {
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
              href={appRoutes.settings}
              className="admin-button-secondary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-medium"
            >
              Back to settings
            </Link>
          }
        />
        <GlassSurface as="section" intensity="medium" className="rounded-[24px] p-5 sm:p-6 ld-animate-fade-in-up">
          <NavigationSettingsManager initialSettings={settings} />
        </GlassSurface>
      </div>
    </AdminShell>
  );
}
