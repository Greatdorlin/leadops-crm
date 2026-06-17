import type { PathwayDefinition, PathwayId } from "./types";

export const PATHWAYS: Record<PathwayId, PathwayDefinition> = {
  passport_readiness: {
    id: "passport_readiness",
    title: "Passport Readiness / Travel Foundation",
    shortDescription: "Get the travel basics ready before paying for applications or bookings.",
    fitReason: "Your answers suggest the first practical win is getting the foundation right.",
  },
  skilled_work_preparation: {
    id: "skilled_work_preparation",
    title: "Skilled Work Preparation",
    shortDescription: "Build a cleaner route into overseas work by strengthening employability signals.",
    fitReason: "Your profile points toward a preparation-first work pathway rather than a rushed application.",
  },
  study_to_work: {
    id: "study_to_work",
    title: "Study-to-Work",
    shortDescription: "Use study as a strategic route into longer-term career or relocation outcomes.",
    fitReason: "Your answers align with a study route that can later support work or settlement goals.",
  },
  employer_sponsored: {
    id: "employer_sponsored",
    title: "Employer-Sponsored",
    shortDescription: "Prioritize countries and roles where an employer can carry more of the route.",
    fitReason: "Your answers suggest a sponsor-backed route may be more realistic than self-funded trial and error.",
  },
  scholarship_funded_study: {
    id: "scholarship_funded_study",
    title: "Supported Study Planning",
    shortDescription: "Compare scholarship and loan-backed study routes against what your profile can realistically support.",
    fitReason: "Funding support matters in your profile, so the report needs to separate scholarship-fit cases from loan-backed cases early.",
  },
  tourism_visitor: {
    id: "tourism_visitor",
    title: "Tourism/Visitor",
    shortDescription: "Focus on realistic visitor travel planning with timing, purpose, and readiness in view.",
    fitReason: "Your main intention reads more like purposeful travel than long-term relocation.",
  },
  business_trade_travel: {
    id: "business_trade_travel",
    title: "Business/Trade Travel",
    shortDescription: "Use travel to meet suppliers, test markets, or build commercial relationships.",
    fitReason: "Your answers are commercially oriented and fit a business travel pathway better than a study route.",
  },
  conference_event_travel: {
    id: "conference_event_travel",
    title: "Conference/Event Travel",
    shortDescription: "Plan around a specific event, invitation, fair, conference, or professional gathering.",
    fitReason: "An event-led pathway appears to fit because your purpose depends on attendance, networking, or exposure.",
  },
  family_dependent: {
    id: "family_dependent",
    title: "Family/Dependent",
    shortDescription: "Assess family-linked movement options without forcing a solo-path assumption.",
    fitReason: "Your answers consistently point to family decision-making rather than an individual-only route.",
  },
  digital_talent_tech: {
    id: "digital_talent_tech",
    title: "Digital Talent/Tech",
    shortDescription: "Target routes that value technical or digital work history.",
    fitReason: "Your work profile appears to fit tech-friendly pathways better than broad generic job searches.",
  },
  healthcare_care: {
    id: "healthcare_care",
    title: "Healthcare/Care",
    shortDescription: "Focus on routes where healthcare or care experience is especially relevant.",
    fitReason: "Your background appears more aligned with healthcare-led migration logic than a general work route.",
  },
  entrepreneur_investment: {
    id: "entrepreneur_investment",
    title: "Entrepreneur/Investment",
    shortDescription: "Assess expansion, registration, or entrepreneur-led market entry pathways.",
    fitReason: "Your answers suggest a business-building pathway may be suitable if the commercial case is strong.",
  },
  low_budget_preparation: {
    id: "low_budget_preparation",
    title: "Low-Budget Preparation",
    shortDescription: "Reduce waste by sequencing the most cost-aware next steps first.",
    fitReason: "Budget protection is a strong signal in your profile, so planning-first routes deserve priority.",
  },
  exploration_not_sure: {
    id: "exploration_not_sure",
    title: "Exploration/Not Sure",
    shortDescription: "Use structured exploration before committing to a country or route too early.",
    fitReason: "Your answers show openness but not enough certainty yet for a single narrow pathway.",
  },
};
