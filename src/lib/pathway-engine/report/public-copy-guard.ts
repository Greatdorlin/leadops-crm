import type { PublicPathwayReport } from "./public-report.types";

const BANNED_PUBLIC_TERMS = [
  "Advisor's Insight",
  "Advisor Insight",
  "Advisor note",
  "Advisor Notes",
  "advisor reason",
  "advisor summary",
  "advisor only",
  "internal",
  "internal provider",
  "internal routing",
  "route stack",
  "Path fit",
  "path fit",
  "score",
  "algorithm",
  "sophisticated assessment",
  "Fly Connect needs to",
  "Fly Connect should",
  "candidate should",
  "applicant should",
  "support answer",
  "route is solid",
  "institutional requirements",
  "funding documentation strategy",
  "route execution",
  "route clearance",
  "proof of resources",
  "move her",
  "move him",
  "optimal route",
];

const PUBLIC_MONEY_PATTERN =
  /(?:£|€|\$|₦|CAD|USD|GBP|EUR|NZD)\s?\d[\d,]*(?:\.\d+)?|\d[\d,]*(?:\.\d+)?\s?(?:GBP|EUR|USD|CAD|NZD|pounds?|euros?|dollars?|naira)|\d+(?:\.\d+)?%\s?(?:interest|scholarship|deposit|loan|repayment|tuition|funding)/gi;

const INTERNAL_FIELD_KEYS = [
  "advisorNotes",
  "advisorSummary",
  "advisorReason",
  "advisorInsights",
  "advisorReview",
  "internalProviderNotes",
  "internalFinancialDetails",
  "routeScores",
  "decisionSignals",
  "rejectedSignals",
  "blockedRouteIds",
  "knowledgeControl",
  "sourceModule",
  "reviewStatus",
  "volatility",
];

export function sanitizePublicText(input: string): string {
  let output = input;

  output = output.replace(/Fly Connect needs to/gi, "Your next step is to");
  output = output.replace(/Fly Connect should/gi, "Your next step is to");
  output = output.replace(/the applicant should/gi, "you should");
  output = output.replace(/applicant should/gi, "you should");
  output = output.replace(/the candidate should/gi, "you should");
  output = output.replace(/candidate should/gi, "you should");
  output = output.replace(/\bwe need to confirm\b/gi, "you need to confirm");
  output = output.replace(/\bwe recommend\b/gi, "you should");
  output = output.replace(/institutional requirements/gi, "application requirements");
  output = output.replace(/route execution/gi, "application process");
  output = output.replace(/route clearance/gi, "before applications begin");
  output = output.replace(/support answer/gi, "support option");
  output = output.replace(/route is solid/gi, "route remains workable");
  output = output.replace(/funding documentation strategy/gi, "funding plan");
  output = output.replace(/proof of resources/gi, "proof of funds");
  output = output.replace(/optimal route/gi, "strongest route");
  output = output.replace(
    /Schiller International University/gi,
    "the flexible France route",
  );
  output = output.replace(
    /University of Manchester Global Futures Scholarship/gi,
    "the merit-based UK route",
  );
  output = output.replace(
    /UK Study Now Pay Later \/ UK Tuition Deposit Loan/gi,
    "the UK tuition-support option",
  );
  output = output.replace(
    /Canada Study Now Pay Later Diploma Programme/gi,
    "the Canada study-support option",
  );
  output = output.replace(PUBLIC_MONEY_PATTERN, "the required financial amount");

  return output.replace(/\s{2,}/g, " ").trim();
}

export function sanitizePublicReport<T>(report: T): T {
  return JSON.parse(
    JSON.stringify(report, (_key, value) => {
      if (typeof value === "string") {
        return sanitizePublicText(value);
      }

      return value;
    }),
  ) as T;
}

export function collectPublicReportViolations(report: unknown): string[] {
  const text = JSON.stringify(report ?? {});
  const violations = new Set<string>();

  for (const term of BANNED_PUBLIC_TERMS) {
    if (text.toLowerCase().includes(term.toLowerCase())) {
      violations.add(`banned phrase: ${term}`);
    }
  }

  const financeMatches = text.match(PUBLIC_MONEY_PATTERN);
  if (financeMatches?.length) {
    violations.add(
      `public report exposes exact financial detail: ${[
        ...new Set(financeMatches),
      ].join(", ")}`,
    );
  }

  for (const key of INTERNAL_FIELD_KEYS) {
    if (text.includes(`"${key}"`)) {
      violations.add(`internal field leaked: ${key}`);
    }
  }

  return [...violations];
}

export function validatePublicReport(report: PublicPathwayReport): void {
  const violations = collectPublicReportViolations(report);

  if (violations.length > 0) {
    throw new Error(
      `Public report contains banned internal language:\n- ${violations.join("\n- ")}`,
    );
  }
}

export function assertPublicReportSafe(report: PublicPathwayReport): void {
  validatePublicReport(report);
}
