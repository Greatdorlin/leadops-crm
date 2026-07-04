import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { ErrorState } from "@/components/admin/ErrorState";
import { FormSourceManager } from "@/components/admin/FormSourceManager";
import { MetricCard } from "@/components/admin/MetricCard";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { getAdminAccessContext } from "@/lib/admin";
import { appRoutes } from "@/lib/app-routes";
import { canManageFormSources } from "@/lib/crm/authz";
import {
  getFormSourceAdminReferenceData,
  listFormSources,
} from "@/lib/crm/form-sources-admin";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";

export const dynamic = "force-dynamic";

export default async function AdminFormSourcesPage() {
  const { role, accessLevel, actualAccessLevel, canSwitchAccessViews } =
    await getAdminAccessContext(appRoutes.settingsFormSources);

  if (!canManageFormSources({ accessLevel, role })) {
    redirect(appRoutes.settings);
  }

  let sources = null;
  let referenceData = null;
  let pageError: unknown = null;

  try {
    [sources, referenceData] = await Promise.all([
      listFormSources({ includeInactive: true, includeMappings: true }),
      getFormSourceAdminReferenceData(),
    ]);
  } catch (error) {
    pageError = error;
    logCrmPageError("settings-form-sources", error);
  }

  return (
    <AdminShell
      activeNav="settings"
      accessLevel={accessLevel}
      role={role}
      actualAccessLevel={actualAccessLevel}
      canSwitchAccessViews={canSwitchAccessViews}
      title="Form Sources"
      description="Connect lead capture points to the right lead fields before intake automation goes live."
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
      {sources && referenceData ? (
        <div className="space-y-6">
          <section className="grid gap-3 md:grid-cols-3">
            <MetricCard
              label="Active sources"
              value={sources.filter((source) => source.isActive).length}
              supporting="Lead capture points currently ready for future intake."
              tone="accent"
            />
            <MetricCard
              label="Mapped fields"
              value={sources.reduce((total, source) => total + source.mappings.length, 0)}
              supporting="Saved field links from external forms into Leads Desk."
            />
            <MetricCard
              label="Webhook keys"
              value={sources.filter((source) => source.webhookKey).length}
              supporting="Sources already prepared for future webhook intake."
            />
          </section>

          <section className="admin-surface rounded-[24px] p-5">
            <SectionHeader
              eyebrow="Form sources"
              title="Manage source definitions"
              description="Save each source once, then keep its field mappings aligned with your lead workflow."
            />
            <div className="mt-5">
              <FormSourceManager initialSources={sources} referenceData={referenceData} />
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
