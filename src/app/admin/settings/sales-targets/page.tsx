import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { ErrorState } from "@/components/admin/ErrorState";
import { MetricCard } from "@/components/admin/MetricCard";
import { SalesTargetManager } from "@/components/admin/SalesTargetManager";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { getAdminAccessContext } from "@/lib/admin";
import { canManageSalesTargets } from "@/lib/crm/authz";
import {
  getSalesTargetReferenceData,
  listSalesTargets,
} from "@/lib/crm/sales-targets-admin";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";

export const dynamic = "force-dynamic";

export default async function AdminSalesTargetsPage() {
  const { role, accessLevel, actualAccessLevel, canSwitchAccessViews } =
    await getAdminAccessContext("/admin/settings/sales-targets");

  if (!canManageSalesTargets({ accessLevel, role })) {
    redirect("/admin/settings");
  }

  let targets = null;
  let referenceData = null;
  let pageError: unknown = null;

  try {
    [targets, referenceData] = await Promise.all([
      listSalesTargets({ includeArchived: true }),
      getSalesTargetReferenceData(),
    ]);
  } catch (error) {
    pageError = error;
    logCrmPageError("settings-sales-targets", error);
  }

  return (
    <AdminShell
      activeNav="settings"
      accessLevel={accessLevel}
      role={role}
      actualAccessLevel={actualAccessLevel}
      canSwitchAccessViews={canSwitchAccessViews}
      title="Sales Targets"
      description="Set clear targets so the dashboard can show progress against revenue goals."
      actions={
        <>
          <Link
            href="/admin/settings"
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
              supporting="Targets currently tracking progress."
              tone="accent"
            />
            <MetricCard
              label="Global targets"
              value={targets.filter((target) => target.scope === "global" && !target.archived).length}
              supporting="Company-wide targets ready for the dashboard."
            />
            <MetricCard
              label="Archived targets"
              value={targets.filter((target) => target.archived).length}
              supporting="Targets hidden from current tracking."
            />
          </section>

          <section className="admin-surface rounded-[24px] p-5">
            <SectionHeader
              eyebrow="Sales targets"
              title="Manage targets"
              description="Track the target value, timing, and scope that matter most for client reporting."
            />
            <div className="mt-5">
              <SalesTargetManager initialTargets={targets} referenceData={referenceData} />
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
