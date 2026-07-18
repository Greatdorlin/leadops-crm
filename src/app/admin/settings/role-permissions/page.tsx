import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { ErrorState } from "@/components/admin/ErrorState";
import { RolePermissionsManager } from "@/components/admin/RolePermissionsManager";
import { getAdminAccessContext } from "@/lib/admin";
import { isLocalAdminPreviewEmail } from "@/lib/admin-access";
import { canManageOwnerOnlySettings } from "@/lib/admin-permissions";
import { appRoutes } from "@/lib/app-routes";
import { canManageAdminSettings } from "@/lib/crm/authz";
import { buildDefaultRolePermissionRows, listRolePermissions } from "@/lib/crm/role-permissions";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";

export const dynamic = "force-dynamic";

export default async function RolePermissionsPage() {
  const {
    session,
    role,
    accessLevel,
    actualAccessLevel,
    canSwitchAccessViews,
    permissions: effectivePermissions,
  } = await getAdminAccessContext(appRoutes.settingsRolePermissions);

  if (
    !canManageOwnerOnlySettings(actualAccessLevel, accessLevel) ||
    !canManageAdminSettings({
      accessLevel,
      permissions: effectivePermissions,
      role,
    })
  ) {
    redirect(appRoutes.settings);
  }

  let permissions: Awaited<ReturnType<typeof listRolePermissions>> | null = null;
  let pageError: unknown = null;

  if (isLocalAdminPreviewEmail(session.user?.email)) {
    permissions = buildDefaultRolePermissionRows();
  } else try {
    permissions = await listRolePermissions();
  } catch (error) {
    pageError = error;
    logCrmPageError("settings-role-permissions", error);
  }

  return (
    <AdminShell
      activeNav="settings"
      accessLevel={accessLevel}
      role={role}
      actualAccessLevel={actualAccessLevel}
      canSwitchAccessViews={canSwitchAccessViews}
      title="Role permissions"
      description="Control what each workspace role can access."
      actions={
        <>
          <Link
            href={appRoutes.settings}
            prefetch={false}
            className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium"
          >
            Back to settings
          </Link>
          <AdminSignOutButton />
        </>
      }
      userName={session.user?.name}
      userEmail={session.user?.email}
      userAvatarUrl={session.user?.image}
    >
      {permissions ? (
        <RolePermissionsManager initialPermissions={permissions} demoMode={isLocalAdminPreviewEmail(session.user?.email)} />
      ) : (
        <ErrorState
          title={getCrmPageErrorCopy(pageError).title}
          description={getCrmPageErrorCopy(pageError).description}
          details={getCrmPageErrorCopy(pageError).details}
        />
      )}
    </AdminShell>
  );
}
