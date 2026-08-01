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
import { formatCrmDateTime } from "@/lib/crm/formatters";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";
import { normalizeEnvValue } from "@/lib/env-utils";
import { redirect } from "next/navigation";
import { leadStore } from "@/lib/storage";
import { appRoutes } from "@/lib/app-routes";

export const dynamic = "force-dynamic";

export default async function AdminTikTokIntegrationPage() {
  const { session, role, accessLevel, actualAccessLevel, canSwitchAccessViews, permissions } =
    await getAdminAccessContext(appRoutes.integration("tiktok"));
  if (!canManageIntegrations(accessLevel, role, permissions)) {
    redirect(appRoutes.dashboard);
  }

  let pageData:
    | {
        tiktokLeadCount: number;
        recentTikTokLeads: Awaited<ReturnType<typeof leadStore.list>>;
        failedPayloads: Awaited<ReturnType<typeof leadStore.listFailedPayloads>>;
      }
    | null = null;
  let pageError: unknown = null;

  if (isLocalAdminPreviewEmail(session.user?.email)) {
    pageData = { tiktokLeadCount: 15, recentTikTokLeads: [], failedPayloads: [] };
  } else try {
    const [tiktokLeadCount, recentTikTokLeads, failedPayloads] = await Promise.all([
      leadStore.countLeads({ source: "tiktok_lead_ads" }),
      leadStore.list({ source: "tiktok_lead_ads", limit: 1 }),
      leadStore.listFailedPayloads("tiktok_lead_ads"),
    ]);

    pageData = { tiktokLeadCount, recentTikTokLeads, failedPayloads };
  } catch (error) {
    pageError = error;
    logCrmPageError("integrations:tiktok", error);
  }

  const baseUrl =
    normalizeEnvValue(process.env.CRM_PUBLIC_BASE_URL) ||
    normalizeEnvValue(process.env.NEXT_PUBLIC_APP_URL);
  const secretConfigured = Boolean(normalizeEnvValue(process.env.TIKTOK_WEBHOOK_SECRET));

  return (
    <AdminShell
      activeNav="integrations"
      accessLevel={accessLevel}
      role={role}
      actualAccessLevel={actualAccessLevel}
      canSwitchAccessViews={canSwitchAccessViews}
      title="TikTok Lead Ads"
      description="Webhook lead intake monitoring and retry controls for TikTok instant forms."
      actions={<AdminSignOutButton />}
    >
      <div className="space-y-6">
        {pageData ? (
          <>
            <section id="health" className="scroll-mt-24 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Lead intake URL"
                value={baseUrl ? "Configured" : "Missing base URL"}
                supporting={
                  baseUrl
                    ? `${baseUrl}/api/integrations/tiktok/webhook`
                    : "Add CRM_PUBLIC_BASE_URL or NEXT_PUBLIC_APP_URL"
                }
                tone={baseUrl && secretConfigured ? "positive" : "danger"}
              />
              <MetricCard
                label="Imported leads"
                value={pageData.tiktokLeadCount}
                supporting="Leads currently attributed to TikTok Lead Ads."
              />
              <MetricCard
                label="Failed lead imports"
                value={pageData.failedPayloads.length}
                supporting="Saved imports that need a retry or mapping review."
                tone={pageData.failedPayloads.length > 0 ? "danger" : "positive"}
              />
              <MetricCard
                label="Last successful import"
                value={pageData.recentTikTokLeads[0] ? formatCrmDateTime(pageData.recentTikTokLeads[0].createdAt) : "Not yet"}
                supporting="Latest lead attributed to TikTok Lead Ads."
              />
            </section>

            <section className="admin-surface rounded-[24px] p-5">
              <SectionHeader
                eyebrow="Actions"
                title="Retry and verify"
                description="Retry failed TikTok webhook payloads without losing the original submission details."
                actions={
                  <AdminActionButton
                    previewMode={isLocalAdminPreviewEmail(session.user?.email)}
                    endpoint="/api/integrations/tiktok/retry"
                    label="Retry failed lead imports"
                  />
                }
              />
            </section>

            <section id="failed-imports" className="admin-surface scroll-mt-24 rounded-[24px] p-5">
              <SectionHeader
                eyebrow="Failed imports"
                title="Imports needing review"
                description="Original payloads stay available for retries and troubleshooting."
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
                          previewMode={isLocalAdminPreviewEmail(session.user?.email)}
                          endpoint="/api/integrations/tiktok/retry"
                          body={{ payloadId: payload.id }}
                          label="Retry this import"
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="No failed TikTok imports"
                    description="Lead Ads imports will only appear here when processing needs attention."
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

        <IntegrationSetupPanel
          provider="tiktok"
          title="Connect TikTok Lead Ads"
          description="Secure the webhook, add the delivery URL, then prove it with a test lead."
          configured={secretConfigured}
          previewMode={isLocalAdminPreviewEmail(session.user?.email)}
          verificationMode="delivery"
          permissions={[
            "Receive instant-form lead deliveries",
            "Read only the fields included in each submitted form",
          ]}
          steps={[
            {
              title: "Create a delivery secret",
              description:
                "Save TIKTOK_WEBHOOK_SECRET as a deployment secret. Use the same value in TikTok's webhook header or query setting.",
            },
            {
              title: "Add the delivery URL",
              description: `Use ${baseUrl ? `${baseUrl}/api/integrations/tiktok/webhook` : "your public Leads Desk URL plus /api/integrations/tiktok/webhook"} for lead delivery.`,
            },
            {
              title: "Send a test lead",
              description:
                "Submit a TikTok test lead and confirm it appears in Leads Desk. Server-secret presence alone is not a verified connection.",
            },
          ]}
        />
      </div>
    </AdminShell>
  );
}
