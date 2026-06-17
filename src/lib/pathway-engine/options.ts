import { nigeriaStateOptions } from "@/lib/nigeria-state-options";
import type { PrimaryGoal, SelectOption } from "./types";

export const primaryGoalOptions: SelectOption[] = [
  { value: "study_abroad", label: "Study abroad" },
  { value: "work_and_relocate", label: "Work and relocate" },
  { value: "business_abroad", label: "Move or expand my business abroad" },
  { value: "visit_or_tour", label: "Visit or tour" },
  { value: "event_travel", label: "Attend an event, conference, or trade fair" },
  { value: "family_relocation", label: "Relocate with my family" },
  { value: "not_sure_yet", label: "I'm not sure yet" },
];

export const countryClarityOptions: SelectOption[] = [
  { value: "yes", label: "Yes" },
  { value: "need_recommendations", label: "No, I need recommendations" },
  { value: "few_options", label: "I have a few options" },
];

export const destinationOptionsByGoal: Record<PrimaryGoal, SelectOption[]> = {
  study_abroad: [
    { value: "uk", label: "UK" },
    { value: "canada", label: "Canada" },
    { value: "usa", label: "USA" },
    { value: "australia", label: "Australia" },
    { value: "europe", label: "Europe" },
    { value: "finland", label: "Finland" },
    { value: "not_sure", label: "Not sure yet" },
    { value: "other", label: "Other" },
  ],
  work_and_relocate: [
    { value: "uk", label: "UK" },
    { value: "canada", label: "Canada" },
    { value: "australia", label: "Australia" },
    { value: "europe", label: "Europe" },
    { value: "uae", label: "UAE" },
    { value: "not_sure", label: "Not sure yet" },
    { value: "other", label: "Other" },
  ],
  business_abroad: [
    { value: "china", label: "China" },
    { value: "uae", label: "UAE" },
    { value: "uk", label: "UK" },
    { value: "usa", label: "USA" },
    { value: "europe", label: "Europe" },
    { value: "canada", label: "Canada" },
    { value: "africa", label: "Africa" },
    { value: "not_sure", label: "Not sure yet" },
    { value: "other", label: "Other" },
  ],
  visit_or_tour: [
    { value: "uk", label: "UK" },
    { value: "uae", label: "UAE" },
    { value: "europe", label: "Europe" },
    { value: "turkey", label: "Turkey" },
    { value: "canada", label: "Canada" },
    { value: "not_sure", label: "Not sure yet" },
    { value: "other", label: "Other" },
  ],
  event_travel: [
    { value: "uae", label: "UAE" },
    { value: "uk", label: "UK" },
    { value: "china", label: "China" },
    { value: "europe", label: "Europe" },
    { value: "usa", label: "USA" },
    { value: "not_sure", label: "Not sure yet" },
    { value: "other", label: "Other" },
  ],
  family_relocation: [
    { value: "uk", label: "UK" },
    { value: "canada", label: "Canada" },
    { value: "australia", label: "Australia" },
    { value: "europe", label: "Europe" },
    { value: "not_sure", label: "Not sure yet" },
    { value: "other", label: "Other" },
  ],
  not_sure_yet: [
    { value: "flexible", label: "I'm open to different countries" },
    { value: "africa", label: "Africa" },
    { value: "europe", label: "Europe" },
    { value: "uk", label: "UK" },
    { value: "canada", label: "Canada" },
    { value: "other", label: "Other" },
  ],
};

export const studyLevelOptions: SelectOption[] = [
  { value: "undergraduate", label: "Undergraduate" },
  { value: "postgraduate", label: "Masters or PhD" },
  { value: "diploma_foundation", label: "Diploma/Foundation" },
  { value: "professional_course", label: "Professional course" },
  { value: "not_sure", label: "Not sure yet" },
];

export const ageRangeOptions: SelectOption[] = [
  { value: "18_24", label: "18-24" },
  { value: "25_27", label: "25-27" },
  { value: "28_33", label: "28-33" },
  { value: "34_39", label: "34-39" },
  { value: "40_plus", label: "40+" },
  { value: "prefer_not_say", label: "Prefer not to say" },
];

export const highestEducationOptions: SelectOption[] = [
  { value: "secondary_school", label: "Secondary school" },
  { value: "ond_nce_diploma", label: "OND/NCE/Diploma" },
  { value: "hnd_lower_credit", label: "HND lower credit" },
  { value: "hnd_upper_credit", label: "HND upper credit" },
  { value: "hnd", label: "HND (not sure of grade)" },
  { value: "third_class", label: "Bachelor's degree - third class" },
  { value: "second_class_lower", label: "Bachelor's degree - second class lower" },
  { value: "second_class_upper", label: "Bachelor's degree - second class upper" },
  { value: "first_class", label: "Bachelor's degree - first class" },
  { value: "bachelors", label: "Bachelor's degree (not sure of class)" },
  { value: "masters", label: "Master's degree" },
  { value: "phd", label: "PhD" },
  { value: "professional_certification", label: "Professional certification" },
];

export const studyFundingReadinessOptions: SelectOption[] = [
  {
    value: "scholarship_support",
    label: "Check scholarship options first",
    description: "Best if you want us to test whether your degree class is strong enough for scholarship routes.",
  },
  {
    value: "loan_support",
    label: "Check loan support routes",
    description: "Best if you want structured tuition support reviewed alongside the route itself.",
  },
  {
    value: "application_costs",
    label: "I can cover application and document costs",
    description: "Useful if you can start the process but still need the route kept cost-aware.",
  },
  {
    value: "payment_plan",
    label: "I can consider tuition/payment plans",
    description: "Best if you may self-fund later but want flexible payment sequencing.",
  },
  {
    value: "self_fund",
    label: "I can fund study if the pathway makes sense",
    description: "Best if funding is not the main blocker and the route just needs to be realistic.",
  },
  { value: "prefer_not_say", label: "Prefer not to say" },
];

export const workFieldOptions: SelectOption[] = [
  { value: "healthcare", label: "Healthcare" },
  { value: "tech", label: "Tech" },
  { value: "engineering", label: "Engineering" },
  { value: "finance_business", label: "Finance/Business" },
  { value: "education", label: "Education" },
  { value: "hospitality", label: "Hospitality" },
  { value: "skilled_trade", label: "Skilled trade" },
  { value: "sales_service", label: "Sales/Customer service" },
  { value: "creative_media", label: "Creative/media" },
  { value: "other", label: "Other" },
];

export const workExperienceOptions: SelectOption[] = [
  { value: "lt_1", label: "Less than 1 year" },
  { value: "1_2", label: "1-2 years" },
  { value: "3_5", label: "3-5 years" },
  { value: "6_9", label: "6-9 years" },
  { value: "10_plus", label: "10+ years" },
];

export const languageTestOptions: SelectOption[] = [
  { value: "valid_result", label: "Yes, I have a valid result" },
  { value: "expired_result", label: "I have taken one, but it expired" },
  { value: "booked", label: "I have booked one" },
  { value: "not_taken", label: "I have not taken one yet" },
  { value: "not_sure", label: "Not sure if I need one" },
];

export const businessMoveTypeOptions: SelectOption[] = [
  { value: "trade_fairs", label: "Attend trade fairs or exhibitions" },
  { value: "suppliers_partners", label: "Meet suppliers or partners" },
  { value: "new_market", label: "Explore a new market" },
  { value: "register_expand", label: "Register or expand my business abroad" },
  { value: "business_visit", label: "Business visit/tour" },
  { value: "not_sure", label: "Not sure yet" },
];

export const businessStageOptions: SelectOption[] = [
  { value: "idea_stage", label: "Idea stage" },
  { value: "early_business", label: "Early business" },
  { value: "growing_business", label: "Growing business" },
  { value: "established_business", label: "Established business" },
  { value: "registered_company", label: "Registered company" },
];

export const visitTravelTypeOptions: SelectOption[] = [
  { value: "vacation", label: "Vacation" },
  { value: "family_visit", label: "Family visit" },
  { value: "group_tour", label: "Group tour" },
  { value: "solo_travel", label: "Solo travel" },
  { value: "honeymoon", label: "Honeymoon" },
  { value: "religious_event", label: "Religious/event travel" },
  { value: "not_sure", label: "Not sure yet" },
];

export const visitTravelWindowOptions: SelectOption[] = [
  { value: "asap", label: "As soon as possible" },
  { value: "within_3_months", label: "Within 3 months" },
  { value: "3_6_months", label: "3-6 months" },
  { value: "6_12_months", label: "6-12 months" },
  { value: "exploring", label: "Just exploring" },
];

export const eventTypeOptions: SelectOption[] = [
  { value: "business_conference", label: "Business conference" },
  { value: "trade_fair", label: "Trade fair/exhibition" },
  { value: "academic_conference", label: "Academic conference" },
  { value: "professional_event", label: "Professional event" },
  { value: "religious_cultural", label: "Religious/cultural event" },
  { value: "not_sure", label: "Not sure yet" },
];

export const eventPurposeOptions: SelectOption[] = [
  { value: "business_growth", label: "Business growth" },
  { value: "networking", label: "Networking" },
  { value: "learning", label: "Learning/professional development" },
  { value: "supplier_search", label: "Supplier or partner search" },
  { value: "exploration", label: "Exploration" },
  { value: "other", label: "Other" },
];

export const familyCompositionOptions: SelectOption[] = [
  { value: "spouse_partner", label: "Spouse/partner" },
  { value: "children", label: "Children" },
  { value: "partner_and_children", label: "Spouse/partner and children" },
  { value: "parent_family_member", label: "Parent/family member" },
  { value: "not_sure", label: "Not sure yet" },
];

export const familyOpenPathwayOptions: SelectOption[] = [
  { value: "study_route", label: "Study route" },
  { value: "work_route", label: "Work route" },
  { value: "business_route", label: "Business route" },
  { value: "family_route", label: "Family route" },
  { value: "recommend_me", label: "Recommend based on my background" },
];

export const unsurePriorityOptions: SelectOption[] = [
  { value: "lowest_cost", label: "Lowest realistic cost" },
  { value: "fastest_path", label: "Fastest possible path" },
  { value: "long_term_relocation", label: "Long-term relocation" },
  { value: "study_opportunity", label: "Study opportunity" },
  { value: "work_opportunity", label: "Work opportunity" },
  { value: "business_opportunity", label: "Business opportunity" },
  { value: "travel_experience", label: "Travel experience" },
  { value: "family_stability", label: "Family stability" },
];

export const openCountriesOptions: SelectOption[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "maybe", label: "Maybe" },
];

export const passportStatusOptions: SelectOption[] = [
  { value: "valid", label: "Yes, I have a valid passport" },
  { value: "renewing", label: "I am renewing it" },
  { value: "no_passport", label: "No, I do not have one yet" },
  { value: "not_sure", label: "Not sure" },
];

export const passportValidityOptions: SelectOption[] = [
  { value: "24_plus", label: "More than 24 months" },
  { value: "12_24", label: "12-24 months" },
  { value: "6_12", label: "6-12 months" },
  { value: "lt_6", label: "Less than 6 months" },
  { value: "dont_know", label: "I do not know" },
  { value: "not_applicable", label: "Not applicable" },
];

export const timelineOptions: SelectOption[] = [
  { value: "immediately", label: "Immediately" },
  { value: "3_6_months", label: "3-6 months" },
  { value: "6_12_months", label: "6-12 months" },
  { value: "1_2_years", label: "1-2 years" },
  { value: "exploring", label: "Just exploring" },
];

export const fundingReadinessOptions: SelectOption[] = [
  { value: "lowest_cost", label: "I need the lowest-cost realistic route" },
  { value: "cover_tests_docs", label: "I can cover tests, documents, and application fees" },
  {
    value: "cover_travel_settlement",
    label: "I can cover application, travel, and some settlement costs",
  },
  {
    value: "study_settlement_route",
    label: "I can consider study or settlement-fund routes if suitable",
  },
  {
    value: "need_support",
    label: "Need scholarship or loan support",
  },
  { value: "prefer_not_say", label: "Prefer not to say" },
];

export const previousRefusalOptions: SelectOption[] = [
  { value: "no", label: "No" },
  { value: "yes", label: "Yes" },
  { value: "prefer_not_say", label: "Prefer not to say" },
];

export const stateOfResidenceOptions: SelectOption[] = nigeriaStateOptions;
