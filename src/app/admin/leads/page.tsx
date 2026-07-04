import Link from "next/link";
import { ArrowLeft, ArrowRight, Rows3, Search, UserRoundPlus } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminLeadExportButton } from "@/components/admin/AdminLeadExportButton";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { ErrorState } from "@/components/admin/ErrorState";
import { FilterBar } from "@/components/admin/FilterBar";
import { LeadDataTable } from "@/components/admin/LeadDataTable";
import { LeadLifecycleButton } from "@/components/admin/LeadLifecycleButton";
import { QueueStatChip } from "@/components/admin/QueueStatChip";
import { SearchInput } from "@/components/admin/SearchInput";
import { AdminWorkspaceComposer } from "@/components/admin/AdminWorkspaceComposer";
import { getAdminAccessContext } from "@/lib/admin";
import { parseLeadListFilters } from "@/lib/admin-leads";
import { loadAdminLeadReadContext } from "@/lib/crm/admin-read-context";
import { listCustomFields } from "@/lib/crm/custom-fields-admin";
import { CRM_STATUSES, LEAD_PRIORITIES, LEAD_SOURCES } from "@/lib/crm/constants";
import { canExportLeads } from "@/lib/crm/authz";
import { getTableVisibleCustomFields } from "@/lib/crm/custom-field-values";
import {
  DEFAULT_LEAD_PREVIEW_CONFIG,
  getCompanySettings,
  resolveLeadPreviewConfig,
} from "@/lib/crm/workspace-settings";
import {
  canAccessLeadTrash,
  canSoftDeleteLead,
  scopeLeadListFilters,
} from "@/lib/admin-permissions";
import { crmLabelize } from "@/lib/crm/formatters";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";
import { buildAdminLeadListItem } from "@/lib/crm/view-models";
import { appRoutes } from "@/lib/app-routes";
import { leadStore } from "@/lib/storage";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

function buildDevelopmentLeadRows() {
  const now = new Date();
  const baseRows = [
    {
      id: "demo-lead-aurelia",
      displayName: "Aurelia Systems",
      initials: "AS",
      email: "hello@aurelia.example",
      phone: "+1 (555) 014-2201",
      source: "website_form" as const,
      leadCustomerType: "business" as const,
      sourceLabel: "Website",
      stage: "qualified",
      stageLabel: "Qualified",
      priority: "high" as const,
      owner: "Sarah Kim",
      companyName: "Aurelia Systems",
      estimatedValue: 280000,
      followUpDays: 0,
      city: "Austin",
    },
    {
      id: "demo-lead-vertex",
      displayName: "Michael Anderson",
      initials: "MA",
      email: "michael@vertexlabs.example",
      phone: "+1 (415) 555-0198",
      source: "referral" as const,
      leadCustomerType: "business" as const,
      sourceLabel: "Referral",
      stage: "contacted",
      stageLabel: "Contacted",
      priority: "medium" as const,
      owner: "James Lee",
      companyName: "Vertex Labs",
      estimatedValue: 125000,
      followUpDays: 1,
      city: "San Francisco",
    },
    {
      id: "demo-lead-northwind",
      displayName: "Northwind Co.",
      initials: "NC",
      email: "ops@northwind.example",
      phone: "+44 20 7946 0100",
      source: "google_ads" as const,
      leadCustomerType: "direct" as const,
      sourceLabel: "Google Ads",
      stage: "consultation_booked",
      stageLabel: "Consultation booked",
      priority: "urgent" as const,
      owner: "Priya Shah",
      companyName: "Northwind Co.",
      estimatedValue: 420000,
      followUpDays: -1,
      city: "London",
    },
  ];

  return baseRows.map((row) => {
    const followUp = new Date(now);
    followUp.setDate(now.getDate() + row.followUpDays);
    followUp.setHours(row.followUpDays < 0 ? 9 : 15, 0, 0, 0);

    return {
      id: row.id,
      displayName: row.displayName,
      initials: row.initials,
      email: row.email,
      phone: row.phone,
      source: row.source,
      sourceLabel: row.sourceLabel,
      sourceDisplay: {
        id: `demo-source-${row.source}`,
        key: row.source,
        label: row.sourceLabel,
        type: "demo",
        color: "#60a5fa",
        isNormalized: true,
      },
      stage: row.stage,
      stageLabel: row.stageLabel,
      stageDisplay: {
        id: `demo-stage-${row.stage}`,
        key: row.stage,
        label: row.stageLabel,
        color: "#8b5cf6",
        isNormalized: true,
      },
      priority: row.priority,
      priorityLabel: crmLabelize(row.priority),
      completionStatus: "active" as const,
      completionLabel: "Active lead",
      categoryLabel: "Sales lead",
      fitSignalLabel: "Good fit",
      interestLabel: `${row.companyName} needs a follow-up on pipeline fit.`,
      assignedUserName: row.owner,
      assignedTo: row.owner.toLowerCase().replace(/\s+/g, ".") + "@local.leadsdesk.test",
      assignedToList: [],
      leadCustomerType: row.leadCustomerType,
      leadCustomerTypeLabel: row.leadCustomerType === "business" ? "Business lead" : "Direct customer",
      ownerDisplay: {
        id: `demo-owner-${row.owner.toLowerCase().replace(/\s+/g, "-")}`,
        label: row.owner,
        email: row.owner.toLowerCase().replace(/\s+/g, ".") + "@local.leadsdesk.test",
        isNormalized: true,
      },
      customFieldDisplayValues: [],
      stateLabel: row.city,
      stateRaw: row.city,
      createdAt: now.toISOString(),
      lastActivityAt: now.toISOString(),
      nextFollowUpAt: followUp.toISOString(),
      nextFollowUpStatus:
        row.followUpDays < 0 ? ("overdue" as const) : row.followUpDays === 0 ? ("due_today" as const) : ("upcoming" as const),
      companyName: row.companyName,
      estimatedValue: row.estimatedValue,
      expectedValue: Math.round(row.estimatedValue * 0.62),
      wonValue: null,
      closeProbability: 62,
      expectedCloseDate: followUp.toISOString(),
      lostReason: null,
      routeId: null,
      routeLabel: row.sourceLabel,
      nigeriaState: null,
    };
  });
}

function readStageFilter(input: Record<string, string | string[] | undefined>) {
  const raw = Array.isArray(input.stage) ? input.stage[0] : input.stage;
  return raw?.trim() ? raw : undefined;
}

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
    stage?: string;
    source?: string;
    priority?: string;
    leadCustomerType?: string;
    assignedTo?: string;
    createdFrom?: string;
    createdTo?: string;
  },
) {
  const query = new URLSearchParams();

  if (params.page > 1) {
    query.set("page", String(params.page));
  }

  if (params.search?.trim()) {
    query.set("search", params.search.trim());
  }

  if (params.stage && params.stage !== "all") {
    query.set("stage", params.stage);
  }

  if (params.source && params.source !== "all") {
    query.set("source", params.source);
  }

  if (params.priority && params.priority !== "all") {
    query.set("priority", params.priority);
  }

  if (params.leadCustomerType && params.leadCustomerType !== "all") {
    query.set("leadCustomerType", params.leadCustomerType);
  }

  if (params.assignedTo?.trim()) {
    query.set("assignedTo", params.assignedTo.trim());
  }

  if (params.createdFrom?.trim()) {
    query.set("createdFrom", params.createdFrom.trim());
  }

  if (params.createdTo?.trim()) {
    query.set("createdTo", params.createdTo.trim());
  }

  const serialized = query.toString();
  return serialized ? `${appRoutes.leads}?${serialized}` : appRoutes.leads;
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
  } = await getAdminAccessContext(appRoutes.leads);
  const params = await searchParams;
  const filters = parseLeadListFilters(params);
  const selectedStage = readStageFilter(params) ?? (filters.stageId === "all" ? "all" : filters.stageId);
  const scopedFilters = scopeLeadListFilters(filters, accessLevel, session.user?.email);
  const requestedPage = readPage(params);
  let pageError: unknown = null;
  let usingDevelopmentDemoData = false;
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
        stageId: selectedStage,
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
    if (process.env.NODE_ENV !== "production") {
      usingDevelopmentDemoData = true;
      pageData = {
        leads: [],
        totalLeads: buildDevelopmentLeadRows().length,
        users: [],
        trashCount: 0,
      };
    }
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
    stage: selectedStage,
    source: filters.source,
    priority: filters.priority,
    leadCustomerType: filters.leadCustomerType,
    assignedTo: scopedFilters.assignedTo,
    createdFrom: typeof filters.createdFrom === "string" ? filters.createdFrom : undefined,
    createdTo: typeof filters.createdTo === "string" ? filters.createdTo : undefined,
  };
  const hasFilters = Boolean(
    filters.search ||
      (selectedStage && selectedStage !== "all") ||
      (filters.source && filters.source !== "all") ||
      (filters.priority && filters.priority !== "all") ||
      (filters.leadCustomerType && filters.leadCustomerType !== "all") ||
      filters.createdFrom ||
      filters.createdTo ||
      scopedFilters.assignedTo,
  );
  const canExportCurrentView = canExportLeads({ accessLevel, email: session.user?.email, role });
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
  const [previewConfig, leadRows, leadCaptureCustomFields] = await (async () => {
    if (usingDevelopmentDemoData) {
      return [
        DEFAULT_LEAD_PREVIEW_CONFIG,
        buildDevelopmentLeadRows(),
        [] as Awaited<ReturnType<typeof listCustomFields>>,
      ] as const;
    }

    try {
        const [customFields, workspaceSettings] = await Promise.all([
          listCustomFields(),
          getCompanySettings(),
        ]);
        const formVisibleCustomFields = customFields.filter((field) => field.showInForm && !field.archived);
        const resolvedPreviewConfig = resolveLeadPreviewConfig(workspaceSettings.leadPreview, customFields);
        const tableVisibleCustomFields = getTableVisibleCustomFields(customFields, {
          limit: resolvedPreviewConfig.maxCustomFieldColumns,
        });
        const readContext = await loadAdminLeadReadContext(leads, { includeCustomFields: true });
        return [
          resolvedPreviewConfig,
          leads.map((lead) =>
            buildAdminLeadListItem(lead, {
              stage: lead.stageId ? readContext.stagesById.get(lead.stageId) ?? null : null,
              source: lead.sourceId ? readContext.sourcesById.get(lead.sourceId) ?? null : null,
              owner: lead.assignedUserId ? readContext.ownersById.get(lead.assignedUserId) ?? null : null,
              customFieldDefinitions: tableVisibleCustomFields,
              customFieldValues: readContext.customFieldValuesByLeadId.get(lead.id) ?? [],
            }),
          ),
          formVisibleCustomFields,
        ] as const;
    } catch (error) {
      if (process.env.NODE_ENV === "production") {
        throw error;
      }

      console.warn("[admin-leads] Falling back to basic lead rows for local preview.", error);
      return [
        DEFAULT_LEAD_PREVIEW_CONFIG,
        leads.map((lead) =>
          buildAdminLeadListItem(lead, {
            customFieldDefinitions: [],
            customFieldValues: [],
          }),
        ),
        [] as Awaited<ReturnType<typeof listCustomFields>>,
      ] as const;
    }
  })();

  return (
    <AdminShell
      activeNav="leads"
      accessLevel={accessLevel}
      role={role}
      actualAccessLevel={actualAccessLevel}
      canSwitchAccessViews={canSwitchAccessViews}
      title={accessLevel === "sales_rep" ? "My Leads" : "Leads"}
      description="Search, segment, assign, import, and export leads."
      actions={
        <>
          <Link
            href="#lead-action-center"
            className="admin-button-primary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold"
          >
            Add lead
          </Link>
          <Link
            href="#lead-action-center"
            className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium"
          >
            Import leads
          </Link>
          {canExportCurrentView ? <AdminLeadExportButton /> : null}
          <AdminSignOutButton />
        </>
      }
    >
      <div className="space-y-6">
        <section className="ld-glass-panel rounded-[32px] p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                Lead queue
              </p>
              <h2 className="mt-2 font-[family:var(--font-heading)] text-[2.4rem] leading-[1.1] tracking-[-0.05em] text-white sm:text-[2.9rem]">
                Leads
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/70">Filter the queue, assign owners quickly, and export the right segment.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {showTrashFolder ? (
                <Link
                  href={appRoutes.leadsTrash}
                  className="ld-floating-control inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-medium"
                >
                  Trash ({safeNumber(trashCount)})
                </Link>
              ) : null}
              <Link
                href={appRoutes.dashboard}
                className="ld-floating-control inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-medium"
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
              surface="contrast"
            />
            <QueueStatChip
              label="Showing"
              value={totalLeads === 0 ? "0" : `${safeNumber(rangeStart)} - ${safeNumber(rangeEnd)}`}
              hint={`${safeNumber(PAGE_SIZE)} rows per page.`}
              icon={Search}
              surface="contrast"
            />
            <QueueStatChip
              label="Owners visible"
              value={safeNumber(
                new Set(leadRows.map((lead) => lead.assignedTo).filter(Boolean)).size,
              )}
              hint="Distinct owners on this page."
              icon={UserRoundPlus}
              surface="contrast"
            />
          </div>
        </section>

        <FilterBar>
          <form action={appRoutes.leads} className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(170px,0.55fr)_minmax(170px,0.55fr)_minmax(170px,0.55fr)_minmax(180px,0.6fr)_minmax(210px,0.75fr)] [&>*]:min-w-0">
              <SearchInput
                defaultValue={filters.search}
                placeholder="Search name, region, email, phone, source, or owner"
              />
              <AdminSelect name="stage" defaultValue={selectedStage ?? "all"} className="h-12">
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
              <AdminSelect name="leadCustomerType" defaultValue={filters.leadCustomerType ?? "all"} className="h-12">
                <option value="all">All lead types</option>
                <option value="direct">Direct customers</option>
                <option value="business">Business leads</option>
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

            <div className="grid gap-3 sm:grid-cols-2 lg:max-w-xl">
              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Created from</span>
                <input
                  type="date"
                  name="createdFrom"
                  defaultValue={typeof filters.createdFrom === "string" ? filters.createdFrom : ""}
                  className="admin-input h-12 w-full rounded-[20px] px-4 text-sm outline-none"
                />
              </label>
              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Created to</span>
                <input
                  type="date"
                  name="createdTo"
                  defaultValue={typeof filters.createdTo === "string" ? filters.createdTo : ""}
                  className="admin-input h-12 w-full rounded-[20px] px-4 text-sm outline-none"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="admin-button-primary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold"
              >
                Apply filters
              </button>
              <Link
                href={appRoutes.leads}
                className="admin-button-secondary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-medium"
              >
                Reset
              </Link>
              <div className="rounded-full border border-white/10 bg-white/[0.07] px-3 py-2 text-xs font-medium text-white/70">
                {hasFilters ? "Filtered view" : "All leads"}
              </div>
            </div>
          </form>
        </FilterBar>

        <div id="lead-action-center">
          <AdminWorkspaceComposer
            accessLevel={accessLevel}
            leadOptions={leadRows.map((lead) => ({
              value: lead.id,
              label: `${lead.displayName} • ${lead.email || lead.phone || "No contact yet"}`,
            }))}
            assignmentLeadOptions={leadRows
              .filter((lead) => !lead.assignedTo || lead.stage === "new")
              .map((lead) => ({
                value: lead.id,
                label: `${lead.displayName} • ${lead.email || lead.phone || "No contact yet"}`,
                assignedTo: lead.assignedTo,
                stage: lead.stage ?? "new",
                priority: lead.priority,
              }))}
            assigneeOptions={assigneeOptions}
            defaultAssignedTo={accessLevel === "sales_rep" ? session.user?.email ?? "" : ""}
            variant="compact"
            leadCaptureCustomFields={leadCaptureCustomFields}
            allowedModes={accessLevel === "sales_rep" ? ["lead"] : ["lead", "assignment", "import"]}
          />
        </div>

        <section className="space-y-4">
          <LeadDataTable
            leads={leadRows}
            emptyTitle="No leads match this view"
            emptyDescription="Try a broader filter or reset the queue."
            assigneeOptions={assigneeOptions}
            previewConfig={previewConfig}
            renderActions={(lead) => (
              <>
                <Link
                  href={appRoutes.lead(lead.id)}
                  className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium"
                >
                  Open
                </Link>
                {canTrashLead ? (
                  <LeadLifecycleButton
                    leadId={lead.id}
                    action="trash"
                    className="inline-flex h-10 items-center justify-center rounded-full border border-rose-300/30 bg-rose-400/10 px-4 text-sm font-medium text-rose-100 transition hover:bg-rose-400/15"
                  />
                ) : null}
              </>
            )}
          />

          <div className="ld-glass-card ld-glass-soft flex flex-col gap-3 rounded-[26px] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-sm leading-6 text-white/70">
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
