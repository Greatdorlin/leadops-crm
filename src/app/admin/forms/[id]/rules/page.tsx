import { FormRulesEditor } from "@/components/admin/FormRulesEditor";

export const dynamic = "force-dynamic";

async function fetchFormFields(formId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/admin/forms/${formId}/fields`, { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return data.fields as unknown[];
}

async function fetchFormRules(formId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/admin/forms/${formId}/rules`, { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return data.rules as unknown[];
}

export default async function FormRulesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [fields, rules] = await Promise.all([fetchFormFields(id), fetchFormRules(id)]);

  return (
    <div className="space-y-6">
      <FormRulesEditor formId={id} initialFields={fields} initialRules={rules} />
    </div>
  );
}
