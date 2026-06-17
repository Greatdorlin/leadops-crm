import {
  businessMoveTypeOptions,
  businessStageOptions,
  countryClarityOptions,
  destinationOptionsByGoal,
  eventPurposeOptions,
  eventTypeOptions,
  familyCompositionOptions,
  familyOpenPathwayOptions,
  fundingReadinessOptions,
  ageRangeOptions,
  highestEducationOptions,
  languageTestOptions,
  openCountriesOptions,
  passportStatusOptions,
  passportValidityOptions,
  previousRefusalOptions,
  primaryGoalOptions,
  stateOfResidenceOptions,
  studyFundingReadinessOptions,
  studyLevelOptions,
  timelineOptions,
  unsurePriorityOptions,
  visitTravelTypeOptions,
  visitTravelWindowOptions,
  workExperienceOptions,
  workFieldOptions,
} from "./options";
import type { AssessmentAnswers, AssessmentStepDefinition } from "./types";

function withGoalName(firstName: string) {
  return `${firstName || "Traveler"}, what are you trying to do?`;
}

export function getAssessmentFlow(
  answers: Partial<AssessmentAnswers>,
): AssessmentStepDefinition[] {
  const firstName = answers.firstName?.trim() || "there";
  const goal = answers.primaryGoal ?? null;

  const steps: AssessmentStepDefinition[] = [
    {
      stepKey: "trust",
      kind: "notice",
      title: "Welcome to Fly Connect Pathway Finder",
      description:
        "I’ll help you weigh your travel goals against your background, readiness, and life goals.",
      helperText:
        "No BVN, NIN, passport documents, bank statements, or confidential uploads are needed.",
    },
    {
      stepKey: "first_name",
      kind: "text",
      title: "What's your first name?",
      description: "Tell us what to call you.",
      field: "firstName",
    },
    {
      stepKey: "greeting",
      kind: "notice",
      title: `Hi ${firstName} 👋`,
      description: "Let’s get started.",
    },
    {
      stepKey: "primary_goal",
      kind: "single-select",
      title: withGoalName(firstName),
      description: "Choose the pathway that matters most right now. We will only ask the questions needed for that direction.",
      field: "primaryGoal",
      options: primaryGoalOptions,
    },
  ];

  if (goal === "study_abroad" || goal === "work_and_relocate") {
    steps.push({
      stepKey: "country_clarity",
      kind: "single-select",
      title: "Do you already have a country in mind?",
      description: "This helps us avoid forcing one country into a profile that may fit better elsewhere.",
      field: "countryClarity",
      options: countryClarityOptions,
    });
    steps.push({
      stepKey: "destination_interest",
      kind: "single-select",
      title: "Which country or region are you considering?",
      description: "Pick your strongest interest. The report can still flag a better-fit backup route.",
      field: "destinationInterest",
      options: destinationOptionsByGoal[goal],
    });
  }

  if (goal === "study_abroad") {
    steps.push(
      {
        stepKey: "study_level",
        kind: "single-select",
        title: "Are you planning Undergraduate, Masters, or PhD study?",
        description: "Your intended study level changes the route, document checks, and timeline.",
        field: "studyLevel",
        options: studyLevelOptions,
      },
      {
        stepKey: "age_range",
        kind: "single-select",
        title: "What age range are you in?",
        description: "Some study routes have age-sensitive rules, especially where scholarships or specific schools are involved.",
        field: "ageRange",
        options: ageRangeOptions,
      },
      {
        stepKey: "highest_education",
        kind: "single-select",
        title: "What is your highest completed education?",
        description: "This is one of the strongest signals for matching a realistic study pathway.",
        field: "highestEducation",
        options: highestEducationOptions,
      },
      {
        stepKey: "study_funding_readiness",
        kind: "single-select",
        title: "What kind of study support should we assess?",
        description:
          "Scholarship checks are merit-based, while loan routes depend on country rules, age, and academic fit. Private finance details stay out of the public report.",
        field: "studyFundingReadiness",
        options: studyFundingReadinessOptions,
      },
    );
  }

  if (goal === "work_and_relocate") {
    steps.push(
      {
        stepKey: "work_field",
        kind: "single-select",
        title: "What field best describes your work background?",
        description: "",
        field: "workField",
        options: workFieldOptions,
      },
      {
        stepKey: "work_experience_years",
        kind: "single-select",
        title: "How many years of full-time work experience do you have?",
        description: "",
        field: "workExperienceYears",
        options: workExperienceOptions,
      },
      {
        stepKey: "language_test_status",
        kind: "single-select",
        title: "Have you taken any language test?",
        description: "",
        field: "languageTestStatus",
        options: languageTestOptions,
      },
    );
  }

  if (goal === "business_abroad") {
    steps.push(
      {
        stepKey: "business_move_type",
        kind: "single-select",
        title: "What kind of business move are you considering?",
        description: "",
        field: "businessMoveType",
        options: businessMoveTypeOptions,
      },
      {
        stepKey: "country_clarity",
        kind: "single-select",
        title: "Do you already have a country or event in mind?",
        description: "",
        field: "countryClarity",
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
          { value: "few_options", label: "I have a few options" },
        ],
      },
      {
        stepKey: "destination_interest",
        kind: "single-select",
        title: "Which country or region are you considering?",
        description: "",
        field: "destinationInterest",
        options: destinationOptionsByGoal.business_abroad,
      },
      {
        stepKey: "business_stage",
        kind: "single-select",
        title: "What stage is your business currently in?",
        description: "",
        field: "businessStage",
        options: businessStageOptions,
      },
    );
  }

  if (goal === "visit_or_tour") {
    steps.push(
      {
        stepKey: "visit_travel_type",
        kind: "single-select",
        title: "What kind of travel are you planning?",
        description: "",
        field: "visitTravelType",
        options: visitTravelTypeOptions,
      },
      {
        stepKey: "country_clarity",
        kind: "single-select",
        title: "Do you already have a destination in mind?",
        description: "",
        field: "countryClarity",
        options: countryClarityOptions,
      },
      {
        stepKey: "visit_travel_window",
        kind: "single-select",
        title: "When would you like to travel?",
        description: "",
        field: "visitTravelWindow",
        options: visitTravelWindowOptions,
      },
    );
  }

  if (goal === "event_travel") {
    steps.push(
      {
        stepKey: "event_type",
        kind: "single-select",
        title: "What kind of event are you considering?",
        description: "",
        field: "eventType",
        options: eventTypeOptions,
      },
      {
        stepKey: "country_clarity",
        kind: "single-select",
        title: "Do you already know the event or destination?",
        description: "",
        field: "countryClarity",
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
          { value: "few_options", label: "I have a few options" },
        ],
      },
      {
        stepKey: "event_purpose",
        kind: "single-select",
        title: "What is your main purpose for attending?",
        description: "",
        field: "eventPurpose",
        options: eventPurposeOptions,
      },
    );
  }

  if (goal === "family_relocation") {
    steps.push(
      {
        stepKey: "family_composition",
        kind: "single-select",
        title: "Who are you planning with?",
        description: "",
        field: "familyComposition",
        options: familyCompositionOptions,
      },
      {
        stepKey: "family_open_pathway",
        kind: "single-select",
        title: "Which pathway are you open to?",
        description: "",
        field: "familyOpenPathway",
        options: familyOpenPathwayOptions,
      },
      {
        stepKey: "destination_interest",
        kind: "single-select",
        title: "Which country or region are you considering?",
        description: "",
        field: "destinationInterest",
        options: destinationOptionsByGoal.family_relocation,
      },
      {
        stepKey: "highest_education",
        kind: "single-select",
        title: "What is your highest completed education?",
        description: "",
        field: "highestEducation",
        options: highestEducationOptions,
      },
      {
        stepKey: "work_experience_years",
        kind: "single-select",
        title: "How many years of full-time work experience do you have?",
        description: "",
        field: "workExperienceYears",
        options: workExperienceOptions,
      },
    );
  }

  if (goal === "not_sure_yet") {
    steps.push(
      {
        stepKey: "unsure_priority",
        kind: "single-select",
        title: "What matters most to you right now?",
        description: "",
        field: "unsurePriority",
        options: unsurePriorityOptions,
      },
      {
        stepKey: "open_countries",
        kind: "single-select",
        title: "Are you open to different countries if the pathway fits?",
        description: "",
        field: "openCountries",
        options: openCountriesOptions,
      },
    );
  }

  steps.push(
    {
      stepKey: "state_of_residence",
      kind: "single-select",
      title: "Which state are you currently based in?",
      description: "Choose your current state.",
      field: "stateOfResidence",
      options: stateOfResidenceOptions,
    },
    {
      stepKey: "passport_status",
      kind: "single-select",
      title: "Do you currently have a valid passport?",
      description: "Passport readiness can change the first practical step even when the academic route is strong.",
      field: "passportStatus",
      options: passportStatusOptions,
    },
    {
      stepKey: "passport_validity",
      kind: "single-select",
      title: "How long before your passport expires?",
      description: "Short validity can create delays, so the report checks this before recommending execution steps.",
      field: "passportValidity",
      options: passportValidityOptions,
    },
    {
      stepKey: "timeline",
      kind: "single-select",
      title: "How soon are you hoping to make progress?",
      description: "Your timeline helps us separate urgent next actions from preparation-first routes.",
      field: "timeline",
      options: timelineOptions,
    },
    {
      stepKey: "funding_readiness",
      kind: "single-select",
      title: "What support level fits your journey right now?",
      description: "Choose the closest answer. We do not ask for account balances or bank documents here.",
      field: "fundingReadiness",
      options: fundingReadinessOptions,
    },
    {
      stepKey: "previous_refusal",
      kind: "single-select",
      title: "Have you had a visa refusal before?",
      description: "A previous refusal does not end the journey, but it changes what should be reviewed first.",
      field: "previousRefusal",
      options: previousRefusalOptions,
      optional: true,
    },
    {
      stepKey: "contact",
      kind: "contact",
      title: `${firstName}, let’s generate your pathway report.`,
      description: "Confirm your details so we can generate your report and send your next steps.",
    },
  );

  return steps;
}
