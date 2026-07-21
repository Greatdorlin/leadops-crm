import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { CurrencySettingsManager } from "@/components/admin/CurrencySettingsManager";
import { GlassSurface } from "@/components/admin/ui/GlassSurface";
import { getAdminAccessContext } from "@/lib/admin";
import { isLocalAdminPreviewEmail } from "@/lib/admin-access";
import { appRoutes } from "@/lib/app-routes";
import { canManageCurrencySettings } from "@/lib/crm/authz";
import { listCurrencyExchangeRates } from "@/lib/crm/currency-exchange";
import { getCompanySettings } from "@/lib/crm/workspace-settings-server";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";
import { resolveStoredWorkspaceSettings } from "@/lib/crm/workspace-settings";

export const dynamic = "force-dynamic";

export default async function CurrencySettingsPage() {
  const { session, role, accessLevel, actualAccessLevel, canSwitchAccessViews, permissions } =
    await getAdminAccessContext(appRoutes.settingsCurrency);

  if (!canManageCurrencySettings({ accessLevel, permissions, role })) {
    redirect(appRoutes.settings);
  }

  let settings = null;
  let exchangeRates = null;
  let pageError: unknown = null;

  if (isLocalAdminPreviewEmail(session.user?.email)) {
    settings = resolveStoredWorkspaceSettings(null);
    exchangeRates = [];
  } else try {
    [settings, exchangeRates] = await Promise.all([
      getCompanySettings(),
      listCurrencyExchangeRates(),
    ]);
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
        <GlassSurface as="section" intensity="medium" className="rounded-[24px] p-5 sm:p-6 ld-animate-fade-in-up">
          <CurrencySettingsManager
            initialGlobalCurrency={settings.globalCurrency}
            initialExchangeRates={exchangeRates ?? []}
            demoMode={isLocalAdminPreviewEmail(session.user?.email)}
          />
        </GlassSurface>
      ) : (
        <div className="rounded-[24px] border border-rose-300/20 bg-rose-400/[0.055] p-5 text-sm text-rose-100">
          <p className="font-semibold">{getCrmPageErrorCopy(pageError).title}</p>
          <p className="mt-2">{getCrmPageErrorCopy(pageError).description}</p>
        </div>
      )}
    </AdminShell>
  );
}
