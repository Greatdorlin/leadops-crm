import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, Rows3, UserRound } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminLeadExportButton } from "@/components/admin/AdminLeadExportButton";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { AdminDateTimeInput } from "@/components/admin/AdminDateTimeInput";
import { ErrorState } from "@/components/admin/ErrorState";
import { FilterBar } from "@/components/admin/FilterBar";
import { LeadDataTable } from "@/components/admin/LeadDataTable";
import { LeadBulkActions } from "@/components/admin/LeadBulkActions";
import { LeadComposerLauncher } from "@/components/admin/LeadComposerLauncher";
import { LeadLifecycleButton } from "@/components/admin/LeadLifecycleButton";
import { ResponsiveFilterFields } from "@/components/admin/ResponsiveFilterFields";
import { SearchInput } from "@/components/admin/SearchInput";
import { AdminWorkspaceComposer } from "@/components/admin/AdminWorkspaceComposer";
import { getAdminAccessContext } from "@/lib/admin";
import { isLocalAdminPreviewEmail } from "@/lib/admin-access";
import { parseLeadListFilters } from "@/lib/admin-leads";
import { loadAdminLeadReadContext } from "@/lib/crm/admin-read-context";
import { listCustomFields } from "@/lib/crm/custom-fields-admin";
import { LEAD_PRIORITIES, LEAD_SOURCES } from "@/lib/crm/constants";
import {
  canAssignLeads,
  canEditLeads,
  canExportLeads,
  canViewLeads,
} from "@/lib/crm/authz";
import { getTableVisibleCustomFields } from "@/lib/crm/custom-field-values";
import { listLeadStages } from "@/lib/crm/lead-stages-admin";
import {
  decodeLeadCursor,
  encodeLeadCursor,
} from "@/lib/crm/lead-pagination";
import {
  DEFAULT_LEAD_PREVIEW_CONFIG,
  resolveLeadPreviewConfig,
} from "@/lib/crm/workspace-settings";
import { getCompanySettings } from "@/lib/crm/workspace-settings-server";
import {
  canAccessLeadTrash,
  canCreateLeadRecords,
  canImportLeadRecords,
  canSoftDeleteLead,
  scopeLeadListFilters,
} from "@/lib/admin-permissions";
import { crmLabelize, formatCrmRoleLabel } from "@/lib/crm/formatters";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";
import { buildAdminLeadListItem } from "@/lib/crm/view-models";
import { appRoutes } from "@/lib/app-routes";
import { isCrmMigrationSource } from "@/lib/migrations/sources";
import { leadStore } from "@/lib/storage";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const DEVELOPMENT_STAGE_DEFINITIONS = [
  { key: "new", name: "New", color: "#60a5fa" },
  { key: "contacted", name: "Contacted", color: "#f59e0b" },
  { key: "qualified", name: "Qualified", color: "#10b981" },
  { key: "consultation_booked", name: "Consultation booked", color: "#8b5cf6" },
  { key: "won", name: "Won", color: "#22c55e", isWon: true },
  { key: "lost", name: "Lost", color: "#f43f5e", isLost: true },
] as const;

function buildDevelopmentStages() {
  const timestamp = new Date().toISOString();
  return DEVELOPMENT_STAGE_DEFINITIONS.map((stage, index) => ({
    id: `demo-stage-${stage.key}`,
    key: stage.key,
    name: stage.name,
    color: stage.color,
    sortOrder: index,
    isWon: "isWon" in stage ? stage.isWon : false,
    isLost: "isLost" in stage ? stage.isLost : false,
    archived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
}

function buildDevelopmentUsers() {
  const timestamp = new Date().toISOString();
  return ["Sarah Kim", "James Lee", "Priya Shah"].map((fullName, index) => ({
    id: `demo-user-${index + 1}`,
    email: `${fullName.toLowerCase().replace(/\s+/g, ".")}@local.leadsdesk.test`,
    fullName,
    role: "sales_agent" as const,
    isActive: true,
    avatarUrl: null,
    accessScope: "own" as const,
    branchId: null,
    departmentId: null,
    teamId: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
}

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
      leadCustomerTypeLabel: row.leadCustomerType === "business" ? "Company lead" : "Individual lead",
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

function readCursor(input: Record<string, string | string[] | undefined>) {
  const rawCursor = Array.isArray(input.cursor) ? input.cursor[0] : input.cursor;
  const rawDirection = Array.isArray(input.direction) ? input.direction[0] : input.direction;
  const value = decodeLeadCursor(rawCursor);

  return value && rawCursor
    ? {
        cursor: rawCursor,
        direction: rawDirection === "prev" ? ("prev" as const) : ("next" as const),
      }
    : null;
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
    cursor?: string;
    direction?: "next" | "prev";
  },
) {
  const query = new URLSearchParams();

  if (params.page > 1) {
    query.set("page", String(params.page));
  }

  if (params.cursor) {
    query.set("cursor", params.cursor);
    query.set("direction", params.direction ?? "next");
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
    permissions,
    crmUser,
  } = await getAdminAccessContext(appRoutes.leads);
  if (!canViewLeads({ accessLevel, permissions, role })) {
    redirect(appRoutes.dashboard);
  }

  const params = await searchParams;
  const requestedComposer = Array.isArray(params.composer) ? params.composer[0] : params.composer;
  const requestedMigrationSource = Array.isArray(params.migrationSource)
    ? params.migrationSource[0]
    : params.migrationSource;
  const filters = parseLeadListFilters(params);
  const selectedStage =
    readStageFilter(params) ??
    (filters.stageId === "all" || filters.status === "all"
      ? "all"
      : filters.stageId ?? filters.status);
  const scopedFilters = scopeLeadListFilters(filters, accessLevel, session.user?.email, crmUser);
  const cursorState = readCursor(params);
  const requestedPage = cursorState ? readPage(params) : 1;
  let pageError: unknown = null;
  let usingDevelopmentDemoData = false;
  let pageData:
    | {
        leads: Awaited<ReturnType<typeof leadStore.list>>;
        totalLeads: number;
        users: Awaited<ReturnType<typeof leadStore.listCrmUsers>>;
        stages: Awaited<ReturnType<typeof listLeadStages>>;
        trashCount: number;
      }
    | null = null;

  if (isLocalAdminPreviewEmail(session.user?.email)) {
    usingDevelopmentDemoData = true;
    pageData = {
      leads: [],
      totalLeads: buildDevelopmentLeadRows().length,
      users: buildDevelopmentUsers(),
      stages: buildDevelopmentStages(),
      trashCount: 0,
    };
  } else try {
    const totalLeads = await leadStore.countLeads(scopedFilters);
    const showTrashFolder = canAccessLeadTrash(accessLevel, permissions);
    const [leads, users, stages] = await Promise.all([
      leadStore.list({
        ...scopedFilters,
        limit: PAGE_SIZE,
        cursor: cursorState?.cursor,
        cursorDirection: cursorState?.direction,
      }),
      accessLevel === "sales_rep" ? Promise.resolve([]) : leadStore.listCrmUsers(),
      listLeadStages(),
    ]);
    const trashCount = showTrashFolder ? await leadStore.countLeads({ recordState: "trashed" }) : 0;

    pageData = {
      leads,
      totalLeads,
      users,
      stages,
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
        users: buildDevelopmentUsers(),
        stages: buildDevelopmentStages(),
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

  const { leads, totalLeads, users, stages, trashCount } = pageData;
  const showTrashFolder = canAccessLeadTrash(accessLevel, permissions);
  const canTrashLead = canSoftDeleteLead(accessLevel, permissions);
  const totalPages = Math.max(1, Math.ceil(totalLeads / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const baseHrefParams = {
    search: filters.search,
    stage: selectedStage,
    source: filters.source,
    priority: filters.priority,
    leadCustomerType: filters.leadCustomerType,
    assignedTo:
      filters.assignment === "unassigned" ? "__unassigned__" : scopedFilters.assignedTo,
    createdFrom: typeof filters.createdFrom === "string" ? filters.createdFrom : undefined,
    createdTo: typeof filters.createdTo === "string" ? filters.createdTo : undefined,
  };
  const previousCursor = leads[0]
    ? encodeLeadCursor({ id: leads[0].id, updatedAt: leads[0].updatedAt })
    : undefined;
  const nextCursor = leads.at(-1)
    ? encodeLeadCursor({ id: leads.at(-1)!.id, updatedAt: leads.at(-1)!.updatedAt })
    : undefined;
  const hasFilters = Boolean(
    filters.search ||
      (selectedStage && selectedStage !== "all") ||
      (filters.source && filters.source !== "all") ||
      (filters.priority && filters.priority !== "all") ||
      (filters.leadCustomerType && filters.leadCustomerType !== "all") ||
      filters.createdFrom ||
      filters.createdTo ||
      scopedFilters.assignedTo ||
      filters.assignment === "unassigned",
  );
  const hasAdvancedFilters = Boolean(
    (selectedStage && selectedStage !== "all") ||
      (filters.source && filters.source !== "all") ||
      (filters.priority && filters.priority !== "all") ||
      filters.createdFrom ||
      filters.createdTo ||
      scopedFilters.assignedTo ||
      filters.assignment === "unassigned",
  );
  const canCreateLead = canCreateLeadRecords(permissions);
  const canExportCurrentView = canExportLeads({
    accessLevel,
    email: session.user?.email,
    permissions,
    role,
  });
  const canImportLeads = canImportLeadRecords(accessLevel, permissions);
  const canReassignOwner = canAssignLeads({ accessLevel, permissions, role });
  const canBulkEdit = canEditLeads({ accessLevel, permissions, role });
  const assigneeOptions = canReassignOwner
    ? users
        .filter((user) => user.isActive)
        .map((user) => ({
          avatarUrl: user.avatarUrl,
          detail: formatCrmRoleLabel(user.role),
          label: user.fullName || user.email,
          value: user.email,
        }))
    : [];
  const [previewConfig, leadRows, leadCaptureCustomFields, workspaceCurrency] = await (async () => {
    if (usingDevelopmentDemoData) {
      return [
        DEFAULT_LEAD_PREVIEW_CONFIG,
        buildDevelopmentLeadRows(),
        [] as Awaited<ReturnType<typeof listCustomFields>>,
        "USD",
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
          workspaceSettings.globalCurrency,
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
        "USD",
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
          {canCreateLead ? (
            <LeadComposerLauncher mode="lead">
              Add lead
            </LeadComposerLauncher>
          ) : null}
          {canImportLeads ? (
            <LeadComposerLauncher mode="import" variant="secondary">
              Import leads
            </LeadComposerLauncher>
          ) : null}
          {canExportCurrentView ? <AdminLeadExportButton /> : null}
          {showTrashFolder ? (
            <Link
              href={appRoutes.leadsTrash}
              className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium"
            >
              Trash ({safeNumber(trashCount)})
            </Link>
          ) : null}
          <AdminSignOutButton />
        </>
      }
    >
      <div className="space-y-6">
        <nav
          aria-label="Lead type"
          className="ld-glass-card ld-glass-soft grid grid-cols-3 gap-1.5 rounded-[24px] p-1.5 sm:gap-2 sm:p-2"
        >
          {[
            { value: "all", label: "All leads", icon: Rows3 },
            { value: "direct", label: "Individuals", icon: UserRound },
            { value: "business", label: "Companies", icon: Building2 },
          ].map((tab) => {
            const isActive = (filters.leadCustomerType ?? "all") === tab.value;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.value}
                href={buildLeadsHref({
                  ...baseHrefParams,
                  page: 1,
                  leadCustomerType: tab.value,
                })}
                prefetch={false}
                aria-current={isActive ? "page" : undefined}
                className={[
                  "ld-focus-ring inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-[18px] border px-2 text-xs font-semibold transition sm:gap-2 sm:px-4 sm:text-sm",
                  isActive
                    ? "border-[color:var(--ld-color-accent)]/35 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--ld-color-primary)_32%,transparent),color-mix(in_srgb,var(--ld-color-accent)_20%,transparent))] text-white shadow-[0_12px_28px_rgba(3,8,28,0.22)]"
                    : "border-transparent text-white/70 hover:border-white/12 hover:bg-white/[0.07] hover:text-white",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <FilterBar>
          <form action={appRoutes.leads} className="grid gap-3">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 lg:grid-cols-3 xl:grid-cols-[minmax(0,1.45fr)_repeat(3,minmax(170px,0.58fr))_minmax(210px,0.75fr)] [&>*]:min-w-0">
              <SearchInput
                defaultValue={filters.search}
                placeholder="Search leads"
              />
              <ResponsiveFilterFields defaultOpen={hasAdvancedFilters}>
                <AdminSelect name="stage" defaultValue={selectedStage ?? "all"} className="h-12">
                  <option value="all">All stages</option>
                  {stages.filter((stage) => !stage.archived).map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
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
                {filters.leadCustomerType && filters.leadCustomerType !== "all" ? (
                  <input type="hidden" name="leadCustomerType" value={filters.leadCustomerType} />
                ) : null}
                {accessLevel === "sales_rep" ? (
                  <input type="hidden" name="assignedTo" value={scopedFilters.assignedTo ?? ""} />
                ) : (
                  <AdminSelect
                    name="assignedTo"
                    defaultValue={filters.assignment === "unassigned" ? "__unassigned__" : scopedFilters.assignedTo ?? ""}
                    className="h-12"
                  >
                    <option value="">All owners</option>
                    <option value="__unassigned__">Unassigned</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.email}>
                        {user.fullName || user.email}{!user.isActive ? " (inactive)" : ""}
                      </option>
                    ))}
                  </AdminSelect>
                )}

                <div className="col-span-full grid gap-3 sm:grid-cols-2 lg:max-w-xl">
                  <label className="space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Created from</span>
                    <AdminDateTimeInput
                      mode="date"
                      name="createdFrom"
                      defaultValue={typeof filters.createdFrom === "string" ? filters.createdFrom : ""}
                      className="h-12 rounded-[20px]"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Created to</span>
                    <AdminDateTimeInput
                      mode="date"
                      name="createdTo"
                      defaultValue={typeof filters.createdTo === "string" ? filters.createdTo : ""}
                      className="h-12 rounded-[20px]"
                    />
                  </label>
                </div>

                <div className="col-span-full flex flex-wrap items-center gap-3">
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
              </ResponsiveFilterFields>
            </div>
          </form>
        </FilterBar>

        <section className="space-y-4">
          {canBulkEdit ? (
            <LeadBulkActions
              assigneeOptions={assigneeOptions.map(({ label, value }) => ({ label, value }))}
              stageOptions={stages.filter((stage) => !stage.archived).map((stage) => ({ label: stage.name, value: stage.id }))}
              allowAssignment={canReassignOwner}
              previewMode={usingDevelopmentDemoData}
            />
          ) : null}
          <LeadDataTable
            leads={leadRows}
            emptyTitle="No leads match this view"
            emptyDescription="Try a broader filter or reset the queue."
            assigneeOptions={assigneeOptions}
            stageOptions={stages.filter((stage) => !stage.archived).map((stage) => ({
              id: stage.id,
              key: stage.key,
              label: stage.name,
              color: stage.color,
            }))}
            previewConfig={previewConfig}
            currency={workspaceCurrency}
            previewMode={usingDevelopmentDemoData}
            bulkSelectionEnabled={canBulkEdit && !usingDevelopmentDemoData}
            renderActions={(lead) => (
              <>
                  <Link
                    href={appRoutes.lead(lead.id)}
                    prefetch={false}
                    className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium"
                >
                  Open
                </Link>
                {canTrashLead ? (
                  <LeadLifecycleButton
                    leadId={lead.id}
                    action="trash"
                    compact
                    className="ld-focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-rose-300/30 bg-rose-400/10 p-0 text-rose-100 transition hover:bg-rose-400/15"
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
                  cursor: previousCursor,
                  direction: "prev",
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
                  cursor: nextCursor,
                  direction: "next",
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

        <div id="lead-action-center" tabIndex={-1} className="scroll-mt-24 outline-none">
          <AdminWorkspaceComposer
            accessLevel={accessLevel}
            leadOptions={leadRows.map((lead) => ({
              value: lead.id,
              label: `${lead.displayName} • ${lead.email || lead.phone || "No contact yet"}`,
            }))}
            assignmentLeadOptions={[]}
            assigneeOptions={assigneeOptions}
            defaultAssignedTo={accessLevel === "sales_rep" ? session.user?.email ?? "" : ""}
            initialMode={requestedComposer === "import" && canImportLeads ? "import" : "lead"}
            initialMigrationSource={
              isCrmMigrationSource(requestedMigrationSource)
                ? requestedMigrationSource
                : undefined
            }
            variant="compact"
            leadCaptureCustomFields={leadCaptureCustomFields}
            leadCaptureStageOptions={stages.filter((stage) => !stage.archived).map((stage) => ({
              value: stage.id,
              key: stage.key,
              label: stage.name,
              stageId: stage.id,
            }))}
            allowedModes={canImportLeads ? ["lead", "import"] : ["lead"]}
          />
        </div>
      </div>
    </AdminShell>
  );
}
