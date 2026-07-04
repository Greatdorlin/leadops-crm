import { notFound } from "next/navigation";
import { Code, ExternalLink } from "lucide-react";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { GlassSurface } from "@/components/admin/ui/GlassSurface";
import { CopyButton } from "@/components/admin/CopyButton";
import { getFormById } from "@/lib/crm/form-builder-store";

export const dynamic = "force-dynamic";

export default async function FormEmbedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const form = await getFormById(id);
  if (!form) {
    notFound();
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://your-domain.com";
  const embedUrl = `${baseUrl}/embed/forms/${id}`;
  const publicUrl = `${baseUrl}/forms/${form.slug}`;

  const iframeCode = `<iframe
  src="${embedUrl}"
  width="100%"
  height="600"
  frameborder="0"
  style="border: none; border-radius: 16px;"
  title="${form.name}"
></iframe>`;

  const scriptCode = `<div id="leads-desk-form-${id}"></div>
<script>
  (function() {
    var container = document.getElementById("leads-desk-form-${id}");
    var iframe = document.createElement("iframe");
    iframe.src = "${embedUrl}";
    iframe.width = "100%";
    iframe.height = "600";
    iframe.frameBorder = "0";
    iframe.style.border = "none";
    iframe.style.borderRadius = "16px";
    iframe.title = "${form.name}";
    container.appendChild(iframe);
  })();
</script>`;

  const directLinkCode = publicUrl;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <GlassSurface intensity="soft" className="rounded-[24px] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Public URL</p>
          <p className="mt-2 text-lg font-semibold tracking-[-0.04em] text-white">{form.isPublic && form.status === "active" ? "Live" : "Hidden"}</p>
          <p className="mt-1 text-xs text-white/50">
            {form.isPublic && form.status === "active"
              ? "Form is publicly accessible"
              : "Enable public access to embed"}
          </p>
        </GlassSurface>
        <GlassSurface intensity="soft" className="rounded-[24px] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Embed method</p>
          <p className="mt-2 text-lg font-semibold tracking-[-0.04em] text-white">2 options</p>
          <p className="mt-1 text-xs text-white/50">IFrame and script tag</p>
        </GlassSurface>
        <GlassSurface intensity="soft" className="rounded-[24px] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Form slug</p>
          <p className="mt-2 text-lg font-semibold tracking-[-0.04em] text-white">{form.slug}</p>
          <p className="mt-1 text-xs text-white/50">Unique identifier</p>
        </GlassSurface>
      </div>

      <GlassSurface intensity="medium" className="rounded-[24px] p-5 sm:p-6">
        <SectionHeader
          eyebrow="Embed options"
          title="Share this form anywhere"
          description="Copy the code and paste it into your website, landing page, or CMS."
        />

        <div className="mt-6 space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                IFrame embed
              </label>
              <CopyButton text={iframeCode} />
            </div>
            <div className="mt-2 overflow-x-auto rounded-[16px] border border-white/10 bg-slate-950/60 p-4">
              <pre className="text-xs leading-relaxed text-emerald-300/90 font-mono">
                <code>{iframeCode}</code>
              </pre>
            </div>
            <p className="mt-2 text-xs text-white/50">
              Best for WordPress, Wix, Squarespace, and most website builders.
            </p>
          </div>

          <div className="border-t border-white/10 pt-6">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                Script embed
              </label>
              <CopyButton text={scriptCode} />
            </div>
            <div className="mt-2 overflow-x-auto rounded-[16px] border border-white/10 bg-slate-950/60 p-4">
              <pre className="text-xs leading-relaxed text-emerald-300/90 font-mono">
                <code>{scriptCode}</code>
              </pre>
            </div>
            <p className="mt-2 text-xs text-white/50">
              Best for custom sites where you need to inject the form dynamically.
            </p>
          </div>

          <div className="border-t border-white/10 pt-6">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                Direct link
              </label>
              <CopyButton text={directLinkCode} />
            </div>
            <div className="mt-2 flex items-center gap-2 rounded-[16px] border border-white/10 bg-white/[0.04] px-3 py-2.5">
              <ExternalLink className="h-4 w-4 shrink-0 text-white/50" />
              <span className="min-w-0 truncate text-sm text-white/70">{directLinkCode}</span>
            </div>
            <p className="mt-2 text-xs text-white/50">
              Share this link directly in emails, social media, or messaging apps.
            </p>
          </div>
        </div>
      </GlassSurface>

      <GlassSurface intensity="soft" className="rounded-[24px] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-white/70">
            <Code className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Need a custom integration?</p>
            <p className="mt-1 text-sm leading-6 text-white/70">
              Use the form API to submit leads programmatically. POST to{" "}
              <code className="rounded-md border border-white/10 bg-white/[0.06] px-1.5 py-0.5 text-xs font-mono text-white/70">
                /api/forms/{id}/submit
              </code>{" "}
              with a JSON body containing{" "}
              <code className="rounded-md border border-white/10 bg-white/[0.06] px-1.5 py-0.5 text-xs font-mono text-white/70">
                {"{ data: {...} }"}
              </code>
              .
            </p>
          </div>
        </div>
      </GlassSurface>
    </div>
  );
}
