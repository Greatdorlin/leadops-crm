import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { BranchSettingsManager } from "@/components/admin/BranchSettingsManager";
import { getAdminAccessContext } from "@/lib/admin";
import { canManageBranches } from "@/lib/crm/authz";
import { appRoutes } from "@/lib/app-routes";

export const dynamic = "force-dynamic";

export default async function BranchesSettingsPage() {
  const { role, accessLevel, actualAccessLevel, canSwitchAccessViews, permissions } =
    await getAdminAccessContext(appRoutes.settingsBranches);

  if (!canManageBranches({ accessLevel, permissions, role })) {
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
