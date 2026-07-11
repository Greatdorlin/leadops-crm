import { FormFieldEditor } from "@/components/admin/FormFieldEditor";
import { listCustomFields } from "@/lib/crm/custom-fields-admin";
import { listFormFields } from "@/lib/crm/form-builder-store";

export const dynamic = "force-dynamic";

export default async function FormFieldsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [fields, customFields] = await Promise.all([
    listFormFields(id),
    listCustomFields(),
  ]);

  return (
    <div className="space-y-6">
      <FormFieldEditor
        formId={id}
        initialFields={fields}
        customFieldOptions={customFields.map((field) => ({
          value: `customField_${field.id}`,
          label: field.label,
        }))}
      />
    </div>
  );
}
