import assert from "node:assert/strict";
import test from "node:test";
import { generateReport, toPublicGeneratedReport } from "./report-generator";
import { reportScenarios } from "./report-scenarios";

function assertCommonQuality(report: ReturnType<typeof generateReport>) {
  assert.ok(report.summaryDiagnosis.length > 40);
  assert.ok(report.firstPracticalStep.length > 30);
  assert.ok(report.recommendedOffer.description.length > 20);
  assert.ok(report.topMatches.length > 0);
  assert.equal(report.actionPlans.length, 5);
  assert.deepEqual(report.actionPlans.map((plan) => plan.title), [
    "30-day plan",
    "60-day plan",
    "90-day plan",
    "120-day plan",
    "180-day plan",
  ]);
  assert.ok(report.actionPlans.every((plan) => plan.steps.length >= 3));
  assert.ok(report.currentActionPlanTitle.length > 0);
  assert.ok(report.pathwayContrasts.length > 0);
  assert.ok(report.pathwayContrasts.length <= 3);
  assert.equal(report.pathwayContrasts[0]?.id, report.topMatches[0]?.id);
  assert.ok(report.pathwayContrasts.every((item) => item.fitReason.length > 20));
  assert.equal(report.problems.length, report.blockers.length);
  assert.ok(report.problems.every((item) => item.title.length > 0 && item.description.length > 0));
  assert.ok(report.studyGuidance);
  assert.ok(report.internalStudyGuidance);
  assert.doesNotMatch(report.summaryDiagnosis, /generic travel answer/i);
  assert.doesNotMatch(report.summaryDiagnosis, /\bunknown\b/i);
  assert.doesNotMatch(report.summaryDiagnosis, /\.\./);
  assert.doesNotMatch(report.firstPracticalStep, /\bunknown\b/i);
  assert.equal("matchedProductIds" in (report.studyGuidance ?? {}), false);
  assert.equal("advisorNotes" in (report.studyGuidance ?? {}), false);
  assert.doesNotMatch(JSON.stringify(report.studyGuidance), /study study/i);
  assert.doesNotMatch(JSON.stringify(report.studyGuidance), /2:2 qualification/i);
  assert.doesNotMatch(report.actionPlans.map((plan) => plan.steps.join(" ")).join(" "), /\bUk\b/);
}

test("report generator produces passport-first guidance when no passport exists", () => {
  const report = generateReport(reportScenarios.noPassport);

  assertCommonQuality(report);
  assert.equal(report.reportVersion.length > 0, true);
  assert.ok(report.firstPracticalStep.toLowerCase().includes("passport"));
  assert.ok(report.blockers.some((blocker) => blocker.id === "passport_missing"));
});

test("report generator flags prior refusal for careful review", () => {
  const report = generateReport(reportScenarios.priorRefusal);

  assertCommonQuality(report);
  assert.ok(report.blockers.some((blocker) => blocker.id === "previous_refusal"));
});

test("report generator keeps funding-sensitive profiles cost-aware", () => {
  const report = generateReport(reportScenarios.lowFundingReadiness);

  assertCommonQuality(report);
  assert.ok(
    report.blockers.some((blocker) => blocker.id === "funding_sensitivity") ||
      report.studyGuidance?.blockers.some((item) => item.toLowerCase().includes("budget")),
  );
});

test("report generator keeps destination-unknown profiles honest", () => {
  const report = generateReport(reportScenarios.destinationUnknown);

  assertCommonQuality(report);
  assert.ok(report.blockers.some((blocker) => blocker.id === "destination_clarity"));
  assert.ok(report.internalStudyGuidance?.missingFields.includes("destinationInterest"));
});

test("report generator preserves a Canada study-to-work signal", () => {
  const report = generateReport(reportScenarios.strongStudyToWorkFit);

  assertCommonQuality(report);
  assert.equal(report.studyGuidance?.country, "canada");
  assert.notEqual(report.readinessLevel, "Foundation");
});

test("report generator surfaces scholarship-oriented UK guidance", () => {
  const report = generateReport(reportScenarios.scholarshipFit);

  assertCommonQuality(report);
  assert.equal(report.studyGuidance?.country, "uk");
  assert.match(report.studyGuidance?.publicRecommendation ?? "", /scholarship|funding/i);
});

test("report generator pivots scholarship-seeking 2:2 UK profiles to the UK loan-backed route", () => {
  const report = generateReport(reportScenarios.ukScholarshipFallback);

  assertCommonQuality(report);
  assert.equal(report.studyGuidance?.country, "uk");
  assert.match(report.studyGuidance?.publicRecommendation ?? "", /loan/i);
  assert.match(
    report.studyGuidance?.financialReadinessSignals.join(" ") ?? "",
    /does not have an age limit/i,
  );
  assert.equal(
    report.studyGuidance?.routeRecommendations.some((route) =>
      /UK loan-supported route/i.test(route.publicRouteName),
    ),
    true,
  );
  assert.equal(
    report.studyGuidance?.routeRecommendations.some((route) =>
      /scholarship/i.test(route.publicRouteName),
    ),
    false,
  );
});

test("report generator only keeps the Canada loan route inside the 18 to 33 window", () => {
  const eligibleReport = generateReport(reportScenarios.canadaLoanEligible);
  const ageOutReport = generateReport(reportScenarios.canadaLoanAgeOut);

  assertCommonQuality(eligibleReport);
  assertCommonQuality(ageOutReport);
  assert.equal(
    eligibleReport.studyGuidance?.routeRecommendations.some((route) =>
      /Canada loan-supported diploma route/i.test(route.publicRouteName),
    ),
    true,
  );
  assert.equal(
    ageOutReport.studyGuidance?.routeRecommendations.some((route) =>
      /Canada loan-supported diploma route/i.test(route.publicRouteName),
    ),
    false,
  );
  assert.doesNotMatch(ageOutReport.studyGuidance?.publicPathwayName ?? "", /loan-supported/i);
});

test("report generator keeps internal study route names out of the public study guidance", () => {
  const report = generateReport(reportScenarios.canadaThirdClass);

  assertCommonQuality(report);
  assert.equal(report.studyGuidance?.publicPathwayName.includes("PRODUCT-"), false);
  assert.equal(
    report.studyGuidance?.publicRecommendation.includes("Schiller International University"),
    false,
  );
  assert.ok(report.internalStudyGuidance?.matchedProductIds.length);
});

test("report generator slows down preparation-first profiles before spending", () => {
  const report = generateReport(reportScenarios.preparationBeforeSpending);

  assertCommonQuality(report);
  assert.notEqual(report.readinessLevel, "Action-ready");
  assert.ok(report.blockers.length >= 2);
  assert.ok(
    report.blockers.some(
      (blocker) => blocker.id === "funding_sensitivity" || blocker.id === "language_test",
    ),
  );
});

test("report generator keeps study summary language polished for public-facing output", () => {
  const report = generateReport(reportScenarios.scholarshipFit);

  assertCommonQuality(report);
  assert.match(report.summaryDiagnosis, /competitive uk scholarship route/i);
  assert.match(report.summaryDiagnosis, /clearest route for you right now/i);
});

test("report generator personalizes longer action plans for later study stages", () => {
  const report = generateReport(reportScenarios.strongStudyToWorkFit);

  assertCommonQuality(report);
  assert.equal(report.currentActionPlanTitle, "60-day plan");
  assert.match(report.actionPlans[3]?.steps.join(" "), /funding strategy|scholarship/i);
  assert.match(report.actionPlans[4]?.steps.join(" "), /visa|housing|arrival/i);
});

test("study report includes v2 route hierarchy and advisor checks", () => {
  const report = generateReport(reportScenarios.franceHndNoPassport);
  const guidance = report.studyGuidance;

  assertCommonQuality(report);
  assert.ok(guidance?.routeRecommendations.some((route) => route.role === "primary"));
  assert.ok(guidance?.routeRecommendations.some((route) => route.role === "backup"));
  assert.ok(guidance?.routeRecommendations.some((route) => route.role === "not_recommended"));
  assert.ok((guidance?.publicReadinessSignals.length ?? 0) >= 3);
  assert.match(guidance?.publicRecommendation ?? "", /France/i);
  assert.doesNotMatch(guidance?.questionsToAsk.join(" ") ?? "", /valid passport/i);
});

test("public study report keeps finance and internal provider details private", () => {
  const publicReport = toPublicGeneratedReport(generateReport(reportScenarios.ukDependantsSupport));
  const serialized = JSON.stringify(publicReport.studyGuidance);

  assert.ok(publicReport.studyGuidance);
  assert.ok(publicReport.pathwayContrasts.length > 0);
  assert.ok(publicReport.problems.length > 0);
  assert.equal("financialSnapshot" in (publicReport.studyGuidance ?? {}), false);
  assert.doesNotMatch(serialized, /University of Manchester|Schiller International|Study Now Pay Later/i);
  assert.doesNotMatch(serialized, /£|€|\$|GBP|EUR|USD|Study Now Pay Later|Schiller International|University of Manchester/i);
  assert.match(serialized, /loan-supported/i);
  assert.doesNotMatch(serialized, /postgraduate/i);
});

test("public report rebuilds pathway contrasts and problems for legacy stored reports", () => {
  const baseReport = generateReport(reportScenarios.strongStudyToWorkFit);
  const legacyReport = {
    ...baseReport,
    pathwayContrasts: undefined,
    problems: undefined,
  };

  const publicReport = toPublicGeneratedReport(
    legacyReport as unknown as ReturnType<typeof generateReport>,
  );

  assert.equal(publicReport.pathwayContrasts.length, publicReport.topMatches.length);
  assert.equal(publicReport.problems.length, publicReport.blockers.length);
  assert.equal(publicReport.pathwayContrasts[0]?.id, publicReport.topMatches[0]?.id);
  assert.equal(publicReport.problems[0]?.title, publicReport.blockers[0]?.title);
});
