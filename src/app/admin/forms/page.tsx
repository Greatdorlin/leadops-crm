import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { ErrorState } from "@/components/admin/ErrorState";
import { FormListGrid } from "@/components/admin/FormListGrid";
import { getAdminAccessContext } from "@/lib/admin";
import { isLocalAdminPreviewEmail } from "@/lib/admin-access";
import { canAccessFormsWorkspace } from "@/lib/admin-permissions";
import { appRoutes } from "@/lib/app-routes";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";
import {
  getFormResourceCounts,
  listForms,
} from "@/lib/crm/form-builder-store";
import { buildDemoForms } from "@/lib/crm/demo-data";

export const dynamic = "force-dynamic";

export default async function AdminFormsPage() {
  const {
    role,
    accessLevel,
    actualAccessLevel,
    canSwitchAccessViews,
    permissions,
    session,
  } = await getAdminAccessContext(appRoutes.forms);

  if (!canAccessFormsWorkspace(accessLevel, role, permissions)) {
    redirect(appRoutes.dashboard);
  }

  let formsWithCounts: (Awaited<ReturnType<typeof listForms>>[number] & { fieldCount: number; submissionCount: number })[] = [];
  let pageError: unknown = null;
  let usingDemoForms = false;

  try {
    const forms = await listForms({ includeArchived: true });
    const counts = await getFormResourceCounts(forms.map((form) => form.id));
    formsWithCounts = forms.map((form) => ({
      ...form,
      fieldCount: counts.get(form.id)?.fieldCount ?? 0,
      submissionCount: counts.get(form.id)?.submissionCount ?? 0,
    }));
    if (formsWithCounts.length === 0 && isLocalAdminPreviewEmail(session.user?.email)) {
      formsWithCounts = buildDemoForms();
      usingDemoForms = true;
    }
  } catch (error) {
    pageError = error;
    logCrmPageError("forms", error);
    if (isLocalAdminPreviewEmail(session.user?.email)) {
      formsWithCounts = buildDemoForms();
      usingDemoForms = true;
    }
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
        permissions={permissions}
        demoMode={usingDemoForms}
      />
    </AdminShell>
  );
}
