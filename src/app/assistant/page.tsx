import { getAdminAccessContext } from "@/lib/admin";
import { AdminShell } from "@/components/admin/AdminShell";
import { AssistantWorkspace } from "@/components/admin/AssistantWorkspace";
export const dynamic = "force-dynamic";
export default async function Page() {
  const c = await getAdminAccessContext("/assistant");
  return (
    <AdminShell
      activeNav="dashboard"
      title="Workspace assistant"
      accessLevel={c.accessLevel}
      permissions={c.permissions}
      role={c.role}
      actualAccessLevel={c.actualAccessLevel}
      canSwitchAccessViews={c.canSwitchAccessViews}
      userName={c.crmUser?.fullName || c.session.user?.name}
      userEmail={c.session.user?.email}
      userAvatarUrl={c.crmUser?.avatarUrl}
    >
      <AssistantWorkspace />
    </AdminShell>
  );
}
