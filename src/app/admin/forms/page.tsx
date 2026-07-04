import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { ErrorState } from "@/components/admin/ErrorState";
import { FormListGrid } from "@/components/admin/FormListGrid";
import { getAdminAccessContext } from "@/lib/admin";
import { appRoutes } from "@/lib/app-routes";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";
import {
  listForms,
  listFormFields,
  listFormSubmissions,
} from "@/lib/crm/form-builder-store";

export const dynamic = "force-dynamic";

export default async function AdminFormsPage() {
  const {
    role,
    accessLevel,
    actualAccessLevel,
    canSwitchAccessViews,
  } = await getAdminAccessContext(appRoutes.forms);

  let formsWithCounts: (Awaited<ReturnType<typeof listForms>>[number] & { fieldCount: number; submissionCount: number })[] = [];
  let pageError: unknown = null;

  try {
    const forms = await listForms();
    formsWithCounts = await Promise.all(
      forms.map(async (form) => {
        const [fields, submissions] = await Promise.all([
          listFormFields(form.id),
          listFormSubmissions(form.id),
        ]);
        return {
          ...form,
          fieldCount: fields.length,
          submissionCount: submissions.length,
        };
      })
    );
  } catch (error) {
    pageError = error;
    logCrmPageError("forms", error);
  }

  if (pageError && formsWithCounts.length === 0) {
    const errorCopy = getCrmPageErrorCopy(pageError);
    return (
      <AdminShell
        activeNav="forms"
        accessLevel={accessLevel}
        role={role}
        actualAccessLevel={actualAccessLevel}
        canSwitchAccessViews={canSwitchAccessViews}
        title="Forms"
        description="Build forms, capture leads, and automate qualification."
        actions={<AdminSignOutButton />}
      >
        <ErrorState
          title={errorCopy.title}
          description={errorCopy.description}
          details={errorCopy.details}
        />
      </AdminShell>
    );
  }

  return (
    <AdminShell
      activeNav="forms"
      accessLevel={accessLevel}
      role={role}
      actualAccessLevel={actualAccessLevel}
      canSwitchAccessViews={canSwitchAccessViews}
      title="Forms"
      description="Build forms, capture leads, and automate qualification."
      actions={
        <>
          <Link
            href={appRoutes.dashboard}
            className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium"
          >
            Back to dashboard
          </Link>
          <AdminSignOutButton />
        </>
      }
    >
      <FormListGrid
        initialForms={formsWithCounts}
        accessLevel={accessLevel}
        role={role}
      />
    </AdminShell>
  );
}
