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
    <div className="relative min-h-screen overflow-hidden bg-[#030712] px-4 py-10 sm:px-6 sm:py-14">
      <div
        className="absolute inset-0 bg-[url('/backgrounds/bg-butterfly-glass.png')] bg-cover bg-center opacity-90"
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(129,140,248,0.26),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.18),transparent_30%),linear-gradient(180deg,rgba(3,7,18,0.38),rgba(3,7,18,0.76))]" aria-hidden="true" />
      <div className="relative mx-auto max-w-6xl">
        <div className="mb-8 text-center sm:mb-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/58">
            Leads Desk form
          </p>
          <h1 className="mt-3 font-[family:var(--font-heading)] text-[2.3rem] leading-none tracking-[-0.06em] text-white sm:text-[3.2rem]">
            Capture qualified leads in one private workspace.
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-white/64 sm:text-base">
            This branded form experience is designed for direct intake, cleaner follow-up, and reliable lead routing from the first submission.
          </p>
        </div>

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
    </div>
  );
}
