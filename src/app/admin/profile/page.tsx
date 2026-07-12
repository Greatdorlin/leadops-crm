import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { ErrorState } from "@/components/admin/ErrorState";
import { GlassCard } from "@/components/admin/GlassCard";
import { AnimatedCard } from "@/components/admin/ui/AnimatedCard";
import { TeamMemberProfileForm } from "@/components/admin/TeamMemberProfileForm";
import { getAdminAccessContext } from "@/lib/admin";
import { isLocalAdminPreviewEmail } from "@/lib/admin-access";
import { resolveAdminAccessLevel } from "@/lib/admin-permissions";
import { appRoutes } from "@/lib/app-routes";

export const dynamic = "force-dynamic";

export default async function AdminProfilePage() {
  const { session, crmUser, role, accessLevel, actualAccessLevel, canSwitchAccessViews } =
    await getAdminAccessContext(appRoutes.profile);
  const demoMode = isLocalAdminPreviewEmail(session.user?.email);
  const profile = crmUser ?? (demoMode ? {
    id: "demo-profile-user",
    fullName: session.user?.name || "Demo workspace owner",
    email: session.user?.email || "preview@local.leadsdesk.test",
    avatarUrl: session.user?.image ?? null,
    role: "admin" as const,
    isActive: true,
  } : null);

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
      userName={profile?.fullName || session.user?.name}
      userEmail={profile?.email || session.user?.email}
      userAvatarUrl={profile?.avatarUrl}
    >
      <div className="mx-auto max-w-4xl">
        {profile ? (
          <AnimatedCard animation="fadeInUp" variant="elevated" className="ld-animate-fade-in-up">
            <GlassCard glassStyle="vibrant" className="p-5 sm:p-6">
              <TeamMemberProfileForm
                userId={profile.id}
                fullName={profile.fullName || session.user?.name || session.user?.email || ""}
                email={profile.email || session.user?.email || ""}
                avatarUrl={profile.avatarUrl}
                accessLevel={resolveAdminAccessLevel({ email: profile.email, role: profile.role })}
                isActive={profile.isActive}
                demoMode={demoMode}
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
