import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { ErrorState } from "@/components/admin/ErrorState";
import { LeadDataTable } from "@/components/admin/LeadDataTable";
import { LeadLifecycleButton } from "@/components/admin/LeadLifecycleButton";
import { getAdminAccessContext } from "@/lib/admin";
import { canAccessLeadTrash } from "@/lib/admin-permissions";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";
import { leadStore } from "@/lib/storage";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

function readPage(input: Record<string, string | string[] | undefined>) {
  const raw = Array.isArray(input.page) ? input.page[0] : input.page;
  const value = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function safeNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function buildTrashHref(page: number) {
  return page > 1 ? `/admin/leads/trash?page=${page}` : "/admin/leads/trash";
}

export default async function AdminLeadTrashPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { role, accessLevel, actualAccessLevel, canSwitchAccessViews } =
    await getAdminAccessContext("/admin/leads/trash");

  if (!canAccessLeadTrash(accessLevel)) {
    return (
      <AdminShell
        activeNav="leads"
        accessLevel={accessLevel}
        role={role}
        actualAccessLevel={actualAccessLevel}
        canSwitchAccessViews={canSwitchAccessViews}
        title="Lead trash"
        description="Deleted leads stay here until they are restored or removed fully."
        actions={<AdminSignOutButton />}
      >
        <ErrorState
          title="Lead trash is not available"
          description="Only master admin and general admin can open deleted leads."
        />
      </AdminShell>
    );
  }

  const params = await searchParams;
  const requestedPage = readPage(params);
  let pageData:
    | {
        leads: Awaited<ReturnType<typeof leadStore.list>>;
        totalLeads: number;
      }
    | null = null;
  let pageError: unknown = null;

  try {
    const totalLeads = await leadStore.countLeads({ recordState: "trashed" });
    const totalPages = Math.max(1, Math.ceil(totalLeads / PAGE_SIZE));
    const page = Math.min(requestedPage, totalPages);
    const leads = await leadStore.list({
      recordState: "trashed",
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    });

    pageData = { leads, totalLeads };
  } catch (error) {
    pageError = error;
    logCrmPageError("lead-trash", error);
  }

  if (!pageData) {
    const errorCopy = getCrmPageErrorCopy(pageError);

    return (
      <AdminShell
        activeNav="leads"
        accessLevel={accessLevel}
        role={role}
        actualAccessLevel={actualAccessLevel}
        canSwitchAccessViews={canSwitchAccessViews}
        title="Lead trash"
        description="Deleted leads stay here until they are restored or removed fully."
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

  const { leads, totalLeads } = pageData;
  const totalPages = Math.max(1, Math.ceil(totalLeads / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);

  return (
    <AdminShell
      activeNav="leads"
      accessLevel={accessLevel}
      role={role}
      actualAccessLevel={actualAccessLevel}
      canSwitchAccessViews={canSwitchAccessViews}
      title="Lead trash"
      description="Deleted leads stay here until they are restored or removed fully."
      actions={
        <>
          <Link
            href="/admin/leads"
            className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium"
          >
            Back to leads
          </Link>
          <AdminSignOutButton />
        </>
      }
    >
      <div className="space-y-4">
        <LeadDataTable
          leads={leads}
          emptyTitle="Trash is empty"
          emptyDescription="Deleted leads will appear here until they are restored or removed permanently."
          renderActions={(lead) => (
            <>
              <Link
                href={`/admin/leads/${lead.id}`}
                className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium"
              >
                Open
              </Link>
              <LeadLifecycleButton
                leadId={lead.id}
                action="restore"
                className="inline-flex h-10 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-4 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
              />
              <LeadLifecycleButton
                leadId={lead.id}
                action="delete"
                onSuccessHref="/admin/leads/trash"
                className="inline-flex h-10 items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
              />
            </>
          )}
        />

        <div className="flex flex-col gap-3 rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(248,250,255,0.92)_100%)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-sm leading-6 text-slate-500">
            Trash holds {safeNumber(totalLeads)} deleted {totalLeads === 1 ? "lead" : "leads"}.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildTrashHref(Math.max(1, currentPage - 1))}
              aria-disabled={currentPage <= 1}
              className={[
                "admin-button-secondary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium",
                currentPage <= 1 ? "pointer-events-none opacity-45" : "",
              ].join(" ")}
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Link>
            <Link
              href={buildTrashHref(Math.min(totalPages, currentPage + 1))}
              aria-disabled={currentPage >= totalPages}
              className={[
                "admin-button-primary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold",
                currentPage >= totalPages ? "pointer-events-none opacity-45" : "",
              ].join(" ")}
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
