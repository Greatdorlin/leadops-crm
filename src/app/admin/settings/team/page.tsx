import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { ErrorState } from "@/components/admin/ErrorState";
import { PremiumPageHeader } from "@/components/admin/PremiumPageHeader";
import { TeamSettingsWorkspace } from "@/components/admin/TeamSettingsWorkspace";
import { getAdminAccessContext } from "@/lib/admin";
import {
  canManageSettings,
  canManageTeamMember,
  canManageTeamRoster,
  getGrantableAccessLevels,
  resolveAdminAccessLevel,
} from "@/lib/admin-permissions";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";
import { appRoutes } from "@/lib/app-routes";
import { leadStore } from "@/lib/storage";

export const dynamic = "force-dynamic";

function buildDevelopmentTeamData() {
  const now = new Date().toISOString();
  return [
    {
      id: "demo-owner",
      email: "owner@local.leadsdesk.test",
      fullName: "Owner Admin",
      role: "admin",
      isActive: true,
      avatarUrl: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "demo-manager",
      email: "manager@local.leadsdesk.test",
      fullName: "Sales Manager",
      role: "manager",
      isActive: true,
      avatarUrl: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "demo-rep",
      email: "rep@local.leadsdesk.test",
      fullName: "Sales Rep",
      role: "sales_agent",
      isActive: true,
      avatarUrl: null,
      createdAt: now,
      updatedAt: now,
    },
  ] as Awaited<ReturnType<typeof leadStore.listCrmUsers>>;
}

export default async function AdminSettingsTeamPage() {
  const { session, role, accessLevel, actualAccessLevel, canSwitchAccessViews } =
    await getAdminAccessContext(appRoutes.settingsTeam);

  if (!canManageSettings(accessLevel, role)) {
    redirect(appRoutes.dashboard);
  }

  let users: Awaited<ReturnType<typeof leadStore.listCrmUsers>> | null = null;
  let pageError: unknown = null;

  try {
    users = await leadStore.listCrmUsers();
  } catch (error) {
    pageError = error;
    logCrmPageError("settings-team", error);

    if (process.env.NODE_ENV !== "production") {
      users = buildDevelopmentTeamData();
    }
  }

  if (!users) {
    const errorCopy = getCrmPageErrorCopy(pageError);

    return (
      <AdminShell
        activeNav="settings"
        accessLevel={accessLevel}
        role={role}
        actualAccessLevel={actualAccessLevel}
        canSwitchAccessViews={canSwitchAccessViews}
        title="Team settings"
        description="People, roles, access, and profile photos."
        actions={<AdminSignOutButton />}
      >
        <ErrorState
          title={errorCopy.title}
          description={errorCopy.description}
          details={errorCopy.details}
        />
      </AdminShell>
    );
  }

  const grantableAccessLevels = getGrantableAccessLevels(accessLevel);
  const canGrantAccess = grantableAccessLevels.length > 0;
  const canEditRoster = canManageTeamRoster(accessLevel);
  const currentUser =
    users.find((user) => user.email.toLowerCase() === session.user?.email?.toLowerCase()) ?? null;

  const roster = users.map((user) => {
    const targetAccessLevel = resolveAdminAccessLevel({
      email: user.email,
      role: user.role,
    });

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      accessLevel: targetAccessLevel,
      isActive: user.isActive,
      canManageMember: canManageTeamMember(
        accessLevel,
        targetAccessLevel,
        session.user?.email,
        user.email,
      ),
    };
  });

  return (
    <AdminShell
      activeNav="settings"
      accessLevel={accessLevel}
      role={role}
      actualAccessLevel={actualAccessLevel}
      canSwitchAccessViews={canSwitchAccessViews}
      title="Team settings"
      description="Manage people, workspace access, and profile photos."
      actions={
        <>
          <Link
            href={appRoutes.settings}
            className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium"
          >
            Back to settings
          </Link>
          <AdminSignOutButton />
        </>
      }
      userName={currentUser?.fullName || session.user?.name}
      userEmail={currentUser?.email || session.user?.email}
      userAvatarUrl={currentUser?.avatarUrl}
    >
      <div className="space-y-6">
        <PremiumPageHeader
          eyebrow="Team settings"
          title="People, access, and profile identity"
          description="Keep team management in one dedicated workspace instead of scattering it through general settings."
        />

        <TeamSettingsWorkspace
          currentUser={
            currentUser
              ? {
                  id: currentUser.id,
                  fullName: currentUser.fullName,
                  email: currentUser.email,
                  avatarUrl: currentUser.avatarUrl,
                  accessLevel: resolveAdminAccessLevel({
                    email: currentUser.email,
                    role: currentUser.role,
                  }),
                }
              : null
          }
          members={roster}
          canGrantAccess={canGrantAccess}
          canEditRoster={canEditRoster}
          grantableAccessLevels={grantableAccessLevels}
        />
      </div>
    </AdminShell>
  );
}
