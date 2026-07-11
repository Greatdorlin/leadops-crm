import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { FormCreateStudio } from "@/components/admin/FormCreateStudio";
import { getAdminAccessContext } from "@/lib/admin";
import { appRoutes } from "@/lib/app-routes";
import { canManageForms } from "@/lib/crm/authz";
import { buildFormDefaultSourceOptions } from "@/lib/crm/form-default-source-options";
import { listLeadSources } from "@/lib/crm/lead-sources-admin";
import { listLeadStages } from "@/lib/crm/lead-stages-admin";
import { leadStore } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function AdminNewFormPage() {
  const { role, accessLevel, actualAccessLevel, canSwitchAccessViews, permissions } =
    await getAdminAccessContext(appRoutes.formsNew);

  if (!canManageForms({ accessLevel, permissions, role })) {
    redirect(appRoutes.forms);
  }

  const [stages, sources, users] = await Promise.all([
    listLeadStages(),
    listLeadSources(),
    leadStore.listCrmUsers(),
  ]);

  const stageOptions = stages
    .filter((stage) => !stage.archived)
    .map((stage) => ({ value: stage.key, label: stage.name }));
  const sourceOptions = buildFormDefaultSourceOptions(sources);
  const ownerOptions = users
    .filter((user) => user.isActive)
    .map((user) => ({
      value: user.id,
      label: user.fullName.trim() || user.email,
    }));

  return (
    <AdminShell
      activeNav="forms"
      accessLevel={accessLevel}
      role={role}
      actualAccessLevel={actualAccessLevel}
      canSwitchAccessViews={canSwitchAccessViews}
      title="Create Form"
      description="Start with a template, set routing defaults, and create a shareable intake flow."
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
      <FormCreateStudio
        stageOptions={stageOptions}
        sourceOptions={sourceOptions}
        ownerOptions={ownerOptions}
      />
    </AdminShell>
  );
}
