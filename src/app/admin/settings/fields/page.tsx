import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { CustomFieldManager } from "@/components/admin/CustomFieldManager";
import { ErrorState } from "@/components/admin/ErrorState";
import { MetricCard } from "@/components/admin/MetricCard";
import { PremiumPageHeader } from "@/components/admin/PremiumPageHeader";
import { getAdminAccessContext } from "@/lib/admin";
import { appRoutes } from "@/lib/app-routes";
import { canManageCustomFields } from "@/lib/crm/authz";
import { listCustomFields } from "@/lib/crm/custom-fields-admin";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";

export const dynamic = "force-dynamic";

export default async function AdminLeadFieldsPage() {
  const { role, accessLevel, actualAccessLevel, canSwitchAccessViews } =
    await getAdminAccessContext(appRoutes.settingsFields);

  if (!canManageCustomFields({ accessLevel, role })) {
    redirect(appRoutes.settings);
  }

  let fields = null;
  let pageError: unknown = null;

  try {
    fields = await listCustomFields({ includeArchived: true });
  } catch (error) {
    pageError = error;
    logCrmPageError("settings-fields", error);
  }

  return (
    <AdminShell
      activeNav="settings"
      accessLevel={accessLevel}
      role={role}
      actualAccessLevel={actualAccessLevel}
      canSwitchAccessViews={canSwitchAccessViews}
      title="Lead Fields"
      description="Define the extra lead details your team needs to capture and review."
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
      {fields ? (
        <div className="space-y-6">
          <PremiumPageHeader
            eyebrow="Lead fields"
            title="Field definitions"
            description="Create the extra lead details your team actually uses."
            actions={
              <Link
                href={appRoutes.settingsLeadPreview}
                className="admin-button-secondary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-medium"
              >
                Open lead preview
              </Link>
            }
          />

          <section className="grid gap-3 md:grid-cols-3">
            <MetricCard
              label="Active fields"
              value={fields.filter((field) => !field.archived).length}
              supporting="Ready for forms, lead detail, and queue views."
              tone="accent"
            />
            <MetricCard
              label="Archived fields"
              value={fields.filter((field) => field.archived).length}
              supporting="Kept for safe recovery instead of deletion."
            />
            <MetricCard
              label="Option-based fields"
              value={fields.filter((field) => field.type === "select" || field.type === "multi_select").length}
              supporting="Structured fields with managed answer options."
            />
          </section>

          <section className="admin-surface rounded-[24px] p-5">
            <div className="mt-5">
              <CustomFieldManager initialFields={fields} />
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
