export type NoteEvidence = {
  id: string;
  leadId: string;
  name: string;
  note: string;
  createdAt: Date;
};
export const objectionThemes = [
  {
    key: "price",
    label: "Price or budget",
    pattern:
      /\b(?:too expensive|too costly|price is (?:high|too high|an issue)|pricing is (?:high|too high)|(?:it|this) costs too much|(?:the )?price (?:is |was )?beyond (?:their|my|our) budget|out of (?:their|my|our) budget|budget is (?:tight|limited)|cannot pay|can.t pay|payment plan|installments?|instalments?|cannot afford|can't afford|can’t afford|over (?:their |the |my )?budget|no budget|budget (?:constraint|issue|concern)|price (?:objection|concern|too high)|cost (?:concern|too high)|not affordable)\b/i,
  },
  {
    key: "timing",
    label: "Timing or readiness",
    pattern:
      /\b(?:not ready|next (?:month|quarter|year)|after (?:payday|the holidays)|not (?:the )?right time|bad timing|buy later|decide later|need(?:s)? more time|delay(?:ing|ed)? (?:the )?(?:purchase|decision)|postpone)\b/i,
  },
  {
    key: "trust",
    label: "Trust or proof",
    pattern:
      /\b(?:doesn'?t trust|do not trust|don’t trust|don't trust|lack of trust|trust (?:issue|concern)|need(?:s)? (?:more )?(?:proof|testimonials|references)|worried about (?:scam|credibility)|scam concern)\b/i,
  },
  {
    key: "fit",
    label: "Product fit or missing features",
    pattern:
      /\b(?:not (?:a )?(?:good |right )?fit|doesn'?t meet|does not meet|missing (?:a |the )?feature|lacks? (?:a |the )?feature|not (?:what|suitable)|wrong product)\b/i,
  },
  {
    key: "competition",
    label: "Competitor or existing supplier",
    pattern:
      /\b(?:prefer(?:s|red)? (?:a |the )?competitor|chose (?:a |the )?competitor|already (?:has|have|using|uses) (?:a |another )?(?:supplier|provider|solution)|staying with (?:their |the )?(?:provider|supplier)|competitor (?:is |was )?cheaper)\b/i,
  },
  {
    key: "approval",
    label: "Approval or decision maker",
    pattern:
      /\b(?:need(?:s)? (?:manager|board|partner|boss|internal) approval|waiting for (?:approval|sign.off)|not (?:the )?decision maker|decision maker (?:unavailable|not available))\b/i,
  },
];
/** Counts distinct leads, so repeated follow-up notes cannot inflate rankings. */
export function analyzeObjectionNotes(notes: NoteEvidence[]) {
  return objectionThemes
    .map((theme) => {
      const matched = notes.filter((row) =>
        row.note.split(/(?<=[.!?;\n])\s*/).some((sentence) => {
          if (
            /\b(?:no (?:longer )?(?:a |any )?(?:price |budget |timing |trust )?(?:objection|concern|issue)|(?:objection|concern|issue)(?: is| was| has been)? (?:resolved|overcome|cleared|addressed)|not an? (?:issue|objection|concern))\b/i.test(
              sentence,
            )
          )
            return false;
          return theme.pattern.test(sentence);
        }),
      );
      return {
        key: theme.key,
        label: theme.label,
        leadCount: new Set(matched.map((n) => n.leadId)).size,
        noteCount: matched.length,
        evidence: matched
          .slice(0, 3)
          .map((n) => ({
            id: n.id,
            leadId: n.leadId,
            name: n.name,
            excerpt: n.note.slice(0, 350),
            createdAt: n.createdAt.toISOString(),
          })),
      };
    })
    .filter((t) => t.leadCount > 0)
    .sort(
      (a, b) =>
        b.leadCount - a.leadCount ||
        b.noteCount - a.noteCount ||
        a.key.localeCompare(b.key),
    );
}
