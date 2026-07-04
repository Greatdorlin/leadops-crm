import { FormFieldEditor } from "@/components/admin/FormFieldEditor";

export const dynamic = "force-dynamic";

async function fetchFormFields(formId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/admin/forms/${formId}/fields`, { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return data.fields as unknown[];
}

export default async function FormFieldsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fields = await fetchFormFields(id);

  return (
    <div className="space-y-6">
      <FormFieldEditor formId={id} initialFields={fields} />
    </div>
  );
}
