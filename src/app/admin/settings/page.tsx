import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { EmptyState } from "@/components/admin/EmptyState";
import { ErrorState } from "@/components/admin/ErrorState";
import { GlassCard } from "@/components/admin/GlassCard";
import { AnimatedCard } from "@/components/admin/ui/AnimatedCard";
import { MetricCard } from "@/components/admin/MetricCard";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { TeamAvatar } from "@/components/admin/TeamAvatar";
import { getAdminAccessContext } from "@/lib/admin";
import {
  canEditTeamAccess,
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
  canManageCurrencySettings,
  canManageBranches,
  canManageSalesTargets,
  canViewSystemStatus,
} from "@/lib/crm/authz";
import {
  formatAdminAccessLevelLabel,
  formatIntegrationProviderLabel,
  formatIntegrationStatusLabel,
} from "@/lib/crm/formatters";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";
import { appRoutes } from "@/lib/app-routes";
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
    await getAdminAccessContext(appRoutes.settings);
  if (!canManageSettings(accessLevel, role)) {
    redirect(appRoutes.dashboard);
  }

  const grantableAccessLevels = getGrantableAccessLevels(accessLevel);
  const canGrantAccess = grantableAccessLevels.length > 0;
  const showFullAdminSettings = canEditTeamAccess(accessLevel);
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
  const canOpenCurrency = canManageCurrencySettings({ accessLevel, role });
  const canOpenBranches = canManageBranches({ accessLevel, role });
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
          ? "Brand, sales setup, access, and system controls."
          : canGrantAccess
            ? "Team setup and workspace controls."
            : "Lead setup and workspace rules."
      }
      actions={<AdminSignOutButton />}
      userName={currentUser?.fullName || session.user?.name}
      userEmail={currentUser?.email || session.user?.email}
      userAvatarUrl={currentUser?.avatarUrl}
    >
      <div className="space-y-6">
        {pageData ? (
          <>
            <SectionHeader
              eyebrow="Workspace settings"
              title="Shape the way your team works"
              description="Open the right setup area quickly without crowding one page with everything."
              className="ld-animate-fade-in-up"
            />

            <section className="grid gap-3 md:grid-cols-3 ld-animate-fade-in-up">
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

            <section className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] ld-animate-fade-in-up">
              {currentUser ? (
                <GlassCard glassStyle="vibrant" className="p-5 sm:p-6">
                  <SectionHeader
                    eyebrow="My profile"
                    title="Your workspace identity"
                    description="Update your own name and profile photo from the dedicated profile page."
                    actions={
                      <Link
                        href={appRoutes.profile}
                        className="admin-button-secondary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-medium"
                      >
                        Open profile
                      </Link>
                    }
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
                      <p className="truncate text-sm text-white/70">{currentUser.email}</p>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
                        {formatAdminAccessLevelLabel(
                          resolveAdminAccessLevel({
                            email: currentUser.email,
                            role: currentUser.role,
                          }),
                        )}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              ) : null}

              <GlassCard glassStyle="soft" className="p-5 sm:p-6">
                <SectionHeader
                  eyebrow="Team settings"
                  title="People and access"
                  description="Manage the roster, photos, and workspace access in a dedicated team settings view."
                  actions={
                    <Link
                      href={appRoutes.settingsTeam}
                      className="admin-button-primary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold"
                    >
                      Open team settings
                    </Link>
                  }
                />
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[22px] border border-white/10 bg-white/[0.045] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                      Active team
                    </p>
                    <p className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-white">
                      {activeUsers.length}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-white/[0.045] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                      Inactive
                    </p>
                    <p className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-white">
                      {inactiveUsers.length}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-white/[0.045] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                      Grantable roles
                    </p>
                    <p className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-white">
                      {grantableAccessLevels.length}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </section>

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
                      ].map(([title, copy], index) => (
                        <AnimatedCard key={title} variant="subtle" animation="fadeInUp" delay={index * 60} className="rounded-2xl p-4">
                          <p className="text-sm font-semibold text-white">{title}</p>
                          <p className="mt-2 text-sm leading-6 text-white/70">{copy}</p>
                        </AnimatedCard>
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
                      { label: "Company Profile", href: appRoutes.settings, enabled: true, copy: "Team access, company-level setup, and owner controls." },
                      { label: "Appearance", href: appRoutes.settingsAppearance, enabled: canOpenAppearance, copy: "Brand the workspace, login page, and colors." },
                      { label: "Industry", href: appRoutes.settingsIndustry, enabled: canOpenIndustry, copy: "Apply safer defaults for your business type." },
                      { label: "Lead Fields", href: appRoutes.settingsFields, enabled: canOpenCustomFields, copy: "Define the extra lead details your business tracks." },
                      { label: "Lead Preview", href: appRoutes.settingsLeadPreview, enabled: canOpenLeadPreview, copy: "Choose the lead columns and mobile preview fields." },
                      { label: "Form Sources", href: appRoutes.settingsFormSources, enabled: canOpenFormSources, copy: "Map website, webhook, CSV, and manual sources." },
                      { label: "Lead Stages", href: appRoutes.settingsStages, enabled: canOpenLeadStages, copy: "Control the stages used across pipeline reporting." },
                      { label: "Lead Sources", href: appRoutes.settingsSources, enabled: canOpenLeadSources, copy: "Keep source labels clean for reporting and exports." },
                      { label: "Dashboard", href: appRoutes.settingsDashboard, enabled: canOpenDashboard, copy: "Show, hide, and reorder the dashboard widgets." },
                      { label: "Sales Targets", href: appRoutes.settingsSalesTargets, enabled: canOpenSalesTargets, copy: "Track monthly goals and progress on the dashboard." },
                      { label: "Branches", href: appRoutes.settingsBranches, enabled: canOpenBranches, copy: "Manage branch locations and per-branch currencies." },
                      { label: "Currency", href: appRoutes.settingsCurrency, enabled: canOpenCurrency, copy: "Set the default currency for targets and lead values." },
                      { label: "Team Settings", href: appRoutes.settingsTeam, enabled: canGrantAccess || activeUsers.length > 0 || inactiveUsers.length > 0, copy: "Manage members, access, profile photos, and roster coverage." },
                      { label: "Export Data", href: appRoutes.reports, enabled: true, copy: "Review performance and export current lead data." },
                      { label: "Navigation", href: appRoutes.settingsNavigation, enabled: canOpenNavigation, copy: "Show, hide, rename, and reorder sidebar items." },
                      { label: "System Status", href: appRoutes.settingsSystemStatus, enabled: canOpenSystemStatus, copy: "Check deployment readiness without exposing secrets." },
                      { label: "Intake Logs", href: appRoutes.intake, enabled: canOpenFormSources, copy: "Review recent submissions and failed syncs." },
                    ]
                      .filter((item) => item.enabled)
                      .map((item, index) => (
                        <Link
                          key={item.label}
                          href={item.href}
                          className="admin-surface-muted group rounded-2xl p-4 transition hover:border-white/20 hover:bg-white/[0.08]"
                        >
                          <p className="text-sm font-semibold text-white transition group-hover:text-white">{item.label}</p>
                          <p className="mt-2 text-sm leading-6 text-white/70">{item.copy}</p>
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
                        { label: "Appearance", href: appRoutes.settingsAppearance, enabled: canOpenAppearance },
                        { label: "Navigation", href: appRoutes.settingsNavigation, enabled: canOpenNavigation },
                        { label: "Lead Preview", href: appRoutes.settingsLeadPreview, enabled: canOpenLeadPreview },
                        { label: "Dashboard", href: appRoutes.settingsDashboard, enabled: canOpenDashboard },
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
                        href={appRoutes.settingsFormSources}
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
                    description="The current rules for ownership, visibility, and follow-up."
                  />
                  <div className="mt-4 grid gap-3">
                    {[
                      "Owners come from the saved team roster and profile cards.",
                      "Sales reps work only with their assigned leads and tasks.",
                      "Unassigned leads stay visible until a team member takes ownership.",
                    ].map((item, index) => (
                      <AnimatedCard key={item} variant="subtle" animation="fadeInUp" delay={index * 60} className="rounded-2xl px-4 py-3 text-sm text-white/70">
                        {item}
                      </AnimatedCard>
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
                    ].map((item, index) => (
                      <AnimatedCard key={item} variant="subtle" animation="fadeInUp" delay={index * 60} className="rounded-2xl px-4 py-3 text-sm text-white/70">
                        {item}
                      </AnimatedCard>
                    ))}
                    <Link
                      href={appRoutes.notifications}
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
                          <div key={integration.id} className="admin-surface-muted rounded-2xl px-4 py-3 text-sm text-white/70">
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
