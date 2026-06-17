import Link from "next/link";
import { ArrowLeft, ArrowRight, Rows3, Search, UserRoundPlus } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { ErrorState } from "@/components/admin/ErrorState";
import { FilterBar } from "@/components/admin/FilterBar";
import { LeadDataTable } from "@/components/admin/LeadDataTable";
import { LeadLifecycleButton } from "@/components/admin/LeadLifecycleButton";
import { QueueStatChip } from "@/components/admin/QueueStatChip";
import { SearchInput } from "@/components/admin/SearchInput";
import { getAdminAccessContext } from "@/lib/admin";
import { parseLeadListFilters } from "@/lib/admin-leads";
import {
  canAccessLeadTrash,
  canSoftDeleteLead,
  scopeLeadListFilters,
} from "@/lib/admin-permissions";
import { crmLabelize } from "@/lib/crm/formatters";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";
import { CRM_STATUSES, LEAD_PRIORITIES, LEAD_SOURCES } from "@/lib/pathway-engine/types";
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

function buildLeadsHref(
  params: {
    page: number;
    search?: string;
    crmStatus?: string;
    source?: string;
    priority?: string;
    assignedTo?: string;
  },
) {
  const query = new URLSearchParams();

  if (params.page > 1) {
    query.set("page", String(params.page));
  }

  if (params.search?.trim()) {
    query.set("search", params.search.trim());
  }

  if (params.crmStatus && params.crmStatus !== "all") {
    query.set("crmStatus", params.crmStatus);
  }

  if (params.source && params.source !== "all") {
    query.set("source", params.source);
  }

  if (params.priority && params.priority !== "all") {
    query.set("priority", params.priority);
  }

  if (params.assignedTo?.trim()) {
    query.set("assignedTo", params.assignedTo.trim());
  }

  const serialized = query.toString();
  return serialized ? `/admin/leads?${serialized}` : "/admin/leads";
}

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const {
    session,
    role,
    accessLevel,
    actualAccessLevel,
    canSwitchAccessViews,
  } = await getAdminAccessContext("/admin/leads");
  const params = await searchParams;
  const filters = parseLeadListFilters(params);
  const scopedFilters = scopeLeadListFilters(filters, accessLevel, session.user?.email);
  const requestedPage = readPage(params);
  let pageError: unknown = null;
  let pageData:
    | {
        leads: Awaited<ReturnType<typeof leadStore.list>>;
        totalLeads: number;
        users: Awaited<ReturnType<typeof leadStore.listCrmUsers>>;
        trashCount: number;
      }
    | null = null;

  try {
    const totalLeads = await leadStore.countLeads(scopedFilters);
    const totalPages = Math.max(1, Math.ceil(totalLeads / PAGE_SIZE));
    const page = Math.min(requestedPage, totalPages);
    const showTrashFolder = canAccessLeadTrash(accessLevel);
    const [leads, users] = await Promise.all([
      leadStore.list({
        ...scopedFilters,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      }),
      accessLevel === "sales_rep" ? Promise.resolve([]) : leadStore.listCrmUsers(),
    ]);
    const trashCount = showTrashFolder ? await leadStore.countLeads({ recordState: "trashed" }) : 0;

    pageData = {
      leads,
      totalLeads,
      users,
      trashCount,
    };
  } catch (error) {
    pageError = error;
    logCrmPageError("leads", error);
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
        title={accessLevel === "sales_rep" ? "My Leads" : "Leads"}
        description="Lead search, routing, and review."
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

  const { leads, totalLeads, users, trashCount } = pageData;
  const showTrashFolder = canAccessLeadTrash(accessLevel);
  const canTrashLead = canSoftDeleteLead(accessLevel);
  const totalPages = Math.max(1, Math.ceil(totalLeads / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const rangeStart = totalLeads === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = totalLeads === 0 ? 0 : Math.min(totalLeads, currentPage * PAGE_SIZE);
  const baseHrefParams = {
    search: filters.search,
    crmStatus: filters.crmStatus,
    source: filters.source,
    priority: filters.priority,
    assignedTo: scopedFilters.assignedTo,
  };
  const hasFilters = Boolean(
    filters.search ||
      (filters.crmStatus && filters.crmStatus !== "all") ||
      (filters.source && filters.source !== "all") ||
      (filters.priority && filters.priority !== "all") ||
      scopedFilters.assignedTo,
  );
  const assigneeOptions =
    accessLevel === "sales_rep"
      ? session.user?.email
        ? [
            {
              label: session.user.name || session.user.email,
              value: session.user.email,
            },
          ]
        : []
      : users
          .filter((user) => user.isActive)
          .map((user) => ({
          label: user.fullName || user.email,
          value: user.email,
        }));

  return (
    <AdminShell
      activeNav="leads"
      accessLevel={accessLevel}
      role={role}
      actualAccessLevel={actualAccessLevel}
      canSwitchAccessViews={canSwitchAccessViews}
      title={accessLevel === "sales_rep" ? "My Leads" : "Leads"}
      description="A dedicated queue for large-volume lead review."
      actions={
        <>
          <Link
            href="/admin#action-center"
            className="admin-button-primary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold"
          >
            Add lead
          </Link>
          <AdminSignOutButton />
        </>
      }
    >
      <div className="space-y-6">
        <section className="admin-surface rounded-[32px] p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0b123f]/54">
                Lead queue
              </p>
              <h2 className="mt-2 font-[family:var(--font-heading)] text-[2.4rem] leading-none tracking-[-0.05em] text-slate-950 sm:text-[2.9rem]">
                Review every lead in one dedicated queue.
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Search, filter, assign, and move through the queue in pages.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {showTrashFolder ? (
                <Link
                  href="/admin/leads/trash"
                  className="admin-button-secondary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-medium"
                >
                  Trash ({safeNumber(trashCount)})
                </Link>
              ) : null}
              <Link
                href="/admin"
                className="admin-button-secondary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-medium"
              >
                Back to dashboard
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            <QueueStatChip
              label="Matching leads"
              value={safeNumber(totalLeads)}
              hint="Results after the current filters."
              icon={Rows3}
              tone="accent"
            />
            <QueueStatChip
              label="Showing"
              value={totalLeads === 0 ? "0" : `${safeNumber(rangeStart)} - ${safeNumber(rangeEnd)}`}
              hint={`${safeNumber(PAGE_SIZE)} rows per page.`}
              icon={Search}
            />
            <QueueStatChip
              label="Owners visible"
              value={safeNumber(
                new Set(leads.map((lead) => lead.assignedTo).filter(Boolean)).size,
              )}
              hint="Distinct owners on this page."
              icon={UserRoundPlus}
            />
          </div>
        </section>

        <FilterBar>
          <form action="/admin/leads" className="grid gap-3">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(180px,0.65fr)_minmax(180px,0.65fr)_minmax(180px,0.65fr)_minmax(220px,0.75fr)]">
              <SearchInput
                defaultValue={filters.search}
                placeholder="Search name, state, email, phone, source, or owner"
              />
              <AdminSelect name="crmStatus" defaultValue={filters.crmStatus ?? "all"} className="h-12">
                <option value="all">All stages</option>
                {CRM_STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {crmLabelize(option)}
                  </option>
                ))}
              </AdminSelect>
              <AdminSelect name="source" defaultValue={filters.source ?? "all"} className="h-12">
                <option value="all">All sources</option>
                {LEAD_SOURCES.map((option) => (
                  <option key={option} value={option}>
                    {crmLabelize(option)}
                  </option>
                ))}
              </AdminSelect>
              <AdminSelect name="priority" defaultValue={filters.priority ?? "all"} className="h-12">
                <option value="all">All priorities</option>
                {LEAD_PRIORITIES.map((option) => (
                  <option key={option} value={option}>
                    {crmLabelize(option)}
                  </option>
                ))}
              </AdminSelect>
              {accessLevel === "sales_rep" ? (
                <input type="hidden" name="assignedTo" value={scopedFilters.assignedTo ?? ""} />
              ) : (
                <AdminSelect name="assignedTo" defaultValue={scopedFilters.assignedTo ?? ""} className="h-12">
                  <option value="">All owners</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.email}>
                      {user.fullName || user.email}{!user.isActive ? " (inactive)" : ""}
                    </option>
                  ))}
                </AdminSelect>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="admin-button-primary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold"
              >
                Apply filters
              </button>
              <Link
                href="/admin/leads"
                className="admin-button-secondary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-medium"
              >
                Reset
              </Link>
              <div className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500">
                {hasFilters ? "Filtered view" : "All leads"}
              </div>
            </div>
          </form>
        </FilterBar>

        <section className="space-y-4">
          <LeadDataTable
            leads={leads}
            emptyTitle="No leads match this view"
            emptyDescription="Try a broader filter or reset the queue."
            assigneeOptions={assigneeOptions}
            renderActions={(lead) => (
              <>
                <Link
                  href={`/admin/leads/${lead.id}`}
                  className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium"
                >
                  Open
                </Link>
                {canTrashLead ? (
                  <LeadLifecycleButton
                    leadId={lead.id}
                    action="trash"
                    className="inline-flex h-10 items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                  />
                ) : null}
              </>
            )}
          />

          <div className="flex flex-col gap-3 rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(248,250,255,0.92)_100%)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-sm leading-6 text-slate-500">
              Page {safeNumber(currentPage)} of {safeNumber(totalPages)}.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={buildLeadsHref({
                  ...baseHrefParams,
                  page: Math.max(1, currentPage - 1),
                })}
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
                href={buildLeadsHref({
                  ...baseHrefParams,
                  page: Math.min(totalPages, currentPage + 1),
                })}
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
        </section>
      </div>
    </AdminShell>
  );
}
