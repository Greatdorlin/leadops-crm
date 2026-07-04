import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { LeadPreviewSettingsManager } from "@/components/admin/LeadPreviewSettingsManager";
import { PremiumPageHeader } from "@/components/admin/PremiumPageHeader";
import { getAdminAccessContext } from "@/lib/admin";
import { appRoutes } from "@/lib/app-routes";
import { canManageLeadPreviewSettings } from "@/lib/crm/authz";
import { listCustomFields } from "@/lib/crm/custom-fields-admin";
import { getCompanySettings } from "@/lib/crm/workspace-settings";

export const dynamic = "force-dynamic";

export default async function LeadPreviewSettingsPage() {
  const { role, accessLevel, actualAccessLevel, canSwitchAccessViews } =
    await getAdminAccessContext(appRoutes.settingsLeadPreview);

  if (!canManageLeadPreviewSettings({ accessLevel, role })) {
    redirect(appRoutes.settings);
  }

  const [settings, customFields] = await Promise.all([getCompanySettings(), listCustomFields()]);

  return (
    <AdminShell
      activeNav="settings"
      accessLevel={accessLevel}
      role={role}
      actualAccessLevel={actualAccessLevel}
      canSwitchAccessViews={canSwitchAccessViews}
      title="Lead Preview"
      description="Choose which lead details show up in the table and mobile cards."
      actions={<AdminSignOutButton />}
    >
      <div className="space-y-6">
        <PremiumPageHeader
          eyebrow="Lead preview"
          title="Queue visibility"
          description="Choose what matters in the table and in the mobile card."
          actions={
            <>
              <Link
                href={appRoutes.settingsFields}
                className="admin-button-secondary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-medium"
              >
                Manage fields
              </Link>
              <Link
                href={appRoutes.settings}
                className="admin-button-secondary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-medium"
              >
                Back to settings
              </Link>
            </>
          }
        />
        <LeadPreviewSettingsManager initialSettings={settings} customFields={customFields} />
      </div>
    </AdminShell>
  );
}
