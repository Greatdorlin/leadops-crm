/** Deterministic CRM routing; never interprets notes as instructions. */
export function questionIntent(input: string) {
  const text = input
    .trim()
    .replace(/^(?:(?:hi|hello|hey|yapper)[,!\s]+)+/i, "");
  if (
    /\b(objections?|pushbacks?|hesitations?|reasons? (?:for|why).*(?:lost|declin|reject)|why.*(?:not buying|not converting))\b/i.test(
      text,
    )
  )
    return "objections";
  if (
    /\b(?:perform(?:ing|ance)?|top (?:rep|staff|sales)|best (?:rep|staff|sales)|who.*(?:best|most sales)|ranking|leaderboard)\b/i.test(
      text,
    )
  )
    return "performance";
  if (
    /^(?:(?:can|could|would) you (?:help me )?|please )?(?:add|save|record|write|log)\b.*\b(?:note|contact|called)\b/i.test(
      text,
    ) ||
    /\b(?:I contacted|I called|I spoke (?:with|to))\b/i.test(text)
  )
    return "note";
  if (
    /^(?:find|search|look up|show (?:me )?(?:the )?lead)\b/i.test(text) ||
    (!/[?]/.test(text) && text.split(/\s+/).length <= 4)
  )
    return "search";
  return "unsupported";
}
