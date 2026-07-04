import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { AppearanceSettingsManager } from "@/components/admin/AppearanceSettingsManager";
import { GlassSurface } from "@/components/admin/ui/GlassSurface";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { getAdminAccessContext } from "@/lib/admin";
import { appRoutes } from "@/lib/app-routes";
import { canManageAppearanceSettings } from "@/lib/crm/authz";
import { getCompanySettings } from "@/lib/crm/workspace-settings";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";

export const dynamic = "force-dynamic";

export default async function AppearanceSettingsPage() {
  const { role, accessLevel, actualAccessLevel, canSwitchAccessViews } =
    await getAdminAccessContext(appRoutes.settingsAppearance);

  if (!canManageAppearanceSettings({ accessLevel, role })) {
    redirect(appRoutes.settings);
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
                href={appRoutes.settings}
                className="admin-button-secondary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-medium"
              >
                Back to settings
              </Link>
            }
          />
          <GlassSurface as="section" intensity="medium" className="rounded-[24px] p-5 sm:p-6 ld-animate-fade-in-up">
            <AppearanceSettingsManager initialSettings={settings} />
          </GlassSurface>
        </div>
      ) : (
        <div className="rounded-[24px] border border-rose-300/20 bg-rose-400/[0.055] p-5 text-sm text-rose-100">
          <p className="font-semibold">{getCrmPageErrorCopy(pageError).title}</p>
          <p className="mt-2">{getCrmPageErrorCopy(pageError).description}</p>
        </div>
      )}
    </AdminShell>
  );
}
