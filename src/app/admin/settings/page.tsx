import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { EmptyState } from "@/components/admin/EmptyState";
import { ErrorState } from "@/components/admin/ErrorState";
import { MetricCard } from "@/components/admin/MetricCard";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { TeamMemberAccessButton } from "@/components/admin/TeamMemberAccessButton";
import { TeamAccessForm } from "@/components/admin/TeamAccessForm";
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
  canManageCustomFields,
  canManageFormSources,
  canManageLeadSources,
  canManageLeadStages,
  canManageSalesTargets,
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
  }

  const activeUsers = pageData?.users.filter((user) => user.isActive) ?? [];
  const inactiveUsers = pageData?.users.filter((user) => !user.isActive) ?? [];

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
          ? "Team members, admin roles, assignment rules, and connected tools."
          : canGrantAccess
            ? "Team members, admin roles, and assignment rules."
          : "Team roster, lead stages, and assignment rules."
      }
      actions={<AdminSignOutButton />}
    >
      <div className="space-y-6">
        {pageData ? (
          <>
            <section className="grid gap-3 md:grid-cols-3">
              <MetricCard
                label="Team members"
                value={activeUsers.length}
                supporting="People who can access or work inside the CRM."
                tone="accent"
              />
              <MetricCard
                label="Saved statuses"
                value={statusDefinitions.length}
                supporting="Saved lead stages available in the CRM."
              />
              <MetricCard
                label={showFullAdminSettings ? "Connected tools" : "Assignment rules"}
                value={showFullAdminSettings ? pageData.integrations.length : 3}
                supporting={
                  showFullAdminSettings
                    ? "Saved connections available to the CRM."
                    : "Lead ownership and follow-up rules."
                }
              />
            </section>

            {canGrantAccess ? (
              <section className="admin-surface rounded-[24px] p-5">
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
              </section>
            ) : null}

            <section className="admin-surface rounded-[24px] p-5">
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
                    <div key={user.id} className="admin-surface-muted rounded-2xl p-4">
                      <p className="text-base font-semibold text-slate-950">{user.fullName || user.email}</p>
                      <p className="mt-1.5 text-sm text-slate-500">{user.email}</p>
                      <p className="mt-3 text-sm text-slate-700">
                        {formatAdminAccessLevelLabel(
                          resolveAdminAccessLevel({ email: user.email, role: user.role }),
                        )}
                      </p>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#0b123f]/56">
                        {user.isActive ? "Active" : "Inactive"}
                      </p>
                      {canEditRoster && canManageMember ? (
                        <div className="mt-4">
                          <TeamMemberAccessButton
                            userId={user.id}
                            isActive={user.isActive}
                            className="inline-flex h-10 items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
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
            </section>

            {inactiveUsers.length > 0 ? (
              <section className="admin-surface rounded-[24px] p-5">
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
                        <p className="text-base font-semibold text-slate-950">{user.fullName || user.email}</p>
                        <p className="mt-1.5 text-sm text-slate-500">{user.email}</p>
                        <p className="mt-3 text-sm text-slate-700">
                          {formatAdminAccessLevelLabel(targetAccessLevel)}
                        </p>
                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#0b123f]/56">
                          Inactive
                        </p>
                        {canEditRoster && canManageMember ? (
                          <div className="mt-4">
                            <TeamMemberAccessButton
                              userId={user.id}
                              isActive={user.isActive}
                              className="inline-flex h-10 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-4 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
                            />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            <section className="grid gap-6 xl:grid-cols-12">
              <div className="space-y-6 xl:col-span-7">
                {showFullAdminSettings ? (
                  <section className="admin-surface rounded-[24px] p-5">
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
                          <p className="text-sm font-semibold text-slate-950">{title}</p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                <section className="admin-surface rounded-[24px] p-5">
                  <SectionHeader
                    eyebrow="Workspace"
                    title="Client-ready settings"
                    description="Open the exact setup area you need without digging through technical screens."
                  />
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {[
                      { label: "Company Profile", href: "/admin/settings", enabled: true, copy: "Team access, company-level setup, and owner controls." },
                      { label: "Lead Fields", href: "/admin/settings/fields", enabled: canOpenCustomFields, copy: "Define the extra lead details your business tracks." },
                      { label: "Form Sources", href: "/admin/settings/form-sources", enabled: canOpenFormSources, copy: "Map website, webhook, CSV, and manual sources." },
                      { label: "Lead Stages", href: "/admin/settings/stages", enabled: canOpenLeadStages, copy: "Control the stages used across pipeline reporting." },
                      { label: "Lead Sources", href: "/admin/settings/sources", enabled: canOpenLeadSources, copy: "Keep source labels clean for reporting and exports." },
                      { label: "Sales Targets", href: "/admin/settings/sales-targets", enabled: canOpenSalesTargets, copy: "Track monthly goals and progress on the dashboard." },
                      { label: "Users / Team Access", href: "#team-access", enabled: canGrantAccess, copy: "Create users and control who can work inside the workspace." },
                      { label: "Export Data", href: "/admin/reports", enabled: true, copy: "Review performance and export current lead data." },
                      { label: "Advanced", href: "/admin/intake", enabled: canOpenFormSources, copy: "Review webhook intake logs and debug failed submissions." },
                    ]
                      .filter((item) => item.enabled)
                      .map((item) => (
                        <Link
                          key={item.label}
                          href={item.href}
                          className="admin-surface-muted rounded-2xl p-4 transition hover:border-slate-300 hover:bg-white"
                        >
                          <p className="text-sm font-semibold text-slate-950">{item.label}</p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{item.copy}</p>
                        </Link>
                      ))}
                  </div>
                </section>

                {canOpenCustomFields ? (
                  <section className="admin-surface rounded-[24px] p-5">
                    <SectionHeader
                      eyebrow="Lead fields"
                      title="Field definitions"
                      description="Manage the extra lead details your business wants to capture."
                    />
                    <div className="mt-4">
                      <Link
                        href="/admin/settings/fields"
                        className="admin-button-secondary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-medium"
                      >
                        Open Lead Fields
                      </Link>
                    </div>
                  </section>
                ) : null}

                {canOpenFormSources ? (
                  <section className="admin-surface rounded-[24px] p-5">
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
                  </section>
                ) : null}
              </div>

              <div className="space-y-6 xl:col-span-5">
                <section className="admin-surface rounded-[24px] p-5">
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
                      <div key={item} className="admin-surface-muted rounded-2xl px-4 py-3 text-sm text-slate-700">
                        {item}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="admin-surface rounded-[24px] p-5">
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
                      <div key={item} className="admin-surface-muted rounded-2xl px-4 py-3 text-sm text-slate-700">
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
                </section>

                {showFullAdminSettings ? (
                  <section className="admin-surface rounded-[24px] p-5">
                    <SectionHeader
                      eyebrow="Connected tools"
                      title="Saved connections"
                      description="Connections that support imports, exports, and campaign reporting."
                    />
                    <div className="mt-4 grid gap-3">
                      {pageData.integrations.length > 0 ? (
                        pageData.integrations.map((integration) => (
                          <div key={integration.id} className="admin-surface-muted rounded-2xl px-4 py-3 text-sm text-slate-700">
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
                  </section>
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
