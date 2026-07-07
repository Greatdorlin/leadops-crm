import { FormRulesEditor } from "@/components/admin/FormRulesEditor";
import { listFormFields, listFormRules } from "@/lib/crm/form-builder-store";

export const dynamic = "force-dynamic";

export default async function FormRulesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [fields, rules] = await Promise.all([listFormFields(id), listFormRules(id)]);

  return (
    <div className="space-y-6">
      <FormRulesEditor formId={id} initialFields={fields} initialRules={rules} />
    </div>
  );
}
