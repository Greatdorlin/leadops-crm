import { FormSettingsPanel } from "@/components/admin/FormSettingsPanel";
import { FormEmbedCode } from "@/components/admin/FormEmbedCode";

export const dynamic = "force-dynamic";

async function fetchForm(formId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/admin/forms/${formId}`, { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  return data.form as Record<string, unknown> | null;
}

export default async function FormSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await fetchForm(id);

  return (
    <div className="space-y-6">
      <FormSettingsPanel formId={id} initialForm={form} />
      <FormEmbedCode formId={id} />
    </div>
  );
}
