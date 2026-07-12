import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { ErrorState } from "@/components/admin/ErrorState";
import { MetricCard } from "@/components/admin/MetricCard";
import { SalesTargetManager } from "@/components/admin/SalesTargetManager";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { getAdminAccessContext } from "@/lib/admin";
import { isLocalAdminPreviewEmail } from "@/lib/admin-access";
import { appRoutes } from "@/lib/app-routes";
import { canManageSalesTargets } from "@/lib/crm/authz";
import {
  getSalesTargetReferenceData,
  listSalesTargets,
} from "@/lib/crm/sales-targets-admin";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";
import { getCompanySettings } from "@/lib/crm/workspace-settings-server";
import { resolveStoredWorkspaceSettings } from "@/lib/crm/workspace-settings";

export const dynamic = "force-dynamic";

export default async function AdminSalesTargetsPage() {
  const { session, role, accessLevel, actualAccessLevel, canSwitchAccessViews, permissions } =
    await getAdminAccessContext(appRoutes.settingsSalesTargets);

  if (!canManageSalesTargets({ accessLevel, permissions, role })) {
    redirect(appRoutes.settings);
  }

  let targets = null;
  let referenceData = null;
  let workspaceSettings = null;
  let pageError: unknown = null;

  if (isLocalAdminPreviewEmail(session.user?.email)) {
    const timestamp = new Date().toISOString();
    targets = [{
      id: "demo-target-quarterly",
      name: "Q3 revenue target",
      scope: "global" as const,
      scopeId: null,
      period: "quarterly" as const,
      targetValue: 12_000_000,
      currency: "NGN",
      startDate: "2026-07-01",
      endDate: "2026-09-30",
      isActive: true,
      archived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    }];
    referenceData = {
      teams: [{ id: "demo-team-inbound", name: "Inbound sales" }],
      branches: [{ id: "demo-branch-lagos", name: "Lagos HQ" }],
      departments: [{ id: "demo-department-sales", name: "Sales" }],
      users: [{ id: "demo-user-ada", label: "Ada Okafor" }],
    };
    workspaceSettings = resolveStoredWorkspaceSettings(null);
  } else try {
    [targets, referenceData, workspaceSettings] = await Promise.all([
      listSalesTargets({ includeArchived: true }),
      getSalesTargetReferenceData(),
      getCompanySettings(),
    ]);
  } catch (error) {
    pageError = error;
    logCrmPageError("settings-sales-targets", error);
  }

  const defaultCurrency =
    targets?.find((target) => !target.archived)?.currency ??
    targets?.[0]?.currency ??
    workspaceSettings?.globalCurrency ??
    "USD";

  return (
    <AdminShell
      activeNav="settings"
      accessLevel={accessLevel}
      role={role}
      actualAccessLevel={actualAccessLevel}
      canSwitchAccessViews={canSwitchAccessViews}
      title="Sales Targets"
      description="Create and adjust the goals shown on the dashboard."
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
      {targets && referenceData ? (
        <div className="space-y-6">
          <section className="grid gap-3 md:grid-cols-3">
            <MetricCard
              label="Active targets"
              value={targets.filter((target) => !target.archived && target.isActive).length}
              supporting="Live on the dashboard."
              tone="accent"
            />
            <MetricCard
              label="Global targets"
              value={targets.filter((target) => target.scope === "global" && !target.archived).length}
              supporting="Shared across the workspace."
            />
            <MetricCard
              label="Archived targets"
              value={targets.filter((target) => target.archived).length}
              supporting="Stored but not tracking."
            />
          </section>

          <section className="admin-surface rounded-[24px] p-5">
            <SectionHeader
              eyebrow="Sales targets"
              title="Target control"
              description="Set the goal behind live pipeline reporting."
            />
            <div className="mt-5">
              <SalesTargetManager
                initialTargets={targets}
                referenceData={referenceData}
                defaultCurrency={defaultCurrency}
                demoMode={isLocalAdminPreviewEmail(session.user?.email)}
              />
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
