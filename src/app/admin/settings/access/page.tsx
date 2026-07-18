import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { DomainRegistrationSettings } from "@/components/admin/DomainRegistrationSettings";
import { getAdminAccessContext } from "@/lib/admin";
import { canManageOwnerOnlySettings } from "@/lib/admin-permissions";
import { getDomainRegistrationPolicy } from "@/lib/auth-registration";
import { appRoutes } from "@/lib/app-routes";

export const dynamic = "force-dynamic";

export default async function AccessSettingsPage() {
  const { session, role, accessLevel, actualAccessLevel, canSwitchAccessViews } =
    await getAdminAccessContext(appRoutes.settingsAccess);

  if (!canManageOwnerOnlySettings(actualAccessLevel, accessLevel)) {
    redirect(appRoutes.settings);
  }

  const policy = await getDomainRegistrationPolicy();

  return (
    <AdminShell
      activeNav="settings"
      accessLevel={accessLevel}
      role={role}
      actualAccessLevel={actualAccessLevel}
      canSwitchAccessViews={canSwitchAccessViews}
      title="Access and registration"
      description="Control the only public account-creation path without opening the workspace to unrestricted sign-up."
      userName={session.user?.name ?? undefined}
      userEmail={session.user?.email ?? undefined}
      userAvatarUrl={session.user?.image ?? undefined}
      actions={
        <>
          <Link href={appRoutes.settings} className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium">Back to settings</Link>
          <AdminSignOutButton />
        </>
      }
    >
      <section className="admin-surface rounded-[26px] p-5 sm:p-6">
        <DomainRegistrationSettings initialPolicy={policy} />
      </section>
    </AdminShell>
  );
}
