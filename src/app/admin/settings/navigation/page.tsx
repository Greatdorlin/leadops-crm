import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { GlassSurface } from "@/components/admin/ui/GlassSurface";
import { NavigationSettingsManager } from "@/components/admin/NavigationSettingsManager";
import { getAdminAccessContext } from "@/lib/admin";
import { appRoutes } from "@/lib/app-routes";
import { canManageNavigationSettings } from "@/lib/crm/authz";
import { getCompanySettings } from "@/lib/crm/workspace-settings-server";

export const dynamic = "force-dynamic";

export default async function NavigationSettingsPage() {
  const { role, accessLevel, actualAccessLevel, canSwitchAccessViews, permissions } =
    await getAdminAccessContext(appRoutes.settingsNavigation);

  if (!canManageNavigationSettings({ accessLevel, permissions, role })) {
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
      <GlassSurface as="section" intensity="medium" className="rounded-[24px] p-5 sm:p-6 ld-animate-fade-in-up">
        <NavigationSettingsManager initialSettings={settings} />
      </GlassSurface>
    </AdminShell>
  );
}
