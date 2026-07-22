import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FormInput } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { FormTabNav } from "@/components/admin/FormTabNav";
import { FormDetailProvider } from "@/components/admin/FormDetailProvider";
import { getAdminAccessContext } from "@/lib/admin";
import { isLocalAdminPreviewEmail } from "@/lib/admin-access";
import { canAccessFormsWorkspace } from "@/lib/admin-permissions";
import { appRoutes } from "@/lib/app-routes";
import {
  getFormById,
  listFormFields,
} from "@/lib/crm/form-builder-store";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";
import { buildDemoForms } from "@/lib/crm/demo-data";

export const dynamic = "force-dynamic";

export default async function FormDetailLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { role, accessLevel, actualAccessLevel, canSwitchAccessViews, permissions, session } =
    await getAdminAccessContext(appRoutes.form(id));

  if (!canAccessFormsWorkspace(accessLevel, role, permissions)) {
    redirect(appRoutes.dashboard);
  }

  let form: Awaited<ReturnType<typeof getFormById>> = null;
  let pageError: unknown = null;
  let fields: Awaited<ReturnType<typeof listFormFields>> = [];

  if (isLocalAdminPreviewEmail(session.user?.email) && id.startsWith("demo-form-")) {
    form = buildDemoForms().find((item) => item.id === id) ?? null;
  } else try {
    form = await getFormById(id);
    if (form) {
      fields = await listFormFields(id);
    }
  } catch (error) {
    logCrmPageError("form-detail", error);
    pageError = error;
  }

  if (!form) {
    notFound();
  }

  return (
    <AdminShell
      activeNav="forms"
      accessLevel={accessLevel}
      role={role}
      actualAccessLevel={actualAccessLevel}
      canSwitchAccessViews={canSwitchAccessViews}
      title={form.name}
      description={`/${form.slug} · ${form.status}`}
      actions={
        <>
          <Link
            href={appRoutes.forms}
            className="admin-button-secondary inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <AdminSignOutButton />
        </>
      }
    >
      <div className="space-y-6">
        <section className="ld-glass-panel rounded-[32px] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-white/10 bg-white/[0.08] text-white/70">
                <FormInput className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-[family:var(--font-heading)] text-[1.8rem] leading-[1.1] tracking-[-0.05em] text-white">
                  {form.name}
                </h2>
                <p className="mt-0.5 text-sm text-white/60">/{form.slug}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.04em] ${
                  form.status === "active"
                    ? "bg-emerald-500/12 border-emerald-400/25 text-emerald-100"
                    : form.status === "archived"
                      ? "bg-white/10 border-white/20 text-white/60"
                      : "bg-sky-500/12 border-sky-400/25 text-sky-100"
                }`}
              >
                {form.status}
              </span>
            </div>
          </div>
          <div className="mt-5">
            {id.startsWith("demo-form-") ? (
              <div className="inline-flex rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1.5 text-xs font-semibold text-sky-100">
                Demo form overview
              </div>
            ) : (
              <FormTabNav formId={id} />
            )}
          </div>
        </section>

        {pageError ? (
          <div className="rounded-[24px] border border-rose-300/20 bg-rose-400/[0.055] p-5 text-sm text-rose-100">
            <p className="font-semibold">{getCrmPageErrorCopy(pageError).title}</p>
            <p className="mt-2">{getCrmPageErrorCopy(pageError).description}</p>
          </div>
        ) : (
          <FormDetailProvider
            form={form}
            formId={id}
            fields={fields}
          >
            <section className="min-w-0">
              {children}
            </section>
          </FormDetailProvider>
        )}
      </div>
    </AdminShell>
  );
}
