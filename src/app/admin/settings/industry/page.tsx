import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { IndustryPresetManager } from "@/components/admin/IndustryPresetManager";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { getAdminAccessContext } from "@/lib/admin";
import { canManageIndustryPresets } from "@/lib/crm/authz";
import { getCompanySettings } from "@/lib/crm/workspace-settings";

export const dynamic = "force-dynamic";

export default async function IndustrySettingsPage() {
  const { role, accessLevel, actualAccessLevel, canSwitchAccessViews } =
    await getAdminAccessContext("/admin/settings/industry");

  if (!canManageIndustryPresets({ accessLevel, role })) {
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
      title="Industry"
      description="Apply safer defaults for the kind of business this workspace supports."
      actions={<AdminSignOutButton />}
    >
      <div className="space-y-6">
        <SectionHeader
          eyebrow="Sales setup"
          title="Vertical presets"
          description="Start with industry defaults without losing the workspace customization you already have."
          actions={
            <Link
              href="/admin/settings"
              className="admin-button-secondary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-medium"
            >
              Back to settings
            </Link>
          }
        />
        <IndustryPresetManager initialSettings={settings} />
      </div>
    </AdminShell>
  );
}
