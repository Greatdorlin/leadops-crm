import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { ErrorState } from "@/components/admin/ErrorState";
import { IntakeEventTable } from "@/components/admin/IntakeEventTable";
import { MetricCard } from "@/components/admin/MetricCard";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { getAdminAccessContext } from "@/lib/admin";
import { canViewIntakeLogs, resolveRole } from "@/lib/crm/authz";
import { listFormSources } from "@/lib/crm/form-sources-admin";
import { listLeadIntakeEvents } from "@/lib/crm/intake-runtime";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";

export const dynamic = "force-dynamic";

type IntakeFilterStatus = "all" | "received" | "mapped" | "lead_created" | "failed" | "ignored";

export default async function AdminIntakePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { role, accessLevel, actualAccessLevel, canSwitchAccessViews } =
    await getAdminAccessContext("/admin/intake");

  if (!canViewIntakeLogs({ accessLevel, role })) {
    redirect("/admin");
  }

  const params = await searchParams;
  const status = (typeof params.status === "string" ? params.status : "all") as IntakeFilterStatus;
  const formSourceId = typeof params.formSourceId === "string" ? params.formSourceId : "";
  const dateFrom = typeof params.dateFrom === "string" ? params.dateFrom : "";
  const dateTo = typeof params.dateTo === "string" ? params.dateTo : "";

  let sources = null;
  let events = null;
  let pageError: unknown = null;

  try {
    [sources, events] = await Promise.all([
      listFormSources({ includeInactive: true }),
      listLeadIntakeEvents({
        status,
        formSourceId: formSourceId || undefined,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        limit: 100,
      }),
    ]);
  } catch (error) {
    pageError = error;
    logCrmPageError("intake", error);
  }

  if (!events || !sources) {
    return (
      <AdminShell
        activeNav="integrations"
        accessLevel={accessLevel}
        role={role}
        actualAccessLevel={actualAccessLevel}
        canSwitchAccessViews={canSwitchAccessViews}
        title="Intake Log"
        description="Recent webhook deliveries and failed submissions."
        actions={<AdminSignOutButton />}
      >
        <ErrorState
          title={getCrmPageErrorCopy(pageError).title}
          description={getCrmPageErrorCopy(pageError).description}
          details={getCrmPageErrorCopy(pageError).details}
        />
      </AdminShell>
    );
  }

  const visibleRole = resolveRole({ accessLevel, role, email: null });
  const showRawPayload = visibleRole === "owner" || visibleRole === "admin";
  const failedCount = events.filter((event) => event.status === "failed").length;
  const createdCount = events.filter((event) => event.status === "lead_created").length;

  return (
    <AdminShell
      activeNav="integrations"
      accessLevel={accessLevel}
      role={role}
      actualAccessLevel={actualAccessLevel}
      canSwitchAccessViews={canSwitchAccessViews}
      title="Intake Log"
      description="Review recent intake events, failed submissions, and the payload summary that reached the system."
      actions={
        <>
          <Link
            href="/admin/settings/form-sources"
            className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium"
          >
            Form sources
          </Link>
          <AdminSignOutButton />
        </>
      }
    >
      <div className="space-y-6">
        <section className="grid gap-3 md:grid-cols-3">
          <MetricCard label="Recent events" value={events.length} supporting="Latest intake deliveries loaded on this page." tone="accent" />
          <MetricCard label="Lead created" value={createdCount} supporting="Intake events that created or updated a lead." tone="positive" />
          <MetricCard label="Failed" value={failedCount} supporting="Events that need a mapping or payload fix." tone={failedCount > 0 ? "danger" : "positive"} />
        </section>

        <section className="admin-surface rounded-[24px] p-5">
          <SectionHeader
            eyebrow="Filters"
            title="Intake activity"
            description="Narrow the log by source, status, or date range when a client needs an answer fast."
          />
          <form action="/admin/intake" className="mt-5 grid gap-3 lg:grid-cols-5">
            <select name="status" defaultValue={status} className="admin-input h-11 rounded-2xl px-4 text-sm outline-none">
              <option value="all">All statuses</option>
              <option value="received">Received</option>
              <option value="mapped">Mapped</option>
              <option value="lead_created">Lead created</option>
              <option value="failed">Failed</option>
              <option value="ignored">Ignored</option>
            </select>
            <select name="formSourceId" defaultValue={formSourceId} className="admin-input h-11 rounded-2xl px-4 text-sm outline-none">
              <option value="">All sources</option>
              {sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name}
                </option>
              ))}
            </select>
            <input name="dateFrom" type="date" defaultValue={dateFrom} className="admin-input h-11 rounded-2xl px-4 text-sm outline-none" />
            <input name="dateTo" type="date" defaultValue={dateTo} className="admin-input h-11 rounded-2xl px-4 text-sm outline-none" />
            <div className="flex gap-2">
              <button type="submit" className="admin-button-primary inline-flex h-11 flex-1 items-center justify-center rounded-2xl px-5 text-sm font-semibold">
                Apply
              </button>
              <Link href="/admin/intake" className="admin-button-secondary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-medium">
                Reset
              </Link>
            </div>
          </form>
        </section>

        <section className="admin-surface rounded-[24px] p-5">
          <IntakeEventTable events={events} showRawPayload={showRawPayload} />
        </section>
      </div>
    </AdminShell>
  );
}
