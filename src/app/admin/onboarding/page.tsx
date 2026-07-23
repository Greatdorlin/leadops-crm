import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { WorkspaceOnboardingWizard } from "@/components/admin/WorkspaceOnboardingWizard";
import { getAdminAccessContext } from "@/lib/admin";
import { canManageIndustryPresets } from "@/lib/crm/authz";
import { getCompanySettings } from "@/lib/crm/workspace-settings-server";
import { VERTICAL_PRESET_DEFINITIONS } from "@/lib/crm/workspace-settings";

const onboardingPath = "/admin/onboarding";

export default async function WorkspaceOnboardingPage() {
  const {
    accessLevel,
    role,
    actualAccessLevel,
    canSwitchAccessViews,
    permissions,
  } = await getAdminAccessContext(onboardingPath);

  if (!canManageIndustryPresets({ accessLevel, permissions, role })) {
    redirect("/settings");
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
