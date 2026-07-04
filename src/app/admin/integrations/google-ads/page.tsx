import { AdminActionButton } from "@/components/admin/AdminActionButton";
import { AdminShell } from "@/components/admin/AdminShell";
import { ErrorState } from "@/components/admin/ErrorState";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { EmptyState } from "@/components/admin/EmptyState";
import { MetricCard } from "@/components/admin/MetricCard";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { getAdminAccessContext } from "@/lib/admin";
import { canManageIntegrations } from "@/lib/crm/authz";
import { formatCrmDateTime, formatSyncJobStatusLabel } from "@/lib/crm/formatters";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";
import { normalizeEnvValue } from "@/lib/env-utils";
import { redirect } from "next/navigation";
import { leadStore } from "@/lib/storage";
import { appRoutes } from "@/lib/app-routes";

export const dynamic = "force-dynamic";

export default async function AdminGoogleAdsIntegrationPage() {
  const { role, accessLevel, actualAccessLevel, canSwitchAccessViews } =
    await getAdminAccessContext(appRoutes.integration("google-ads"));
  if (!canManageIntegrations(accessLevel, role)) {
    redirect(appRoutes.dashboard);
  }

  let pageData:
    | {
        campaigns: Awaited<ReturnType<typeof leadStore.getCampaignReport>>;
        jobs: Awaited<ReturnType<typeof leadStore.listSyncJobs>>;
        googleAdsLeads: Awaited<ReturnType<typeof leadStore.list>>;
        failedPayloads: Awaited<ReturnType<typeof leadStore.listFailedPayloads>>;
      }
    | null = null;
  let pageError: unknown = null;

  try {
    const [campaigns, jobs, googleAdsLeads, failedPayloads] = await Promise.all([
      leadStore.getCampaignReport(),
      leadStore.listSyncJobs({ provider: "google_ads", limit: 20 }),
      leadStore.list({ source: "google_ads" }),
      leadStore.listFailedPayloads("google_ads"),
    ]);

    pageData = { campaigns, jobs, googleAdsLeads, failedPayloads };
  } catch (error) {
    pageError = error;
    logCrmPageError("integrations:google-ads", error);
  }

  const totals = (pageData?.campaigns ?? []).reduce(
    (accumulator, campaign) => {
      accumulator.spend += Number(campaign.spend);
      accumulator.clicks += campaign.clicks;
      accumulator.impressions += campaign.impressions;
      accumulator.leads += campaign.leads;
      return accumulator;
    },
    {
      spend: 0,
      clicks: 0,
      impressions: 0,
      leads: 0,
    },
  );
  const lastSync = pageData?.jobs[0];
  const customerId = normalizeEnvValue(process.env.GOOGLE_ADS_CUSTOMER_ID);
  const webhookKeyConfigured = Boolean(normalizeEnvValue(process.env.GOOGLE_ADS_WEBHOOK_KEY));
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
      title="Google Ads"
      description="Campaign reporting plus lead form webhook intake for Google Ads leads."
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
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <MetricCard
                label="Customer ID"
                value={customerId || "Missing"}
                supporting="Customer ID used for campaign reporting queries."
                tone={customerId ? "positive" : "danger"}
              />
              <MetricCard
                label="Lead intake URL"
                value={baseUrl ? "Configured" : "Missing base URL"}
                supporting={
                  baseUrl
                    ? `${baseUrl}/api/integrations/google-ads/webhook`
                    : "Add CRM_PUBLIC_BASE_URL or NEXT_PUBLIC_APP_URL"
                }
                tone={baseUrl && webhookKeyConfigured ? "positive" : "danger"}
              />
              <MetricCard
                label="Imported leads"
                value={pageData?.googleAdsLeads.length ?? 0}
                supporting="Leads currently attributed to Google Ads."
              />
              <MetricCard
                label="Failed lead imports"
                value={pageData?.failedPayloads.length ?? 0}
                supporting="Saved webhook payloads waiting for retry or mapping review."
                tone={(pageData?.failedPayloads.length ?? 0) > 0 ? "danger" : "positive"}
              />
              <MetricCard
                label="Last refresh"
                value={lastSync ? formatCrmDateTime(lastSync.finishedAt) : "Not yet"}
                supporting={
                  lastSync
                    ? formatSyncJobStatusLabel(lastSync.status)
                    : "No performance refresh has run yet."
                }
                tone="accent"
              />
            </section>

            <section className="admin-surface rounded-[24px] p-5">
              <SectionHeader
                eyebrow="Actions"
                title="Lead intake and reporting"
                description="Refresh campaign performance and retry failed lead webhook payloads from one place."
              />
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <AdminActionButton
                  endpoint="/api/integrations/google-ads/sync-performance"
                  label="Refresh performance"
                  variant="primary"
                />
                <AdminActionButton
                  endpoint="/api/integrations/google-ads/retry"
                  label="Retry failed lead imports"
                />
              </div>
            </section>

            <section className="admin-surface rounded-[24px] p-5">
              <SectionHeader
                eyebrow="Campaign performance"
                title="Stored campaign rows"
                description="Spend, impressions, clicks, and matched lead volume from Google Ads."
              />
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <MetricCard label="Spend" value={totals.spend.toFixed(2)} supporting="Total stored campaign spend." />
                <MetricCard label="Clicks" value={totals.clicks} supporting={`${totals.impressions} impressions`} />
                <MetricCard
                  label="Leads"
                  value={totals.leads}
                  supporting={
                    totals.leads > 0
                      ? `${(totals.spend / totals.leads).toFixed(2)} CPL`
                      : "No matched leads yet."
                  }
                  tone="accent"
                />
                <MetricCard
                  label="Latest lead"
                  value={
                    pageData?.googleAdsLeads[0]
                      ? formatCrmDateTime(pageData.googleAdsLeads[0].createdAt)
                      : "Not yet"
                  }
                  supporting="Most recent Google Ads lead captured in the CRM."
                />
              </div>

              <div className="mt-5 space-y-3">
                {pageData && pageData.campaigns.length > 0 ? (
                  pageData.campaigns.map((campaign) => (
                    <div
                      key={`${campaign.provider}-${campaign.campaignId}`}
                      className="admin-surface-muted rounded-2xl p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-white">
                            {campaign.campaignName || "Unnamed campaign"}
                          </p>
                          <p className="mt-1.5 text-sm text-white/60">{campaign.campaignId}</p>
                        </div>
                        <p className="text-sm font-semibold text-white/80">{campaign.costPerLead} CPL</p>
                      </div>
                      <div className="mt-4 grid gap-3 text-sm text-white/70 md:grid-cols-4">
                        <p>
                          Spend: <span className="text-white/90">{campaign.spend}</span>
                        </p>
                        <p>
                          Clicks: <span className="text-white/90">{campaign.clicks}</span>
                        </p>
                        <p>
                          Impressions: <span className="text-white/90">{campaign.impressions}</span>
                        </p>
                        <p>
                          Leads: <span className="text-white/90">{campaign.leads}</span>
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="No campaign data yet"
                    description="Refresh Google Ads performance after setup is complete to populate this view."
                  />
                )}
              </div>
            </section>

            <section className="admin-surface rounded-[24px] p-5">
              <SectionHeader
                eyebrow="Failed imports"
                title="Lead payloads needing review"
                description="Original Google Ads webhook payloads stay available for retries."
              />
              <div className="mt-4 grid gap-3">
                {pageData && pageData.failedPayloads.length > 0 ? (
                  pageData.failedPayloads.map((payload) => (
                    <div key={payload.id} className="admin-surface-muted rounded-2xl p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            Lead import {payload.externalId || payload.id}
                          </p>
                          <p className="mt-2 text-sm text-white/60">
                            {payload.errorMessage || "Unknown error"}
                          </p>
                        </div>
                        <AdminActionButton
                          endpoint="/api/integrations/google-ads/retry"
                          body={{ payloadId: payload.id }}
                          label="Retry this import"
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="No failed Google Ads imports"
                    description="Webhook lead failures will appear here only when intake needs attention."
                  />
                )}
              </div>
            </section>
          </>
        )}

        <section className="admin-surface rounded-[24px] p-5">
          <SectionHeader
            eyebrow="Setup checklist"
            title="Google Ads setup"
            description="Use this checklist for campaign reporting and lead form delivery."
          />
          <div className="mt-4 space-y-3 text-sm text-white/70">
            {[
              "Set GOOGLE_ADS_WEBHOOK_KEY for new lead delivery into the CRM.",
              "Set GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN, and GOOGLE_ADS_CUSTOMER_ID for campaign reporting.",
              "Point the lead form delivery webhook to /api/integrations/google-ads/webhook.",
              "Use Refresh performance for campaign metrics only, and use Retry failed lead imports only for lead webhook retries.",
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
