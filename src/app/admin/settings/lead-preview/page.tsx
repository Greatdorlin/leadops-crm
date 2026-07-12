import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { LeadPreviewSettingsManager } from "@/components/admin/LeadPreviewSettingsManager";
import { getAdminAccessContext } from "@/lib/admin";
import { isLocalAdminPreviewEmail } from "@/lib/admin-access";
import { appRoutes } from "@/lib/app-routes";
import { canManageLeadPreviewSettings } from "@/lib/crm/authz";
import { loadAdminLeadReadContext } from "@/lib/crm/admin-read-context";
import { listCustomFields } from "@/lib/crm/custom-fields-admin";
import { listLeadStages } from "@/lib/crm/lead-stages-admin";
import { buildAdminLeadListItem } from "@/lib/crm/view-models";
import { getCompanySettings } from "@/lib/crm/workspace-settings-server";
import { resolveStoredWorkspaceSettings } from "@/lib/crm/workspace-settings";
import { leadStore } from "@/lib/storage";
import { DEFAULT_LEADS_DESK_STAGE_ROWS } from "@/lib/db/defaults";

export const dynamic = "force-dynamic";

export default async function LeadPreviewSettingsPage() {
  const { session, role, accessLevel, actualAccessLevel, canSwitchAccessViews, permissions } =
    await getAdminAccessContext(appRoutes.settingsLeadPreview);

  if (!canManageLeadPreviewSettings({ accessLevel, permissions, role })) {
    redirect(appRoutes.settings);
  }

  const demoMode = isLocalAdminPreviewEmail(session.user?.email);
  const [settings, customFields, previewLeads, stages] = demoMode
    ? [
        resolveStoredWorkspaceSettings(null),
        [] as Awaited<ReturnType<typeof listCustomFields>>,
        [] as Awaited<ReturnType<typeof leadStore.list>>,
        DEFAULT_LEADS_DESK_STAGE_ROWS.map((stage) => ({ id: `demo-stage-${stage.key}`, ...stage })),
      ]
    : await Promise.all([
        getCompanySettings(),
        listCustomFields(),
        leadStore.list({ limit: 1 }),
        listLeadStages(),
      ]);
  const previewLeadRow = previewLeads[0] ?? null;
  const previewContext = previewLeadRow
    ? await loadAdminLeadReadContext([previewLeadRow], { includeCustomFields: true })
    : null;
  const previewLead = previewLeadRow && previewContext
    ? buildAdminLeadListItem(previewLeadRow, {
        stage: previewLeadRow.stageId
          ? previewContext.stagesById.get(previewLeadRow.stageId) ?? null
          : null,
        source: previewLeadRow.sourceId
          ? previewContext.sourcesById.get(previewLeadRow.sourceId) ?? null
          : null,
        owner: previewLeadRow.assignedUserId
          ? previewContext.ownersById.get(previewLeadRow.assignedUserId) ?? null
          : null,
        customFieldDefinitions: customFields,
        customFieldValues: previewContext.customFieldValuesByLeadId.get(previewLeadRow.id) ?? [],
      })
    : null;

  return (
    <AdminShell
      activeNav="settings"
      accessLevel={accessLevel}
      role={role}
      actualAccessLevel={actualAccessLevel}
      canSwitchAccessViews={canSwitchAccessViews}
      title="Lead Preview"
      description="Choose which lead details show up in the table and mobile cards."
      actions={
        <>
          <Link
            href={appRoutes.settingsFields}
            prefetch={false}
            className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium"
          >
            Manage fields
          </Link>
          <Link
            href={appRoutes.settings}
            prefetch={false}
            className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium"
          >
            Back to settings
          </Link>
          <AdminSignOutButton />
        </>
      }
    >
      <LeadPreviewSettingsManager
        initialSettings={settings}
        customFields={customFields}
        previewLead={previewLead}
        currency={settings.globalCurrency}
        stageOptions={stages.map((stage) => ({
          id: stage.id,
          key: stage.key,
          label: stage.name,
          color: stage.color,
        }))}
        demoMode={demoMode}
      />
    </AdminShell>
  );
}
