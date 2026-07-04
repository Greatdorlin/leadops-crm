import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { BranchSettingsManager } from "@/components/admin/BranchSettingsManager";
import { getAdminAccessContext } from "@/lib/admin";
import { canManageSettings } from "@/lib/admin-permissions";
import { canManageBranches } from "@/lib/crm/authz";
import { appRoutes } from "@/lib/app-routes";

export const dynamic = "force-dynamic";

export default async function BranchesSettingsPage() {
  const { session, role, accessLevel, actualAccessLevel, canSwitchAccessViews } =
    await getAdminAccessContext(appRoutes.settingsBranches);

  if (!canManageSettings(accessLevel, role)) {
    redirect(appRoutes.dashboard);
  }

  if (!canManageBranches({ accessLevel, role })) {
    redirect(appRoutes.settings);
  }

  return (
    <AdminShell
      activeNav="settings"
      accessLevel={accessLevel}
      role={role}
      actualAccessLevel={actualAccessLevel}
      canSwitchAccessViews={canSwitchAccessViews}
      title="Branch settings"
      description="Set branch currencies and manage locations."
    >
      <BranchSettingsManager />
    </AdminShell>
  );
}
