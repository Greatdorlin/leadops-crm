import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { CurrencySettingsManager } from "@/components/admin/CurrencySettingsManager";
import { GlassSurface } from "@/components/admin/ui/GlassSurface";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { getAdminAccessContext } from "@/lib/admin";
import { appRoutes } from "@/lib/app-routes";
import { canManageCurrencySettings } from "@/lib/crm/authz";
import { getCompanySettings } from "@/lib/crm/workspace-settings";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";

export const dynamic = "force-dynamic";

export default async function CurrencySettingsPage() {
  const { role, accessLevel, actualAccessLevel, canSwitchAccessViews } =
    await getAdminAccessContext(appRoutes.settingsCurrency);

  if (!canManageCurrencySettings({ accessLevel, role })) {
    redirect(appRoutes.settings);
  }

  let settings = null;
  let pageError: unknown = null;

  try {
    settings = await getCompanySettings();
  } catch (error) {
    logCrmPageError("settings-currency", error);
    pageError = error;
  }

  return (
    <AdminShell
      activeNav="settings"
      accessLevel={accessLevel}
      role={role}
      actualAccessLevel={actualAccessLevel}
      canSwitchAccessViews={canSwitchAccessViews}
      title="Currency"
      description="Set the default currency for sales targets and lead values."
      actions={
        <>
          <Link
            href={appRoutes.settings}
            className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium"
          >
            Back to settings
          </Link>
          <AdminSignOutButton />
        </>
      }
    >
      {settings ? (
        <div className="space-y-6">
          <SectionHeader
            eyebrow="Workspace currency"
            title="Currency settings"
            description="Control the default currency used across targets, leads, and reporting."
          />
          <GlassSurface as="section" intensity="medium" className="rounded-[24px] p-5 sm:p-6 ld-animate-fade-in-up">
            <CurrencySettingsManager initialGlobalCurrency={settings.globalCurrency} />
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
