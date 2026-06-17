import { AdminActionButton } from "@/components/admin/AdminActionButton";
import { AdminShell } from "@/components/admin/AdminShell";
import { ErrorState } from "@/components/admin/ErrorState";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { EmptyState } from "@/components/admin/EmptyState";
import { MetricCard } from "@/components/admin/MetricCard";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { getAdminAccessContext } from "@/lib/admin";
import { canManageIntegrations } from "@/lib/crm/authz";
import {
  formatCrmDateTime,
  formatSyncJobStatusLabel,
  formatSyncJobTypeLabel,
} from "@/lib/crm/formatters";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";
import { hasConfiguredEnvValue, normalizeEnvValue } from "@/lib/env-utils";
import { redirect } from "next/navigation";
import { leadStore } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function AdminGoogleSheetsIntegrationPage() {
  const { role, accessLevel, actualAccessLevel, canSwitchAccessViews } =
    await getAdminAccessContext("/admin/integrations/google-sheets");
  if (!canManageIntegrations(accessLevel, role)) {
    redirect("/admin");
  }
  let jobs: Awaited<ReturnType<typeof leadStore.listSyncJobs>> = [];
  let pageError: unknown = null;

  try {
    jobs = await leadStore.listSyncJobs({ provider: "google_sheets", limit: 20 });
  } catch (error) {
    pageError = error;
    logCrmPageError("integrations:google-sheets", error);
  }

  const lastImport = jobs.find((job) => job.jobType === "import");
  const lastExport = jobs.find((job) => job.jobType === "export");
  const spreadsheetId = normalizeEnvValue(process.env.GOOGLE_SHEETS_SPREADSHEET_ID);
  const worksheetName = normalizeEnvValue(process.env.GOOGLE_SHEETS_WORKSHEET_NAME);

  return (
    <AdminShell
      activeNav="integrations"
      accessLevel={accessLevel}
      role={role}
      actualAccessLevel={actualAccessLevel}
      canSwitchAccessViews={canSwitchAccessViews}
      title="Google Sheets"
      description="Import worksheet rows and export the current lead list without changing the lead journey."
      actions={<AdminSignOutButton />}
    >
      <div className="space-y-6">
        {pageError ? (
          <ErrorState
            title={getCrmPageErrorCopy(pageError).title}
            description={getCrmPageErrorCopy(pageError).description}
            details={getCrmPageErrorCopy(pageError).details}
          />
        ) : (
          <>
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Spreadsheet ID"
                value={hasConfiguredEnvValue(spreadsheetId) ? "Configured" : "Missing"}
                supporting={spreadsheetId || "Add GOOGLE_SHEETS_SPREADSHEET_ID"}
                tone={hasConfiguredEnvValue(spreadsheetId) ? "positive" : "danger"}
              />
              <MetricCard
                label="Worksheet"
                value={worksheetName || "Missing"}
                supporting="Worksheet used for both import and full lead export."
                tone={worksheetName ? "positive" : "danger"}
              />
              <MetricCard
                label="Last export"
                value={lastExport ? formatCrmDateTime(lastExport.finishedAt) : "Not yet"}
                supporting={lastExport ? formatSyncJobStatusLabel(lastExport.status) : "No export activity yet."}
              />
              <MetricCard
                label="Last import"
                value={lastImport ? formatCrmDateTime(lastImport.finishedAt) : "Not yet"}
                supporting={lastImport ? formatSyncJobStatusLabel(lastImport.status) : "No import activity yet."}
              />
            </section>

            <section className="admin-surface rounded-[24px] p-5">
              <SectionHeader
                eyebrow="Manual update"
                title="Import or export"
                description="Use these controls to pull worksheet rows in or send the current lead list back out."
                actions={
                  <div className="flex flex-wrap gap-3">
                    <AdminActionButton endpoint="/api/google-sheets/import" label="Import rows" />
                    <AdminActionButton endpoint="/api/google-sheets/export" label="Export leads" variant="primary" />
                  </div>
                }
              />
            </section>

            <section className="admin-surface rounded-[24px] p-5">
              <SectionHeader
                eyebrow="Recent activity"
                title="Sheets history"
                description="Imports and exports keep a record of outcomes and any row-level issues."
              />
              <div className="mt-4 grid gap-3">
                {jobs.length > 0 ? (
                  jobs.map((job) => (
                    <div key={job.id} className="admin-surface-muted rounded-2xl p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-slate-950">{formatSyncJobTypeLabel(job.jobType)}</p>
                          <p className="mt-1.5 text-sm text-slate-500">
                            {job.errorMessage || "Finished without any recorded issues."}
                          </p>
                        </div>
                        <p className="text-sm text-slate-600">{formatSyncJobStatusLabel(job.status)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="No Google Sheets activity yet"
                    description="Import and export activity will appear here after the first manual or automatic update."
                  />
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </AdminShell>
  );
}
