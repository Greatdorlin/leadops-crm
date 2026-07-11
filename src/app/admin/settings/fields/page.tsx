import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { CustomFieldManager } from "@/components/admin/CustomFieldManager";
import { ErrorState } from "@/components/admin/ErrorState";
import { getAdminAccessContext } from "@/lib/admin";
import { appRoutes } from "@/lib/app-routes";
import { canManageCustomFields } from "@/lib/crm/authz";
import { listCustomFields } from "@/lib/crm/custom-fields-admin";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";

export const dynamic = "force-dynamic";

export default async function AdminLeadFieldsPage() {
  const { role, accessLevel, actualAccessLevel, canSwitchAccessViews, permissions } =
    await getAdminAccessContext(appRoutes.settingsFields);

  if (!canManageCustomFields({ accessLevel, permissions, role })) {
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
            prefetch={false}
            className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium"
          >
            Back to settings
          </Link>
          <Link
            href={appRoutes.settingsLeadPreview}
            prefetch={false}
            className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium"
          >
            Lead preview
          </Link>
          <AdminSignOutButton />
        </>
      }
    >
      {fields ? (
        <section className="admin-surface rounded-[24px] p-4 sm:p-5">
          <CustomFieldManager initialFields={fields} />
        </section>
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
