import assert from "node:assert/strict";
import test from "node:test";
import { buildFormEmbedCodes } from "@/lib/crm/form-embed-code";

test("form embed codes use an absolute host and escape user-controlled titles", () => {
  const result = buildFormEmbedCodes({
    formId: "11111111-1111-4111-8111-111111111111",
    formName: 'Enquiry " onload="alert(1)',
    formSlug: "qualified-enquiry",
    baseUrl: "https://crm.example.com/admin/forms",
  });

  assert.equal(result.formUrl, "https://crm.example.com/forms/qualified-enquiry");
  assert.match(result.iframeCode, /&quot; onload=&quot;/);
  assert.doesNotMatch(result.iframeCode, /title="Enquiry " onload=/);
  assert.match(result.scriptCode, /iframe\.title = "Enquiry \\" onload=/);
});

test("form embed codes reject non-web origins", () => {
  assert.throws(() =>
    buildFormEmbedCodes({
      formId: "form",
      formName: "Form",
      formSlug: "form",
      baseUrl: "javascript:alert(1)",
    }),
  );
});
