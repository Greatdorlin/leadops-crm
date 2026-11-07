/** Deterministic CRM routing; never interprets notes as instructions. */
export function questionIntent(input: string) {
  const text = input
    .trim()
    .replace(/^(?:(?:hi|hello|hey|yapper)[,!\s]+)+/i, "");
  if (/\b(?:automation|automate|routing rule)\b/i.test(text)) return "automation";
  if (
    /\b(objections?|pushbacks?|hesitations?|concerns?|complaints?|push.?back|reasons? (?:for|why).*(?:lost|declin|reject)|why.*(?:not buying|not converting))\b/i.test(
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
  if (/\b(?:notes?|say|said|saying|feedback|mentioned|mentions|conversation|spoke|discussed)\b/i.test(text)) return "notes";
  if (
    /^(?:(?:(?:can|could|would) you|please)\s+)?(?:is there|do we have|find|search|look (?:up|for)|show (?:me )?(?:the |a )?lead)\b/i.test(text) ||
    (!/[?]/.test(text) && text.split(/\s+/).length <= 4)
  )
    return "search";
  return "unsupported";
}
