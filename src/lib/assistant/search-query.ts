/** Accept a name, email, company, or an explicit request to find one. */
export function leadSearchQuery(input: string) {
  return input.trim()
    .replace(/^(?:(?:hi|hey|hello|yapper)[,!\s]+)+/i, "")
    .replace(/^(?:(?:can|could|would) you\s+|please\s+|help me\s+)*/i, "")
    .replace(/^(?:is there|do we have)\s+/i, "")
    .replace(/^(?:find|search(?:\s+for)?|look\s+(?:up|for)|show(?:\s+me)?|get(?:\s+me)?)\s*/i, "")
    .replace(/^(?:(?:the|a|an)\s+)?(?:lead|contact|customer)\b(?:\s+(?:named|called|with (?:the )?name|for))?\s*/i, "")
    .replace(/^(?:named|called|for)\s+/i, "")
    .replace(/[?!.]+$/, "").replace(/^["“']|["”']$/g, "").replace(/\s+/g, " ").trim();
}
export function isLeadIdentityMatch(query: string, lead: { firstName: string; lastName?: string | null; email?: string | null; companyName?: string | null }) {
  const normalize = (v: string) => v.normalize("NFKC").toLocaleLowerCase().replace(/\s+/g," ").trim();
  const terms = normalize(query).split(" ").filter(Boolean);
  return terms.length > 0 && [lead.firstName + " " + (lead.lastName ?? ""), lead.email ?? "", lead.companyName ?? ""].some(v => terms.every(term => normalize(v).includes(term)));
}
