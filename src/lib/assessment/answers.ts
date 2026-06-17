import type { AssessmentAnswers } from "@/lib/pathway-engine/types";
import { sanitizeEmail, sanitizeNullable, sanitizePhone, sanitizeText } from "@/lib/sanitize";

function rawString(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function sanitizeAnswers(input: Record<string, unknown>): AssessmentAnswers {
  return {
    firstName: sanitizeText(rawString(input.firstName)),
    lastName: sanitizeText(rawString(input.lastName)),
    whatsappNumber: sanitizePhone(rawString(input.whatsappNumber)),
    email: sanitizeEmail(rawString(input.email)),
    primaryGoal: input.primaryGoal as AssessmentAnswers["primaryGoal"],
    countryClarity: sanitizeNullable(rawString(input.countryClarity)),
    destinationInterest: sanitizeNullable(rawString(input.destinationInterest)),
    studyLevel: sanitizeNullable(rawString(input.studyLevel)),
    ageRange: sanitizeNullable(rawString(input.ageRange)),
    highestEducation: sanitizeNullable(rawString(input.highestEducation)),
    studyFundingReadiness: sanitizeNullable(rawString(input.studyFundingReadiness)),
    workField: sanitizeNullable(rawString(input.workField)),
    workExperienceYears: sanitizeNullable(rawString(input.workExperienceYears)),
    languageTestStatus: sanitizeNullable(rawString(input.languageTestStatus)),
    businessMoveType: sanitizeNullable(rawString(input.businessMoveType)),
    businessStage: sanitizeNullable(rawString(input.businessStage)),
    visitTravelType: sanitizeNullable(rawString(input.visitTravelType)),
    visitTravelWindow: sanitizeNullable(rawString(input.visitTravelWindow)),
    eventType: sanitizeNullable(rawString(input.eventType)),
    eventPurpose: sanitizeNullable(rawString(input.eventPurpose)),
    familyComposition: sanitizeNullable(rawString(input.familyComposition)),
    familyOpenPathway: sanitizeNullable(rawString(input.familyOpenPathway)),
    unsurePriority: sanitizeNullable(rawString(input.unsurePriority)),
    openCountries: sanitizeNullable(rawString(input.openCountries)),
    stateOfResidence: sanitizeNullable(rawString(input.stateOfResidence)),
    passportStatus: sanitizeNullable(rawString(input.passportStatus)),
    passportValidity: sanitizeNullable(rawString(input.passportValidity)),
    timeline: sanitizeNullable(rawString(input.timeline)),
    fundingReadiness: sanitizeNullable(rawString(input.fundingReadiness)),
    previousRefusal: sanitizeNullable(rawString(input.previousRefusal)),
    sendReportConsent: Boolean(input.sendReportConsent),
    wantsHumanSupport: Boolean(input.wantsHumanSupport),
    marketingConsent: Boolean(input.marketingConsent),
  };
}
