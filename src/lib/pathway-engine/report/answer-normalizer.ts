import type { AssessmentAnswers } from "../types";

export type Destination =
  | "uk"
  | "canada"
  | "france"
  | "new_zealand"
  | "ireland"
  | "unknown";

export type Qualification =
  | "waec_neco"
  | "ond"
  | "hnd_lower_credit"
  | "hnd_upper_credit"
  | "third_class"
  | "second_class_lower"
  | "second_class_upper"
  | "first_class"
  | "masters"
  | "phd"
  | "bachelors_unknown"
  | "professional_certification"
  | "unknown";

export type FundingPosition =
  | "self_funded"
  | "needs_study_loan"
  | "needs_scholarship"
  | "lowest_cost"
  | "payment_plan"
  | "application_costs_only"
  | "sponsor_funded"
  | "unknown";

export type PassportStatus =
  | "valid_passport"
  | "expired_passport"
  | "no_passport"
  | "unknown";

export type EnglishTestStatus =
  | "has_test"
  | "needs_test"
  | "waiver_possible"
  | "unknown";

export type ResearchReadiness =
  | "has_topic"
  | "needs_topic"
  | "not_required"
  | "unknown";

export interface NormalizedAssessmentProfile {
  name?: string;
  age?: number;
  destination: Destination;
  qualification: Qualification;
  qualificationLabel: string;
  targetField?: string;
  primaryGoal:
    | "study"
    | "study_to_work"
    | "family_relocation"
    | "scholarship"
    | "unknown";
  wantsDependants: boolean | "unknown";
  fundingPosition: FundingPosition;
  passportStatus: PassportStatus;
  englishTestStatus: EnglishTestStatus;
  researchReadiness: ResearchReadiness;
  hasPreviousRefusal: boolean | "unknown";
  targetIntake?: string;
  timelineUrgency: "urgent" | "normal" | "flexible" | "unknown";
  passportRenewalInProgress: boolean;
  ageRange?: string;
}

export type NormalizedDestination = Destination;
export type NormalizedQualification = Qualification;
export type NormalizedPassportStatus = PassportStatus;
export type NormalizedFundingNeed = FundingPosition;
export type NormalizedEnglishStatus = EnglishTestStatus;
export type NormalizedResearchReadiness = ResearchReadiness;
export type NormalizedDependants = "yes" | "no" | "unknown";

export interface NormalizedAnswers {
  name?: string;
  destination: Destination;
  qualification: Qualification;
  qualificationLabel: string;
  passportStatus: PassportStatus;
  fundingNeed: FundingPosition;
  dependants: NormalizedDependants;
  englishStatus: EnglishTestStatus;
  researchReadiness: ResearchReadiness;
  targetTimeline?: string;
  targetField?: string;
  wantsFamilyRelocation: boolean;
  wantsStudyToWork: boolean;
  wantsScholarship: boolean;
  previousRefusal: boolean | "unknown";
  passportRenewalInProgress: boolean;
  ageRange?: string;
}

type AnyAnswers = Record<string, unknown> | AssessmentAnswers;

type QualificationInfo = {
  qualification: Qualification;
  label: string;
};

function readRaw(answers: AnyAnswers, keys: string[]): unknown {
  const record = answers as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return undefined;
}

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ");
}

function includesAny(value: string, terms: string[]): boolean {
  return terms.some((term) => value.includes(term));
}

function normalizeDestination(value: string): Destination {
  if (includesAny(value, ["uk", "united kingdom", "britain", "england"])) {
    return "uk";
  }

  if (value.includes("canada")) {
    return "canada";
  }

  if (value.includes("france")) {
    return "france";
  }

  if (includesAny(value, ["new zealand", "newzealand", "nz"])) {
    return "new_zealand";
  }

  if (value.includes("ireland")) {
    return "ireland";
  }

  return "unknown";
}

function normalizeQualificationInfo(value: string): QualificationInfo {
  if (value.includes("phd")) {
    return { qualification: "phd", label: "PhD" };
  }

  if (includesAny(value, ["masters", "master", "msc", "ma ", "mphil", "mba"])) {
    return { qualification: "masters", label: "Master's degree" };
  }

  if (includesAny(value, ["first class", "1st class", "firstclass"])) {
    return { qualification: "first_class", label: "Bachelor's degree - first class" };
  }

  if (includesAny(value, ["second class upper", "2 1", "2:1", "upper second"])) {
    return { qualification: "second_class_upper", label: "Bachelor's degree - second class upper" };
  }

  if (includesAny(value, ["second class lower", "2 2", "2:2", "lower second"])) {
    return { qualification: "second_class_lower", label: "Bachelor's degree - second class lower" };
  }

  if (includesAny(value, ["third class", "3rd class", "thirdclass"])) {
    return { qualification: "third_class", label: "Bachelor's degree - third class" };
  }

  if (includesAny(value, ["hnd upper", "higher national diploma upper"])) {
    return { qualification: "hnd_upper_credit", label: "HND upper credit" };
  }

  if (includesAny(value, ["hnd lower", "higher national diploma lower"])) {
    return { qualification: "hnd_lower_credit", label: "HND lower credit" };
  }

  if (value.includes("hnd")) {
    return { qualification: "hnd_lower_credit", label: "HND (grade not provided)" };
  }

  if (includesAny(value, ["ond nce diploma", "ond/nce/diploma", "ond", "nce", "diploma"])) {
    return { qualification: "ond", label: "OND/NCE/Diploma" };
  }

  if (includesAny(value, ["secondary school", "waec", "neco", "o level", "olevel", "ssce"])) {
    return { qualification: "waec_neco", label: "Secondary school" };
  }

  if (includesAny(value, ["professional certification", "professional certificate"])) {
    return {
      qualification: "professional_certification",
      label: "Professional certification",
    };
  }

  if (includesAny(value, ["bachelors", "bachelor's degree", "bachelor degree"])) {
    return {
      qualification: "bachelors_unknown",
      label: "Bachelor's degree (class not provided)",
    };
  }

  return {
    qualification: "unknown",
    label: "Academic background not fully provided",
  };
}

function normalizePassportInfo(value: string): {
  passportStatus: PassportStatus;
  passportRenewalInProgress: boolean;
} {
  if (includesAny(value, ["renew", "renewing", "renewal"])) {
    return {
      passportStatus: "expired_passport",
      passportRenewalInProgress: true,
    };
  }

  if (includesAny(value, ["valid", "have a valid passport", "yes"])) {
    return {
      passportStatus: "valid_passport",
      passportRenewalInProgress: false,
    };
  }

  if (includesAny(value, ["no passport", "do not have one yet", "don't have one yet", "not yet"])) {
    return {
      passportStatus: "no_passport",
      passportRenewalInProgress: false,
    };
  }

  if (includesAny(value, ["expired"])) {
    return {
      passportStatus: "expired_passport",
      passportRenewalInProgress: false,
    };
  }

  return {
    passportStatus: "unknown",
    passportRenewalInProgress: false,
  };
}

function normalizeFundingPosition(value: string): FundingPosition {
  if (includesAny(value, ["scholarship support", "scholarship", "fully funded"])) {
    return "needs_scholarship";
  }

  if (includesAny(value, ["loan support", "study loan", "loan"])) {
    return "needs_study_loan";
  }

  if (includesAny(value, ["payment plan", "tuition payment plan"])) {
    return "payment_plan";
  }

  if (includesAny(value, ["application costs", "application and document costs", "cover tests docs", "tests documents application fees"])) {
    return "application_costs_only";
  }

  if (includesAny(value, ["self fund", "self funded", "fund study", "cover travel settlement", "study settlement route"])) {
    return "self_funded";
  }

  if (includesAny(value, ["lowest cost", "low cost", "budget", "affordable"])) {
    return "lowest_cost";
  }

  if (includesAny(value, ["sponsor", "sponsored"])) {
    return "sponsor_funded";
  }

  return "unknown";
}

function normalizeDependants(value: string): NormalizedDependants {
  if (includesAny(value, ["yes", "with", "spouse", "children", "family", "dependant", "dependent"])) {
    return "yes";
  }

  if (includesAny(value, ["no", "alone", "single", "without"])) {
    return "no";
  }

  return "unknown";
}

function normalizeEnglishStatus(value: string): EnglishTestStatus {
  if (includesAny(value, ["waiver", "english medium", "medium of instruction", "moi"])) {
    return "waiver_possible";
  }

  if (includesAny(value, ["valid result", "have a valid result", "ielts", "pte", "toefl", "duolingo", "taken one"])) {
    return "has_test";
  }

  if (includesAny(value, ["expired result", "booked", "not taken", "not sure", "not done", "no"])) {
    return "needs_test";
  }

  return "unknown";
}

function normalizeResearchReadiness(value: string): ResearchReadiness {
  if (includesAny(value, ["not required", "no need", "not applicable", "n/a"])) {
    return "not_required";
  }

  if (includesAny(value, ["topic", "proposal", "research area", "written", "ready", "have"])) {
    return "has_topic";
  }

  if (includesAny(value, ["no", "not yet", "need", "none", "unsure"])) {
    return "needs_topic";
  }

  return "unknown";
}

function normalizePreviousRefusal(value: string): boolean | "unknown" {
  if (includesAny(value, ["yes", "refusal", "denied", "rejected"])) {
    return true;
  }

  if (includesAny(value, ["no", "none", "never"])) {
    return false;
  }

  return "unknown";
}

function inferAge(ageRange: string | undefined): number | undefined {
  switch (ageRange) {
    case "18_24":
      return 21;
    case "25_27":
      return 26;
    case "28_33":
      return 30;
    case "34_39":
      return 36;
    case "40_plus":
      return 41;
    default:
      return undefined;
  }
}

function normalizeTimelineUrgency(
  value: string,
): NormalizedAssessmentProfile["timelineUrgency"] {
  if (includesAny(value, ["immediately", "as soon as possible", "within 3 months", "urgent"])) {
    return "urgent";
  }

  if (includesAny(value, ["3 6 months", "3_6_months", "6 12 months", "6_12_months", "next intake"])) {
    return "normal";
  }

  if (includesAny(value, ["1 2 years", "1_2_years", "exploring", "just exploring", "later", "flexible"])) {
    return "flexible";
  }

  return "unknown";
}

export function qualificationLabel(qualification: Qualification): string {
  switch (qualification) {
    case "waec_neco":
      return "Secondary school";
    case "ond":
      return "OND/NCE/Diploma";
    case "hnd_lower_credit":
      return "HND lower credit";
    case "hnd_upper_credit":
      return "HND upper credit";
    case "third_class":
      return "Bachelor's degree - third class";
    case "second_class_lower":
      return "Bachelor's degree - second class lower";
    case "second_class_upper":
      return "Bachelor's degree - second class upper";
    case "first_class":
      return "Bachelor's degree - first class";
    case "masters":
      return "Master's degree";
    case "phd":
      return "PhD";
    case "bachelors_unknown":
      return "Bachelor's degree (class not provided)";
    case "professional_certification":
      return "Professional certification";
    default:
      return "Academic background not fully provided";
  }
}

export function destinationLabel(destination: Destination): string {
  switch (destination) {
    case "uk":
      return "United Kingdom";
    case "canada":
      return "Canada";
    case "france":
      return "France";
    case "new_zealand":
      return "New Zealand";
    case "ireland":
      return "Ireland";
    default:
      return "Selected destination";
  }
}

export function isMastersLevelProfile(qualification: Qualification): boolean {
  return qualification === "masters" || qualification === "phd";
}

export function normalizeAnswers(answers: AnyAnswers): NormalizedAnswers {
  const name = String(
    readRaw(answers, ["name", "fullName", "firstName", "userName"]) ?? "",
  ).trim();
  const destinationRaw = normalizeText(
    readRaw(answers, [
      "destination",
      "destinationInterest",
      "preferredDestination",
      "country",
      "studyDestination",
    ]),
  );
  const qualificationInfo = normalizeQualificationInfo(
    normalizeText(
      readRaw(answers, [
        "qualification",
        "highestQualification",
        "highestEducation",
        "degreeClass",
        "academicLevel",
        "educationLevel",
      ]),
    ),
  );
  const passportInfo = normalizePassportInfo(
    normalizeText(readRaw(answers, ["passport", "passportStatus", "hasPassport"])),
  );
  const fundingNeed = normalizeFundingPosition(
    normalizeText(
      readRaw(answers, [
        "studyFundingReadiness",
        "fundingReadiness",
        "funding",
        "fundingNeed",
        "supportNeed",
        "budget",
        "financialReadiness",
      ]),
    ),
  );
  const dependants = normalizeDependants(
    normalizeText(
      readRaw(answers, [
        "dependants",
        "hasDependants",
        "travellingWithDependants",
        "familyRelocation",
        "relocateWithFamily",
        "familyOpenPathway",
        "familyComposition",
      ]),
    ),
  );
  const goalRaw = normalizeText(
    readRaw(answers, ["goal", "primaryGoal", "travelGoal", "studyGoal"]),
  );
  const englishStatus = normalizeEnglishStatus(
    normalizeText(
      readRaw(answers, [
        "englishTest",
        "englishStatus",
        "languageTest",
        "languageTestStatus",
        "ielts",
        "pte",
        "toefl",
        "duolingo",
      ]),
    ),
  );
  const researchReadiness = normalizeResearchReadiness(
    normalizeText(
      readRaw(answers, [
        "researchProposal",
        "researchTopic",
        "researchReadiness",
        "proposalReadiness",
      ]),
    ),
  );
  const targetTimeline = String(
    readRaw(answers, ["timeline", "targetTimeline", "intake", "targetIntake"]) ?? "",
  ).trim();
  const targetField = String(
    readRaw(answers, ["field", "targetField", "courseField", "course"]) ?? "",
  ).trim();
  const previousRefusal = normalizePreviousRefusal(
    normalizeText(readRaw(answers, ["previousRefusal", "visaRefusal", "refusal"])),
  );
  const ageRange = String(readRaw(answers, ["ageRange", "age"]) ?? "").trim() || undefined;

  return {
    name: name || undefined,
    destination: normalizeDestination(destinationRaw),
    qualification: qualificationInfo.qualification,
    qualificationLabel: qualificationInfo.label,
    passportStatus: passportInfo.passportStatus,
    fundingNeed,
    dependants,
    englishStatus,
    researchReadiness,
    targetTimeline: targetTimeline || undefined,
    targetField: targetField || undefined,
    wantsFamilyRelocation:
      includesAny(goalRaw, ["family", "dependant", "dependent", "relocation"]) ||
      dependants === "yes",
    wantsStudyToWork:
      includesAny(goalRaw, ["work", "pr", "residence", "settle", "career"]) ||
      includesAny(destinationRaw, ["canada", "new zealand"]),
    wantsScholarship:
      includesAny(goalRaw, ["scholarship", "funding"]) ||
      fundingNeed === "needs_scholarship",
    previousRefusal,
    passportRenewalInProgress: passportInfo.passportRenewalInProgress,
    ageRange,
  };
}

export function normalizeAssessmentAnswers(
  answers: AnyAnswers,
): NormalizedAssessmentProfile {
  const normalized = normalizeAnswers(answers);

  const primaryGoal: NormalizedAssessmentProfile["primaryGoal"] = normalized.wantsFamilyRelocation
    ? "family_relocation"
    : normalized.wantsScholarship
      ? "scholarship"
      : normalized.wantsStudyToWork
        ? "study_to_work"
        : "study";

  return {
    name: normalized.name,
    age: inferAge(normalized.ageRange),
    ageRange: normalized.ageRange,
    destination: normalized.destination,
    qualification: normalized.qualification,
    qualificationLabel: normalized.qualificationLabel,
    targetField: normalized.targetField,
    primaryGoal,
    wantsDependants:
      normalized.dependants === "yes"
        ? true
        : normalized.dependants === "no"
          ? false
          : "unknown",
    fundingPosition: normalized.fundingNeed,
    passportStatus: normalized.passportStatus,
    englishTestStatus: normalized.englishStatus,
    researchReadiness: normalized.researchReadiness,
    hasPreviousRefusal: normalized.previousRefusal,
    targetIntake: normalized.targetTimeline,
    timelineUrgency: normalizeTimelineUrgency(normalized.targetTimeline ?? ""),
    passportRenewalInProgress: normalized.passportRenewalInProgress,
  };
}
