import { getAdminAccessContext } from "@/lib/admin";
import { AdminShell } from "@/components/admin/AdminShell";
import { WorkspaceGuide } from "@/components/admin/WorkspaceGuide";
export const dynamic = "force-dynamic";
export default async function Page() {
  const c = await getAdminAccessContext("/profile");
  return (
    <AdminShell
      activeNav="settings"
      title="Workspace guide"
      accessLevel={c.accessLevel}
      role={c.role}
      permissions={c.permissions}
    >
      <WorkspaceGuide />
    </AdminShell>
  );
}
