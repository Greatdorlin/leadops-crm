import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { ErrorState } from "@/components/admin/ErrorState";
import { LeadStageManager } from "@/components/admin/LeadStageManager";
import { MetricCard } from "@/components/admin/MetricCard";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { getAdminAccessContext } from "@/lib/admin";
import { isLocalAdminPreviewEmail } from "@/lib/admin-access";
import { appRoutes } from "@/lib/app-routes";
import { canManageLeadStages } from "@/lib/crm/authz";
import { listLeadStages } from "@/lib/crm/lead-stages-admin";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";
import { DEFAULT_LEADS_DESK_STAGE_ROWS } from "@/lib/db/defaults";

export const dynamic = "force-dynamic";

export default async function AdminLeadStagesPage() {
  const { session, role, accessLevel, actualAccessLevel, canSwitchAccessViews, permissions } =
    await getAdminAccessContext(appRoutes.settingsStages);

  if (!canManageLeadStages({ accessLevel, permissions, role })) {
    redirect(appRoutes.settings);
  }

  let stages = null;
  let pageError: unknown = null;

  if (isLocalAdminPreviewEmail(session.user?.email)) {
    const timestamp = new Date().toISOString();
    stages = DEFAULT_LEADS_DESK_STAGE_ROWS.map((stage) => ({
      id: `demo-stage-${stage.key}`,
      ...stage,
      archived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    }));
  } else try {
    stages = await listLeadStages({ includeArchived: true });
  } catch (error) {
    pageError = error;
    logCrmPageError("settings-stages", error);
  }

  return (
    <AdminShell
      activeNav="settings"
      accessLevel={accessLevel}
      role={role}
      actualAccessLevel={actualAccessLevel}
      canSwitchAccessViews={canSwitchAccessViews}
      title="Lead Stages"
      description="Keep pipeline stages clean, ordered, and ready for reporting."
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
      {stages ? (
        <div className="space-y-6">
          <section className="grid gap-3 md:grid-cols-3">
            <MetricCard
              label="Active stages"
              value={stages.filter((stage) => !stage.archived).length}
              supporting="Stages currently available to the sales team."
              tone="accent"
            />
            <MetricCard
              label="Won stages"
              value={stages.filter((stage) => stage.isWon && !stage.archived).length}
              supporting="Stages that count as closed-won."
              tone="positive"
            />
            <MetricCard
              label="Lost stages"
              value={stages.filter((stage) => stage.isLost && !stage.archived).length}
              supporting="Stages that count as closed-lost."
            />
          </section>

          <section className="admin-surface rounded-[24px] p-5">
            <SectionHeader
              eyebrow="Pipeline setup"
              title="Manage lead stages"
              description="Add, rename, order, archive, and restore stages without breaking lead history."
            />
            <div className="mt-5">
              <LeadStageManager initialStages={stages} demoMode={isLocalAdminPreviewEmail(session.user?.email)} />
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
