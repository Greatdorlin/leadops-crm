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

export default async function AdminLinkedInIntegrationPage() {
  const { session, role, accessLevel, actualAccessLevel, canSwitchAccessViews, permissions } =
    await getAdminAccessContext(appRoutes.integration("linkedin"));
  if (!canManageIntegrations(accessLevel, role, permissions)) {
    redirect(appRoutes.dashboard);
  }

  let pageData:
    | {
        linkedInLeadCount: number;
        recentLinkedInLeads: Awaited<ReturnType<typeof leadStore.list>>;
        failedPayloads: Awaited<ReturnType<typeof leadStore.listFailedPayloads>>;
      }
    | null = null;
  let pageError: unknown = null;

  if (isLocalAdminPreviewEmail(session.user?.email)) {
    pageData = { linkedInLeadCount: 12, recentLinkedInLeads: [], failedPayloads: [] };
  } else try {
    const [linkedInLeadCount, recentLinkedInLeads, failedPayloads] = await Promise.all([
      leadStore.countLeads({ source: "linkedin_lead_gen_forms" }),
      leadStore.list({ source: "linkedin_lead_gen_forms", limit: 1 }),
      leadStore.listFailedPayloads("linkedin_lead_gen_forms"),
    ]);

    pageData = { linkedInLeadCount, recentLinkedInLeads, failedPayloads };
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
            <section id="health" className="scroll-mt-24 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
                value={pageData.linkedInLeadCount}
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
                value={pageData.recentLinkedInLeads[0] ? formatCrmDateTime(pageData.recentLinkedInLeads[0].createdAt) : "Not yet"}
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
                    previewMode={isLocalAdminPreviewEmail(session.user?.email)}
                    endpoint="/api/integrations/linkedin/retry"
                    label="Retry failed lead imports"
                  />
                }
              />
            </section>

            <section id="failed-imports" className="admin-surface scroll-mt-24 rounded-[24px] p-5">
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
                          <p className="text-sm font-semibold text-white">
                            Lead notification {payload.externalId || payload.id}
                          </p>
                          <p className="mt-2 text-sm text-white/60">{payload.errorMessage || "Unknown error"}</p>
                        </div>
                        <AdminActionButton
                          previewMode={isLocalAdminPreviewEmail(session.user?.email)}
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

        <IntegrationSetupPanel
          provider="linkedin"
          title="Connect LinkedIn Lead Gen Forms"
          description="Confirm Lead Sync access, register the webhook, and verify the token."
          configured={linkedInConfigured}
          previewMode={isLocalAdminPreviewEmail(session.user?.email)}
          permissions={[
            "LinkedIn Lead Sync API access",
            "Read form responses for the authorized ad account",
          ]}
          steps={[
            {
              title: "Add LinkedIn credentials",
              description:
                "Save the client secret and access token as deployment secrets. Standard Ads API access does not include Lead Sync.",
            },
            {
              title: "Register the webhook",
              description: `Use ${baseUrl ? `${baseUrl}/api/integrations/linkedin/webhook` : "your public Leads Desk URL plus /api/integrations/linkedin/webhook"} and complete LinkedIn's challenge.`,
            },
            {
              title: "Verify and test delivery",
              description:
                "Verify token access here, then submit a test form response and confirm the lead appears in Leads Desk.",
            },
          ]}
        />
      </div>
    </AdminShell>
  );
}
