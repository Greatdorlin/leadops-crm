import { FormFieldEditor } from "@/components/admin/FormFieldEditor";
import { listFormFields } from "@/lib/crm/form-builder-store";

export const dynamic = "force-dynamic";

export default async function FormFieldsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fields = await listFormFields(id);

  return (
    <div className="space-y-6">
      <FormFieldEditor formId={id} initialFields={fields} />
    </div>
  );
}
