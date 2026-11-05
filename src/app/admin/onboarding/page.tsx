import { redirect } from "next/navigation";
import { appRoutes } from "@/lib/app-routes";
import { AdminShell } from "@/components/admin/AdminShell";
import { WorkspaceOnboardingWizard } from "@/components/admin/WorkspaceOnboardingWizard";
import { getAdminAccessContext } from "@/lib/admin";
import { canManageIndustryPresets } from "@/lib/crm/authz";
import { getCompanySettings } from "@/lib/crm/workspace-settings-server";
import { VERTICAL_PRESET_DEFINITIONS } from "@/lib/crm/workspace-settings";

export default async function WorkspaceOnboardingPage() {
  const {
    accessLevel,
    role,
    actualAccessLevel,
    canSwitchAccessViews,
    permissions,
  } = await getAdminAccessContext(appRoutes.onboarding);

  if (!canManageIndustryPresets({ accessLevel, permissions, role })) {
    redirect(appRoutes.settings);
  }

  const settings = await getCompanySettings();

  return (
    <AdminShell
      activeNav="settings"
      accessLevel={accessLevel}
      role={role}
      permissions={permissions}
      actualAccessLevel={actualAccessLevel}
      canSwitchAccessViews={canSwitchAccessViews}
      title="Set up your workspace"
      description="Choose a workflow, review every change, then apply it."
    >
      <WorkspaceOnboardingWizard
        currentPresetKey={settings.industryPreset}
        initialProfile={settings.onboardingProfile}
        presets={Object.values(VERTICAL_PRESET_DEFINITIONS)}
      />
    </AdminShell>
  );
}
