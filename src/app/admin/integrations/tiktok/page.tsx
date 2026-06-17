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

export default async function AdminTikTokIntegrationPage() {
  const { role, accessLevel, actualAccessLevel, canSwitchAccessViews } =
    await getAdminAccessContext("/admin/integrations/tiktok");
  if (!canManageIntegrations(accessLevel, role)) {
    redirect("/admin");
  }

  let pageData:
    | {
        tiktokLeads: Awaited<ReturnType<typeof leadStore.list>>;
        failedPayloads: Awaited<ReturnType<typeof leadStore.listFailedPayloads>>;
      }
    | null = null;
  let pageError: unknown = null;

  try {
    const [tiktokLeads, failedPayloads] = await Promise.all([
      leadStore.list({ source: "tiktok_lead_ads" }),
      leadStore.listFailedPayloads("tiktok_lead_ads"),
    ]);

    pageData = { tiktokLeads, failedPayloads };
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
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
                value={pageData.tiktokLeads.length}
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
                value={pageData.tiktokLeads[0] ? formatCrmDateTime(pageData.tiktokLeads[0].createdAt) : "Not yet"}
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
                    endpoint="/api/integrations/tiktok/retry"
                    label="Retry failed lead imports"
                  />
                }
              />
            </section>

            <section className="admin-surface rounded-[24px] p-5">
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
                          <p className="text-sm font-semibold text-slate-950">
                            Lead import {payload.externalId || payload.id}
                          </p>
                          <p className="mt-2 text-sm text-slate-500">{payload.errorMessage || "Unknown error"}</p>
                        </div>
                        <AdminActionButton
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

        <section className="admin-surface rounded-[24px] p-5">
          <SectionHeader
            eyebrow="Setup checklist"
            title="TikTok setup"
            description="Use this list when configuring TikTok instant form delivery into the CRM."
          />
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            {[
              "Set TIKTOK_WEBHOOK_SECRET so the CRM can verify webhook deliveries.",
              "Point TikTok lead delivery to /api/integrations/tiktok/webhook and send the same secret in the configured header or query parameter.",
              "Send a test lead from TikTok and confirm it appears under TikTok Lead Ads in the CRM.",
              "Use Retry failed lead imports whenever the CRM flags a payload mapping issue.",
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
