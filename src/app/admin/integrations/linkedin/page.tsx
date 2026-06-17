import { AdminActionButton } from "@/components/admin/AdminActionButton";
import { AdminShell } from "@/components/admin/AdminShell";
import { ErrorState } from "@/components/admin/ErrorState";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { EmptyState } from "@/components/admin/EmptyState";
import { MetricCard } from "@/components/admin/MetricCard";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { getAdminAccessContext } from "@/lib/admin";
import { canManageIntegrations } from "@/lib/crm/authz";
import { formatCrmDateTime } from "@/lib/crm/formatters";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";
import { normalizeEnvValue } from "@/lib/env-utils";
import { redirect } from "next/navigation";
import { leadStore } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function AdminLinkedInIntegrationPage() {
  const { role, accessLevel, actualAccessLevel, canSwitchAccessViews } =
    await getAdminAccessContext("/admin/integrations/linkedin");
  if (!canManageIntegrations(accessLevel, role)) {
    redirect("/admin");
  }

  let pageData:
    | {
        linkedInLeads: Awaited<ReturnType<typeof leadStore.list>>;
        failedPayloads: Awaited<ReturnType<typeof leadStore.listFailedPayloads>>;
      }
    | null = null;
  let pageError: unknown = null;

  try {
    const [linkedInLeads, failedPayloads] = await Promise.all([
      leadStore.list({ source: "linkedin_lead_gen_forms" }),
      leadStore.listFailedPayloads("linkedin_lead_gen_forms"),
    ]);

    pageData = { linkedInLeads, failedPayloads };
  } catch (error) {
    pageError = error;
    logCrmPageError("integrations:linkedin", error);
  }

  const baseUrl =
    normalizeEnvValue(process.env.CRM_PUBLIC_BASE_URL) ||
    normalizeEnvValue(process.env.NEXT_PUBLIC_APP_URL);
  const linkedInConfigured =
    Boolean(normalizeEnvValue(process.env.LINKEDIN_CLIENT_SECRET)) &&
    Boolean(normalizeEnvValue(process.env.LINKEDIN_ACCESS_TOKEN));

  return (
    <AdminShell
      activeNav="integrations"
      accessLevel={accessLevel}
      role={role}
      actualAccessLevel={actualAccessLevel}
      canSwitchAccessViews={canSwitchAccessViews}
      title="LinkedIn Lead Gen Forms"
      description="Lead Sync webhook monitoring, response fetching, and retry tools for LinkedIn forms."
      actions={<AdminSignOutButton />}
    >
      <div className="space-y-6">
        {pageData ? (
          <>
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Lead intake URL"
                value={baseUrl ? "Configured" : "Missing base URL"}
                supporting={
                  baseUrl
                    ? `${baseUrl}/api/integrations/linkedin/webhook`
                    : "Add CRM_PUBLIC_BASE_URL or NEXT_PUBLIC_APP_URL"
                }
                tone={baseUrl && linkedInConfigured ? "positive" : "danger"}
              />
              <MetricCard
                label="Imported leads"
                value={pageData.linkedInLeads.length}
                supporting="Leads currently attributed to LinkedIn Lead Gen Forms."
              />
              <MetricCard
                label="Failed lead imports"
                value={pageData.failedPayloads.length}
                supporting="Saved notifications that need a retry or response fetch review."
                tone={pageData.failedPayloads.length > 0 ? "danger" : "positive"}
              />
              <MetricCard
                label="Last successful import"
                value={pageData.linkedInLeads[0] ? formatCrmDateTime(pageData.linkedInLeads[0].createdAt) : "Not yet"}
                supporting="Latest lead attributed to LinkedIn Lead Gen Forms."
              />
            </section>

            <section className="admin-surface rounded-[24px] p-5">
              <SectionHeader
                eyebrow="Actions"
                title="Retry and verify"
                description="Retry failed LinkedIn notifications after access token or form-response issues are fixed."
                actions={
                  <AdminActionButton
                    endpoint="/api/integrations/linkedin/retry"
                    label="Retry failed lead imports"
                  />
                }
              />
            </section>

            <section className="admin-surface rounded-[24px] p-5">
              <SectionHeader
                eyebrow="Failed imports"
                title="Notifications needing review"
                description="Original LinkedIn webhook payloads stay available for retries and troubleshooting."
              />
              <div className="mt-4 grid gap-3">
                {pageData.failedPayloads.length > 0 ? (
                  pageData.failedPayloads.map((payload) => (
                    <div key={payload.id} className="admin-surface-muted rounded-2xl p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">
                            Lead notification {payload.externalId || payload.id}
                          </p>
                          <p className="mt-2 text-sm text-slate-500">{payload.errorMessage || "Unknown error"}</p>
                        </div>
                        <AdminActionButton
                          endpoint="/api/integrations/linkedin/retry"
                          body={{ payloadId: payload.id }}
                          label="Retry this import"
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="No failed LinkedIn imports"
                    description="Lead Sync issues will only appear here when a notification or form-response fetch fails."
                  />
                )}
              </div>
            </section>
          </>
        ) : (
          <ErrorState
            title={getCrmPageErrorCopy(pageError).title}
            description={getCrmPageErrorCopy(pageError).description}
            details={getCrmPageErrorCopy(pageError).details}
          />
        )}

        <section className="admin-surface rounded-[24px] p-5">
          <SectionHeader
            eyebrow="Setup checklist"
            title="LinkedIn setup"
            description="Use this list when configuring LinkedIn Lead Sync for CRM lead capture."
          />
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            {[
              "Set LINKEDIN_CLIENT_SECRET, LINKEDIN_ACCESS_TOKEN, and optionally LINKEDIN_API_VERSION so the CRM can validate the webhook and fetch the full lead form response.",
              "Point LinkedIn Lead Sync to /api/integrations/linkedin/webhook and complete the webhook challenge validation.",
              "Confirm the app has LinkedIn Lead Sync API access. Standard ads access alone is not enough for lead syncing.",
              "Use Retry failed lead imports after fixing token, permission, or webhook issues.",
            ].map((item) => (
              <div key={item} className="admin-surface-muted rounded-2xl p-4">
                {item}
              </div>
            ))}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
