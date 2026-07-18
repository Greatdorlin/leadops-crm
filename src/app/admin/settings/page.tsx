import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bell,
  Building2,
  CircleDollarSign,
  FormInput,
  Inbox,
  LayoutDashboard,
  ListChecks,
  Palette,
  PanelLeft,
  RadioTower,
  Rows3,
  ShieldCheck,
  Target,
  UserRound,
  Users2,
  WandSparkles,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { EmptyState } from "@/components/admin/EmptyState";
import { ErrorState } from "@/components/admin/ErrorState";
import { GlassCard } from "@/components/admin/GlassCard";
import { InfoTip } from "@/components/admin/ui/InfoTip";
import { getAdminAccessContext } from "@/lib/admin";
import { isLocalAdminPreviewEmail } from "@/lib/admin-access";
import { canEditTeamAccess, canManageOwnerOnlySettings } from "@/lib/admin-permissions";
import {
  canManageAppearanceSettings,
  canManageCustomFields,
  canManageDashboardSettings,
  canManageFormSources,
  canManageIndustryPresets,
  canManageLeadSources,
  canManageLeadPreviewSettings,
  canManageLeadStages,
  canManageIntegrations,
  canManageNavigationSettings,
  canManageCurrencySettings,
  canManageBranches,
  canManageSalesTargets,
  canManageUsers,
  canViewReports,
  canViewSystemStatus,
  canManageAdminSettings,
} from "@/lib/crm/authz";
import { formatIntegrationProviderLabel, formatIntegrationStatusLabel } from "@/lib/crm/formatters";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";
import { appRoutes } from "@/lib/app-routes";
import { leadStore } from "@/lib/storage";

export const dynamic = "force-dynamic";

function buildDevelopmentSettingsData() {
  const now = new Date().toISOString();
  const users = [
    {
      id: "demo-user-preview",
      email: "preview@local.leadsdesk.test",
      fullName: "Local Preview",
      role: "manager",
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
  const {
    session,
    role,
    accessLevel,
    actualAccessLevel,
    canSwitchAccessViews,
    permissions,
  } =
    await getAdminAccessContext(appRoutes.settings);
  const subject = { accessLevel, permissions, role };
  const canOpenTeam = canManageUsers(subject);
  const canOpenCustomFields = canManageCustomFields(subject);
  const canOpenFormSources = canManageFormSources(subject);
  const canOpenLeadStages = canManageLeadStages(subject);
  const canOpenLeadSources = canManageLeadSources(subject);
  const canOpenSalesTargets = canManageSalesTargets(subject);
  const canOpenAppearance = canManageAppearanceSettings(subject);
  const canOpenNavigation = canManageNavigationSettings(subject);
  const canOpenLeadPreview = canManageLeadPreviewSettings(subject);
  const canOpenDashboard = canManageDashboardSettings(subject);
  const canOpenIndustry = canManageIndustryPresets(subject);
  const canOpenSystemStatus = canViewSystemStatus(subject);
  const canOpenOwnerAccess = canManageOwnerOnlySettings(actualAccessLevel, accessLevel);
  const canOpenRolePermissions = canOpenOwnerAccess && canManageAdminSettings(subject);
  const canOpenCurrency = canManageCurrencySettings(subject);
  const canOpenBranches = canManageBranches(subject);
  const canOpenIntegrations = canManageIntegrations(accessLevel, role, permissions);
  const canOpenReports = canViewReports(subject);
  const showFullAdminSettings =
    canEditTeamAccess(accessLevel, permissions) ||
    canOpenIntegrations ||
    canOpenRolePermissions;
  const canOpenSettingsWorkspace = [
    canOpenTeam,
    canOpenCustomFields,
    canOpenFormSources,
    canOpenLeadStages,
    canOpenLeadSources,
    canOpenSalesTargets,
    canOpenAppearance,
    canOpenNavigation,
    canOpenLeadPreview,
    canOpenDashboard,
    canOpenIndustry,
    canOpenSystemStatus,
    canOpenRolePermissions,
    canOpenCurrency,
    canOpenBranches,
  ].some(Boolean);

  if (!canOpenSettingsWorkspace) {
    redirect(appRoutes.dashboard);
  }
  let pageData:
    | {
        users: Awaited<ReturnType<typeof leadStore.listCrmUsers>>;
        integrations: Awaited<ReturnType<typeof leadStore.listIntegrations>>;
      }
    | null = null;
  let pageError: unknown = null;

  if (isLocalAdminPreviewEmail(session.user?.email)) {
    pageData = buildDevelopmentSettingsData();
  } else try {
    const [users, integrations] = await Promise.all([
      leadStore.listCrmUsers(),
      canOpenIntegrations ? leadStore.listIntegrations() : Promise.resolve([]),
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
  const currentUser =
    activeUsers.find((user) => user.email.toLowerCase() === session.user?.email?.toLowerCase()) ?? null;
  const settingsGroups = [
    {
      key: "company",
      eyebrow: "Company",
      title: "Business setup",
      tip: "Keep ownership, branch coverage, team access, and currency defaults aligned before leads start moving.",
      items: [
        { label: "Team settings", href: appRoutes.settingsTeam, enabled: canOpenTeam, copy: "People, access, and roster coverage.", icon: Users2 },
        { label: "Branches", href: appRoutes.settingsBranches, enabled: canOpenBranches, copy: "Locations and branch ownership.", icon: Building2 },
        { label: "Currency", href: appRoutes.settingsCurrency, enabled: canOpenCurrency, copy: "Default value and target currency.", icon: CircleDollarSign },
        { label: "Role permissions", href: appRoutes.settingsRolePermissions, enabled: canOpenRolePermissions, copy: "What each role can touch.", icon: ShieldCheck },
        { label: "Access and registration", href: appRoutes.settingsAccess, enabled: canOpenOwnerAccess, copy: "Approved domains and safe account creation.", icon: ShieldCheck },
      ],
    },
    {
      key: "pipeline",
      eyebrow: "Pipeline",
      title: "Lead operations",
      tip: "These settings shape qualification, offer routing, source reporting, and the values shown across the dashboard.",
      items: [
        { label: "Lead fields", href: appRoutes.settingsFields, enabled: canOpenCustomFields, copy: "Business-specific lead data.", icon: ListChecks },
        { label: "Lead stages", href: appRoutes.settingsStages, enabled: canOpenLeadStages, copy: "Pipeline stages and outcome states.", icon: Rows3 },
        { label: "Lead sources", href: appRoutes.settingsSources, enabled: canOpenLeadSources, copy: "Source labels for filtering and reports.", icon: RadioTower },
        { label: "Sales targets", href: appRoutes.settingsSalesTargets, enabled: canOpenSalesTargets, copy: "Goals behind pipeline tracking.", icon: Target },
        { label: "Form sources", href: appRoutes.settingsFormSources, enabled: canOpenFormSources, copy: "Website, CSV, and webhook mapping.", icon: FormInput },
        { label: "Intake log", href: appRoutes.intake, enabled: canOpenFormSources, copy: "Recent submissions and failures.", icon: Inbox },
      ],
    },
    {
      key: "workspace",
      eyebrow: "Workspace",
      title: "Brand and layout",
      tip: "These controls change how the workspace looks, what users see first, and how quickly they can act.",
      items: [
        { label: "Appearance", href: appRoutes.settingsAppearance, enabled: canOpenAppearance, copy: "Logo, color system, and login branding.", icon: Palette },
        { label: "Navigation", href: appRoutes.settingsNavigation, enabled: canOpenNavigation, copy: "Sidebar order, labels, and visibility.", icon: PanelLeft },
        { label: "Lead preview", href: appRoutes.settingsLeadPreview, enabled: canOpenLeadPreview, copy: "Preview cards and mobile fields.", icon: Rows3 },
        { label: "Dashboard", href: appRoutes.settingsDashboard, enabled: canOpenDashboard, copy: "Widgets, order, and visibility.", icon: LayoutDashboard },
        { label: "Industry", href: appRoutes.settingsIndustry, enabled: canOpenIndustry, copy: "Safer defaults for your business type.", icon: WandSparkles },
        { label: "Profile", href: appRoutes.profile, enabled: Boolean(session.user?.email), copy: "Your own name and photo.", icon: UserRound },
      ],
    },
    {
      key: "system",
      eyebrow: "Oversight",
      title: "Reports and controls",
      tip: "Use these pages when you need proof, exports, notifications, or deployment-readiness checks.",
      items: [
        { label: "Reports", href: appRoutes.reports, enabled: canOpenReports, copy: "Performance, exports, and summaries.", icon: BarChart3 },
        { label: "Notifications", href: appRoutes.notifications, enabled: true, copy: "Follow-up and assignment alerts.", icon: Bell },
        { label: "System status", href: appRoutes.settingsSystemStatus, enabled: canOpenSystemStatus, copy: "Operational health and readiness.", icon: Activity },
      ],
    },
  ] as const;
  const visibleSettingsGroups = settingsGroups.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.enabled),
  })).filter((group) => group.items.length > 0);
  const savedConnections = canOpenIntegrations ? pageData?.integrations ?? [] : [];

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
                        prefetch={false}
                        className="group rounded-[22px] border border-white/10 bg-white/[0.045] p-4 transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.08] hover:shadow-[0_18px_42px_rgba(0,0,0,0.2)]"
                      >
                        <div className="flex items-start gap-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border border-white/12 bg-white/[0.06] text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition group-hover:border-white/20 group-hover:text-white">
                            <item.icon className="h-[18px] w-[18px]" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white">{item.label}</p>
                            <p className="mt-1.5 text-sm leading-5 text-white/68">{item.copy}</p>
                          </div>
                          <span className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/48 transition group-hover:border-white/18 group-hover:bg-white/[0.08] group-hover:text-white">
                            <ArrowUpRight className="h-4 w-4" />
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </GlassCard>
              ))}
            </section>

            {canOpenIntegrations ? (
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
