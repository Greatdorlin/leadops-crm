import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { ErrorState } from "@/components/admin/ErrorState";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { WorkspaceAutomationManager } from "@/components/admin/WorkspaceAutomationManager";
import { getAdminAccessContext } from "@/lib/admin";
import { isLocalAdminPreviewEmail } from "@/lib/admin-access";
import { appRoutes } from "@/lib/app-routes";
import { canManageAdminSettings } from "@/lib/crm/authz";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";
import { listLeadSources } from "@/lib/crm/lead-sources-admin";
import { listLeadStages } from "@/lib/crm/lead-stages-admin";
import { listWorkspaceAutomations } from "@/lib/crm/workspace-automations";
import { leadStore } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function WorkspaceAutomationsPage() {
  const context = await getAdminAccessContext(appRoutes.settingsAutomations);
  if (!canManageAdminSettings(context)) redirect(appRoutes.settings);
  const demoMode = isLocalAdminPreviewEmail(context.session.user?.email);
  let data: Awaited<ReturnType<typeof loadData>> | null = null;
  let pageError: unknown = null;
  try {
    data = demoMode ? await loadDemoData() : await loadData();
  } catch (error) {
    pageError = error;
    logCrmPageError("settings-automations", error);
  }

  return <AdminShell activeNav="settings" accessLevel={context.accessLevel} role={context.role} actualAccessLevel={context.actualAccessLevel} canSwitchAccessViews={context.canSwitchAccessViews} title="Automations" description="Route new leads without tying logic to one form." actions={<><Link href={appRoutes.settings} className="admin-button-secondary inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold">Back to settings</Link><AdminSignOutButton /></>}>
    {data ? <section className="admin-surface rounded-[26px] p-4 sm:p-6"><SectionHeader eyebrow="Lead routing" title="Workspace automations" description="Choose a condition and the action Leads Desk should take." /><div className="mt-6"><WorkspaceAutomationManager initialRules={data.rules} owners={data.owners} sources={data.sources} stages={data.stages} demoMode={demoMode} /></div></section> : <ErrorState title={getCrmPageErrorCopy(pageError).title} description={getCrmPageErrorCopy(pageError).description} details={getCrmPageErrorCopy(pageError).details} />}
  </AdminShell>;
}

async function loadData() {
  const [rules, users, sources, stages] = await Promise.all([
    listWorkspaceAutomations(),
    leadStore.listCrmUsers(),
    listLeadSources(),
    listLeadStages(),
  ]);
  return {
    rules,
    owners: users.filter((user) => user.isActive && user.role !== "affiliate").map((user) => ({ id: user.id, label: user.fullName || user.email })),
    sources: sources.filter((source) => !source.archived).map((source) => ({ id: source.id, label: source.name, key: source.key })),
    stages: stages.filter((stage) => !stage.archived).map((stage) => ({ id: stage.id, label: stage.name, key: stage.key })),
  };
}

async function loadDemoData() {
  const now = new Date();
  return {
    rules: [{ id: "demo-rule", name: "Route website enquiries", conditionField: "source", conditionOperator: "equals", conditionValue: "demo-source", actionType: "assign_owner", actionValue: "demo-owner", isActive: true, sortOrder: 0, createdBy: null, createdAt: now, updatedAt: now }],
    owners: [{ id: "demo-owner", label: "Sales Manager" }],
    sources: [{ id: "demo-source", label: "Website", key: "website" }],
    stages: [{ id: "demo-stage", label: "New", key: "new" }],
  };
}
