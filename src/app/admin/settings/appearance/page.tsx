import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { AppearanceSettingsManager } from "@/components/admin/AppearanceSettingsManager";
import { getAdminAccessContext } from "@/lib/admin";
import { isLocalAdminPreviewEmail } from "@/lib/admin-access";
import { appRoutes } from "@/lib/app-routes";
import { canManageAppearanceSettings } from "@/lib/crm/authz";
import { getCompanySettings } from "@/lib/crm/workspace-settings-server";
import { resolveStoredWorkspaceSettings } from "@/lib/crm/workspace-settings";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";

export const dynamic = "force-dynamic";

export default async function AppearanceSettingsPage() {
  const { session, role, accessLevel, actualAccessLevel, canSwitchAccessViews, permissions } =
    await getAdminAccessContext(appRoutes.settingsAppearance);

  if (!canManageAppearanceSettings({ accessLevel, permissions, role })) {
    redirect(appRoutes.settings);
  }

  let settings = null;
  let pageError: unknown = null;

  if (isLocalAdminPreviewEmail(session.user?.email)) {
    settings = resolveStoredWorkspaceSettings(null);
  } else try {
    settings = await getCompanySettings();
  } catch (error) {
    logCrmPageError("settings-appearance", error);
    pageError = error;
  }

  return (
    <AdminShell
      activeNav="settings"
      accessLevel={accessLevel}
      role={role}
      actualAccessLevel={actualAccessLevel}
      canSwitchAccessViews={canSwitchAccessViews}
      title="Appearance"
      description="Brand the workspace, login page, and visual style."
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
      {settings ? (
        <AppearanceSettingsManager initialSettings={settings} demoMode={isLocalAdminPreviewEmail(session.user?.email)} />
      ) : (
        <div className="rounded-[24px] border border-rose-300/20 bg-rose-400/[0.055] p-5 text-sm text-rose-100">
          <p className="font-semibold">{getCrmPageErrorCopy(pageError).title}</p>
          <p className="mt-2">{getCrmPageErrorCopy(pageError).description}</p>
        </div>
      )}
    </AdminShell>
  );
}
