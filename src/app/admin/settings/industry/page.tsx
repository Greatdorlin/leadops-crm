import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminAccessContext } from "@/lib/admin";
import { appRoutes } from "@/lib/app-routes";
import { ALL_INDUSTRY_PRESETS } from "@/lib/crm/industry-presets";
import { IndustryPresetManager } from "@/components/admin/IndustryPresetManager";

export default async function IndustryPresetPage() {
  const { accessLevel, role, actualAccessLevel, canSwitchAccessViews } =
    await getAdminAccessContext(appRoutes.settings);

  return (
    <AdminShell
      activeNav="settings"
      accessLevel={accessLevel}
      role={role}
      actualAccessLevel={actualAccessLevel}
      canSwitchAccessViews={canSwitchAccessViews}
      title="Industry preset"
      description="Apply a pre-built configuration for your business type."
    >
      <IndustryPresetManager presets={ALL_INDUSTRY_PRESETS} />
    </AdminShell>
  );
}
