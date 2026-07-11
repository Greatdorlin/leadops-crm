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
import { appRoutes } from "@/lib/app-routes";

export const dynamic = "force-dynamic";

export default async function AdminFacebookIntegrationPage() {
  const { role, accessLevel, actualAccessLevel, canSwitchAccessViews, permissions } =
    await getAdminAccessContext(appRoutes.integration("facebook"));
  if (!canManageIntegrations(accessLevel, role, permissions)) {
    redirect(appRoutes.dashboard);
  }
  let pageData:
    | {
        facebookLeadCount: number;
        recentFacebookLeads: Awaited<ReturnType<typeof leadStore.list>>;
        failedPayloads: Awaited<ReturnType<typeof leadStore.listFailedPayloads>>;
        duplicateUpdates: number;
      }
    | null = null;
  let pageError: unknown = null;

  try {
    const [facebookLeadCount, recentFacebookLeads, failedPayloads, duplicateUpdates] = await Promise.all([
      leadStore.countLeads({ source: "facebook_lead_ads" }),
      leadStore.list({ source: "facebook_lead_ads", limit: 1 }),
      leadStore.listFailedPayloads("facebook_lead_ads"),
      leadStore.countLeadEvents({
        eventType: "lead_updated_from_source",
        source: "facebook_lead_ads",
      }),
    ]);

    pageData = {
      facebookLeadCount,
      recentFacebookLeads,
      failedPayloads,
      duplicateUpdates,
    };
  } catch (error) {
    pageError = error;
    logCrmPageError("integrations:facebook", error);
  }

  const baseUrl =
    normalizeEnvValue(process.env.CRM_PUBLIC_BASE_URL) ||
    normalizeEnvValue(process.env.NEXT_PUBLIC_APP_URL);

  return (
    <AdminShell
      activeNav="integrations"
      accessLevel={accessLevel}
      role={role}
      actualAccessLevel={actualAccessLevel}
      canSwitchAccessViews={canSwitchAccessViews}
      title="Facebook Lead Ads"
      description="Lead intake monitoring, duplicate handling, and retry tools for Meta lead forms."
      actions={<AdminSignOutButton />}
    >
      <div className="space-y-6">
        {pageData ? (
          <>
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Lead intake URL"
                value={baseUrl ? "Configured" : "Missing base URL"}
                supporting={baseUrl ? `${baseUrl}/api/integrations/facebook/webhook` : "Add CRM_PUBLIC_BASE_URL or NEXT_PUBLIC_APP_URL"}
                tone={baseUrl ? "positive" : "danger"}
              />
              <MetricCard
                label="Imported leads"
                value={pageData.facebookLeadCount}
                supporting="Leads currently attributed to Facebook Lead Ads."
              />
              <MetricCard
                label="Duplicate merges"
                value={pageData.duplicateUpdates}
                supporting="Lead imports merged into an existing lead profile."
              />
              <MetricCard
                label="Failed lead imports"
                value={pageData.failedPayloads.length}
                supporting="Saved imports that need a retry or mapping review."
                tone={pageData.failedPayloads.length > 0 ? "danger" : "positive"}
              />
            </section>

            <section className="admin-surface rounded-[24px] p-5">
              <SectionHeader
                eyebrow="Actions"
                title="Retry and verify"
                description="Retry failed lead imports without losing the original submission details."
                actions={
                  <AdminActionButton
                    endpoint="/api/integrations/facebook/retry"
                    label="Retry failed lead imports"
                  />
                }
              />
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <MetricCard
                  label="Last failed intake"
                  value={pageData.failedPayloads[0] ? formatCrmDateTime(pageData.failedPayloads[0].createdAt) : "No failed import"}
                  supporting="Most recent failed lead import timestamp."
                />
                <MetricCard
                  label="Last successful import"
                  value={pageData.recentFacebookLeads[0] ? formatCrmDateTime(pageData.recentFacebookLeads[0].createdAt) : "Not yet"}
                  supporting="Latest lead attributed to Facebook Lead Ads."
                />
              </div>
            </section>

            <section className="admin-surface rounded-[24px] p-5">
              <SectionHeader
                eyebrow="Failed imports"
                title="Imports needing review"
                description="Original submission details stay available for retries and troubleshooting."
              />
              <div className="mt-4 grid gap-3">
                {pageData.failedPayloads.length > 0 ? (
                  pageData.failedPayloads.map((payload) => (
                    <div key={payload.id} className="admin-surface-muted rounded-2xl p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            Lead import {payload.externalId || payload.id}
                          </p>
                          <p className="mt-2 text-sm text-white/60">{payload.errorMessage || "Unknown error"}</p>
                        </div>
                        <AdminActionButton
                          endpoint="/api/integrations/facebook/retry"
                          body={{ payloadId: payload.id }}
                          label="Retry this import"
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="No failed Facebook imports"
                    description="Lead Ads imports will only appear here when processing still needs attention."
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
            title="Meta setup"
            description="Use this list when configuring Facebook Lead Ads for the first time."
          />
          <div className="mt-4 space-y-3 text-sm text-white/70">
            {[
              "Set META_APP_ID, META_APP_SECRET, META_VERIFY_TOKEN, META_PAGE_ACCESS_TOKEN, and META_GRAPH_API_VERSION.",
              "Point the Meta webhook subscription to /api/integrations/facebook/webhook.",
              "Subscribe to the leadgen field on the connected page.",
              "Confirm failed lead imports clear after credentials are valid.",
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
