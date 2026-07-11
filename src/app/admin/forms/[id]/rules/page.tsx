import { FormRulesEditor } from "@/components/admin/FormRulesEditor";
import { listFormFields, listFormRules } from "@/lib/crm/form-builder-store";
import { buildFormDefaultSourceOptions } from "@/lib/crm/form-default-source-options";
import { listLeadSources } from "@/lib/crm/lead-sources-admin";
import { listLeadStages } from "@/lib/crm/lead-stages-admin";
import { leadStore } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function FormRulesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [fields, rules, stages, sources, users] = await Promise.all([
    listFormFields(id),
    listFormRules(id),
    listLeadStages(),
    listLeadSources(),
    leadStore.listCrmUsers(),
  ]);

  return (
    <div className="space-y-6">
      <FormRulesEditor
        formId={id}
        initialFields={fields}
        initialRules={rules}
        stageOptions={stages
          .filter((stage) => !stage.archived)
          .map((stage) => ({ value: stage.key, label: stage.name }))}
        sourceOptions={buildFormDefaultSourceOptions(sources)}
        ownerOptions={users
          .filter((user) => user.isActive)
          .map((user) => ({ value: user.id, label: user.fullName || user.email }))}
      />
    </div>
  );
}
