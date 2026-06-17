import type { AssessmentAnswers, LeadSegment, OfferRecommendation, PathwayId } from "./types";

function consultationOffer(label = "Book My Personalized Pathway Review"): OfferRecommendation {
  return {
    id: "pathway_review",
    title: "Personalized Pathway Review",
    description:
      "Speak with the Fly Connect consultation team to review your result, pressure-test your route, and decide your next practical step.",
    ctaLabel: label,
  };
}

export function getRecommendedOffer(
  answers: AssessmentAnswers,
  segment: LeadSegment,
  primaryPathway: PathwayId,
): OfferRecommendation {
  if (segment === "Consultation priority") {
    return consultationOffer();
  }

  if (primaryPathway === "passport_readiness") {
    return {
      id: "passport_readiness_support",
      title: "Passport Readiness Starter Guidance",
      description:
        "Start with the practical checklist that gets your travel foundation right before you spend on the wrong next move.",
      ctaLabel: "Get My Passport Readiness Plan",
    };
  }

  if (primaryPathway === "scholarship_funded_study") {
    return {
      id: "funded_study_review",
      title: "Supported Study Strategy Session",
      description:
        "Review study countries, scholarship fit, loan-backed alternatives, and the cleanest funding strategy before committing to a route.",
      ctaLabel: "Review Supported Study Options",
    };
  }

  if (primaryPathway === "business_trade_travel" || primaryPathway === "conference_event_travel") {
    return {
      id: "business_travel_strategy",
      title: "Business Travel Strategy Review",
      description:
        "Clarify the event, market, or supplier travel route most worth pursuing first.",
      ctaLabel: "Plan My Business Travel Route",
    };
  }

  if (answers.primaryGoal === "work_and_relocate") {
    return {
      id: "work_route_readiness",
      title: "Work Route Readiness Review",
      description:
        "Review how your background, experience, and test readiness affect your strongest work pathway direction.",
      ctaLabel: "Review My Work Route",
    };
  }

  return consultationOffer("Speak With the Pathway Team");
}
