import { notFound } from "next/navigation";
import { PublicFormRenderer } from "@/components/admin/PublicFormRenderer";
import type { PublicFormFieldData } from "@/components/admin/PublicFormField";

export const dynamic = "force-dynamic";

async function fetchEmbedForm(id: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/forms/embed/${id}`, { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  return data as {
    form: {
      id: string;
      name: string;
      slug: string;
      description: string | null;
      successMessage: string;
      redirectUrl: string | null;
      primaryColor: string | null;
      accentColor: string | null;
      logoUrl: string | null;
    };
    fields: PublicFormFieldData[];
  } | null;
}

export default async function EmbedFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await fetchEmbedForm(id);

  if (!result) {
    notFound();
  }

  const { form, fields } = result;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:py-12">
      <PublicFormRenderer
        form={{
          id: form.id,
          name: form.name,
          slug: form.slug,
          description: form.description,
          successMessage: form.successMessage,
          redirectUrl: form.redirectUrl,
          primaryColor: form.primaryColor,
          accentColor: form.accentColor,
          logoUrl: form.logoUrl,
        }}
        fields={fields}
      />
    </div>
  );
}
