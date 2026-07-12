import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { ErrorState } from "@/components/admin/ErrorState";
import { LeadDataTable } from "@/components/admin/LeadDataTable";
import { LeadLifecycleButton } from "@/components/admin/LeadLifecycleButton";
import { getAdminAccessContext } from "@/lib/admin";
import { canAccessLeadTrash } from "@/lib/admin-permissions";
import { appRoutes } from "@/lib/app-routes";
import { loadAdminLeadReadContext } from "@/lib/crm/admin-read-context";
import { listCustomFields } from "@/lib/crm/custom-fields-admin";
import { getTableVisibleCustomFields } from "@/lib/crm/custom-field-values";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";
import { buildAdminLeadListItem } from "@/lib/crm/view-models";
import { decodeLeadCursor, encodeLeadCursor } from "@/lib/crm/lead-pagination";
import { resolveLeadPreviewConfig } from "@/lib/crm/workspace-settings";
import { getCompanySettings } from "@/lib/crm/workspace-settings-server";
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

function buildTrashHref({
  cursor,
  direction,
  page,
}: {
  cursor?: string;
  direction?: "next" | "prev";
  page: number;
}) {
  const query = new URLSearchParams();
  if (page > 1) {
    query.set("page", String(page));
  }
  if (cursor) {
    query.set("cursor", cursor);
    query.set("direction", direction ?? "next");
  }

  const serialized = query.toString();
  return serialized ? `${appRoutes.leadsTrash}?${serialized}` : appRoutes.leadsTrash;
}

export default async function AdminLeadTrashPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { role, accessLevel, actualAccessLevel, canSwitchAccessViews, permissions } =
    await getAdminAccessContext(appRoutes.leadsTrash);

  if (!canAccessLeadTrash(accessLevel, permissions)) {
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
          description="Only owners and admins can open deleted leads."
        />
      </AdminShell>
    );
  }

  const params = await searchParams;
  const cursorState = readCursor(params);
  const requestedPage = cursorState ? readPage(params) : 1;
  let pageData:
    | {
        leads: Awaited<ReturnType<typeof leadStore.list>>;
        totalLeads: number;
      }
    | null = null;
  let pageError: unknown = null;

  try {
    const totalLeads = await leadStore.countLeads({ recordState: "trashed" });
    const leads = await leadStore.list({
      recordState: "trashed",
      limit: PAGE_SIZE,
      cursor: cursorState?.cursor,
      cursorDirection: cursorState?.direction,
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
  const previousCursor = leads[0]
    ? encodeLeadCursor({ id: leads[0].id, updatedAt: leads[0].updatedAt })
    : undefined;
  const nextCursor = leads.at(-1)
    ? encodeLeadCursor({ id: leads.at(-1)!.id, updatedAt: leads.at(-1)!.updatedAt })
    : undefined;
  const [customFields, workspaceSettings] = await Promise.all([
    listCustomFields(),
    getCompanySettings(),
  ]);
  const previewConfig = resolveLeadPreviewConfig(workspaceSettings.leadPreview, customFields);
  const tableVisibleCustomFields = getTableVisibleCustomFields(customFields, {
    limit: previewConfig.maxCustomFieldColumns,
  });
  const readContext = await loadAdminLeadReadContext(leads, { includeCustomFields: true });
  const leadRows = leads.map((lead) =>
    buildAdminLeadListItem(lead, {
      stage: lead.stageId ? readContext.stagesById.get(lead.stageId) ?? null : null,
      source: lead.sourceId ? readContext.sourcesById.get(lead.sourceId) ?? null : null,
      owner: lead.assignedUserId ? readContext.ownersById.get(lead.assignedUserId) ?? null : null,
      customFieldDefinitions: tableVisibleCustomFields,
      customFieldValues: readContext.customFieldValuesByLeadId.get(lead.id) ?? [],
    }),
  );

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
            href={appRoutes.leads}
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
          leads={leadRows}
          emptyTitle="Trash is empty"
          emptyDescription="Deleted leads will appear here until they are restored or removed permanently."
          interactiveWorkflow={false}
          previewConfig={previewConfig}
          currency={workspaceSettings.globalCurrency}
          renderActions={(lead) => (
            <>
              <Link
                href={appRoutes.lead(lead.id)}
                className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium"
              >
                Open
              </Link>
              <LeadLifecycleButton
                leadId={lead.id}
                action="restore"
                className="inline-flex h-10 items-center justify-center rounded-full border border-emerald-300/24 bg-emerald-300/12 px-4 text-sm font-medium text-emerald-100 transition hover:border-emerald-100/40 hover:bg-emerald-300/18"
              />
              <LeadLifecycleButton
                leadId={lead.id}
                action="delete"
                onSuccessHref={appRoutes.leadsTrash}
                className="inline-flex h-10 items-center justify-center rounded-full border border-rose-300/24 bg-rose-300/12 px-4 text-sm font-medium text-rose-100 transition hover:border-rose-100/40 hover:bg-rose-300/18"
              />
            </>
          )}
        />

        <div className="ld-glass-card ld-glass-soft flex flex-col gap-3 rounded-[26px] border border-white/10 bg-white/[0.045] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-sm leading-6 text-white/70">
            Trash holds {safeNumber(totalLeads)} deleted {totalLeads === 1 ? "lead" : "leads"}.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildTrashHref({
                cursor: previousCursor,
                direction: "prev",
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
              href={buildTrashHref({
                cursor: nextCursor,
                direction: "next",
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
      </div>
    </AdminShell>
  );
}
