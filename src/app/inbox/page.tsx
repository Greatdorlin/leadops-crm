import { getAdminAccessContext } from "@/lib/admin";
import { AdminShell } from "@/components/admin/AdminShell";
import { InboxWorkspace } from "@/components/inbox/InboxWorkspace";
export const dynamic = "force-dynamic";
export default async function Page() {
  const c = await getAdminAccessContext("/inbox");
  return (
    <AdminShell
      activeNav="inbox"
      title="Inbox"
      description="Keep sales conversations and handoffs together."
      accessLevel={c.accessLevel}
      permissions={c.permissions}
      role={c.role}
      userName={c.crmUser?.fullName || c.session.user?.name}
      userEmail={c.session.user?.email}
      userAvatarUrl={c.crmUser?.avatarUrl}
    >
      <InboxWorkspace />
    </AdminShell>
  );
}
