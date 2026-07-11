function escapeHtmlAttribute(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function buildFormEmbedCodes(input: {
  formId: string;
  formName: string;
  formSlug: string;
  baseUrl: string;
}) {
  const baseUrl = new URL(input.baseUrl);
  if (baseUrl.protocol !== "https:" && baseUrl.protocol !== "http:") {
    throw new Error("Form embeds require an HTTP or HTTPS application URL.");
  }

  const formUrl = new URL(
    `/forms/${encodeURIComponent(input.formSlug)}`,
    baseUrl,
  ).toString();
  const escapedFormUrl = escapeHtmlAttribute(formUrl);
  const escapedTitle = escapeHtmlAttribute(input.formName);
  const containerId = `leads-desk-form-${input.formId.replace(/[^a-z0-9_-]/gi, "")}`;

  const iframeCode = `<iframe
  src="${escapedFormUrl}"
  width="100%"
  height="600"
  frameborder="0"
  style="border: none; border-radius: 16px;"
  title="${escapedTitle}"
></iframe>`;

  const scriptCode = `<div id="${containerId}"></div>
<script>
  (function() {
    var container = document.getElementById(${JSON.stringify(containerId)});
    if (!container) return;
    var iframe = document.createElement("iframe");
    iframe.src = ${JSON.stringify(formUrl)};
    iframe.width = "100%";
    iframe.height = "600";
    iframe.frameBorder = "0";
    iframe.style.border = "none";
    iframe.style.borderRadius = "16px";
    iframe.title = ${JSON.stringify(input.formName)};
    container.appendChild(iframe);
  })();
</script>`;

  return {
    formUrl,
    iframeCode,
    scriptCode,
    wordpressCode: `[iframe src="${escapedFormUrl}" width="100%" height="600" frameborder="0" style="border:none;border-radius:16px;" title="${escapedTitle}"]`,
  };
}
