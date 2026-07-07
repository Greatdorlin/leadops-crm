import { FormSettingsPanel } from "@/components/admin/FormSettingsPanel";
import { FormEmbedCode } from "@/components/admin/FormEmbedCode";
import { buildFormDefaultSourceOptions } from "@/lib/crm/form-default-source-options";
import { listLeadSources } from "@/lib/crm/lead-sources-admin";
import { listLeadStages } from "@/lib/crm/lead-stages-admin";
import { getFormById } from "@/lib/crm/form-builder-store";
import { leadStore } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function FormSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [form, stages, sources, users] = await Promise.all([
    getFormById(id),
    listLeadStages(),
    listLeadSources(),
    leadStore.listCrmUsers(),
  ]);

  return (
    <div className="space-y-6">
      <FormSettingsPanel
        formId={id}
        initialForm={form}
        stageOptions={stages.filter((stage) => !stage.archived).map((stage) => ({ value: stage.key, label: stage.name }))}
        sourceOptions={buildFormDefaultSourceOptions(sources)}
        ownerOptions={users.filter((user) => user.isActive).map((user) => ({ value: user.id, label: user.fullName.trim() || user.email }))}
      />
      <FormEmbedCode formId={id} />
    </div>
  );
}
