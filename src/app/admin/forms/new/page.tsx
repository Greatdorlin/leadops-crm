import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { FormCreateStudio } from "@/components/admin/FormCreateStudio";
import { getAdminAccessContext } from "@/lib/admin";
import { appRoutes } from "@/lib/app-routes";
import { canManageForms } from "@/lib/crm/authz";

export const dynamic = "force-dynamic";

export default async function AdminNewFormPage() {
  const { role, accessLevel, actualAccessLevel, canSwitchAccessViews, permissions } =
    await getAdminAccessContext(appRoutes.formsNew);

  if (!canManageForms({ accessLevel, permissions, role })) {
    redirect(appRoutes.forms);
  }

  return (
    <AdminShell
      activeNav="forms"
      accessLevel={accessLevel}
      role={role}
      actualAccessLevel={actualAccessLevel}
      canSwitchAccessViews={canSwitchAccessViews}
      title="Create form"
      description="Choose, name, build."
      actions={
        <>
          <Link
            href={appRoutes.forms}
            className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium"
          >
            Back to forms
          </Link>
          <AdminSignOutButton />
        </>
      }
    >
      <FormCreateStudio />
    </AdminShell>
  );
}
