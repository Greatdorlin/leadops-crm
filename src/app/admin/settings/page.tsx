import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { EmptyState } from "@/components/admin/EmptyState";
import { ErrorState } from "@/components/admin/ErrorState";
import { GlassCard } from "@/components/admin/GlassCard";
import { MetricCard } from "@/components/admin/MetricCard";
import { PremiumPageHeader } from "@/components/admin/PremiumPageHeader";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { TeamAvatar } from "@/components/admin/TeamAvatar";
import { TeamMemberAccessButton } from "@/components/admin/TeamMemberAccessButton";
import { TeamAccessForm } from "@/components/admin/TeamAccessForm";
import { TeamMemberProfileForm } from "@/components/admin/TeamMemberProfileForm";
import { getAdminAccessContext } from "@/lib/admin";
import {
  canEditTeamAccess,
  canManageTeamMember,
  canManageTeamRoster,
  canManageSettings,
  getGrantableAccessLevels,
  resolveAdminAccessLevel,
} from "@/lib/admin-permissions";
import {
  canManageAppearanceSettings,
  canManageCustomFields,
  canManageDashboardSettings,
  canManageFormSources,
  canManageIndustryPresets,
  canManageLeadSources,
  canManageLeadPreviewSettings,
  canManageLeadStages,
  canManageNavigationSettings,
  canManageSalesTargets,
  canViewSystemStatus,
} from "@/lib/crm/authz";
import {
  formatAdminAccessLevelLabel,
  formatIntegrationProviderLabel,
  formatIntegrationStatusLabel,
} from "@/lib/crm/formatters";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";
import { leadStore } from "@/lib/storage";

export const dynamic = "force-dynamic";

const statusDefinitions = [
  "new",
  "contacted",
  "qualified",
  "consultation_booked",
  "application_started",
  "documents_pending",
  "payment_pending",
  "converted",
  "lost",
  "unresponsive",
  "unqualified",
  "closed",
] as const;

function buildDevelopmentSettingsData() {
  const now = new Date().toISOString();
  const users = [
    {
      id: "demo-user-preview",
      email: "preview@local.leadsdesk.test",
      fullName: "Local Preview",
      role: "admin",
      isActive: true,
      avatarUrl: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "demo-user-manager",
      email: "manager@example.com",
      fullName: "Sales Manager",
      role: "manager",
      isActive: true,
      avatarUrl: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "demo-user-rep",
      email: "rep@example.com",
      fullName: "Sales Rep",
      role: "sales_agent",
      isActive: true,
      avatarUrl: null,
      createdAt: now,
      updatedAt: now,
    },
  ] as Awaited<ReturnType<typeof leadStore.listCrmUsers>>;

  return {
    users,
    integrations: [] as Awaited<ReturnType<typeof leadStore.listIntegrations>>,
  };
}

export default async function AdminSettingsPage() {
  const { session, role, accessLevel, actualAccessLevel, canSwitchAccessViews } =
    await getAdminAccessContext("/admin/settings");
  if (!canManageSettings(accessLevel, role)) {
    redirect("/admin");
  }

  const grantableAccessLevels = getGrantableAccessLevels(accessLevel);
  const canGrantAccess = grantableAccessLevels.length > 0;
  const showFullAdminSettings = canEditTeamAccess(accessLevel);
  const canEditRoster = canManageTeamRoster(accessLevel);
  const canOpenCustomFields = canManageCustomFields({ accessLevel, role });
  const canOpenFormSources = canManageFormSources({ accessLevel, role });
  const canOpenLeadStages = canManageLeadStages({ accessLevel, role });
  const canOpenLeadSources = canManageLeadSources({ accessLevel, role });
  const canOpenSalesTargets = canManageSalesTargets({ accessLevel, role });
  const canOpenAppearance = canManageAppearanceSettings({ accessLevel, role });
  const canOpenNavigation = canManageNavigationSettings({ accessLevel, role });
  const canOpenLeadPreview = canManageLeadPreviewSettings({ accessLevel, role });
  const canOpenDashboard = canManageDashboardSettings({ accessLevel, role });
  const canOpenIndustry = canManageIndustryPresets({ accessLevel, role });
  const canOpenSystemStatus = canViewSystemStatus({ accessLevel, role });
  let pageData:
    | {
        users: Awaited<ReturnType<typeof leadStore.listCrmUsers>>;
        integrations: Awaited<ReturnType<typeof leadStore.listIntegrations>>;
      }
    | null = null;
  let pageError: unknown = null;

  try {
    const [users, integrations] = await Promise.all([
      leadStore.listCrmUsers(),
      showFullAdminSettings ? leadStore.listIntegrations() : Promise.resolve([]),
    ]);

    pageData = { users, integrations };
  } catch (error) {
    pageError = error;
    logCrmPageError("settings", error);

    if (process.env.NODE_ENV !== "production") {
      pageData = buildDevelopmentSettingsData();
    }
  }

  const activeUsers = pageData?.users.filter((user) => user.isActive) ?? [];
  const inactiveUsers = pageData?.users.filter((user) => !user.isActive) ?? [];
  const currentUser =
    activeUsers.find((user) => user.email.toLowerCase() === session.user?.email?.toLowerCase()) ??
    activeUsers[0] ??
    null;

  return (
    <AdminShell
      activeNav="settings"
      accessLevel={accessLevel}
      role={role}
      actualAccessLevel={actualAccessLevel}
      canSwitchAccessViews={canSwitchAccessViews}
      title="Settings"
      description={
        showFullAdminSettings
          ? "Brand, sales setup, team access, and system controls."
          : canGrantAccess
            ? "Team access and workspace setup."
          : "Lead setup and assignment rules."
      }
      actions={<AdminSignOutButton />}
      userName={currentUser?.fullName || session.user?.name}
      userEmail={currentUser?.email || session.user?.email}
      userAvatarUrl={currentUser?.avatarUrl}
    >
      <div className="space-y-6">
        {pageData ? (
          <>
            <PremiumPageHeader
              eyebrow="Workspace settings"
              title="Shape the way your team works"
              description="Profile, roles, brand, lead setup, and operational controls in one calm workspace."
            />

            <section className="grid gap-3 md:grid-cols-3">
              <MetricCard
                label="Team members"
                value={activeUsers.length}
                supporting="People who can access this workspace."
                tone="accent"
              />
              <MetricCard
                label="Saved statuses"
                value={statusDefinitions.length}
                supporting="Saved lead stages for pipeline work."
              />
              <MetricCard
                label={showFullAdminSettings ? "Connected tools" : "Assignment rules"}
                value={showFullAdminSettings ? pageData.integrations.length : 3}
                supporting={
                  showFullAdminSettings
                    ? "Saved connections available to Leads Desk."
                    : "Lead ownership and follow-up rules."
                }
              />
            </section>

            {currentUser ? (
              <GlassCard glassStyle="vibrant" className="p-5 sm:p-6">
                <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr] xl:items-start">
                  <div>
                    <SectionHeader
                      eyebrow="My profile"
                      title="Your workspace identity"
                      description="Update your name and profile photo. Sales reps can manage this without admin access."
                    />
                    <div className="mt-5 flex items-center gap-4 rounded-[24px] border border-white/10 bg-white/[0.045] p-4">
                      <TeamAvatar
                        name={currentUser.fullName}
                        email={currentUser.email}
                        avatarUrl={currentUser.avatarUrl}
                        size="lg"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-lg font-semibold text-white">
                          {currentUser.fullName || currentUser.email}
                        </p>
                        <p className="truncate text-sm text-white/55">{currentUser.email}</p>
                      </div>
                    </div>
                  </div>
                  <TeamMemberProfileForm
                    userId={currentUser.id}
                    fullName={currentUser.fullName}
                    email={currentUser.email}
                    avatarUrl={currentUser.avatarUrl}
                    accessLevel={resolveAdminAccessLevel({
                      email: currentUser.email,
                      role: currentUser.role,
                    })}
                    isActive={currentUser.isActive}
                    compact
                  />
                </div>
              </GlassCard>
            ) : null}

            {canGrantAccess ? (
              <GlassCard glassStyle="soft" className="p-5">
                <SectionHeader
                  eyebrow="Team access"
                  title="Add or update team members"
                  description={
                    accessLevel === "lead_sales_rep"
                      ? "Team leads can grant workspace access to sales reps."
                      : "Manage who can sign in and which workspace role they should receive."
                  }
                />
                <div className="mt-4">
                  <TeamAccessForm grantableAccessLevels={grantableAccessLevels} />
                </div>
              </GlassCard>
            ) : null}

            <GlassCard glassStyle="soft" className="p-5">
              <SectionHeader
                eyebrow="Team roster"
                title="Current team members"
                description="These team members can be assigned to leads and tasks."
              />
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {activeUsers.length > 0 ? (
                  activeUsers.map((user) => {
                    const targetAccessLevel = resolveAdminAccessLevel({
                      email: user.email,
                      role: user.role,
                    });
                    const canManageMember = canManageTeamMember(
                      accessLevel,
                      targetAccessLevel,
                      session.user?.email,
                      user.email,
                    );

                    return (
                      <div key={user.id} className="admin-surface-muted rounded-[24px] p-4">
                        <TeamMemberProfileForm
                          userId={user.id}
                          fullName={user.fullName}
                          email={user.email}
                          avatarUrl={user.avatarUrl}
                          accessLevel={targetAccessLevel}
                          isActive={user.isActive}
                          grantableAccessLevels={grantableAccessLevels}
                          canEditAccess={canEditRoster && canManageMember}
                          canEditActive={canEditRoster && canManageMember}
                          compact
                        />
                        {canEditRoster && canManageMember ? (
                          <div className="mt-4 border-t border-white/10 pt-4">
                            <TeamMemberAccessButton
                              userId={user.id}
                              isActive={user.isActive}
                              className="inline-flex h-10 items-center justify-center rounded-full border border-rose-300/24 bg-rose-300/10 px-4 text-sm font-medium text-rose-100 transition hover:bg-rose-300/16"
                            />
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <EmptyState
                    title="No team members yet"
                    description="Add team members to keep assignment options up to date."
                  />
                )}
              </div>
            </GlassCard>

            {inactiveUsers.length > 0 ? (
              <GlassCard glassStyle="soft" className="p-5">
                <SectionHeader
                  eyebrow="Inactive roster"
                  title="Removed team members"
                  description="These people no longer appear in assignment choices or admin access."
                />
                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {inactiveUsers.map((user) => {
                    const targetAccessLevel = resolveAdminAccessLevel({
                      email: user.email,
                      role: user.role,
                    });
                    const canManageMember = canManageTeamMember(
                      accessLevel,
                      targetAccessLevel,
                      session.user?.email,
                      user.email,
                    );

                    return (
                      <div key={user.id} className="admin-surface-muted rounded-2xl p-4">
                        <p className="text-base font-semibold text-white">{user.fullName || user.email}</p>
                        <p className="mt-1.5 text-sm text-white/52">{user.email}</p>
                        <p className="mt-3 text-sm text-white/70">
                          {formatAdminAccessLevelLabel(targetAccessLevel)}
                        </p>
                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/42">
                          Inactive
                        </p>
                        {canEditRoster && canManageMember ? (
                          <div className="mt-4">
                            <TeamMemberAccessButton
                              userId={user.id}
                              isActive={user.isActive}
                              className="inline-flex h-10 items-center justify-center rounded-full border border-emerald-300/24 bg-emerald-300/10 px-4 text-sm font-medium text-emerald-100 transition hover:bg-emerald-300/16"
                            />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            ) : null}

            <section className="grid gap-6 xl:grid-cols-12">
              <div className="space-y-6 xl:col-span-7">
                {showFullAdminSettings ? (
                  <GlassCard glassStyle="soft" className="p-5">
                    <SectionHeader
                      eyebrow="Admin roles"
                      title="Role access"
                      description="A quick reference for each admin role."
                    />
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {[ 
                        ["Owner", "Full company access, exports, settings, and team management."],
                        ["Admin", "Operational admin access, lead oversight, reports, and everyday settings."],
                        ["Team Lead", "Team visibility, task assignment, follow-up coverage, and rep support."],
                        ["Sales Rep", "Assigned leads, personal tasks, and individual performance."],
                      ].map(([title, copy]) => (
                        <div key={title} className="admin-surface-muted rounded-2xl p-4">
                          <p className="text-sm font-semibold text-white">{title}</p>
                          <p className="mt-2 text-sm leading-6 text-white/58">{copy}</p>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                ) : null}

                <GlassCard glassStyle="soft" className="p-5">
                  <SectionHeader
                    eyebrow="Workspace"
                    title="Client-ready settings"
                    description="Open the right setup area without digging through technical screens."
                  />
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {[
                      { label: "Company Profile", href: "/admin/settings", enabled: true, copy: "Team access, company-level setup, and owner controls." },
                      { label: "Appearance", href: "/admin/settings/appearance", enabled: canOpenAppearance, copy: "Brand the workspace, login page, and colors." },
                      { label: "Industry", href: "/admin/settings/industry", enabled: canOpenIndustry, copy: "Apply safer defaults for your business type." },
                      { label: "Lead Fields", href: "/admin/settings/fields", enabled: canOpenCustomFields, copy: "Define the extra lead details your business tracks." },
                      { label: "Lead Preview", href: "/admin/settings/lead-preview", enabled: canOpenLeadPreview, copy: "Choose the lead columns and mobile preview fields." },
                      { label: "Form Sources", href: "/admin/settings/form-sources", enabled: canOpenFormSources, copy: "Map website, webhook, CSV, and manual sources." },
                      { label: "Lead Stages", href: "/admin/settings/stages", enabled: canOpenLeadStages, copy: "Control the stages used across pipeline reporting." },
                      { label: "Lead Sources", href: "/admin/settings/sources", enabled: canOpenLeadSources, copy: "Keep source labels clean for reporting and exports." },
                      { label: "Dashboard", href: "/admin/settings/dashboard", enabled: canOpenDashboard, copy: "Show, hide, and reorder the dashboard widgets." },
                      { label: "Sales Targets", href: "/admin/settings/sales-targets", enabled: canOpenSalesTargets, copy: "Track monthly goals and progress on the dashboard." },
                      { label: "Users / Team Access", href: "#team-access", enabled: canGrantAccess, copy: "Create users and control who can work inside the workspace." },
                      { label: "Export Data", href: "/admin/reports", enabled: true, copy: "Review performance and export current lead data." },
                      { label: "Navigation", href: "/admin/settings/navigation", enabled: canOpenNavigation, copy: "Show, hide, rename, and reorder sidebar items." },
                      { label: "System Status", href: "/admin/settings/system-status", enabled: canOpenSystemStatus, copy: "Check deployment readiness without exposing secrets." },
                      { label: "Intake Logs", href: "/admin/intake", enabled: canOpenFormSources, copy: "Review recent submissions and failed syncs." },
                    ]
                      .filter((item) => item.enabled)
                      .map((item) => (
                        <Link
                          key={item.label}
                          href={item.href}
                          className="admin-surface-muted group rounded-2xl p-4 transition hover:border-cyan-200/24 hover:bg-white/[0.075]"
                        >
                          <p className="text-sm font-semibold text-white transition group-hover:text-cyan-50">{item.label}</p>
                          <p className="mt-2 text-sm leading-6 text-white/56">{item.copy}</p>
                        </Link>
                      ))}
                  </div>
                </GlassCard>

                {canOpenAppearance || canOpenNavigation || canOpenLeadPreview || canOpenDashboard ? (
                  <GlassCard glassStyle="soft" className="p-5">
                    <SectionHeader
                      eyebrow="Brand and workflow"
                      title="Workspace customization"
                      description="Shape the way Leads Desk looks and what your team sees first."
                    />
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {[
                        { label: "Appearance", href: "/admin/settings/appearance", enabled: canOpenAppearance },
                        { label: "Navigation", href: "/admin/settings/navigation", enabled: canOpenNavigation },
                        { label: "Lead Preview", href: "/admin/settings/lead-preview", enabled: canOpenLeadPreview },
                        { label: "Dashboard", href: "/admin/settings/dashboard", enabled: canOpenDashboard },
                      ]
                        .filter((item) => item.enabled)
                        .map((item) => (
                          <Link
                            key={item.label}
                            href={item.href}
                            className="admin-button-secondary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-medium"
                          >
                            {item.label}
                          </Link>
                        ))}
                    </div>
                  </GlassCard>
                ) : null}

                {canOpenFormSources ? (
                  <GlassCard glassStyle="soft" className="p-5">
                    <SectionHeader
                      eyebrow="Form sources"
                      title="Source mappings"
                      description="Define where leads come from and how each source maps into your lead records."
                    />
                    <div className="mt-4">
                      <Link
                        href="/admin/settings/form-sources"
                        className="admin-button-secondary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-medium"
                      >
                        Open Form Sources
                      </Link>
                    </div>
                  </GlassCard>
                ) : null}
              </div>

              <div className="space-y-6 xl:col-span-5">
                <GlassCard glassStyle="soft" className="p-5">
                  <SectionHeader
                    eyebrow="Assignment rules"
                    title="Working rules"
                    description="The current rules for ownership and follow-up."
                  />
                  <div className="mt-4 grid gap-3">
                    {[
                      "Owners come from the saved team roster.",
                      "Sales reps work only with their assigned leads and tasks.",
                      "Unassigned leads stay visible until a team member takes ownership.",
                    ].map((item) => (
                      <div key={item} className="admin-surface-muted rounded-2xl px-4 py-3 text-sm text-white/68">
                        {item}
                      </div>
                    ))}
                  </div>
                </GlassCard>

                <GlassCard glassStyle="soft" className="p-5">
                  <SectionHeader
                    eyebrow="Notifications"
                    title="How the team stays on track"
                    description="Follow-up reminders and lead activity keep the queue moving."
                  />
                  <div className="mt-4 grid gap-3">
                    {[
                      "Assigned lead alerts appear in the notification inbox.",
                      "Webhook captures can create intake alerts and assignment notifications.",
                      "Follow-up reminders depend on the saved next follow-up date and ownership.",
                    ].map((item) => (
                      <div key={item} className="admin-surface-muted rounded-2xl px-4 py-3 text-sm text-white/68">
                        {item}
                      </div>
                    ))}
                    <Link
                      href="/admin/notifications"
                      className="admin-button-secondary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-medium"
                    >
                      Open Notifications
                    </Link>
                  </div>
                </GlassCard>

                {showFullAdminSettings ? (
                  <GlassCard glassStyle="soft" className="p-5">
                    <SectionHeader
                      eyebrow="Connected tools"
                      title="Saved connections"
                      description="Connections that support imports, exports, and campaign reporting."
                    />
                    <div className="mt-4 grid gap-3">
                      {pageData.integrations.length > 0 ? (
                        pageData.integrations.map((integration) => (
                          <div key={integration.id} className="admin-surface-muted rounded-2xl px-4 py-3 text-sm text-white/68">
                            {formatIntegrationProviderLabel(integration.provider)} • {formatIntegrationStatusLabel(integration.status)}
                          </div>
                        ))
                      ) : (
                        <EmptyState
                          title="No saved connections yet"
                          description="Connected tools will appear here after setup is saved."
                        />
                      )}
                    </div>
                  </GlassCard>
                ) : null}
              </div>
            </section>
          </>
        ) : (
          <ErrorState
            title={getCrmPageErrorCopy(pageError).title}
            description={getCrmPageErrorCopy(pageError).description}
            details={getCrmPageErrorCopy(pageError).details}
          />
        )}
      </div>
    </AdminShell>
  );
}
