import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  ChevronRight,
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
  LayoutTemplate as WandSparkles,
  Workflow,
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
  const canOpenAutomations = canManageAdminSettings(subject);
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
    canOpenAutomations,
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
      items: [
        { label: "Team settings", href: appRoutes.settingsTeam, enabled: canOpenTeam, copy: "People, access, and roster coverage.", icon: Users2 },
        { label: "Branches", href: appRoutes.settingsBranches, enabled: canOpenBranches, copy: "Locations and branch ownership.", icon: Building2 },
        { label: "Region & currency", href: appRoutes.settingsCurrency, enabled: canOpenCurrency, copy: "Location, time zone, and money.", icon: CircleDollarSign },
        { label: "Role permissions", href: appRoutes.settingsRolePermissions, enabled: canOpenRolePermissions, copy: "Permissions for each workspace role.", icon: ShieldCheck },
        { label: "Access and registration", href: appRoutes.settingsAccess, enabled: canOpenOwnerAccess, copy: "Approved domains and account registration.", icon: ShieldCheck },
      ],
    },
    {
      key: "pipeline",
      eyebrow: "Pipeline",
      title: "Lead operations",
      items: [
        { label: "Assistant", href: "/settings/assistant", enabled: true, copy: "Personal AI connections and assistant access.", icon: WandSparkles },
        { label: "Products and offers", href: "/settings/products", enabled: canOpenAutomations, copy: "Reusable products and potential values.", icon: CircleDollarSign },
        { label: "Lead fields", href: appRoutes.settingsFields, enabled: canOpenCustomFields, copy: "Business-specific lead data.", icon: ListChecks },
        { label: "Lead stages", href: appRoutes.settingsStages, enabled: canOpenLeadStages, copy: "Pipeline stages and outcome states.", icon: Rows3 },
        { label: "Lead sources", href: appRoutes.settingsSources, enabled: canOpenLeadSources, copy: "Source labels for filtering and reports.", icon: RadioTower },
        { label: "Automations", href: appRoutes.settingsAutomations, enabled: canOpenAutomations, copy: "Route every new lead consistently.", icon: Workflow },
        { label: "Sales targets", href: appRoutes.settingsSalesTargets, enabled: canOpenSalesTargets, copy: "Goals behind pipeline tracking.", icon: Target },
        { label: "Form sources", href: appRoutes.settingsFormSources, enabled: canOpenFormSources, copy: "Website, CSV, and webhook mapping.", icon: FormInput },
        { label: "Intake log", href: appRoutes.intake, enabled: canOpenFormSources, copy: "Recent submissions and failures.", icon: Inbox },
      ],
    },
    {
      key: "workspace",
      eyebrow: "Workspace",
      title: "Brand and layout",
      items: [
        { label: "Appearance", href: appRoutes.settingsAppearance, enabled: canOpenAppearance, copy: "Logo, color system, and login branding.", icon: Palette },
        { label: "Navigation", href: appRoutes.settingsNavigation, enabled: canOpenNavigation, copy: "Sidebar order, labels, and visibility.", icon: PanelLeft },
        { label: "Lead preview", href: appRoutes.settingsLeadPreview, enabled: canOpenLeadPreview, copy: "Preview cards and mobile fields.", icon: Rows3 },
        { label: "Dashboard", href: appRoutes.settingsDashboard, enabled: canOpenDashboard, copy: "Widgets, order, and visibility.", icon: LayoutDashboard },
        { label: "Industry", href: appRoutes.settingsIndustry, enabled: canOpenIndustry, copy: "Recommended stages, sources, and fields.", icon: WandSparkles },
        { label: "Profile", href: appRoutes.profile, enabled: Boolean(session.user?.email), copy: "Your own name and photo.", icon: UserRound },
      ],
    },
    {
      key: "system",
      eyebrow: "Oversight",
      title: "Reports and controls",
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
            <nav aria-label="Settings sections" className="flex flex-wrap gap-2">
              {visibleSettingsGroups.map((group) => (
                <a key={group.key} href={`#settings-${group.key}`} className="ld-focus-ring rounded-lg border border-white/10 px-3 py-2 text-sm text-white/75 transition-colors hover:bg-white/8 hover:text-white">
                  {group.eyebrow}
                </a>
              ))}
            </nav>
            <div className="grid items-start gap-5 2xl:grid-cols-2">
              {visibleSettingsGroups.map((group) => (
                <section key={group.key} id={`settings-${group.key}`} aria-labelledby={`settings-heading-${group.key}`} className="scroll-mt-24 rounded-xl border border-white/10 bg-white/[0.025]">
                  <div className="px-4 py-4 sm:px-5">
                    <p className="text-xs font-medium text-white/60">{group.eyebrow}</p>
                    <h2 id={`settings-heading-${group.key}`} className="mt-1 text-lg font-semibold text-white">{group.title}</h2>
                  </div>
                  <ul className="divide-y divide-white/8 border-t border-white/8">
                    {group.items.map((item) => (
                      <li key={item.label}>
                        <Link
                          href={item.href}
                          prefetch={false}
                          className="ld-focus-ring flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.055] sm:px-5"
                        >
                          <item.icon aria-hidden="true" className="size-[18px] shrink-0 text-white/60" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-white">{item.label}</span>
                            <span className="mt-0.5 block text-sm leading-5 text-white/65">{item.copy}</span>
                          </span>
                          <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-white/50" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

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
