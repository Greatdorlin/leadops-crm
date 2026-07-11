import { notFound } from "next/navigation";
import { PublicFormRenderer } from "@/components/admin/PublicFormRenderer";
import { getPublicFormById } from "@/lib/crm/form-builder-store";
import { buildPublicFormDefinition, buildPublicFormFields } from "@/lib/crm/public-form";

export const dynamic = "force-dynamic";

export default async function EmbedFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getPublicFormById(id);

  if (!result) {
    notFound();
  }

  const form = buildPublicFormDefinition(result.form);
  const fields = buildPublicFormFields(result.fields);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:py-12">
      <PublicFormRenderer
        form={form}
        fields={fields}
      />
    </div>
  );
}
