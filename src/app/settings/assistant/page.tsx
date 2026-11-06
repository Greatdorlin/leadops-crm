import { getAdminAccessContext } from "@/lib/admin";
import { AdminShell } from "@/components/admin/AdminShell";
import { AssistantWorkspace } from "@/components/admin/AssistantWorkspace";
export const dynamic = "force-dynamic";
export default async function Page() {
  const c = await getAdminAccessContext("/settings/assistant");
  return (
    <AdminShell
      activeNav="settings"
      title="Assistant settings"
      description="Your assistant name, personal connections and owner-managed access."
      accessLevel={c.accessLevel}
      permissions={c.permissions}
    >
      <AssistantWorkspace settingsOnly />
    </AdminShell>
  );
}
