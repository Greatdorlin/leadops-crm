import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { AppearanceSettingsManager } from "@/components/admin/AppearanceSettingsManager";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { getAdminAccessContext } from "@/lib/admin";
import { canManageAppearanceSettings } from "@/lib/crm/authz";
import { getCompanySettings } from "@/lib/crm/workspace-settings";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";

export const dynamic = "force-dynamic";

export default async function AppearanceSettingsPage() {
  const { role, accessLevel, actualAccessLevel, canSwitchAccessViews } =
    await getAdminAccessContext("/admin/settings/appearance");

  if (!canManageAppearanceSettings({ accessLevel, role })) {
    redirect("/admin/settings");
  }

  let settings = null;
  let pageError: unknown = null;

  try {
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
      actions={<AdminSignOutButton />}
    >
      {settings ? (
        <div className="space-y-6">
          <SectionHeader
            eyebrow="Brand settings"
            title="Appearance customization"
            description="Control the colors, logo, login experience, and visual style your team sees."
            actions={
              <Link
                href="/admin/settings"
                className="admin-button-secondary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-medium"
              >
                Back to settings
              </Link>
            }
          />
          <AppearanceSettingsManager initialSettings={settings} />
        </div>
      ) : (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
          <p className="font-semibold">{getCrmPageErrorCopy(pageError).title}</p>
          <p className="mt-2">{getCrmPageErrorCopy(pageError).description}</p>
        </div>
      )}
    </AdminShell>
  );
}
