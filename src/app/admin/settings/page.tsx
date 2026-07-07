import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { EmptyState } from "@/components/admin/EmptyState";
import { ErrorState } from "@/components/admin/ErrorState";
import { GlassCard } from "@/components/admin/GlassCard";
import { MetricCard } from "@/components/admin/MetricCard";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { TeamAvatar } from "@/components/admin/TeamAvatar";
import { InfoTip } from "@/components/admin/ui/InfoTip";
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
  canManageAdminSettings,
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
  const canOpenRolePermissions = canManageAdminSettings({ accessLevel, role });
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
  const settingsGroups = [
    {
      key: "company",
      eyebrow: "Company",
      title: "Business setup",
      tip: "Keep ownership, branch coverage, team access, and currency defaults aligned before leads start moving.",
      items: [
        { label: "Team settings", href: appRoutes.settingsTeam, enabled: true, copy: "People, access, and roster coverage." },
        { label: "Branches", href: appRoutes.settingsBranches, enabled: canOpenBranches, copy: "Locations and branch ownership." },
        { label: "Currency", href: appRoutes.settingsCurrency, enabled: canOpenCurrency, copy: "Default value and target currency." },
        { label: "Role permissions", href: appRoutes.settingsRolePermissions, enabled: canOpenRolePermissions, copy: "What each role can touch." },
      ],
    },
    {
      key: "pipeline",
      eyebrow: "Pipeline",
      title: "Lead operations",
      tip: "These settings shape qualification, offer routing, source reporting, and the values shown across the dashboard.",
      items: [
        { label: "Lead fields", href: appRoutes.settingsFields, enabled: canOpenCustomFields, copy: "Business-specific lead data." },
        { label: "Lead stages", href: appRoutes.settingsStages, enabled: canOpenLeadStages, copy: "Pipeline stages and outcome states." },
        { label: "Lead sources", href: appRoutes.settingsSources, enabled: canOpenLeadSources, copy: "Source labels for filtering and reports." },
        { label: "Sales targets", href: appRoutes.settingsSalesTargets, enabled: canOpenSalesTargets, copy: "Goals behind pipeline tracking." },
        { label: "Form sources", href: appRoutes.settingsFormSources, enabled: canOpenFormSources, copy: "Website, CSV, and webhook mapping." },
        { label: "Intake log", href: appRoutes.intake, enabled: canOpenFormSources, copy: "Recent submissions and failures." },
      ],
    },
    {
      key: "workspace",
      eyebrow: "Workspace",
      title: "Brand and layout",
      tip: "These controls change how the workspace looks, what users see first, and how quickly they can act.",
      items: [
        { label: "Appearance", href: appRoutes.settingsAppearance, enabled: canOpenAppearance, copy: "Logo, color system, and login branding." },
        { label: "Navigation", href: appRoutes.settingsNavigation, enabled: canOpenNavigation, copy: "Sidebar order, labels, and visibility." },
        { label: "Lead preview", href: appRoutes.settingsLeadPreview, enabled: canOpenLeadPreview, copy: "Preview cards and mobile fields." },
        { label: "Dashboard", href: appRoutes.settingsDashboard, enabled: canOpenDashboard, copy: "Widgets, order, and visibility." },
        { label: "Industry", href: appRoutes.settingsIndustry, enabled: canOpenIndustry, copy: "Safer defaults for your business type." },
        { label: "Profile", href: appRoutes.profile, enabled: Boolean(currentUser), copy: "Your own name and photo." },
      ],
    },
    {
      key: "system",
      eyebrow: "Oversight",
      title: "Reports and controls",
      tip: "Use these pages when you need proof, exports, notifications, or deployment-readiness checks.",
      items: [
        { label: "Reports", href: appRoutes.reports, enabled: true, copy: "Performance, exports, and summaries." },
        { label: "Notifications", href: appRoutes.notifications, enabled: true, copy: "Follow-up and assignment alerts." },
        { label: "System status", href: appRoutes.settingsSystemStatus, enabled: canOpenSystemStatus, copy: "Operational health and readiness." },
      ],
    },
  ] as const;
  const visibleSettingsGroups = settingsGroups.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.enabled),
  })).filter((group) => group.items.length > 0);
  const savedConnections = showFullAdminSettings ? pageData?.integrations ?? [] : [];

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
              title="Workspace control"
              description="Open the right setup area fast."
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
                    description="Manage your own name and photo from the profile page."
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
                  description="Keep the roster, photos, and access clean."
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

            <section className="grid gap-6 xl:grid-cols-2">
              {visibleSettingsGroups.map((group) => (
                <GlassCard key={group.key} glassStyle="soft" className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                        {group.eyebrow}
                      </p>
                      <h2 className="mt-2 font-[family:var(--font-heading)] text-[1.45rem] leading-[1.02] tracking-[-0.05em] text-white">
                        {group.title}
                      </h2>
                    </div>
                    <InfoTip label={group.tip} align="right" />
                  </div>
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {group.items.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        className="group rounded-[22px] border border-white/10 bg-white/[0.045] px-4 py-4 transition hover:border-white/20 hover:bg-white/[0.08]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white">{item.label}</p>
                            <p className="mt-2 text-sm leading-6 text-white/68">{item.copy}</p>
                          </div>
                          <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/58 transition group-hover:text-white/78">
                            Open
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </GlassCard>
              ))}
            </section>

            {showFullAdminSettings ? (
              <GlassCard glassStyle="soft" className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                      Connected tools
                    </p>
                    <h2 className="mt-2 font-[family:var(--font-heading)] text-[1.45rem] leading-[1.02] tracking-[-0.05em] text-white">
                      Saved connections
                    </h2>
                  </div>
                  <InfoTip
                    label="These are the integrations already saved for imports, exports, and reporting support."
                    align="right"
                  />
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {savedConnections.length > 0 ? (
                    savedConnections.map((integration) => (
                      <div
                        key={integration.id}
                        className="rounded-[22px] border border-white/10 bg-white/[0.045] px-4 py-4"
                      >
                        <p className="text-sm font-semibold text-white">
                          {formatIntegrationProviderLabel(integration.provider)}
                        </p>
                        <p className="mt-2 text-sm text-white/68">
                          {formatIntegrationStatusLabel(integration.status)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      title="No saved connections yet"
                      description="Connected tools will show here after setup is saved."
                    />
                  )}
                </div>
              </GlassCard>
            ) : null}
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
