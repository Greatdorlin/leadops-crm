import { AdminActionButton } from "@/components/admin/AdminActionButton";
import { AdminShell } from "@/components/admin/AdminShell";
import { ErrorState } from "@/components/admin/ErrorState";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { EmptyState } from "@/components/admin/EmptyState";
import { MetricCard } from "@/components/admin/MetricCard";
import { IntegrationSetupPanel } from "@/components/admin/IntegrationSetupPanel";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { getAdminAccessContext } from "@/lib/admin";
import { isLocalAdminPreviewEmail } from "@/lib/admin-access";
import { canManageIntegrations } from "@/lib/crm/authz";
import { formatCrmDateTime, formatSyncJobStatusLabel } from "@/lib/crm/formatters";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";
import { normalizeEnvValue } from "@/lib/env-utils";
import { redirect } from "next/navigation";
import { leadStore } from "@/lib/storage";
import { appRoutes } from "@/lib/app-routes";

export const dynamic = "force-dynamic";

export default async function AdminGoogleAdsIntegrationPage() {
  const { session, role, accessLevel, actualAccessLevel, canSwitchAccessViews, permissions } =
    await getAdminAccessContext(appRoutes.integration("google-ads"));
  if (!canManageIntegrations(accessLevel, role, permissions)) {
    redirect(appRoutes.dashboard);
  }

  let pageData:
    | {
        campaigns: Awaited<ReturnType<typeof leadStore.getCampaignReport>>;
        jobs: Awaited<ReturnType<typeof leadStore.listSyncJobs>>;
        googleAdsLeadCount: number;
        recentGoogleAdsLeads: Awaited<ReturnType<typeof leadStore.list>>;
        failedPayloads: Awaited<ReturnType<typeof leadStore.listFailedPayloads>>;
      }
    | null = null;
  let pageError: unknown = null;

  if (isLocalAdminPreviewEmail(session.user?.email)) {
    pageData = { campaigns: [], jobs: [], googleAdsLeadCount: 18, recentGoogleAdsLeads: [], failedPayloads: [] };
  } else try {
    const [campaigns, jobs, googleAdsLeadCount, recentGoogleAdsLeads, failedPayloads] = await Promise.all([
      leadStore.getCampaignReport(),
      leadStore.listSyncJobs({ provider: "google_ads", limit: 20 }),
      leadStore.countLeads({ source: "google_ads" }),
      leadStore.list({ source: "google_ads", limit: 1 }),
      leadStore.listFailedPayloads("google_ads"),
    ]);

    pageData = { campaigns, jobs, googleAdsLeadCount, recentGoogleAdsLeads, failedPayloads };
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
  const reportingConfigured = [
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    process.env.GOOGLE_ADS_CLIENT_ID,
    process.env.GOOGLE_ADS_CLIENT_SECRET,
    process.env.GOOGLE_ADS_REFRESH_TOKEN,
    process.env.GOOGLE_ADS_CUSTOMER_ID,
  ].every((value) => Boolean(normalizeEnvValue(value)));
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
            <section id="health" className="scroll-mt-24 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
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
                value={pageData?.googleAdsLeadCount ?? 0}
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
                  previewMode={isLocalAdminPreviewEmail(session.user?.email)}
                  endpoint="/api/integrations/google-ads/sync-performance"
                  label="Refresh performance"
                  variant="primary"
                />
                <AdminActionButton
                  previewMode={isLocalAdminPreviewEmail(session.user?.email)}
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
                    pageData?.recentGoogleAdsLeads[0]
                      ? formatCrmDateTime(pageData.recentGoogleAdsLeads[0].createdAt)
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

            <section id="failed-imports" className="admin-surface scroll-mt-24 rounded-[24px] p-5">
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
                          previewMode={isLocalAdminPreviewEmail(session.user?.email)}
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

        <IntegrationSetupPanel
          provider="google_ads"
          title="Connect Google Ads"
          description="Set up account reporting and lead delivery without exposing credentials in the browser."
          configured={reportingConfigured}
          previewMode={isLocalAdminPreviewEmail(session.user?.email)}
          permissions={[
            "Read campaign performance for the selected customer",
            "Receive lead form webhook deliveries",
          ]}
          steps={[
            {
              title: "Add Google Ads credentials",
              description:
                "Save the OAuth client, refresh token, developer token, and customer ID as deployment secrets.",
            },
            {
              title: "Secure lead delivery",
              description: `${webhookKeyConfigured ? "The webhook key is present." : "Add GOOGLE_ADS_WEBHOOK_KEY."} Use ${baseUrl ? `${baseUrl}/api/integrations/google-ads/webhook` : "your public Leads Desk URL plus /api/integrations/google-ads/webhook"} for lead delivery.`,
            },
            {
              title: "Verify and refresh",
              description:
                "Verify customer access here. Then refresh performance and send a test lead to confirm both paths.",
            },
          ]}
        />
      </div>
    </AdminShell>
  );
}
