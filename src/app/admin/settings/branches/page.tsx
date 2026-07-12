import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { BranchSettingsManager } from "@/components/admin/BranchSettingsManager";
import { getAdminAccessContext } from "@/lib/admin";
import { isLocalAdminPreviewEmail } from "@/lib/admin-access";
import { canManageBranches } from "@/lib/crm/authz";
import { appRoutes } from "@/lib/app-routes";

export const dynamic = "force-dynamic";

export default async function BranchesSettingsPage() {
  const { session, role, accessLevel, actualAccessLevel, canSwitchAccessViews, permissions } =
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
      <BranchSettingsManager
        demoMode={isLocalAdminPreviewEmail(session.user?.email)}
        initialBranches={isLocalAdminPreviewEmail(session.user?.email) ? [
          { id: "demo-branch-lagos", name: "Lagos HQ", location: "Ikeja, Lagos", managerUserId: null, currency: "NGN", archived: false, createdAt: new Date(), updatedAt: new Date() },
          { id: "demo-branch-london", name: "London branch", location: "London, United Kingdom", managerUserId: null, currency: "GBP", archived: false, createdAt: new Date(), updatedAt: new Date() },
          { id: "demo-branch-new-york", name: "New York branch", location: "New York, United States", managerUserId: null, currency: "USD", archived: false, createdAt: new Date(), updatedAt: new Date() },
        ] : []}
      />
    </AdminShell>
  );
}
