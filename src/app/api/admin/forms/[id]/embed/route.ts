import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageFormSources } from "@/lib/crm/authz";
import { getFormById } from "@/lib/crm/form-builder-store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageFormSources(context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;
  const form = await getFormById(id);
  if (!form) {
    return NextResponse.json({ error: "Form not found." }, { status: 404 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const formUrl = `${baseUrl}/forms/${form.slug}`;
  
  const iframeCode = `<iframe
  src="${formUrl}"
  width="100%"
  height="600"
  frameborder="0"
  style="border: none; border-radius: 12px;"
  title="${form.name}"
></iframe>`;

  const scriptCode = `<script>
  (function() {
    var d = document;
    var f = d.createElement('iframe');
    f.src = '${formUrl}';
    f.width = '100%';
    f.height = '600';
    f.frameBorder = '0';
    f.style.border = 'none';
    f.style.borderRadius = '12px';
    f.title = '${form.name}';
    var c = d.currentScript;
    if (c && c.parentNode) c.parentNode.insertBefore(f, c);
  })();
</script>`;

  const wordpressCode = `[iframe src="${formUrl}" width="100%" height="600" frameborder="0" style="border:none;border-radius:12px;" title="${form.name}"]`;

  return NextResponse.json({
    formId: id,
    formSlug: form.slug,
    formUrl,
    iframeCode,
    scriptCode,
    wordpressCode,
  });
}
