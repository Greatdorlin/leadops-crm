import { AdminActionButton } from "@/components/admin/AdminActionButton";
import { AdminShell } from "@/components/admin/AdminShell";
import { ErrorState } from "@/components/admin/ErrorState";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { EmptyState } from "@/components/admin/EmptyState";
import { IntegrationHealthCard } from "@/components/admin/IntegrationHealthCard";
import { MetricCard } from "@/components/admin/MetricCard";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { getAdminAccessContext } from "@/lib/admin";
import { canManageIntegrations } from "@/lib/crm/authz";
import {
  formatIntegrationProviderLabel,
  formatSyncJobStatusLabel,
  formatSyncJobTypeLabel,
} from "@/lib/crm/formatters";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";
import type { IntegrationProvider, IntegrationRecord } from "@/lib/crm/types";
import { hasConfiguredEnvValue } from "@/lib/env-utils";
import { redirect } from "next/navigation";
import { leadStore } from "@/lib/storage";
import { appRoutes } from "@/lib/app-routes";

export const dynamic = "force-dynamic";

const providers: Array<{
  provider: IntegrationProvider;
  href: string;
  action?: {
    endpoint: string;
    label: string;
  };
}> = [
  {
    provider: "website",
    href: appRoutes.integrations,
  },
  {
    provider: "facebook",
    href: appRoutes.integration("facebook"),
    action: {
      endpoint: "/api/integrations/facebook/retry",
      label: "Retry failed lead imports",
    },
  },
  {
    provider: "google_sheets",
    href: appRoutes.integration("google-sheets"),
    action: {
      endpoint: "/api/google-sheets/export",
      label: "Export leads",
    },
  },
  {
    provider: "google_ads",
    href: appRoutes.integration("google-ads"),
    action: {
      endpoint: "/api/integrations/google-ads/sync-performance",
      label: "Refresh performance",
    },
  },
  {
    provider: "tiktok",
    href: appRoutes.integration("tiktok"),
    action: {
      endpoint: "/api/integrations/tiktok/retry",
      label: "Retry failed lead imports",
    },
  },
  {
    provider: "linkedin",
    href: appRoutes.integration("linkedin"),
    action: {
      endpoint: "/api/integrations/linkedin/retry",
      label: "Retry failed lead imports",
    },
  },
  {
    provider: "sender",
    href: appRoutes.integrations,
  },
];

function inferFallbackStatus(provider: IntegrationProvider): IntegrationRecord["status"] {
  if (
    provider === "facebook" &&
    hasConfiguredEnvValue(process.env.META_APP_SECRET) &&
    hasConfiguredEnvValue(process.env.META_PAGE_ACCESS_TOKEN) &&
    hasConfiguredEnvValue(process.env.META_VERIFY_TOKEN)
  ) {
    return "pending_sync";
  }

  if (
    provider === "google_sheets" &&
    hasConfiguredEnvValue(process.env.GOOGLE_SHEETS_SPREADSHEET_ID) &&
    hasConfiguredEnvValue(process.env.GOOGLE_SHEETS_WORKSHEET_NAME) &&
    hasConfiguredEnvValue(process.env.GOOGLE_SHEETS_CLIENT_EMAIL) &&
    hasConfiguredEnvValue(process.env.GOOGLE_SHEETS_PRIVATE_KEY)
  ) {
    return "pending_sync";
  }

  if (
    provider === "google_ads" &&
    ((hasConfiguredEnvValue(process.env.GOOGLE_ADS_DEVELOPER_TOKEN) &&
      hasConfiguredEnvValue(process.env.GOOGLE_ADS_CUSTOMER_ID)) ||
      hasConfiguredEnvValue(process.env.GOOGLE_ADS_WEBHOOK_KEY))
  ) {
    return "pending_sync";
  }

  if (provider === "tiktok" && hasConfiguredEnvValue(process.env.TIKTOK_WEBHOOK_SECRET)) {
    return "pending_sync";
  }

  if (
    provider === "linkedin" &&
    hasConfiguredEnvValue(process.env.LINKEDIN_CLIENT_SECRET) &&
    hasConfiguredEnvValue(process.env.LINKEDIN_ACCESS_TOKEN)
  ) {
    return "pending_sync";
  }

  if (
    provider === "sender" &&
    hasConfiguredEnvValue(process.env.SENDER_API_KEY) &&
    hasConfiguredEnvValue(process.env.SENDER_DEFAULT_GROUP_ID)
  ) {
    return "pending_sync";
  }

  if (provider === "website" && hasConfiguredEnvValue(process.env.CRM_INTAKE_SECRET)) {
    return "healthy";
  }

  return "not_configured";
}

export default async function AdminIntegrationsPage() {
  const { role, accessLevel, actualAccessLevel, canSwitchAccessViews } =
    await getAdminAccessContext(appRoutes.integrations);
  if (!canManageIntegrations(accessLevel, role)) {
    redirect(appRoutes.dashboard);
  }
  let pageData:
    | {
        integrations: Awaited<ReturnType<typeof leadStore.listIntegrations>>;
        jobs: Awaited<ReturnType<typeof leadStore.listSyncJobs>>;
      }
    | null = null;
  let pageError: unknown = null;

  try {
    const [integrations, jobs] = await Promise.all([
      leadStore.listIntegrations(),
      leadStore.listSyncJobs({ limit: 20 }),
    ]);

    pageData = { integrations, jobs };
  } catch (error) {
    pageError = error;
    logCrmPageError("integrations", error);
  }

  const errorCopy = pageError ? getCrmPageErrorCopy(pageError) : null;

  const cards =
    pageData?.integrations
      ? providers.map(({ provider, href, action }) => {
          const integration =
            pageData.integrations.find((record) => record.provider === provider) ??
            ({
              id: provider,
              provider,
              accountName: formatIntegrationProviderLabel(provider),
              externalAccountId: null,
              status: inferFallbackStatus(provider),
              accessTokenEncrypted: null,
              refreshTokenEncrypted: null,
              config: null,
              lastSyncAt: null,
              lastError: null,
              createdAt: new Date(0).toISOString(),
              updatedAt: new Date(0).toISOString(),
            } satisfies IntegrationRecord);

          return {
            integration,
            href,
            action,
          };
        })
      : [];

  return (
    <AdminShell
      activeNav="integrations"
      accessLevel={accessLevel}
      role={role}
      actualAccessLevel={actualAccessLevel}
      canSwitchAccessViews={canSwitchAccessViews}
      title="Integrations"
      description="Monitor connected tools, lead imports, recent activity, and setup coverage."
      actions={<AdminSignOutButton />}
    >
      <div className="space-y-6">
        {pageData ? (
          <>
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <MetricCard
                label="Connected"
                value={cards.filter((card) => card.integration.status === "healthy").length}
                supporting="Tools currently running without an issue."
                tone="positive"
              />
              <MetricCard
                label="Recently synced"
                value={cards.filter((card) => card.integration.status === "pending_sync").length}
                supporting="Waiting on the next update or manual action."
                tone="warning"
              />
              <MetricCard
                label="Needs attention"
                value={cards.filter((card) => card.integration.status === "failed").length}
                supporting="Tools that need immediate review."
                tone="danger"
              />
              <MetricCard
                label="Setup needed"
                value={cards.filter((card) => card.integration.status === "not_configured").length}
                supporting="Connections still missing setup details."
              />
              <MetricCard
                label="Recent activity"
                value={pageData.jobs.length}
                supporting="Imports, exports, retries, and refreshes."
                tone="accent"
              />
            </section>

            <section className="admin-surface rounded-[24px] p-5">
              <SectionHeader
                eyebrow="Connected tools"
                title="Tool health"
                description="Open each connection to review setup, activity, or the next step."
              />
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {cards.map((card) => (
                  <div key={card.integration.provider} className="space-y-3">
                    <IntegrationHealthCard integration={card.integration} href={card.href} />
                    {card.action ? (
                      <AdminActionButton endpoint={card.action.endpoint} label={card.action.label} />
                    ) : null}
                  </div>
                ))}
              </div>
            </section>

            <section className="admin-surface rounded-[24px] p-5">
              <SectionHeader
                eyebrow="Recent activity"
                title="Sync history"
                description="A quick record of imports, exports, retries, and performance refreshes."
              />
              <div className="mt-4 grid gap-3">
                {pageData.jobs.length > 0 ? (
                  pageData.jobs.map((job) => (
                    <div key={job.id} className="admin-surface-muted rounded-2xl p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-white/60">
                            {formatIntegrationProviderLabel(job.provider)}
                          </p>
                          <p className="mt-1.5 text-base font-semibold text-white">
                            {formatSyncJobTypeLabel(job.jobType)}
                          </p>
                        </div>
                        <p className="text-sm text-white/70">{formatSyncJobStatusLabel(job.status)}</p>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-white/70">
                        {job.errorMessage || "No issue was recorded for this activity."}
                      </p>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="No activity yet"
                    description="Imports, exports, retries, and refreshes will appear here after the first run."
                  />
                )}
              </div>
            </section>
          </>
        ) : (
          <ErrorState
            title={errorCopy?.title ?? "We couldn't load integrations"}
            description={errorCopy?.description ?? "Integration status could not be loaded right now."}
            details={errorCopy?.details}
          />
        )}
      </div>
    </AdminShell>
  );
}
