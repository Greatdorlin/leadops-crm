import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { ErrorState } from "@/components/admin/ErrorState";
import { LeadSourceManager } from "@/components/admin/LeadSourceManager";
import { MetricCard } from "@/components/admin/MetricCard";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { getAdminAccessContext } from "@/lib/admin";
import { appRoutes } from "@/lib/app-routes";
import { canManageLeadSources } from "@/lib/crm/authz";
import { listLeadSources } from "@/lib/crm/lead-sources-admin";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";

export const dynamic = "force-dynamic";

export default async function AdminLeadSourcesPage() {
  const { role, accessLevel, actualAccessLevel, canSwitchAccessViews } =
    await getAdminAccessContext(appRoutes.settingsSources);

  if (!canManageLeadSources({ accessLevel, role })) {
    redirect(appRoutes.settings);
  }

  let sources = null;
  let pageError: unknown = null;

  try {
    sources = await listLeadSources({ includeArchived: true });
  } catch (error) {
    pageError = error;
    logCrmPageError("settings-sources", error);
  }

  return (
    <AdminShell
      activeNav="settings"
      accessLevel={accessLevel}
      role={role}
      actualAccessLevel={actualAccessLevel}
      canSwitchAccessViews={canSwitchAccessViews}
      title="Lead Sources"
      description="Keep your lead source list clean, consistent, and ready for source performance reporting."
      actions={
        <>
          <Link
            href={appRoutes.settings}
            className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium"
          >
            Back to settings
          </Link>
          <AdminSignOutButton />
        </>
      }
    >
      {sources ? (
        <div className="space-y-6">
          <section className="grid gap-3 md:grid-cols-3">
            <MetricCard
              label="Active sources"
              value={sources.filter((source) => !source.archived).length}
              supporting="Sources currently available during lead capture."
              tone="accent"
            />
            <MetricCard
              label="Archived sources"
              value={sources.filter((source) => source.archived).length}
              supporting="Sources hidden from new lead capture."
            />
            <MetricCard
              label="Typed sources"
              value={sources.filter((source) => Boolean(source.type) && !source.archived).length}
              supporting="Sources already grouped by type for reporting."
            />
          </section>

          <section className="admin-surface rounded-[24px] p-5">
            <SectionHeader
              eyebrow="Source setup"
              title="Manage lead sources"
              description="Add, rename, archive, and restore the source labels your team uses every day."
            />
            <div className="mt-5">
              <LeadSourceManager initialSources={sources} />
            </div>
          </section>
        </div>
      ) : (
        <ErrorState
          title={getCrmPageErrorCopy(pageError).title}
          description={getCrmPageErrorCopy(pageError).description}
          details={getCrmPageErrorCopy(pageError).details}
        />
      )}
    </AdminShell>
  );
}
