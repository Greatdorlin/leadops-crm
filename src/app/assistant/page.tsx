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
    >
      <AssistantWorkspace />
    </AdminShell>
  );
}
