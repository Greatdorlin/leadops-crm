import { leadSearchQuery } from "./search-query";
export function parseNoteQuestion(question: string, now = new Date()) {
  const text = question.trim();
  let since: Date | undefined;
  let period = "All time";
  if (/\bthis month\b/i.test(text)) { since = new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1)); period = "This month (UTC)"; }
  else if (/\b(?:this week|last 7 days)\b/i.test(text)) { since = new Date(now.getTime()-7*86400000); period = "Last 7 days"; }
  else if (/\b(?:today|last 24 hours)\b/i.test(text)) { since = new Date(now.getTime()-86400000); period = "Last 24 hours"; }
  const quoted = text.match(/["“]([^"”]{2,120})["”]/)?.[1];
  const name = text.match(/\bwhat (?:did|has)\s+(.+?)\s+(?:say|said|mention|tell|discuss)/i)?.[1]
    ?? text.match(/\b([\p{L}][\p{L} .-]{1,80})[’']s (?:main |latest )?(?:notes|objections|feedback)/iu)?.[1]
    ?? text.match(/\b(?:notes?|objections?|concerns?|feedback)\s+(?:for|from|on|about)\s+(.+?)(?=\s+(?:this month|this week|today|last \d+ days|about)|[?!.]|$)/i)?.[1];
  const generic = /^(?:our |the |all |my )?(?:(?:new|won|lost|qualified|contacted|proposal) )?(?:leads?|customers?|clients?|team|sales|price|pricing|cost|budget|payment|timing|trust|approval|competitors?|product fit)(?:\b|$)/i;
  const leadQuery = name && !quoted && !generic.test(name) ? leadSearchQuery(name) : undefined;
  const topic = /\b(?:price|pricing|cost|expensive|budget|afford)\b/i.test(text) ? "price"
    : /\b(?:timing|ready|readiness|delay)\b/i.test(text) ? "timing"
    : /\b(?:trust|proof|testimonials?)\b/i.test(text) ? "trust"
    : /\b(?:competitor|supplier)\b/i.test(text) ? "competition"
    : /\b(?:approval|decision maker)\b/i.test(text) ? "approval" : undefined;
  const stageKey = text.match(/\b(new|qualified|won|lost|contacted|proposal)\s+(?:leads?|customers?|clients?)\b/i)?.[1]?.toLowerCase();
  return { since, period, leadQuery, topic, phrase: quoted, stageKey };
}
