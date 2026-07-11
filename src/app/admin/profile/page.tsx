import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { ErrorState } from "@/components/admin/ErrorState";
import { GlassCard } from "@/components/admin/GlassCard";
import { AnimatedCard } from "@/components/admin/ui/AnimatedCard";
import { TeamMemberProfileForm } from "@/components/admin/TeamMemberProfileForm";
import { getAdminAccessContext } from "@/lib/admin";
import { resolveAdminAccessLevel } from "@/lib/admin-permissions";
import { appRoutes } from "@/lib/app-routes";

export const dynamic = "force-dynamic";

export default async function AdminProfilePage() {
  const { session, crmUser, role, accessLevel, actualAccessLevel, canSwitchAccessViews } =
    await getAdminAccessContext(appRoutes.profile);

  return (
    <AdminShell
      activeNav="settings"
      accessLevel={accessLevel}
      role={role}
      actualAccessLevel={actualAccessLevel}
      canSwitchAccessViews={canSwitchAccessViews}
      title="My profile"
      description="Name, photo, and workspace identity."
      actions={<AdminSignOutButton />}
      userName={crmUser?.fullName || session.user?.name}
      userEmail={crmUser?.email || session.user?.email}
      userAvatarUrl={crmUser?.avatarUrl}
    >
      <div className="mx-auto max-w-4xl">
        {crmUser ? (
          <AnimatedCard animation="fadeInUp" variant="elevated" className="ld-animate-fade-in-up">
            <GlassCard glassStyle="vibrant" className="p-5 sm:p-6">
              <TeamMemberProfileForm
                userId={crmUser.id}
                fullName={crmUser.fullName || session.user?.name || session.user?.email || ""}
                email={crmUser.email || session.user?.email || ""}
                avatarUrl={crmUser.avatarUrl}
                accessLevel={resolveAdminAccessLevel({ email: crmUser.email, role: crmUser.role })}
                isActive={crmUser.isActive}
              />
            </GlassCard>
          </AnimatedCard>
        ) : (
          <ErrorState
            title="Profile is not ready"
            description="Your admin profile could not be loaded. Ask an owner or admin to refresh your access."
          />
        )}
      </div>
    </AdminShell>
  );
}
