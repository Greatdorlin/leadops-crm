import assert from "node:assert/strict";
import test from "node:test";
import { REPORT_ACCURACY_WARNING } from "../report-knowledge";
import { reportScenarios } from "../report-scenarios";
import type { AssessmentAnswers } from "../types";
import { getStudyGuidance } from "../study-knowledge";
import { buildPublicStudyReport, buildPublicStudyReportPayload } from "./build-public-study-report";
import { collectPublicReportViolations } from "./public-copy-guard";

function buildReport(answers: AssessmentAnswers) {
  return buildPublicStudyReport({
    answers,
    guidance: getStudyGuidance(answers),
  });
}

function reportText(report: ReturnType<typeof buildReport>) {
  return JSON.stringify(report);
}

function assertNoUnsafeLanguage(text: string) {
  assert.doesNotMatch(text, /\byou qualify\b/i);
  assert.doesNotMatch(text, /pathway logic|grouped to avoid repeated document rows|document completeness/i);
}

test("public report payload separates public, advisor, and internal report data", () => {
  const payload = buildPublicStudyReportPayload({
    answers: reportScenarios.ukDependantsSupport,
    guidance: getStudyGuidance(reportScenarios.ukDependantsSupport),
  });

  assert.equal(payload.publicReport.reportType, "public_pathway_report");
  assert.ok(payload.advisorReport);
  assert.ok(payload.internalDecision);
  assert.equal("advisorNotes" in payload.publicReport, false);
  assert.equal("knowledgeControl" in payload.publicReport, false);
  assert.equal(payload.publicReport.metadata.accuracyNotice, REPORT_ACCURACY_WARNING);
  assert.equal(payload.publicReport.snapshot.title, "Your submitted profile");
  assert.ok(payload.publicReport.fundingChecks.length >= 3);
});

test("public study report does not expose advisor or internal language", () => {
  const report = buildReport(reportScenarios.ukDependantsSupport);
  const text = reportText(report);

  assert.equal(text.includes("advisorNotes"), false);
  assert.equal(text.includes("advisorSummary"), false);
  assert.equal(text.includes("knowledgeControl"), false);
  assert.equal(text.includes("sourceModule"), false);
  assert.equal(text.includes("reviewStatus"), false);
  assert.equal(text.includes("volatility"), false);
  assert.equal(text.includes("routeScores"), false);
  assertNoUnsafeLanguage(text);
});

test("scenario 1: UK scholarship potential fit stays competitive and non-guaranteed", () => {
  const report = buildReport(reportScenarios.ukScholarshipStrong);
  const scholarshipCheck = report.fundingChecks.find((item) => item.title === "Scholarship review");

  assert.equal(report.primaryRoute.countryLabel, "United Kingdom");
  assert.ok(scholarshipCheck);
  assert.equal(scholarshipCheck?.statusLabel, "Potential fit for review");
  assert.match(scholarshipCheck?.body ?? "", /competitive|not guaranteed/i);
  assert.match(report.smartNextSteps[0]?.body ?? "", /competitive|backup/i);
  assertNoUnsafeLanguage(reportText(report));
});

test("scenario 2: weak UK scholarship request does not pretend scholarship fit", () => {
  const report = buildReport(reportScenarios.ukScholarshipWeak);
  const scholarshipCheck = report.fundingChecks.find((item) => item.title === "Scholarship review");

  assert.ok(scholarshipCheck);
  assert.equal(scholarshipCheck?.statusLabel, "Not the strongest fit from your answers");
  assert.match(scholarshipCheck?.nextAction ?? "", /support route|self-funded|backup/i);
  assert.doesNotMatch(report.primaryRoute.title, /scholarship/i);
  assertNoUnsafeLanguage(reportText(report));
});

test("scenario 3: Canada loan potential fit stays soft and review-led", () => {
  const report = buildReport(reportScenarios.canadaLoanEligible);
  const loanCheck = report.fundingChecks.find((item) => item.title === "Loan-supported route");

  assert.ok(
    report.primaryRoute.title.includes("Loan-supported") ||
      report.supportingRoutes.some((route) => route.title.includes("Loan-supported")),
  );
  assert.equal(loanCheck?.statusLabel, "Potential fit for review");
  assert.match(`${loanCheck?.body} ${loanCheck?.nextAction}`, /age|academic|funding conditions|applications/i);
  assertNoUnsafeLanguage(reportText(report));
});

test("scenario 4: Canada loan age-out does not push loan as the main plan", () => {
  const report = buildReport(reportScenarios.canadaLoanAgeOut);
  const loanCheck = report.fundingChecks.find((item) => item.title === "Loan-supported route");

  assert.doesNotMatch(report.primaryRoute.title, /Loan-supported/i);
  assert.equal(loanCheck?.statusLabel, "Age window may not fit");
  assert.match(loanCheck?.nextAction ?? "", /graduate certificate|funding route/i);
});

test("scenario 5: Canada graduate certificate stays separate from loan language", () => {
  const report = buildReport(reportScenarios.canadaGraduateCertificateSelfFund);

  assert.equal(report.primaryRoute.title, "Canada graduate certificate pathway");
  assert.doesNotMatch(report.smartNextSteps.map((step) => step.title).join(" "), /loan/i);
  assert.match(
    report.fundingChecks.find((item) => item.title === "Funding plan")?.body ?? "",
    /payment plan|self-funded|funding plan/i,
  );
});

test("scenario 6: flexible France route stays primary for HND and third-class style profiles", () => {
  const report = buildReport(reportScenarios.franceFlexibleHnd);

  assert.equal(report.primaryRoute.title, "Flexible France business and technology study route");
  assert.doesNotMatch(report.primaryRoute.title, /Business-focused France study route/i);
  assert.match(report.primaryRoute.reason, /flexible France pathway|flexible study direction/i);
});

test("scenario 7: strong academic France route can stay primary without overpromising", () => {
  const report = buildReport(reportScenarios.franceStrongAcademic);

  assert.equal(report.primaryRoute.title, "Business-focused France study route");
  assert.match(
    report.fundingChecks.find((item) => item.title === "Funding plan")?.body ?? "",
    /funding|evidence|review/i,
  );
  assertNoUnsafeLanguage(reportText(report));
});

test("scenario 8: no passport pauses execution and makes passport the first next step", () => {
  const report = buildReport(reportScenarios.noPassport);

  assert.equal(report.blockers[0]?.title, "Passport not ready");
  assert.match(report.smartNextSteps[0]?.title ?? "", /passport/i);
  assert.match(report.hero.opening, /passport/i);
});

test("scenario 9: previous refusal gets calm high-priority handling", () => {
  const report = buildReport(reportScenarios.priorRefusal);

  assert.equal(report.blockers[0]?.title, "Previous refusal needs review");
  assert.match(report.smartNextSteps[0]?.title ?? "", /refusal/i);
  assert.match(report.hero.opening, /previous refusal needs review/i);
});

test("scenario 10: strong self-funded profile does not push support calls to action", () => {
  const report = buildReport(reportScenarios.selfFundedStrongProfile);
  const joined = report.smartNextSteps.map((step) => `${step.title} ${step.body}`).join(" ");

  assert.match(report.hero.opening, /self-funding/i);
  assert.doesNotMatch(joined, /loan support|scholarship-first/i);
  assert.equal(
    report.fundingChecks.find((item) => item.title === "Loan-supported route")?.statusLabel,
    "Not requested",
  );
});

test("scenario 11: unsupported or not-sure destinations stay transparent about live route coverage", () => {
  const unknownReport = buildReport(reportScenarios.destinationUnknown);
  const unsupportedReport = buildReport(reportScenarios.unsupportedDestination);

  assert.match(unknownReport.hero.opening, /closest pathway to review|recommend confidently today/i);
  assert.match(unsupportedReport.hero.opening, /closest pathway to review|recommend confidently today/i);
  assert.equal(
    unsupportedReport.snapshot.items.find((item) => item.label === "Preferred destination")?.value,
    "USA",
  );
});

test("scenario 12: bachelors unknown and professional certification stay cautious", () => {
  const bachelorsReport = buildReport(reportScenarios.bachelorsUnknown);
  const professionalReport = buildReport(reportScenarios.professionalCertification);

  assert.equal(
    bachelorsReport.snapshot.items.find((item) => item.label === "Education level")?.value,
    "Bachelor's degree (not sure of class)",
  );
  assert.equal(
    professionalReport.snapshot.items.find((item) => item.label === "Education level")?.value,
    "Professional certification",
  );
  assert.doesNotMatch(`${bachelorsReport.hero.opening} ${professionalReport.hero.opening}`, /strong academic/i);
  assert.match(reportText(bachelorsReport), /final programme match should be confirmed during review/i);
});

test("public report keeps route choice and backup pathways meaningful", () => {
  const report = buildReport(reportScenarios.canadaLoanWaecEligible);

  assert.equal(report.primaryRoute.role, "primary");
  assert.ok(report.backupRoutes.length > 0 || report.supportingRoutes.length > 0);
  assert.ok(
    [...report.backupRoutes, ...report.supportingRoutes].every(
      (route) => route.reason.length > 40 && route.reason !== report.primaryRoute.reason,
    ),
  );
});

test("public report guard catches banned phrases", () => {
  const violations = collectPublicReportViolations({
    title: "Advisor note",
    body: "Fly Connect needs to secure funding documentation strategy.",
  });

  assert.ok(violations.length > 0);
});
