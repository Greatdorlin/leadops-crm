import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { LeadPreviewSettingsManager } from "@/components/admin/LeadPreviewSettingsManager";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { getAdminAccessContext } from "@/lib/admin";
import { canManageLeadPreviewSettings } from "@/lib/crm/authz";
import { listCustomFields } from "@/lib/crm/custom-fields-admin";
import { getCompanySettings } from "@/lib/crm/workspace-settings";

export const dynamic = "force-dynamic";

export default async function LeadPreviewSettingsPage() {
  const { role, accessLevel, actualAccessLevel, canSwitchAccessViews } =
    await getAdminAccessContext("/admin/settings/lead-preview");

  if (!canManageLeadPreviewSettings({ accessLevel, role })) {
    redirect("/admin/settings");
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
        <SectionHeader
          eyebrow="Sales setup"
          title="Lead preview fields"
          description="Keep the queue readable while surfacing the details your team actually uses."
          actions={
            <Link
              href="/admin/settings"
              className="admin-button-secondary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-medium"
            >
              Back to settings
            </Link>
          }
        />
        <LeadPreviewSettingsManager initialSettings={settings} customFields={customFields} />
      </div>
    </AdminShell>
  );
}
