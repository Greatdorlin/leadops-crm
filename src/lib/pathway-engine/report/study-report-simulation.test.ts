import assert from "node:assert/strict";
import test from "node:test";
import { emptyAnswers } from "@/lib/assessment/defaults";
import { generateReport, toPublicGeneratedReport } from "../report-generator";
import { collectPublicReportViolations } from "./public-copy-guard";
import { buildPublicStudyReport } from "./build-public-study-report";
import { getStudyGuidance } from "../study-knowledge";
import {
  isCanadaLoanAgeEligible,
  isCanadaLoanAcademicEligible,
  isUkScholarshipEligible,
} from "../support-rules";
import type { AssessmentAnswers } from "../types";

type Persona = {
  key: string;
  overrides: Partial<AssessmentAnswers>;
};

type DestinationVariant = {
  key: string;
  overrides: Partial<AssessmentAnswers>;
};

function buildStudyAnswers(overrides: Partial<AssessmentAnswers>): AssessmentAnswers {
  return {
    ...emptyAnswers,
    firstName: "Amara",
    primaryGoal: "study_abroad",
    countryClarity: "yes",
    destinationInterest: "canada",
    studyLevel: "postgraduate",
    ageRange: "25_27",
    highestEducation: "bachelors",
    studyFundingReadiness: "self_fund",
    workField: "tech",
    workExperienceYears: "3_5",
    languageTestStatus: "valid_result",
    passportStatus: "valid",
    passportValidity: "24_plus",
    timeline: "6_12_months",
    fundingReadiness: "cover_travel_settlement",
    previousRefusal: "no",
    ...overrides,
  };
}

const personas: Persona[] = [
  {
    key: "first-class-scholarship",
    overrides: {
      highestEducation: "first_class",
      studyFundingReadiness: "scholarship_support",
      fundingReadiness: "need_support",
    },
  },
  {
    key: "strong-2-1-scholarship",
    overrides: {
      highestEducation: "second_class_upper",
      studyFundingReadiness: "scholarship_support",
      fundingReadiness: "need_support",
    },
  },
  {
    key: "2-2-self-funded",
    overrides: {
      highestEducation: "second_class_lower",
      studyFundingReadiness: "self_fund",
      fundingReadiness: "cover_tests_docs",
    },
  },
  {
    key: "third-class-practical",
    overrides: {
      highestEducation: "third_class",
      studyFundingReadiness: "payment_plan",
      fundingReadiness: "cover_tests_docs",
    },
  },
  {
    key: "hnd-lower-flexible",
    overrides: {
      highestEducation: "hnd_lower_credit",
      studyFundingReadiness: "self_fund",
      studyLevel: "postgraduate",
    },
  },
  {
    key: "hnd-upper-loan",
    overrides: {
      highestEducation: "hnd_upper_credit",
      studyFundingReadiness: "loan_support",
      fundingReadiness: "need_support",
      studyLevel: "diploma_foundation",
      ageRange: "28_33",
    },
  },
  {
    key: "waec-loan-young",
    overrides: {
      highestEducation: "secondary_school",
      studyFundingReadiness: "loan_support",
      fundingReadiness: "need_support",
      studyLevel: "diploma_foundation",
      ageRange: "18_24",
    },
  },
  {
    key: "bachelors-unknown",
    overrides: {
      highestEducation: "bachelors",
      studyFundingReadiness: "self_fund",
      fundingReadiness: "cover_travel_settlement",
    },
  },
  {
    key: "older-age-out-loan",
    overrides: {
      highestEducation: "second_class_lower",
      studyFundingReadiness: "loan_support",
      fundingReadiness: "need_support",
      ageRange: "40_plus",
      studyLevel: "postgraduate",
    },
  },
  {
    key: "passport-and-refusal-caution",
    overrides: {
      passportStatus: "no_passport",
      passportValidity: "not_applicable",
      previousRefusal: "yes",
      languageTestStatus: "not_taken",
      timeline: "immediately",
      studyFundingReadiness: "application_costs",
      fundingReadiness: "lowest_cost",
    },
  },
];

const destinationVariants: DestinationVariant[] = [
  {
    key: "uk",
    overrides: {
      countryClarity: "yes",
      destinationInterest: "uk",
    },
  },
  {
    key: "canada",
    overrides: {
      countryClarity: "yes",
      destinationInterest: "canada",
    },
  },
  {
    key: "france",
    overrides: {
      countryClarity: "yes",
      destinationInterest: "france",
    },
  },
  {
    key: "new-zealand",
    overrides: {
      countryClarity: "yes",
      destinationInterest: "new_zealand",
    },
  },
  {
    key: "exploratory",
    overrides: {
      countryClarity: "need_recommendations",
      destinationInterest: "not_sure",
      studyLevel: "not_sure",
    },
  },
];

const simulations = personas.flatMap((persona) =>
  destinationVariants.map((destination) => {
    const answers = buildStudyAnswers({
      ...persona.overrides,
      ...destination.overrides,
    });

    return {
      id: `${persona.key}__${destination.key}`,
      answers,
    };
  }),
);

test("study report stress test covers 50 simulation profiles without leaking internal guidance", async (t) => {
  assert.equal(simulations.length, 50);

  for (const simulation of simulations) {
    await t.test(simulation.id, () => {
      const report = generateReport(simulation.answers);
      const publicGeneratedReport = toPublicGeneratedReport(report, simulation.answers);
      const publicStudyReport = buildPublicStudyReport({
        answers: simulation.answers,
        guidance: getStudyGuidance(simulation.answers),
      });
      const publicGeneratedSerialized = JSON.stringify(publicGeneratedReport.studyGuidance);
      const publicStudySerialized = JSON.stringify(publicStudyReport);
      const publicViolations = collectPublicReportViolations(publicStudyReport);

      assert.ok(report.studyGuidance, "expected internal study guidance");
      assert.ok(report.internalStudyGuidance, "expected internal advisor guidance");
      assert.ok(report.summaryDiagnosis.length > 40, "summary diagnosis should be substantial");
      assert.ok(report.firstPracticalStep.length > 20, "first step should be useful");
      assert.ok(report.topMatches.length > 0, "top matches should exist");
      assert.ok(report.pathwayContrasts.length > 0, "pathway contrasts should exist");
      assert.ok(Array.isArray(report.blockers), "blockers should stay as an array");
      assert.ok(
        report.blockers.length > 0 || report.readinessLevel !== "Foundation",
        "stronger profiles may have no blockers, but weak profiles should not be blocker-free",
      );
      assert.equal(report.actionPlans.length, 5, "action plans should stay complete");

      assert.ok(publicGeneratedReport.studyGuidance, "public generated report should keep public study guidance");
      assert.ok(publicStudyReport.hero.opening.length > 40, "public report opening should be substantial");
      assert.ok(publicStudyReport.primaryRoute.title.length > 10, "public report needs a meaningful route title");
      assert.ok(publicStudyReport.snapshot.items.length >= 4, "snapshot should remain populated");
      assert.equal(publicViolations.length, 0, "public report copy should stay safe");

      assert.doesNotMatch(publicGeneratedSerialized, /advisorNotes|internalStudyGuidance|matchedProductIds|triggeredRuleIds/i);
      assert.doesNotMatch(publicGeneratedSerialized, /University of Manchester|Schiller International|Study Now Pay Later|PRODUCT-/i);
      assert.doesNotMatch(publicGeneratedSerialized, /£|€|\$|GBP|EUR|USD/i);
      assert.doesNotMatch(
        publicStudySerialized,
        /advisorNotes|internalStudyGuidance|matchedProductIds|triggeredRuleIds|knowledgeControl|sourceModule|reviewStatus|volatility/i,
      );

      if (simulation.answers.passportStatus === "no_passport") {
        assert.match(report.firstPracticalStep, /passport/i);
        assert.ok(report.blockers.some((blocker) => blocker.id === "passport_missing"));
        assert.match(publicStudyReport.hero.opening, /passport/i);
      }

      if (simulation.answers.previousRefusal === "yes") {
        assert.ok(report.blockers.some((blocker) => blocker.id === "previous_refusal"));
        assert.match(publicStudyReport.hero.opening, /refusal|review/i);
      }

      if (
        simulation.answers.destinationInterest === "uk" &&
        simulation.answers.studyFundingReadiness === "scholarship_support" &&
        isUkScholarshipEligible(simulation.answers)
      ) {
        assert.match(report.studyGuidance?.publicRecommendation ?? "", /scholarship|funding/i);
      }

      if (
        simulation.answers.destinationInterest === "canada" &&
        simulation.answers.studyFundingReadiness === "loan_support" &&
        isCanadaLoanAgeEligible(simulation.answers) &&
        isCanadaLoanAcademicEligible(simulation.answers)
      ) {
        assert.equal(
          report.studyGuidance?.routeRecommendations.some((route) =>
            /loan-supported/i.test(route.publicRouteName),
          ),
          true,
        );
      }

      if (
        simulation.answers.destinationInterest === "canada" &&
        simulation.answers.studyFundingReadiness === "loan_support" &&
        !isCanadaLoanAgeEligible(simulation.answers)
      ) {
        assert.equal(
          report.studyGuidance?.routeRecommendations.some((route) =>
            /loan-supported/i.test(route.publicRouteName),
          ),
          false,
        );
      }

      if (simulation.answers.destinationInterest === "not_sure") {
        assert.equal(
          publicStudyReport.snapshot.items.some(
            (item) =>
              item.label === "Preferred destination" && /not sure|recommend/i.test(item.value),
          ),
          true,
        );
        assert.ok(publicStudyReport.hero.opening.length > 30);
      }
    });
  }
});
