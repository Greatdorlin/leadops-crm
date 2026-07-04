import { notFound } from "next/navigation";
import { PublicFormRenderer } from "@/components/admin/PublicFormRenderer";
import type { PublicFormFieldData } from "@/components/admin/PublicFormField";

export const dynamic = "force-dynamic";

async function fetchPublicForm(slug: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/forms/public/${slug}`, { cache: "no-store" });
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

export default async function PublicFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await fetchPublicForm(slug);

  if (!result) {
    notFound();
  }

  const { form, fields } = result;

  return (
    <div className="min-h-screen bg-slate-50 py-12 sm:py-16">
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
