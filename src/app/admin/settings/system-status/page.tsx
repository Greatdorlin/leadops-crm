import Link from "next/link";
import { redirect } from "next/navigation";
import packageJson from "../../../../../package.json";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { MetricCard } from "@/components/admin/MetricCard";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { getAdminAccessContext } from "@/lib/admin";
import { appRoutes } from "@/lib/app-routes";
import { isAdminAuthConfigured, isLocalAdminPreviewEnabled } from "@/lib/admin-access";
import { canViewSystemStatus } from "@/lib/crm/authz";
import { getCompanySettings } from "@/lib/crm/workspace-settings-server";
import { hasDatabaseUrl } from "@/lib/db/env";

export const dynamic = "force-dynamic";

function yesNo(value: boolean) {
  return value ? "Yes" : "No";
}

export default async function SystemStatusPage() {
  const { role, accessLevel, actualAccessLevel, canSwitchAccessViews, permissions } =
    await getAdminAccessContext(appRoutes.settingsSystemStatus);

  if (!canViewSystemStatus({ accessLevel, permissions, role })) {
    redirect(appRoutes.settings);
  }

  const settings = await getCompanySettings();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";

  return (
    <AdminShell
      activeNav="settings"
      accessLevel={accessLevel}
      role={role}
      actualAccessLevel={actualAccessLevel}
      canSwitchAccessViews={canSwitchAccessViews}
      title="System Status"
      description="See environment readiness without exposing secrets."
      actions={
        <>
          <Link
            href={appRoutes.settings}
            prefetch={false}
            className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium"
          >
            Back to settings
          </Link>
          <AdminSignOutButton />
        </>
      }
    >
      <div className="space-y-6">
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Database URL" value={yesNo(hasDatabaseUrl())} supporting="Configured at deployment level." tone={hasDatabaseUrl() ? "positive" : "warning"} />
          <MetricCard label="Auth setup" value={yesNo(isAdminAuthConfigured())} supporting="Google auth vars and initial admin." tone={isAdminAuthConfigured() ? "positive" : "warning"} />
          <MetricCard label="Environment" value={process.env.NODE_ENV || "development"} supporting="Development preview stays out of production." />
          <MetricCard label="App version" value={packageJson.version} supporting={`Brand: ${settings.companyName}`} tone="accent" />
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="admin-surface rounded-[28px] p-5">
            <SectionHeader
              eyebrow="Connection checks"
              title="Current configuration"
              description="These checks confirm whether the workspace has the minimum setup to run."
            />
            <div className="mt-4 grid gap-3">
              {[
                ["Database connection", hasDatabaseUrl() ? "Ready" : "Missing"],
                ["Auth path", isAdminAuthConfigured() ? "Ready" : "Needs setup"],
                ["Dev preview", isLocalAdminPreviewEnabled() ? "Enabled only in development" : "Disabled"],
                ["Health route", `${appUrl}/api/health`],
                ["Webhook base URL", `${appUrl}/api/intake/webhook/{webhookKey}`],
              ].map(([label, value]) => (
                <div key={label} className="admin-surface-muted rounded-[22px] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">{label}</p>
                  <p className="mt-2 text-sm font-medium text-white [overflow-wrap:anywhere]">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="admin-surface rounded-[28px] p-5">
            <SectionHeader
              eyebrow="Operations"
              title="Go-live links"
              description="Jump straight to the operator docs your team needs before launch."
            />
            <div className="mt-4 grid gap-3">
              {[
                ["Production checklist", "/PRODUCTION_CHECKLIST.md"],
                ["Install guide", "/INSTALL.md"],
                ["Backup guide", "/BACKUP_AND_RESTORE.md"],
                ["Client handover", "/CLIENT_HANDOVER.md"],
              ].map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  className="admin-surface-muted rounded-[22px] px-4 py-3 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08]"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
