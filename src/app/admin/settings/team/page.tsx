import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { ErrorState } from "@/components/admin/ErrorState";
import { TeamSettingsWorkspace } from "@/components/admin/TeamSettingsWorkspace";
import { getAdminAccessContext } from "@/lib/admin";
import { isLocalAdminPreviewEmail } from "@/lib/admin-access";
import {
  canManageTeamMember,
  canManageTeamRoster,
  getGrantableAccessLevels,
  resolveAdminAccessLevel,
} from "@/lib/admin-permissions";
import { canManageUsers } from "@/lib/crm/authz";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";
import { appRoutes } from "@/lib/app-routes";
import { leadStore } from "@/lib/storage";
import { getDb } from "@/lib/db/client";
import { branches, departments, teams } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";

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
      accessScope: "all",
      branchId: null,
      departmentId: null,
      teamId: null,
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
      accessScope: "team",
      branchId: null,
      departmentId: null,
      teamId: null,
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
      accessScope: "own",
      branchId: null,
      departmentId: null,
      teamId: null,
      createdAt: now,
      updatedAt: now,
    },
  ] as Awaited<ReturnType<typeof leadStore.listCrmUsers>>;
}

export default async function AdminSettingsTeamPage() {
  const {
    session,
    role,
    accessLevel,
    actualAccessLevel,
    canSwitchAccessViews,
    permissions,
  } =
    await getAdminAccessContext(appRoutes.settingsTeam);

  if (!canManageUsers({ accessLevel, permissions, role })) {
    redirect(appRoutes.dashboard);
  }

  let users: Awaited<ReturnType<typeof leadStore.listCrmUsers>> | null = null;
  let pageError: unknown = null;
  let branchOptions: Array<{ id: string; name: string }> = [];
  let departmentOptions: Array<{ id: string; name: string }> = [];
  let teamOptions: Array<{ id: string; name: string }> = [];

  if (isLocalAdminPreviewEmail(session.user?.email)) {
    users = buildDevelopmentTeamData();
  } else try {
    const db = getDb();
    [users, branchOptions, departmentOptions, teamOptions] = await Promise.all([
      leadStore.listCrmUsers(),
      db.select({ id: branches.id, name: branches.name }).from(branches).where(eq(branches.archived, false)).orderBy(asc(branches.name)),
      db.select({ id: departments.id, name: departments.name }).from(departments).where(eq(departments.archived, false)).orderBy(asc(departments.name)),
      db.select({ id: teams.id, name: teams.name }).from(teams).where(eq(teams.archived, false)).orderBy(asc(teams.name)),
    ]);
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
  const canEditRoster = canManageTeamRoster(accessLevel, permissions);
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
        permissions,
      ),
      accessScope: user.accessScope,
      branchId: user.branchId,
      departmentId: user.departmentId,
      teamId: user.teamId,
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
        branches={branchOptions}
        departments={departmentOptions}
        teams={teamOptions}
      />
    </AdminShell>
  );
}
