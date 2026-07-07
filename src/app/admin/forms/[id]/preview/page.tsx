import Link from "next/link";
import { Eye } from "lucide-react";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { GlassSurface } from "@/components/admin/ui/GlassSurface";
import { SmoothButton } from "@/components/admin/ui/SmoothButton";
import { getFormById } from "@/lib/crm/form-builder-store";

export const dynamic = "force-dynamic";

export default async function FormPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await getFormById(id);

  if (!form) {
    return (
      <GlassSurface intensity="soft" className="rounded-[26px] p-6 text-center">
        <p className="text-white/70">Form not found.</p>
      </GlassSurface>
    );
  }

  const previewUrl = `/forms/${form.slug}`;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Preview"
        title="How this form looks to leads"
        description="Open the public form in a new tab to see the full experience."
        actions={
          form.isPublic ? (
            <Link href={previewUrl} target="_blank">
              <SmoothButton variant="primary" size="sm" icon={<Eye className="h-4 w-4" />}>
                Open preview
              </SmoothButton>
            </Link>
          ) : (
            <p className="text-sm text-white/50">This form is not public.</p>
          )
        }
      />

      {form.isPublic ? (
        <GlassSurface intensity="medium" className="rounded-[26px] p-0 overflow-hidden">
          <iframe
            src={previewUrl}
            title="Form preview"
            className="w-full h-[600px] border-0"
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </GlassSurface>
      ) : (
        <GlassSurface intensity="soft" className="rounded-[26px] p-8 text-center">
          <p className="text-white/70">
            This form is currently private. Make it public in Settings to preview it.
          </p>
        </GlassSurface>
      )}
    </div>
  );
}
