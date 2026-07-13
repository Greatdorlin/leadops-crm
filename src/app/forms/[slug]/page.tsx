import { notFound } from "next/navigation";
import { PublicFormRenderer } from "@/components/admin/PublicFormRenderer";
import { getPublicFormBySlug } from "@/lib/crm/form-builder-store";
import { buildDemoPublicForm } from "@/lib/crm/demo-data";
import { buildPublicFormDefinition, buildPublicFormFields } from "@/lib/crm/public-form";

export const dynamic = "force-dynamic";

export default async function PublicFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const demoResult = process.env.NODE_ENV === "production" ? null : buildDemoPublicForm(slug);
  const result = demoResult ?? (await getPublicFormBySlug(slug));
  const previewMode = Boolean(demoResult);

  if (!result) {
    notFound();
  }

  const form = buildPublicFormDefinition(result.form);
  const fields = buildPublicFormFields(result.fields);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030712] px-4 py-5 sm:px-6 sm:py-10">
      <div
        className="absolute inset-0 bg-[url('/backgrounds/bg-butterfly-glass.png')] bg-cover bg-center opacity-90"
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(129,140,248,0.26),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.18),transparent_30%),linear-gradient(180deg,rgba(3,7,18,0.38),rgba(3,7,18,0.76))]" aria-hidden="true" />
      <div className="relative mx-auto max-w-3xl">
        <PublicFormRenderer
          form={form}
          fields={fields}
          previewMode={previewMode}
        />
      </div>
    </div>
  );
}
