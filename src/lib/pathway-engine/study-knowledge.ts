import type {
  AssessmentAnswers,
  InternalStudyGuidance,
  KnowledgeStatus,
  PublicStudyGuidance,
  PublicStudyRequirement,
  QualificationFit,
  RouteRecommendation,
  StudyCountryCard,
  StudyDocumentChecklistItem,
  StudyDestination,
  StudyFitHighlight,
  StudyGuidance,
  StudyProductCard,
  StudyRecommendationRule,
  StudyRequirementCard,
} from "./types";
import {
  isCanadaLoanAgeEligible,
  isUkScholarshipEligible,
  requestedScholarshipButNotEligible,
  resolveStudyFundingProfile,
} from "./support-rules";

const SOURCE_LABEL = "fly-connect-study-knowledge-layer-v2(1).md";
const LAST_REVIEWED = "2026-05-26";

const LIVE: KnowledgeStatus = "live";
const REVIEW: KnowledgeStatus = "ready_for_review";

const COUNTRY_CARDS: StudyCountryCard[] = [
  {
    id: "COUNTRY-UK-001",
    status: LIVE,
    sourceLabel: SOURCE_LABEL,
    lastReviewed: LAST_REVIEWED,
    country: "uk",
    publicName: "United Kingdom",
    publicLocation: "United Kingdom",
    publicPositioning:
      "The UK fits Masters or PhD study, research planning, and structured study-route support.",
    bestFor: [
      "Masters or PhD applicants",
      "Research-led study routes",
      "Scholarship-minded applicants",
      "Applicants who need tuition deposit support",
    ],
    publicNotes: [
      "Some routes can support dependants.",
      "Scholarship options are competitive and must be verified.",
      "Loan-supported tuition planning can help with deposit barriers.",
    ],
    advisorNotes: [
      "Use the UK when research fit, Masters or PhD fit, or funding support are central.",
      "Keep deposit, CAS, and proposal sequencing explicit in advisor notes.",
    ],
  },
  {
    id: "COUNTRY-CANADA-001",
    status: LIVE,
    sourceLabel: SOURCE_LABEL,
    lastReviewed: LAST_REVIEWED,
    country: "canada",
    publicName: "Canada",
    publicLocation: "Canada",
    publicPositioning:
      "Canada is strong for practical study-to-work planning and certificate/diploma routes.",
    bestFor: [
      "HND and lower-classification graduates",
      "Graduate certificate pathways",
      "Loan-supported diploma planning",
      "Applicants who want a practical study-to-work direction",
    ],
    publicNotes: [
      "PGWP strategy should be checked carefully.",
      "One-year routes can limit long-term planning if not sequenced well.",
      "Two sequential programmes can sometimes strengthen the longer plan.",
    ],
    advisorNotes: [
      "Keep PR language cautious.",
      "Use course length, funding, and field alignment as the main planning filters.",
    ],
  },
  {
    id: "COUNTRY-FRANCE-001",
    status: LIVE,
    sourceLabel: SOURCE_LABEL,
    lastReviewed: LAST_REVIEWED,
    country: "france",
    publicName: "France",
    publicLocation: "France",
    publicPositioning:
      "France works well for flexible business and technology-focused study routes.",
    bestFor: [
      "HND and third-class applicants needing flexibility",
      "Business and technology interest",
      "Applicants who want a European study option",
    ],
    publicNotes: [
      "Some routes are more flexible than others.",
      "Funding and proof-of-funds planning still need verification.",
    ],
    advisorNotes: [
      "Separate the strict business route from the more flexible route in advisor scripts.",
      "Do not expose school names publicly.",
    ],
  },
  {
    id: "COUNTRY-NZ-001",
    status: LIVE,
    sourceLabel: SOURCE_LABEL,
    lastReviewed: LAST_REVIEWED,
    country: "new_zealand",
    publicName: "New Zealand",
    publicLocation: "New Zealand",
    publicPositioning:
      "New Zealand is useful for study-to-work planning where skilled fields, work rights, and longer study gaps matter.",
    bestFor: [
      "Skilled or in-demand fields",
      "Applicants with longer work history or study gap",
      "Masters and PhD applicants who may need dependant planning",
    ],
    publicNotes: [
      "Proof-of-funds planning is important.",
      "English test readiness must be verified.",
      "Field choice matters for the overall study-to-work logic.",
    ],
    advisorNotes: [
      "Use study gap explanation carefully if work history suggests a long gap.",
      "Keep NZ proof-of-funds planning explicit.",
    ],
  },
];

const PRODUCTS: StudyProductCard[] = [
  {
    id: "PRODUCT-UK-MRES-001",
    status: LIVE,
    sourceLabel: SOURCE_LABEL,
    lastReviewed: LAST_REVIEWED,
    publicName: "Research-based UK Masters or PhD route",
    internalName: "UK MRes Programme",
    disclosureLevel: "advisor_only",
    country: "uk",
    publicLocation: "United Kingdom",
    internalProviderNotes: [
      "Use when dependants or research progression are part of the goal.",
      "Keep exact university discussion for advisor follow-up.",
    ],
    productType: "research_route",
    bestFor: [
      "Applicants who want a research-led Masters",
      "Applicants who may want dependants",
      "Applicants who can prepare a research proposal",
    ],
    notBestFor: [
      "Applicants with unrelated backgrounds",
      "Applicants who cannot prepare a research proposal",
      "Applicants who cannot meet deposit requirements",
    ],
    acceptedQualifications: ["second_class_lower", "second_class_upper", "first_class"],
    minimumAcademicRequirement: "Minimum 2:2 or 2:1 in a relevant previous course.",
    dependantRule: "Dependants are allowed according to the internal route material.",
    tuitionRange: "£18,500 to £24,500",
    depositRange: "50% required, from about £5,000 minimum",
    publicSummary:
      "This route may fit a research-led UK Masters or PhD plan if your previous course is relevant and you can prepare a research proposal.",
    advisorSummary:
      "Keep this route for strong Masters or PhD applicants who want research positioning, PhD progression, or dependant planning.",
    firstStep: "Confirm qualification fit, course relevance, research topic, passport readiness, and deposit capacity.",
  },
  {
    id: "PRODUCT-UK-LOAN-001",
    status: LIVE,
    sourceLabel: SOURCE_LABEL,
    lastReviewed: LAST_REVIEWED,
    publicName: "Loan-supported UK tuition deposit route",
    internalName: "UK Study Now Pay Later / UK Tuition Deposit Loan",
    disclosureLevel: "advisor_only",
    country: "uk",
    publicLocation: "United Kingdom",
    internalProviderNotes: [
      "Useful when admission is plausible but deposit affordability is the main barrier.",
      "Keep repayment and partner routing internal.",
    ],
    productType: "loan_supported_route",
    bestFor: [
      "Applicants who need deposit support",
      "Applicants with at least a 2:2",
      "Selected HND or third-class applicants on a case-by-case basis",
    ],
    notBestFor: [
      "Applicants with no academic documents",
      "Applicants who cannot meet loan requirements",
      "Applicants who are not ready to submit documents for review",
    ],
    acceptedQualifications: [
      "second_class_lower",
      "second_class_upper",
      "first_class",
      "hnd_lower_credit",
      "hnd_upper_credit",
      "third_class",
    ],
    minimumAcademicRequirement: "A Masters application usually needs at least a relevant 2:2.",
    ageRule: "No age limit on the current UK loan-supported route, but academic and document review still apply.",
    studyGapRule: "Short study gaps are preferred for some routes. Older results may trigger extra English-test checks.",
    englishTestRule: "Some routes can work without a language test, but older results may trigger testing.",
    tuitionRange: "£15,000 to £18,500",
    depositRange: "£4,000 to £6,000",
    scholarshipOrFunding: "Planning support may cover deposit or full tuition depending on product fit.",
    publicSummary:
      "This route may fit if the UK looks right academically but tuition deposit pressure is the main barrier.",
    advisorSummary:
      "Use for qualified applicants who need a deposit-first plan after admission assessment. Age is not the main filter on the current UK loan-backed route.",
    firstStep: "Submit academic documents, CV, passport, and transcript before discussing advisor review.",
  },
  {
    id: "PRODUCT-UK-SCHOLARSHIP-GENERAL-001",
    status: LIVE,
    sourceLabel: SOURCE_LABEL,
    lastReviewed: LAST_REVIEWED,
    publicName: "Competitive UK scholarship route",
    disclosureLevel: "public",
    country: "uk",
    publicLocation: "United Kingdom",
    productType: "scholarship_route",
    bestFor: [
      "High-achieving students",
      "Applicants with strong academic records",
      "Masters or PhD applicants seeking funding support",
    ],
    notBestFor: [
      "Applicants with weak academic records",
      "Applicants who need guaranteed funding",
      "Applicants who cannot fund living costs where support is partial",
    ],
    acceptedQualifications: ["second_class_upper", "first_class"],
    minimumAcademicRequirement:
      "Scholarship review is currently reserved for applicants with a 2:1 or first-class result.",
    scholarshipOrFunding:
      "Some awards are partial tuition support while others can be fully funded, depending on the specific scholarship.",
    publicSummary:
      "This route may fit if you have a 2:1 or first-class result and can prepare a high-quality application before the deadline.",
    advisorSummary:
      "Separate the competitive awards carefully and keep scholarship language cautious. If the degree class is below 2:1, move the applicant to the loan-backed conversation instead.",
    firstStep: "Confirm degree class, target course, admission status, deadline, and living-cost funding plan.",
  },
  {
    id: "PRODUCT-UK-MANCHESTER-SCHOLARSHIP-001",
    status: REVIEW,
    sourceLabel: SOURCE_LABEL,
    lastReviewed: LAST_REVIEWED,
    publicName: "Merit-based UK university scholarship route",
    internalName: "University of Manchester Global Futures Scholarship",
    disclosureLevel: "advisor_only",
    country: "uk",
    publicLocation: "Manchester, United Kingdom",
    productType: "scholarship_route",
    bestFor: [
      "Nigerian and African applicants who meet residency criteria",
      "Strong academic applicants",
      "Self-funded students who can still cover living costs",
    ],
    notBestFor: [
      "Applicants who need full living-cost funding",
      "Applicants below the required degree class",
      "Applicants without an eligible offer before the deadline",
    ],
    acceptedQualifications: ["second_class_upper", "first_class"],
    minimumAcademicRequirement: "Masters applicants usually need at least a 2:1.",
    tuitionRange: "Scholarship support is a fee reduction rather than full living-cost cover.",
    publicSummary:
      "This route can be a useful merit-based option when the profile is strong and the applicant can still cover living costs.",
    advisorSummary:
      "Keep this route for advisor use only. Do not expose the university name by default.",
    firstStep: "Confirm residency, degree class, course eligibility, offer status, deposit readiness, and living-cost funding.",
  },
  {
    id: "PRODUCT-CANADA-GRAD-CERT-001",
    status: LIVE,
    sourceLabel: SOURCE_LABEL,
    lastReviewed: LAST_REVIEWED,
    publicName: "Canada graduate certificate pathway",
    internalName: "Canada Opportunities for HND, Second Class Lower, and Third-Class Graduates",
    disclosureLevel: "public",
    country: "canada",
    publicLocation: "Canada",
    productType: "graduate_certificate_route",
    bestFor: [
      "HND holders",
      "Third-class graduates",
      "Second-class lower graduates",
      "Career changers seeking practical Canadian study",
    ],
    notBestFor: [
      "Applicants expecting guaranteed PR outcomes",
      "Applicants who ignore PGWP duration strategy",
      "Applicants who cannot fund tuition and living costs",
    ],
    acceptedQualifications: [
      "hnd_lower_credit",
      "hnd_upper_credit",
      "third_class",
      "second_class_lower",
      "second_class_upper",
      "first_class",
    ],
    minimumAcademicRequirement:
      "HND lower credit fits best. Third-class and second-class lower applicants may still fit depending on the exact route.",
    studyGapRule: "One-year routes may narrow the longer-term study-to-work strategy, so sequencing matters.",
    postStudyWork:
      "A one-year route may shorten the post-study window; a two-stage plan can sometimes improve the longer-term pathway.",
    publicSummary:
      "This route may fit if you have HND, third class, or second-class lower and want a practical study-to-work direction in Canada.",
    advisorSummary:
      "Recommend carefully when the long-term work strategy depends on programme duration and course choice.",
    firstStep: "Confirm qualification, grade, target field, career direction, passport readiness, and funding capacity.",
  },
  {
    id: "PRODUCT-CANADA-DIPLOMA-LOAN-001",
    status: LIVE,
    sourceLabel: SOURCE_LABEL,
    lastReviewed: LAST_REVIEWED,
    publicName: "Loan-supported Canada diploma route",
    internalName: "Canada Study Now Pay Later Diploma Programme",
    disclosureLevel: "advisor_only",
    country: "canada",
    publicLocation: "Canada",
    productType: "loan_supported_route",
    bestFor: [
      "WAEC holders",
      "OND holders",
      "HND holders",
      "Applicants aged 18 to 33",
      "Applicants needing tuition and living-cost support",
    ],
    notBestFor: [
      "Applicants outside the age range",
      "Applicants without good loan or credit history",
      "Applicants without required academic documents",
    ],
    acceptedQualifications: ["waec_neco", "ond", "hnd_lower_credit", "hnd_upper_credit"],
    minimumAcademicRequirement:
      "WAEC with relevant credits, OND lower or upper credit, or HND lower or upper credit.",
    ageRule: "18 to 33 years only.",
    proofOfFundsSummary:
      "The loan route can reduce the proof-of-funding burden by providing a financial support letter once approved.",
    scholarshipOrFunding:
      "The route can cover tuition and living expenses depending on approval, with upfront payment after approval.",
    publicSummary:
      "This route may fit if you are within the age range, meet academic criteria, and need structured funding support for Canada.",
    advisorSummary:
      "Use only after checking age, qualification, credit readiness, course fit, and required documents.",
    firstStep: "Confirm age, qualification, preferred course field, credit readiness, employment status, and passport status.",
  },
  {
    id: "PRODUCT-FRANCE-BUSINESS-STRICT-001",
    status: LIVE,
    sourceLabel: SOURCE_LABEL,
    lastReviewed: LAST_REVIEWED,
    publicName: "Business-focused France study route",
    internalName: "ICN Creative Business School",
    disclosureLevel: "advisor_only",
    country: "france",
    publicLocation: "Paris or Nancy, France",
    productType: "study_route",
    bestFor: [
      "Strong academic applicants",
      "Applicants interested in business, management, or creative industries",
      "Applicants who meet the age limits",
    ],
    notBestFor: [
      "HND holders",
      "Third-class graduates",
      "Applicants below the required academic threshold",
    ],
    acceptedQualifications: ["second_class_upper", "first_class"],
    minimumAcademicRequirement:
      "A Masters route usually needs around 3.5/5.0 or stronger. Undergraduate routes still need a solid result.",
    ageRule: "Undergraduate routes may have a 25-year limit. Masters routes may have a 28-year limit.",
    scholarshipOrFunding: "A modest scholarship may be available, but funding and deposit planning still matter.",
    publicSummary:
      "You may fit a business-focused France study route if your academic profile is strong and you meet age and deposit requirements.",
    advisorSummary: "Strict France route. Keep away from HND and third-class applicants.",
    firstStep: "Confirm qualification, CGPA, age, passport readiness, and deposit capacity.",
  },
  {
    id: "PRODUCT-FRANCE-FLEXIBLE-BUSINESS-TECH-001",
    status: LIVE,
    sourceLabel: SOURCE_LABEL,
    lastReviewed: LAST_REVIEWED,
    publicName: "Flexible France business and technology study route",
    internalName: "Schiller International University",
    disclosureLevel: "advisor_only",
    country: "france",
    publicLocation: "Paris, France",
    productType: "study_route",
    bestFor: [
      "HND holders",
      "Third-class graduates",
      "Applicants who need a no-age-limit option",
      "Applicants interested in business or technology-related programmes",
    ],
    notBestFor: [
      "Applicants who cannot meet deposit and proof-of-funds requirements",
      "Applicants whose target course does not match available fields",
    ],
    acceptedQualifications: [
      "hnd_lower_credit",
      "hnd_upper_credit",
      "third_class",
      "second_class_lower",
      "second_class_upper",
      "first_class",
    ],
    minimumAcademicRequirement:
      "HND lower or upper credit is accepted. Third-class degree is also accepted according to the internal route material.",
    ageRule: "No age limit.",
    englishTestRule: "No English test required according to the internal route material.",
    dependantRule: "Dependants may be allowed for higher-level study according to the internal material.",
    scholarshipOrFunding: "A partial scholarship may exist depending on level and route.",
    publicSummary:
      "This route may fit if you need a flexible France option that can consider HND or third-class background and business or technology fields.",
    advisorSummary: "Flexible France route. Strong option for HND and third-class applicants.",
    firstStep: "Confirm qualification, grade, target course field, passport readiness, deposit capacity, and proof-of-funds readiness.",
  },
  {
    id: "PRODUCT-NEW-ZEALAND-STUDY-001",
    status: LIVE,
    sourceLabel: SOURCE_LABEL,
    lastReviewed: LAST_REVIEWED,
    publicName: "New Zealand study-to-work pathway",
    internalName: "Study in New Zealand 2026",
    disclosureLevel: "public",
    country: "new_zealand",
    publicLocation: "New Zealand",
    productType: "study_route",
    bestFor: [
      "Applicants interested in safe English-speaking destinations",
      "Applicants with longer study gaps",
      "Applicants interested in skilled shortage fields",
      "Masters or PhD applicants who want dependants",
    ],
    notBestFor: [
      "Applicants who cannot meet proof-of-funds requirements",
      "Applicants who cannot provide English test evidence",
      "Applicants choosing weak career-logic courses",
    ],
    acceptedQualifications: ["waec_neco", "second_class_lower", "second_class_upper", "first_class", "masters"],
    minimumAcademicRequirement:
      "Bachelor routes need O-level credits. Masters routes usually need a good BSc profile. PhD routes need a Masters degree and a research proposal.",
    studyGapRule: "A long study gap can still be workable if explained clearly.",
    englishTestRule: "IELTS, PTE, TOEFL, or Duolingo may be required depending on the route.",
    dependantRule: "Dependants may be allowed for Masters and PhD routes according to the internal material.",
    workWhileStudying: "Students can work during study and during holidays according to the internal material.",
    postStudyWork:
      "Bachelor, Masters, and PhD routes can have longer post-study work options than shorter diploma-style routes.",
    proofOfFundsSummary:
      "Planning should cover tuition, living costs, and travel costs. Six months of bank statements are advised internally.",
    publicSummary:
      "Your profile may fit a New Zealand study-to-work pathway if you are targeting skilled shortage fields, have a longer study gap, or want a route with work and residence potential.",
    advisorSummary:
      "Check course alignment, proof of funds, English test readiness, work documents, sponsor evidence, and study gap explanation.",
    firstStep: "Confirm qualification, study gap, target field, proof-of-funds capacity, passport readiness, and English test readiness.",
  },
];

const REQUIREMENTS: StudyRequirementCard[] = [
  {
    id: "REQ-GENERAL-PASSPORT-001",
    status: LIVE,
    sourceLabel: SOURCE_LABEL,
    lastReviewed: LAST_REVIEWED,
    country: "general",
    productIds: ["PRODUCT-UK-MRES-001", "PRODUCT-UK-LOAN-001", "PRODUCT-UK-SCHOLARSHIP-GENERAL-001", "PRODUCT-CANADA-GRAD-CERT-001", "PRODUCT-CANADA-DIPLOMA-LOAN-001", "PRODUCT-FRANCE-BUSINESS-STRICT-001", "PRODUCT-FRANCE-FLEXIBLE-BUSINESS-TECH-001", "PRODUCT-NEW-ZEALAND-STUDY-001"],
    group: "Personal documents",
    item: "International passport",
    priority: "blocker",
    publicDescription: "A valid international passport is needed before most study, visa, admission, or booking processes can move forward.",
    ifMissingRecommendation: "Apply for your passport first before applications, visa forms, flights, hotels, or advanced route steps.",
    questionsToAsk: [
      "Do you currently have a valid passport?",
      "When does it expire?",
      "Are you applying alone or with dependants?",
    ],
  },
  {
    id: "REQ-STUDY-ADMISSION-001",
    status: LIVE,
    sourceLabel: SOURCE_LABEL,
    lastReviewed: LAST_REVIEWED,
    country: "general",
    productIds: ["PRODUCT-UK-MRES-001", "PRODUCT-UK-LOAN-001", "PRODUCT-UK-SCHOLARSHIP-GENERAL-001", "PRODUCT-CANADA-GRAD-CERT-001", "PRODUCT-CANADA-DIPLOMA-LOAN-001", "PRODUCT-FRANCE-BUSINESS-STRICT-001", "PRODUCT-FRANCE-FLEXIBLE-BUSINESS-TECH-001", "PRODUCT-NEW-ZEALAND-STUDY-001"],
    group: "Admission documents",
    item: "Admission letter, offer letter, CAS, or equivalent",
    priority: "blocker",
    publicDescription: "A study route usually needs admission proof before visa planning can proceed.",
    ifMissingRecommendation: "Start with programme matching and admission application after passport readiness is confirmed.",
    questionsToAsk: [
      "Do you already have admission?",
      "What country are you targeting?",
      "What level are you applying for?",
      "What course field do you prefer?",
    ],
  },
  {
    id: "REQ-STUDY-ACADEMIC-001",
    status: LIVE,
    sourceLabel: SOURCE_LABEL,
    lastReviewed: LAST_REVIEWED,
    country: "general",
    productIds: ["PRODUCT-UK-MRES-001", "PRODUCT-UK-LOAN-001", "PRODUCT-UK-SCHOLARSHIP-GENERAL-001", "PRODUCT-UK-MANCHESTER-SCHOLARSHIP-001", "PRODUCT-CANADA-GRAD-CERT-001", "PRODUCT-CANADA-DIPLOMA-LOAN-001", "PRODUCT-FRANCE-BUSINESS-STRICT-001", "PRODUCT-FRANCE-FLEXIBLE-BUSINESS-TECH-001", "PRODUCT-NEW-ZEALAND-STUDY-001"],
    group: "Academic documents",
    item: "Certificates, transcripts, and academic history",
    priority: "important",
    publicDescription: "Academic documents help determine programme fit, admission eligibility, scholarship fit, and visa readiness.",
    ifMissingRecommendation: "Gather academic documents before admission or visa planning.",
    questionsToAsk: [
      "What is your highest qualification?",
      "What grade or CGPA did you finish with?",
      "Do you have your transcript?",
      "Are your certificates available?",
    ],
  },
  {
    id: "REQ-STUDY-CV-001",
    status: LIVE,
    sourceLabel: SOURCE_LABEL,
    lastReviewed: LAST_REVIEWED,
    country: "general",
    productIds: ["PRODUCT-UK-MRES-001", "PRODUCT-UK-LOAN-001", "PRODUCT-UK-SCHOLARSHIP-GENERAL-001", "PRODUCT-UK-MANCHESTER-SCHOLARSHIP-001", "PRODUCT-CANADA-GRAD-CERT-001", "PRODUCT-CANADA-DIPLOMA-LOAN-001", "PRODUCT-NEW-ZEALAND-STUDY-001"],
    group: "Professional documents",
    item: "CV or resume",
    priority: "supporting",
    publicDescription: "A CV helps with Masters, research, loan, and career-focused programme assessment.",
    ifMissingRecommendation: "Prepare or update your CV before assessment.",
    questionsToAsk: [
      "Do you have a current CV?",
      "Do you have work experience?",
      "Is your CV aligned with your target course?",
    ],
  },
  {
    id: "REQ-STUDY-RESEARCH-PROPOSAL-001",
    status: LIVE,
    sourceLabel: SOURCE_LABEL,
    lastReviewed: LAST_REVIEWED,
    country: "general",
    productIds: ["PRODUCT-UK-MRES-001"],
    group: "Research documents",
    item: "Research proposal",
    priority: "blocker",
    publicDescription: "Research-based programmes need a clear research direction and proposal.",
    ifMissingRecommendation: "Clarify the research topic and prepare a proposal before applying for research-based routes.",
    questionsToAsk: [
      "What research area interests you?",
      "Is your previous course related?",
      "Have you written a research proposal before?",
    ],
  },
  {
    id: "REQ-STUDY-PROOF-OF-FUNDS-001",
    status: LIVE,
    sourceLabel: SOURCE_LABEL,
    lastReviewed: LAST_REVIEWED,
    country: "general",
    productIds: ["PRODUCT-UK-MRES-001", "PRODUCT-UK-LOAN-001", "PRODUCT-UK-SCHOLARSHIP-GENERAL-001", "PRODUCT-UK-MANCHESTER-SCHOLARSHIP-001", "PRODUCT-CANADA-GRAD-CERT-001", "PRODUCT-CANADA-DIPLOMA-LOAN-001", "PRODUCT-FRANCE-BUSINESS-STRICT-001", "PRODUCT-FRANCE-FLEXIBLE-BUSINESS-TECH-001", "PRODUCT-NEW-ZEALAND-STUDY-001"],
    group: "Financial documents",
    item: "Proof of funds, sponsor documents, scholarship letter, or loan letter",
    priority: "important",
    publicDescription: "Study visa routes usually require evidence that tuition and living costs can be covered.",
    ifMissingRecommendation: "Clarify self-funding, sponsor, scholarship, or loan route before visa processing.",
    questionsToAsk: [
      "Are you self-funded or sponsored?",
      "Do you need loan or scholarship support?",
      "Can you show bank statements?",
      "Do you have a sponsor income source?",
    ],
  },
  {
    id: "REQ-UK-CAS-001",
    status: LIVE,
    sourceLabel: SOURCE_LABEL,
    lastReviewed: LAST_REVIEWED,
    country: "uk",
    productIds: ["PRODUCT-UK-MRES-001", "PRODUCT-UK-LOAN-001", "PRODUCT-UK-SCHOLARSHIP-GENERAL-001", "PRODUCT-UK-MANCHESTER-SCHOLARSHIP-001"],
    group: "Visa documents",
    item: "CAS",
    priority: "blocker",
    publicDescription: "The UK student visa process usually requires a CAS after admission and deposit requirements are met.",
    ifMissingRecommendation: "Secure admission and meet deposit conditions before CAS processing.",
    questionsToAsk: [
      "Do you have an offer?",
      "Have you paid the required deposit?",
      "Has CAS processing started?",
    ],
  },
  {
    id: "REQ-UK-TB-TEST-001",
    status: LIVE,
    sourceLabel: SOURCE_LABEL,
    lastReviewed: LAST_REVIEWED,
    country: "uk",
    productIds: ["PRODUCT-UK-MRES-001", "PRODUCT-UK-LOAN-001", "PRODUCT-UK-SCHOLARSHIP-GENERAL-001", "PRODUCT-UK-MANCHESTER-SCHOLARSHIP-001"],
    group: "Medical documents",
    item: "TB test certificate",
    priority: "conditional",
    publicDescription: "Some UK student visa applicants need a TB test certificate depending on nationality and visa rules.",
    ifMissingRecommendation: "Verify whether the applicant needs a TB test before visa submission.",
    questionsToAsk: [
      "What country are you applying from?",
      "Have you completed a TB test before?",
      "When are you submitting your visa application?",
    ],
  },
  {
    id: "REQ-FRANCE-POF-001",
    status: LIVE,
    sourceLabel: SOURCE_LABEL,
    lastReviewed: LAST_REVIEWED,
    country: "france",
    productIds: ["PRODUCT-FRANCE-BUSINESS-STRICT-001", "PRODUCT-FRANCE-FLEXIBLE-BUSINESS-TECH-001"],
    group: "Financial documents",
    item: "Proof of funds",
    priority: "important",
    publicDescription: "France study planning requires proof documents, and the exact evidence should be verified before final visa planning.",
    ifMissingRecommendation: "Clarify sponsor, self-funding, scholarship, or deposit plan before visa processing.",
    questionsToAsk: [
      "Are you applying alone or with dependants?",
      "Can you show financial support?",
      "Have you paid tuition deposit?",
    ],
  },
  {
    id: "REQ-NEW-ZEALAND-POF-001",
    status: LIVE,
    sourceLabel: SOURCE_LABEL,
    lastReviewed: LAST_REVIEWED,
    country: "new_zealand",
    productIds: ["PRODUCT-NEW-ZEALAND-STUDY-001"],
    group: "Financial documents",
    item: "Proof of funding",
    priority: "important",
    publicDescription: "New Zealand study planning should account for tuition, living expenses, and travel expenses.",
    ifMissingRecommendation: "Clarify sponsor, bank statement, loan letter, or funding route before visa processing.",
    questionsToAsk: [
      "Can you show tuition funding?",
      "Can you show living expenses?",
      "Do you have sponsor documents?",
      "Do you have a loan letter if applicable?",
    ],
  },
];

const RULES: StudyRecommendationRule[] = [
  {
    id: "RULE-NO-PASSPORT-FIRST-001",
    status: LIVE,
    sourceLabel: SOURCE_LABEL,
    lastReviewed: LAST_REVIEWED,
    triggerSummary: "No passport means pause and reset the sequence to passport readiness.",
    matchSignals: ["passport:no_passport"],
    recommendedProductIds: [],
    avoidProductIds: [],
    publicRecommendation:
      "Your first step is passport readiness. Apply for an international passport before applications, visa processing, bookings, or advanced route steps.",
    advisorReason: "Passport is a universal foundation document across all study products.",
    askNext: [
      "What country are you considering?",
      "What is your highest qualification?",
      "When do you want to start?",
    ],
    warnings: ["Do not start school or visa steps before passport readiness is resolved."],
  },
  {
    id: "RULE-UK-DEPENDANTS-RESEARCH-001",
    status: LIVE,
    sourceLabel: SOURCE_LABEL,
    lastReviewed: LAST_REVIEWED,
    triggerSummary: "UK Masters or PhD applicants with dependant interest and research readiness.",
    matchSignals: ["destination:uk", "level:postgraduate", "dependants:yes"],
    recommendedProductIds: ["PRODUCT-UK-MRES-001"],
    avoidProductIds: [],
    publicRecommendation:
      "A research-based UK Masters or PhD route may be more suitable if you want to study and relocate with dependants.",
    advisorReason: "The MRes route is the best fit for research positioning and dependant-friendly planning in the source material.",
    askNext: [
      "Do you have at least a 2:2?",
      "Is your previous course related?",
      "Can you prepare a research proposal?",
      "Can you meet the deposit requirement?",
    ],
    warnings: [
      "Do not recommend if the course background is unrelated.",
      "Do not recommend if the applicant cannot prepare a research proposal.",
    ],
  },
  {
    id: "RULE-UK-DEPOSIT-BARRIER-001",
    status: LIVE,
    sourceLabel: SOURCE_LABEL,
    lastReviewed: LAST_REVIEWED,
    triggerSummary: "UK applicants who need support but otherwise have plausible academic fit.",
    matchSignals: ["destination:uk", "funding:needs_support", "academic:admission_possible"],
    recommendedProductIds: ["PRODUCT-UK-LOAN-001"],
    avoidProductIds: [],
    publicRecommendation:
      "You may fit a support-reviewed UK study route if your academic documents meet the route requirements and the application sequence is validated privately.",
    advisorReason: "The loan route addresses tuition deposit and CAS sequencing after admission assessment.",
    askNext: [
      "What is your degree class?",
      "Do you have your transcript?",
      "Is your result older than 15 years?",
      "Do you already have admission?",
    ],
    warnings: [
      "Loan support is not automatic.",
      "Do not expose repayment examples publicly unless intentionally enabled.",
    ],
  },
  {
    id: "RULE-CANADA-HND-THIRDCLASS-001",
    status: LIVE,
    sourceLabel: SOURCE_LABEL,
    lastReviewed: LAST_REVIEWED,
    triggerSummary: "Canada applicants with HND, third class, or second-class lower backgrounds.",
    matchSignals: ["destination:canada", "qualification:hnd_or_below", "goal:study"],
    recommendedProductIds: ["PRODUCT-CANADA-GRAD-CERT-001"],
    avoidProductIds: [],
    publicRecommendation:
      "Your profile may fit a practical Canada graduate certificate route, especially if you have HND, third class, or second-class lower.",
    advisorReason: "The Canada graduate certificate route explicitly targets HND, third-class, and second-class lower applicants.",
    askNext: [
      "What is your exact qualification?",
      "What grade did you finish with?",
      "What field do you want to study?",
      "Do you want a one-year or two-year study strategy?",
    ],
    warnings: [
      "Do not overpromise PR.",
      "Explain PGWP duration strategy carefully.",
    ],
  },
  {
    id: "RULE-CANADA-DIPLOMA-LOAN-001",
    status: LIVE,
    sourceLabel: SOURCE_LABEL,
    lastReviewed: LAST_REVIEWED,
    triggerSummary: "Canada applicants who need support and fit the age/qualification window.",
    matchSignals: ["destination:canada", "funding:needs_support", "age:18_33", "qualification:waec_ond_hnd"],
    recommendedProductIds: ["PRODUCT-CANADA-DIPLOMA-LOAN-001"],
    avoidProductIds: [],
    publicRecommendation:
      "You may fit a support-reviewed Canada diploma route if you meet the age, academic, and readiness conditions.",
    advisorReason: "The diploma loan route is age-sensitive and works best when credit readiness and course fit are realistic.",
    askNext: [
      "How old are you?",
      "What qualification do you have?",
      "Do you have good loan or credit history?",
      "Are you interested in STEM, trade, health, education, management, or engineering?",
    ],
    warnings: [
      "Do not recommend outside the age range.",
      "Do not recommend if the applicant cannot meet credit-readiness conditions.",
      "Do not expose the loan provider publicly by default.",
    ],
  },
  {
    id: "RULE-FRANCE-HND-THIRDCLASS-001",
    status: LIVE,
    sourceLabel: SOURCE_LABEL,
    lastReviewed: LAST_REVIEWED,
    triggerSummary: "France applicants with HND or third-class backgrounds who need flexibility.",
    matchSignals: ["destination:france", "qualification:hnd_or_below", "goal:study"],
    recommendedProductIds: ["PRODUCT-FRANCE-FLEXIBLE-BUSINESS-TECH-001"],
    avoidProductIds: ["PRODUCT-FRANCE-BUSINESS-STRICT-001"],
    publicRecommendation:
      "Your profile may fit a flexible France business or technology study route that can consider HND or third-class backgrounds.",
    advisorReason:
      "The flexible France route accepts HND and third-class applicants while the stricter business route does not.",
    askNext: [
      "What is your exact qualification?",
      "What course field are you targeting?",
      "Can you meet tuition deposit and proof-of-funds requirements?",
    ],
    warnings: [
      "Do not recommend the stricter France route to HND or third-class applicants.",
      "Do not expose school names by default.",
    ],
  },
  {
    id: "RULE-FRANCE-STRONG-BUSINESS-001",
    status: LIVE,
    sourceLabel: SOURCE_LABEL,
    lastReviewed: LAST_REVIEWED,
    triggerSummary: "France applicants with a strong academic profile and business interest.",
    matchSignals: ["destination:france", "interest:business", "academic:strong"],
    recommendedProductIds: ["PRODUCT-FRANCE-BUSINESS-STRICT-001"],
    avoidProductIds: [],
    publicRecommendation:
      "You may fit a business-focused France study route if your academic result is strong and you meet the age and deposit requirements.",
    advisorReason: "The strict France business route has stronger academic and age filters.",
    askNext: [
      "What is your CGPA?",
      "What is your age?",
      "What business field do you want?",
      "Can you meet the deposit requirement?",
    ],
    warnings: ["Do not recommend to HND or third-class applicants."],
  },
  {
    id: "RULE-NEW-ZEALAND-SKILLED-FIELD-001",
    status: LIVE,
    sourceLabel: SOURCE_LABEL,
    lastReviewed: LAST_REVIEWED,
    triggerSummary: "New Zealand applicants in skilled or in-demand fields or with longer study gaps.",
    matchSignals: ["destination:new_zealand", "interest:skilled_field"],
    recommendedProductIds: ["PRODUCT-NEW-ZEALAND-STUDY-001"],
    avoidProductIds: [],
    publicRecommendation:
      "You may fit a New Zealand study-to-work route if your target field aligns with skilled shortage or in-demand areas.",
    advisorReason: "The New Zealand route is strongest when field alignment, proof of funds, and English readiness are all realistic.",
    askNext: [
      "What field are you targeting?",
      "What is your highest qualification?",
      "Do you have a study gap?",
      "Can you provide proof of funds?",
      "Do you have an English test?",
    ],
    warnings: [
      "Proof of funds may be significant.",
      "English test readiness is important.",
    ],
  },
  {
    id: "RULE-UK-SCHOLARSHIP-FALLBACK-LOAN-001",
    status: LIVE,
    sourceLabel: SOURCE_LABEL,
    lastReviewed: LAST_REVIEWED,
    triggerSummary: "UK applicants who asked for scholarship support but do not meet the current 2:1 or first-class scholarship rule.",
    matchSignals: ["destination:uk", "scholarship:true", "qualification:not_uk_scholarship_class"],
    recommendedProductIds: ["PRODUCT-UK-LOAN-001"],
    avoidProductIds: ["PRODUCT-UK-SCHOLARSHIP-GENERAL-001", "PRODUCT-UK-MANCHESTER-SCHOLARSHIP-001"],
    publicRecommendation:
      "Based on your current degree class, a UK loan-supported route is the more realistic support plan than a scholarship-first route.",
    advisorReason:
      "When the applicant asks for scholarship support but does not have a 2:1 or first-class profile, pivot the conversation to the UK loan-backed route instead.",
    askNext: [
      "What is your exact degree class?",
      "Can you meet the document checks for a UK loan-supported route?",
      "Do you already have your transcript, CV, and passport ready?",
    ],
    warnings: [
      "Do not position scholarship as the main route below 2:1.",
      "The current UK loan-backed route does not have an age limit, but it still needs academic and document review.",
    ],
  },
  {
    id: "RULE-UK-MERIT-SCHOLARSHIP-001",
    status: LIVE,
    sourceLabel: SOURCE_LABEL,
    lastReviewed: LAST_REVIEWED,
    triggerSummary: "UK applicants with strong academics and scholarship interest.",
    matchSignals: ["destination:uk", "scholarship:true", "qualification:uk_scholarship_class"],
    recommendedProductIds: ["PRODUCT-UK-SCHOLARSHIP-GENERAL-001", "PRODUCT-UK-MANCHESTER-SCHOLARSHIP-001"],
    avoidProductIds: [],
    publicRecommendation:
      "You may fit a competitive UK scholarship route if your academic profile is strong and you can prepare a complete application before the deadline.",
    advisorReason:
      "Scholarship routes require strong grades, deadlines, admission fit, and financial clarity.",
    askNext: [
      "What is your CGPA or degree class?",
      "Have you secured admission?",
      "Can you cover living costs if the scholarship is partial?",
      "What course are you targeting?",
    ],
    warnings: [
      "Do not guarantee scholarship.",
      "Distinguish full funding from partial tuition discounts.",
    ],
  },
];

function normalizeDestination(value: string | null | undefined): StudyDestination | "general" {
  if (value === "uk" || value === "canada" || value === "france" || value === "new_zealand") {
    return value;
  }
  return "general";
}

function hasStudyDependantsSignal(answers: AssessmentAnswers) {
  return answers.familyOpenPathway === "study_route" || answers.primaryGoal === "family_relocation";
}

function hasSkilledFieldSignal(answers: AssessmentAnswers) {
  return ["healthcare", "tech", "engineering", "education", "hospitality", "skilled_trade"].includes(
    answers.workField ?? "",
  );
}

function academicStrength(answers: AssessmentAnswers) {
  const value = answers.highestEducation;

  if (value === "masters" || value === "phd") {
    return "very_strong";
  }

  if (value === "first_class" || value === "second_class_upper" || value === "bachelors") {
    return "strong";
  }

  if (
    value === "second_class_lower" ||
    value === "hnd" ||
    value === "hnd_lower_credit" ||
    value === "hnd_upper_credit"
  ) {
    return "moderate";
  }

  if (value === "third_class" || value === "ond_nce_diploma") {
    return "moderate";
  }

  if (value === "secondary_school") {
    return "weak";
  }

  return "moderate";
}

function qualificationFits(answers: AssessmentAnswers): QualificationFit[] {
  switch (answers.highestEducation) {
    case "secondary_school":
      return ["waec_neco"];
    case "ond_nce_diploma":
      return ["ond"];
    case "hnd_lower_credit":
      return ["hnd_lower_credit"];
    case "hnd_upper_credit":
      return ["hnd_upper_credit"];
    case "hnd":
      return ["hnd_lower_credit", "hnd_upper_credit"];
    case "third_class":
      return ["third_class"];
    case "second_class_lower":
      return ["second_class_lower"];
    case "second_class_upper":
      return ["second_class_upper"];
    case "first_class":
      return ["first_class"];
    case "bachelors":
      return ["second_class_lower", "second_class_upper", "first_class"];
    case "masters":
      return ["masters", "second_class_upper", "first_class"];
    case "phd":
      return ["masters", "first_class"];
    case "professional_certification":
      return ["waec_neco"];
    default:
      return [];
  }
}

function fundingProfile(answers: AssessmentAnswers) {
  return resolveStudyFundingProfile(answers);
}

function languageReadiness(answers: AssessmentAnswers) {
  return answers.languageTestStatus === "valid_result" ? "ready" : "not_ready";
}

function studyLevelLabel(answers: AssessmentAnswers) {
  switch (answers.studyLevel) {
    case "undergraduate":
      return "undergraduate";
    case "postgraduate":
      return answers.highestEducation === "masters" || answers.highestEducation === "phd"
        ? "Masters or PhD"
        : "Masters-level";
    case "diploma_foundation":
      return "diploma or foundation";
    case "professional_course":
      return "professional course";
    default:
      return "study";
  }
}

function qualificationLabel(answers: AssessmentAnswers) {
  switch (answers.highestEducation) {
    case "second_class_lower":
      return "your 2:2 bachelor's degree";
    case "second_class_upper":
      return "your 2:1 bachelor's degree";
    case "first_class":
      return "your first-class bachelor's degree";
    case "third_class":
      return "your third-class bachelor's degree";
    case "hnd_lower_credit":
      return "your HND lower credit";
    case "hnd_upper_credit":
      return "your HND upper credit";
    case "hnd":
      return "your HND";
    case "ond_nce_diploma":
      return "your OND, NCE, or diploma background";
    case "masters":
      return "your Master's degree";
    case "phd":
      return "your PhD";
    case "bachelors":
      return "your Bachelor's degree";
    case "secondary_school":
      return "your secondary-school result";
    case "professional_certification":
      return "your professional certification";
    default:
      return "your academic background";
  }
}

function destinationLabel(destination: StudyDestination | "general", countryCard?: StudyCountryCard) {
  if (countryCard) {
    return countryCard.publicName;
  }

  switch (destination) {
    case "uk":
      return "the UK";
    case "canada":
      return "Canada";
    case "france":
      return "France";
    case "new_zealand":
      return "New Zealand";
    default:
      return "a study destination";
  }
}

function answerReasonParts(answers: AssessmentAnswers, countryCard: StudyCountryCard) {
  const parts: string[] = [];

  if (answers.destinationInterest && answers.destinationInterest !== "not_sure") {
    parts.push(`you selected ${destinationLabel(countryCard.country, countryCard)}`);
  }

  if (answers.studyLevel && answers.studyLevel !== "not_sure") {
    parts.push(`you are looking at ${studyLevelLabel(answers)} study`);
  }

  if (answers.highestEducation) {
    parts.push(`your highest qualification is ${qualificationLabel(answers).replace(/^your /, "")}`);
  }

  if (hasStudyDependantsSignal(answers)) {
    parts.push("dependant or family planning matters to you");
  }

  if (
    fundingProfile(answers) === "support_needed" ||
    fundingProfile(answers) === "loan_support" ||
    fundingProfile(answers) === "scholarship"
  ) {
    parts.push("you asked for structured support");
  }

  if (answers.languageTestStatus === "valid_result") {
    parts.push("you already have a language-test result");
  }

  return parts.slice(0, 4);
}

function joinReasonParts(parts: string[]) {
  if (parts.length === 0) {
    return "Based on your answers";
  }

  if (parts.length === 1) {
    return `Because ${parts[0]}`;
  }

  return `Because ${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

function buildRouteLogicDescription(
  answers: AssessmentAnswers,
  product: StudyProductCard,
  countryCard: StudyCountryCard,
) {
  const reason = joinReasonParts(answerReasonParts(answers, countryCard));

  if (answers.studyLevel === "postgraduate") {
    return `${reason}, this route is being prioritised because it can be reviewed against your ${studyLevelLabel(answers)} direction, course relevance, document readiness, and route conditions.`;
  }

  return `${reason}, this route is being prioritised because the ${product.publicName.toLowerCase()} is the most practical match to review before applications move forward.`;
}

function buildAcademicFitDescription(answers: AssessmentAnswers, product: StudyProductCard) {
  const qualification = qualificationLabel(answers);

  if (
    answers.studyLevel === "postgraduate" &&
    answers.highestEducation === "second_class_lower" &&
    product.acceptedQualifications.includes("second_class_lower")
  ) {
    return "You meet the basic requirement for a Masters application with your 2:2 qualification. The next check is whether your course field and documents match the exact programme.";
  }

  if (productMatchesQualification(product, qualificationFits(answers))) {
    return `Your profile can be reviewed for this route with ${qualification}. The next check is exact course relevance, transcripts, and programme entry criteria.`;
  }

  return `${qualification} still needs document review against this route before you commit to applications.`;
}

function timelinePressure(answers: AssessmentAnswers) {
  return answers.timeline === "immediately" || answers.timeline === "3_6_months" ? "urgent" : "moderate";
}

const AGE_RANGE_ORDER = {
  "18_24": 0,
  "25_27": 1,
  "28_33": 2,
  "34_39": 3,
  "40_plus": 4,
} as const;

type AgeRangeKey = keyof typeof AGE_RANGE_ORDER;

function normalizeAgeRange(value: AssessmentAnswers["ageRange"]): AgeRangeKey | null {
  if (!value || value === "prefer_not_say") {
    return null;
  }

  return value as AgeRangeKey;
}

function ageRangeIndex(value: AgeRangeKey | null) {
  return value ? AGE_RANGE_ORDER[value] : null;
}

function ageRangeAtMost(value: AssessmentAnswers["ageRange"], max: AgeRangeKey) {
  const normalized = normalizeAgeRange(value);
  const index = ageRangeIndex(normalized);

  if (index === null) {
    return false;
  }

  return index <= AGE_RANGE_ORDER[max];
}

function buildMissingFields(answers: AssessmentAnswers): string[] {
  const missingFields: string[] = [];

  if (answers.passportStatus === "no_passport") {
    missingFields.push("passportStatus");
  }

  if (!answers.destinationInterest || answers.destinationInterest === "not_sure") {
    missingFields.push("destinationInterest");
  }

  if (answers.studyLevel === "not_sure" || !answers.studyLevel) {
    missingFields.push("studyLevel");
  }

  if (answers.highestEducation === "bachelors") {
    missingFields.push("degreeClass");
  }

  if (answers.highestEducation === "hnd") {
    missingFields.push("hndGrade");
  }

  if (answers.previousRefusal === "yes") {
    missingFields.push("refusalReview");
  }

  if (answers.languageTestStatus === "not_taken" || answers.languageTestStatus === "not_sure") {
    missingFields.push("languageTestReadiness");
  }

  if (
    fundingProfile(answers) === "support_needed" ||
    fundingProfile(answers) === "loan_support" ||
    fundingProfile(answers) === "scholarship"
  ) {
    missingFields.push("fundingPlan");
  }

  if (!normalizeAgeRange(answers.ageRange) && answers.primaryGoal === "study_abroad") {
    missingFields.push("ageRange");
  }

  return Array.from(new Set(missingFields));
}

function productMatchesQualification(product: StudyProductCard, fits: QualificationFit[]) {
  return product.acceptedQualifications.some((fit) => fits.includes(fit));
}

function productPassesHardFilters(product: StudyProductCard, answers: AssessmentAnswers) {
  if (product.productType === "scholarship_route" && product.country === "uk") {
    return isUkScholarshipEligible(answers);
  }

  if (product.id === "PRODUCT-CANADA-DIPLOMA-LOAN-001") {
    return isCanadaLoanAgeEligible(answers);
  }

  return true;
}

function scoreProduct(product: StudyProductCard, answers: AssessmentAnswers) {
  const destination = normalizeDestination(answers.destinationInterest);
  const fits = qualificationFits(answers);
  const funding = fundingProfile(answers);
  const academic = academicStrength(answers);
  const language = languageReadiness(answers);
  const timeline = timelinePressure(answers);
  const dependants = hasStudyDependantsSignal(answers);
  const skilledField = hasSkilledFieldSignal(answers);
  const ageRange = normalizeAgeRange(answers.ageRange);

  let score = 0;
  const reasons: string[] = [];

  if (destination !== "general" && destination === product.country) {
    score += 40;
    reasons.push("Destination interest matches this route.");
  } else if (destination === "general") {
    score += 8;
  } else {
    score -= 6;
  }

  if (productMatchesQualification(product, fits)) {
    score += 26;
    reasons.push("Your highest qualification can fit this route.");
  } else {
    score -= 10;
  }

  if (product.id === "PRODUCT-UK-MRES-001" && academic !== "weak" && answers.studyLevel !== "undergraduate") {
    score += 18;
    reasons.push("Your Masters or PhD profile supports research-led UK study.");
  }

  if (product.id === "PRODUCT-UK-LOAN-001" && funding !== "self") {
    score += 18;
    reasons.push("Deposit support looks relevant.");
  }

  if (product.id === "PRODUCT-UK-SCHOLARSHIP-GENERAL-001") {
    if (funding === "scholarship" && (academic === "strong" || academic === "very_strong")) {
      score += 24;
      reasons.push("Scholarship interest and academic strength align.");
    } else {
      score -= academic === "weak" ? 18 : 4;
    }
  }

  if (product.id === "PRODUCT-CANADA-GRAD-CERT-001") {
    if (
      [
        "hnd_lower_credit",
        "hnd_upper_credit",
        "hnd",
        "ond_nce_diploma",
        "third_class",
        "second_class_lower",
        "bachelors",
      ].includes(answers.highestEducation ?? "")
    ) {
      score += 20;
      reasons.push("Your background suits a practical Canada certificate route.");
    }
    if (funding !== "self") {
      score += 6;
    }
  }

  if (product.id === "PRODUCT-CANADA-DIPLOMA-LOAN-001") {
    if (
      [
        "secondary_school",
        "ond_nce_diploma",
        "hnd_lower_credit",
        "hnd_upper_credit",
        "hnd",
      ].includes(answers.highestEducation ?? "")
    ) {
      score += 18;
    }
    if (funding === "support_needed" || funding === "loan_support") {
      score += 22;
      reasons.push("Your support needs make a structured route review important.");
    }
    if (ageRangeAtMost(answers.ageRange, "28_33")) {
      score += 14;
      reasons.push("The age range fits the structured Canada diploma route.");
    } else if (ageRange) {
      score -= 22;
      reasons.push("The age range does not fit the Canada diploma loan route.");
    } else {
      score -= 10;
      reasons.push("Age range is still needed to confirm the Canada diploma loan route.");
    }
  }

  if (product.id === "PRODUCT-FRANCE-BUSINESS-STRICT-001") {
    if (
      answers.destinationInterest === "france" &&
      academic === "strong" &&
      ["first_class", "second_class_upper", "bachelors"].includes(answers.highestEducation ?? "")
    ) {
      score += 20;
      reasons.push("Strong academics support the stricter France route.");
    } else {
      score -= 18;
    }
  }

  if (product.id === "PRODUCT-FRANCE-FLEXIBLE-BUSINESS-TECH-001") {
    if (
      answers.destinationInterest === "france" &&
      [
        "hnd_lower_credit",
        "hnd_upper_credit",
        "hnd",
        "ond_nce_diploma",
        "third_class",
        "second_class_lower",
        "bachelors",
      ].includes(answers.highestEducation ?? "")
    ) {
      score += 24;
      reasons.push("Flexible France route fits a wider academic range.");
    }
  }

  if (product.id === "PRODUCT-NEW-ZEALAND-STUDY-001") {
    if (answers.destinationInterest === "new_zealand") {
      score += 24;
      reasons.push("Destination interest matches New Zealand.");
    }
    if (skilledField || answers.workExperienceYears === "6_9" || answers.workExperienceYears === "10_plus") {
      score += 18;
      reasons.push("Work background suggests a skilled-field or longer-gap profile.");
    }
  }

  if (dependants && (product.id === "PRODUCT-UK-MRES-001" || product.id === "PRODUCT-NEW-ZEALAND-STUDY-001")) {
    score += 10;
  }

  if (language === "ready") {
    score += product.id === "PRODUCT-FRANCE-FLEXIBLE-BUSINESS-TECH-001" ? 8 : 12;
  } else if (product.id !== "PRODUCT-FRANCE-FLEXIBLE-BUSINESS-TECH-001") {
    score -= 6;
  }

  if (timeline === "urgent") {
    score +=
      product.id === "PRODUCT-CANADA-DIPLOMA-LOAN-001" ||
      product.id === "PRODUCT-CANADA-GRAD-CERT-001" ||
      product.id === "PRODUCT-FRANCE-FLEXIBLE-BUSINESS-TECH-001"
        ? 8
        : 2;
  }

  if (answers.previousRefusal === "yes") {
    score -= 6;
    reasons.push("Previous refusal history needs extra review.");
  }

  if (answers.studyLevel === "postgraduate" && product.productType === "scholarship_route") {
    score += 8;
  }

  if (answers.studyLevel === "diploma_foundation" && product.productType === "diploma_route") {
    score += 10;
  }

  return { score, reasons };
}

function buildAdvisorNotes(products: StudyProductCard[], rules: StudyRecommendationRule[]) {
  const notes = new Set<string>();

  for (const product of products) {
    if (product.internalName && product.disclosureLevel !== "public") {
      notes.add(`Internal route: ${product.internalName}`);
    }
    if (product.advisorSummary) {
      notes.add(product.advisorSummary);
    }
    product.internalProviderNotes?.forEach((note) => notes.add(note));
  }

  for (const rule of rules) {
    notes.add(rule.advisorReason);
  }

  return Array.from(notes).slice(0, 6);
}

function buildBlockers(answers: AssessmentAnswers, products: StudyProductCard[], rules: StudyRecommendationRule[]) {
  const blockers: string[] = [];

  if (answers.passportStatus === "no_passport") {
    blockers.push("Passport readiness comes first.");
  }

  if (answers.passportValidity === "lt_6") {
    blockers.push("Passport validity is too short for confident study planning.");
  }

  const languageRequired = products.some((product) => product.country !== "france" && product.country !== "canada")
    ? true
    : false;
  if (
    products.some((product) => product.productType === "research_route") &&
    answers.studyLevel !== "undergraduate"
  ) {
    blockers.push("You need to prepare a clear research topic and proposal for this route.");
  }

  if (languageRequired && (answers.languageTestStatus === "not_taken" || answers.languageTestStatus === "not_sure")) {
    blockers.push("You need to confirm whether this route requires IELTS, PTE, TOEFL, Duolingo, or a valid waiver.");
  }

  if (
    fundingProfile(answers) === "support_needed" ||
    fundingProfile(answers) === "loan_support" ||
    fundingProfile(answers) === "scholarship"
  ) {
    blockers.push("Because you asked for support, we recommend reviewing your funding options before applications move forward.");
  }

  if (requestedScholarshipButNotEligible(answers)) {
    blockers.push("Your current degree class does not fit the scholarship rule, so the report should compare loan-backed support routes instead.");
  }

  if (answers.previousRefusal === "yes") {
    blockers.push("Previous refusal history needs a careful review.");
  }

  if (!answers.destinationInterest || answers.destinationInterest === "not_sure") {
    blockers.push("Destination direction is still broad.");
  }

  for (const rule of rules) {
    if (rule.warnings.length > 0 && rule.matchSignals.some((signal) => signal === "passport:no_passport" && answers.passportStatus === "no_passport")) {
      blockers.push(rule.warnings[0]);
    }
  }

  return Array.from(new Set(blockers)).slice(0, 4);
}

function selectRequirements(productIds: string[], answers: AssessmentAnswers) {
  const selected = REQUIREMENTS.filter((card) => {
    if (card.country !== "general") {
      const destination = normalizeDestination(answers.destinationInterest);
      if (destination !== "general" && card.country !== destination) {
        return false;
      }
    }

    return card.productIds.some((id) => productIds.includes(id));
  });

  const priorityOrder: Record<StudyRequirementCard["priority"], number> = {
    blocker: 0,
    important: 1,
    supporting: 2,
    conditional: 3,
  };

  return selected.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]).slice(0, 5);
}

function toPublicRequirement(requirement: StudyRequirementCard): PublicStudyRequirement {
  return {
    id: requirement.id,
    group: requirement.group,
    item: requirement.item,
    priority: requirement.priority,
    publicDescription: requirement.publicDescription,
    ifMissingRecommendation: requirement.ifMissingRecommendation,
  };
}

function matchRule(rule: StudyRecommendationRule, answers: AssessmentAnswers) {
  const destination = normalizeDestination(answers.destinationInterest);
  const fits = qualificationFits(answers);
  const funding = fundingProfile(answers);
  const academic = academicStrength(answers);
  const language = languageReadiness(answers);
  const dependants = hasStudyDependantsSignal(answers);
  const skilledField = hasSkilledFieldSignal(answers);
  const scholarship = funding === "scholarship";

  return rule.matchSignals.every((signal) => {
    const [key, value] = signal.split(":");

    switch (key) {
      case "passport":
        return value === answers.passportStatus;
      case "destination":
        return value === destination;
      case "level":
        return value === answers.studyLevel;
      case "dependants":
        return value === "yes" ? dependants : !dependants;
      case "funding":
        return value === funding;
      case "academic":
        if (value === "strong") {
          return academic === "strong" || academic === "very_strong";
        }
        if (value === "admission_possible") {
          return academic !== "weak";
        }
        return academic === value;
      case "qualification":
        if (value === "uk_scholarship_class") {
          return isUkScholarshipEligible(answers);
        }
        if (value === "not_uk_scholarship_class") {
          return !isUkScholarshipEligible(answers);
        }
        if (value === "hnd_or_below") {
          return fits.some((fit) => ["waec_neco", "ond", "hnd_lower_credit", "hnd_upper_credit", "third_class", "second_class_lower"].includes(fit));
        }
        if (value === "waec_ond_hnd") {
          return fits.some((fit) => ["waec_neco", "ond", "hnd_lower_credit", "hnd_upper_credit"].includes(fit));
        }
        return fits.includes(value as QualificationFit);
      case "interest":
        if (value === "business") {
          return ["business_abroad", "study_abroad"].includes(answers.primaryGoal ?? "");
        }
        if (value === "skilled_field") {
          return skilledField || answers.workExperienceYears === "6_9" || answers.workExperienceYears === "10_plus";
        }
        return false;
      case "scholarship":
        return value === "true" ? scholarship : !scholarship;
      case "language":
        return value === "ready" ? language === "ready" : language !== "ready";
      case "age":
        if (value === "18_33") {
          return ageRangeAtMost(answers.ageRange, "28_33");
        }
        if (value === "under_28") {
          return ageRangeAtMost(answers.ageRange, "25_27");
        }
        if (value === "under_34") {
          return ageRangeAtMost(answers.ageRange, "28_33");
        }
        return normalizeAgeRange(answers.ageRange) === value;
      default:
        return true;
    }
  });
}

function getCountryFallback(country: StudyDestination | "general") {
  return COUNTRY_CARDS.find((card) => card.country === country) ?? null;
}

function choosePrimaryProduct(products: StudyProductCard[], answers: AssessmentAnswers) {
  const scored = products
    .map((product) => {
      const { score, reasons } = scoreProduct(product, answers);
      return { product, score, reasons };
    })
    .sort((a, b) => b.score - a.score);

  const top = scored.filter((item) => item.score > -20).slice(0, 3);

  return top.length > 0 ? top : scored.slice(0, 1);
}

function buildWhyThisFits(
  answers: AssessmentAnswers,
  product: StudyProductCard,
  scoreReasons: string[],
  countryCard: StudyCountryCard,
) {
  const items = new Set<string>();

  items.add(buildRouteLogicDescription(answers, product, countryCard));
  scoreReasons
    .filter((reason) => !/destination interest matches/i.test(reason))
    .slice(0, 1)
    .forEach((reason) => items.add(reason));

  if (items.size < 3 && answers.studyLevel && answers.studyLevel !== "not_sure") {
    items.add(
      `Your chosen study level points more naturally toward a ${product.publicName.toLowerCase()}.`,
    );
  }

  if (
    items.size < 3 &&
    (fundingProfile(answers) === "support_needed" ||
      fundingProfile(answers) === "loan_support")
  ) {
    items.add("Because you asked for support, this route should stay practical and should be checked before applications move forward.");
  }

  if (
    items.size < 3 &&
    hasStudyDependantsSignal(answers) &&
    product.dependantRule
  ) {
    items.add("Family or dependant planning matters for this route, so we are prioritising options that can be reviewed for that.");
  }

  return Array.from(items).slice(0, 3);
}

function buildFitHighlights(
  answers: AssessmentAnswers,
  product: StudyProductCard,
  countryCard: StudyCountryCard,
): StudyFitHighlight[] {
  const highlights: StudyFitHighlight[] = [
    {
      title: "Route logic",
      description: buildRouteLogicDescription(answers, product, countryCard),
    },
  ];

  if (product.minimumAcademicRequirement) {
    highlights.push({
      title: "Academic fit",
      description: buildAcademicFitDescription(answers, product),
    });
  }

  if (
    fundingProfile(answers) === "support_needed" ||
    fundingProfile(answers) === "loan_support" ||
    fundingProfile(answers) === "scholarship"
  ) {
    highlights.push({
      title: "Support planning",
      description:
        "Because you asked for support, we recommend checking your funding options before applications move forward.",
    });
  } else if (product.postStudyWork) {
    highlights.push({
      title: "Long-term route value",
      description: product.postStudyWork,
    });
  }

  if (hasStudyDependantsSignal(answers) && product.dependantRule) {
    highlights.push({
      title: "Dependant planning",
      description: product.dependantRule,
    });
  }

  if (highlights.length < 3 && product.englishTestRule) {
    highlights.push({
      title: "Language test reality",
      description: product.englishTestRule,
    });
  }

  return highlights.slice(0, 3);
}

function buildDocumentChecklist(
  answers: AssessmentAnswers,
  product: StudyProductCard,
): StudyDocumentChecklistItem[] {
  const checklist: StudyDocumentChecklistItem[] = [];

  if (answers.passportStatus !== "valid" || answers.passportValidity === "lt_6") {
    checklist.push({
      title: "Valid passport",
      status:
        answers.passportStatus === "valid" || answers.passportStatus === "renewing"
          ? "review"
          : "missing",
      note:
        answers.passportStatus === "valid"
          ? "Your passport exists, but you need to confirm it stays valid long enough for the route."
          : answers.passportStatus === "renewing"
            ? "Your passport renewal is in progress, so the next check is whether it will finish early enough for this route."
          : "You need a valid international passport before applications, bookings, or visa processing.",
    });
  }

  checklist.push({
    title: "Academic documents",
    status:
      answers.highestEducation && answers.highestEducation !== "secondary_school" ? "review" : "missing",
    note:
      "You need your transcript, certificates, and exact academic result checked against the final programme match.",
  });

  checklist.push({
    title: "Programme and admission matching",
    status: "review",
    note:
      "You need to match your course field and entry level before visa planning begins.",
  });

  if (product.productType === "research_route") {
    checklist.push({
      title: "Research proposal",
      status: "missing",
      note: "You need a clear research topic and proposal before a research-based Masters route can move forward.",
    });
  }

  if (product.englishTestRule) {
    checklist.push({
      title: "Language-test readiness",
      status: answers.languageTestStatus === "valid_result" ? "ready" : "review",
      note:
        answers.languageTestStatus === "valid_result"
          ? "You already have a language-test result on record."
          : "You need to confirm whether this route needs a language-test result or a valid waiver.",
    });
  }

  checklist.push({
    title: "Proof-of-funds plan",
    status:
      fundingProfile(answers) === "self"
        ? "review"
        : fundingProfile(answers) === "support_needed" ||
            fundingProfile(answers) === "loan_support" ||
            fundingProfile(answers) === "scholarship"
          ? "missing"
          : "review",
    note:
      "You need to confirm whether you will use self-funding, institutional funding, scholarship support, or a sponsor.",
  });

  return checklist.slice(0, 5);
}

function buildMilestoneTimeline(
  answers: AssessmentAnswers,
  product: StudyProductCard,
): PublicStudyGuidance["milestoneTimeline"] {
  const firstWindow = "Step 1";
  const firstTitle =
    answers.passportStatus === "no_passport"
      ? "Apply for your passport"
      : product.productType === "research_route"
        ? "Prepare your research direction"
        : "Validate the route";
  const firstDescription =
    answers.passportStatus === "no_passport"
      ? "Secure a valid international passport before applications, bookings, or visa processing."
      : product.productType === "research_route"
        ? "Write down your research topic, check that it connects with your previous study, and prepare the proposal."
        : "Confirm qualification fit, route logic, and whether this study direction is still the best use of your time.";

  return [
    {
      window: firstWindow,
      title: firstTitle,
      description: firstDescription,
    },
    {
      window: "Step 2",
      title: "Programme and admission matching",
      description:
        "Match your course field, entry level, and destination logic before moving into advanced document review.",
    },
    {
      window: "Step 3",
      title: "Funding and document readiness",
      description:
        "Confirm your proof-of-funds plan, scholarship or institutional funding options, sponsor documents, and other route conditions before the visa stage starts.",
    },
    {
      window: "Step 4",
      title: "Application and visa stage",
      description:
        "Only move into final application, CAS, or visa steps once the route and documents have been properly validated.",
    },
  ];
}

function buildConsultationAgenda(
  answers: AssessmentAnswers,
  product: StudyProductCard,
  blockers: string[],
  questionsToAsk: string[],
) {
  const items = new Set<string>();

  items.add(`Review whether ${publicRouteNameForAnswers(product, answers).toLowerCase()} is still the strongest route for your profile and timing.`);

  if (blockers[0]) {
    items.add(`Resolve the main blocker first: ${blockers[0]}.`);
  }

  if (
    fundingProfile(answers) === "support_needed" ||
    fundingProfile(answers) === "loan_support" ||
    fundingProfile(answers) === "scholarship"
  ) {
    items.add("Discuss self-funding, institutional funding, scholarship options, or sponsor support before applications move forward.");
  }

  if (answers.previousRefusal === "yes") {
    items.add("Audit the previous refusal carefully before any reapplication.");
  }

  if (questionsToAsk[0]) {
    items.add(`Clarify this next: ${questionsToAsk[0]}`);
  }

  if (answers.timeline && answers.timeline !== "just_exploring") {
    items.add("Map the application timeline around the most realistic intake window for this route.");
  }

  return Array.from(items).slice(0, 4);
}

function buildConfidenceLabel(
  answers: AssessmentAnswers,
  blockers: string[],
  missingFields: string[],
  topScore: number,
) {
  if (answers.passportStatus === "no_passport" || blockers.length >= 3) {
    return "Preparation-first";
  }

  if (answers.previousRefusal === "yes" || missingFields.length >= 3 || topScore < 70) {
    return "Needs review";
  }

  return "Directionally strong";
}

function buildRouteSummary(product: StudyProductCard, countryCard: StudyCountryCard, answers: AssessmentAnswers) {
  return `${publicRouteNameForAnswers(product, answers)} in ${countryCard.publicName}`;
}

function cleanSentence(value: string) {
  const trimmed = value.trim().replace(/\s+/g, " ").replace(/[.]+$/g, "");
  if (!trimmed) {
    return "";
  }

  return trimmed[0].toUpperCase() + trimmed.slice(1);
}

function cleanClause(value: string) {
  const trimmed = value.trim().replace(/\s+/g, " ").replace(/[.]+$/g, "");
  if (!trimmed) {
    return "";
  }

  return trimmed[0].toLowerCase() + trimmed.slice(1);
}

function cleanBlockerDetail(value: string) {
  return cleanClause(value)
    .replace(/^because\s+/i, "")
    .replace(/^fly connect needs to/i, "you need to")
    .replace(/^fly connect should/i, "we recommend you")
    .replace(/^fly connect/i, "we");
}

function asSentence(value: string) {
  const sentence = cleanSentence(value);
  return sentence ? `${sentence}.` : "";
}

function buildFitSummary(
  answers: AssessmentAnswers,
  product: StudyProductCard,
  whyThisFits: string[],
  biggestBlocker: string | null,
) {
  const name = answers.firstName || "Traveler";
  const opening = `${name}, your profile aligns most strongly with the ${publicRouteNameForAnswers(product, answers)} in ${product.publicLocation}.`;
  const fitReason = asSentence(whyThisFits[0] ?? product.publicSummary);
  const blockerNote = biggestBlocker
    ? `The main issue to resolve before applications move forward is that ${cleanBlockerDetail(biggestBlocker)}.`
    : "Right now, this direction looks workable if the next steps are handled in the right order.";

  return `${opening} ${fitReason} ${blockerNote}`;
}

function getProductById(productId: string) {
  return PRODUCTS.find((product) => product.id === productId) ?? null;
}

function publicRouteNameForAnswers(product: StudyProductCard, answers: AssessmentAnswers) {
  if (product.id === "PRODUCT-UK-MRES-001") {
    return answers.highestEducation === "masters" || answers.highestEducation === "phd"
      ? "Research-based UK PhD route"
      : "Research-based UK Masters route";
  }

  if (product.id === "PRODUCT-UK-LOAN-001") {
    return "UK loan-supported route";
  }

  if (product.id === "PRODUCT-CANADA-DIPLOMA-LOAN-001") {
    return "Canada loan-supported diploma route";
  }

  return product.publicName;
}

function buildPersonalizedRecommendation(
  answers: AssessmentAnswers,
  product: StudyProductCard,
  countryCard: StudyCountryCard,
  whyThisFits: string[],
  biggestBlocker: string | null,
) {
  const reason = joinReasonParts(answerReasonParts(answers, countryCard));
  const blockerText = biggestBlocker
    ? `The main condition is to resolve this first: ${cleanBlockerDetail(biggestBlocker)}.`
    : "The next condition is document review before applications move forward.";

  return `${reason}, your strongest route to review is ${publicRouteNameForAnswers(product, answers)}. This route fits because it matches your destination, qualification, study level, and planning goal. ${blockerText}`;
}

function routeCondition(product: StudyProductCard) {
  if (product.id === "PRODUCT-UK-MRES-001") {
    return "You need a relevant degree, a clear research topic, a strong proposal, and the university's payment conditions confirmed.";
  }

  if (product.id === "PRODUCT-UK-LOAN-001") {
    return "You need document review, academic fit, and a private affordability check first. The current UK loan-backed route does not have an age limit.";
  }

  if (product.productType === "loan_supported_route") {
    return "You need document review, admission fit, and a private funding-readiness check before using this as a main plan.";
  }

  if (product.productType === "scholarship_route") {
    return "You need strong grades, complete documents, a realistic deadline, and a backup plan because awards are competitive.";
  }

  return (
    product.minimumAcademicRequirement ??
    product.englishTestRule ??
    product.ageRule ??
    "We recommend you confirm your documents, course fit, and route conditions before applications move forward."
  );
}

function routeNextStep(product: StudyProductCard, answers: AssessmentAnswers) {
  if (product.id === "PRODUCT-UK-MRES-001") {
    return buildFirstPracticalStep(answers, product);
  }

  if (product.productType === "loan_supported_route") {
    return "Gather your academic documents, admission status, passport, and funding-readiness details before using this route.";
  }

  if (product.productType === "scholarship_route") {
    return "Check your grades, deadline, references, offer status, and backup plan before relying on this route.";
  }

  return "Gather your documents and confirm the course match before applications move forward.";
}

function toRouteRecommendation(
  role: RouteRecommendation["role"],
  product: StudyProductCard,
  answers: AssessmentAnswers,
  publicReason: string,
  nextStep?: string,
): RouteRecommendation {
  return {
    role,
    publicRouteName: publicRouteNameForAnswers(product, answers),
    publicLocation: product.publicLocation,
    publicReason,
    keyCondition: routeCondition(product),
    nextStep: nextStep ?? routeNextStep(product, answers),
  };
}

function addUniqueRoute(
  routes: RouteRecommendation[],
  route: RouteRecommendation | null,
) {
  if (!route) {
    return;
  }

  if (routes.some((item) => item.publicRouteName === route.publicRouteName)) {
    return;
  }

  routes.push(route);
}

function buildSupportingRoute(
  answers: AssessmentAnswers,
  primaryProduct: StudyProductCard,
): RouteRecommendation | null {
  const funding = fundingProfile(answers);

  if (primaryProduct.id === "PRODUCT-UK-MRES-001") {
    if (funding === "support_needed" || funding === "loan_support") {
      const product = getProductById("PRODUCT-UK-LOAN-001");
      return product
        ? toRouteRecommendation(
            "supporting",
            product,
            answers,
            "Because route support is part of your answers, this can be reviewed as a practical support route after academic fit is checked.",
          )
        : null;
    }

    if (funding === "scholarship") {
      const product = getProductById("PRODUCT-UK-SCHOLARSHIP-GENERAL-001");
      return product
        ? toRouteRecommendation(
            "supporting",
            product,
            answers,
            "Because your academic profile may support a competitive route, this should be reviewed as a supporting option, not a guaranteed plan.",
          )
        : null;
    }
  }

  if (
    primaryProduct.id === "PRODUCT-CANADA-GRAD-CERT-001" &&
    (funding === "support_needed" || funding === "loan_support")
  ) {
    const product = getProductById("PRODUCT-CANADA-DIPLOMA-LOAN-001");
    return product && ageRangeAtMost(answers.ageRange, "28_33")
      ? toRouteRecommendation(
          "supporting",
          product,
          answers,
          "Because you are within the age window and asked for support, this can be reviewed as a structured Canada support route.",
        )
      : null;
  }

  if (primaryProduct.id === "PRODUCT-UK-SCHOLARSHIP-GENERAL-001") {
    const product = getProductById("PRODUCT-UK-MRES-001");
    return product && hasStudyDependantsSignal(answers)
      ? toRouteRecommendation(
          "supporting",
          product,
          answers,
          "Because dependant planning is part of your goal, a research-based UK route should be compared alongside the competitive route.",
        )
      : null;
  }

  return null;
}

function buildBackupRoute(
  answers: AssessmentAnswers,
  primaryProduct: StudyProductCard,
  selectedProducts: Array<{ product: StudyProductCard; score: number; reasons: string[] }>,
): RouteRecommendation | null {
  const sameCountryAlternative = selectedProducts.find(
    (item) => item.product.id !== primaryProduct.id && item.score >= 35,
  )?.product;

  if (sameCountryAlternative) {
    return toRouteRecommendation(
      "backup",
      sameCountryAlternative,
      answers,
      "If the strongest route is blocked by course relevance, document readiness, age, language-test readiness, or route conditions, this is the next realistic route to compare.",
    );
  }

  if (primaryProduct.id === "PRODUCT-FRANCE-FLEXIBLE-BUSINESS-TECH-001") {
    const product = getProductById("PRODUCT-CANADA-GRAD-CERT-001");
    return product
      ? toRouteRecommendation(
          "backup",
          product,
          answers,
          "If the France route does not fit your course field or route conditions, this Canada route is a practical comparison for HND, third-class, or 2:2 backgrounds.",
        )
      : null;
  }

  if (primaryProduct.id === "PRODUCT-NEW-ZEALAND-STUDY-001" && hasStudyDependantsSignal(answers)) {
    const product = getProductById("PRODUCT-UK-MRES-001");
    return product
      ? toRouteRecommendation(
          "backup",
          product,
          answers,
          "If New Zealand is blocked by proof, language-test readiness, or course logic, a UK research route can be compared for Masters or PhD dependant planning.",
        )
      : null;
  }

  return null;
}

function buildNotRecommendedRoutes(ruleHits: StudyRecommendationRule[], answers: AssessmentAnswers) {
  return ruleHits.flatMap((rule) =>
    rule.avoidProductIds
      .map((productId) => getProductById(productId))
      .filter((product): product is StudyProductCard => Boolean(product))
      .map((product) =>
        toRouteRecommendation(
          "not_recommended",
          product,
          answers,
          rule.warnings[0] ?? "This route does not match the stronger conditions in your answers.",
          "Do not treat this as the main plan unless your documents prove it can fit.",
        ),
      ),
  );
}

function buildRouteRecommendations(
  answers: AssessmentAnswers,
  primaryProduct: StudyProductCard,
  selectedProducts: Array<{ product: StudyProductCard; score: number; reasons: string[] }>,
  ruleHits: StudyRecommendationRule[],
  whyThisFits: string[],
) {
  const routes: RouteRecommendation[] = [];

  addUniqueRoute(
    routes,
    toRouteRecommendation(
      "primary",
      primaryProduct,
      answers,
      whyThisFits[0] ?? primaryProduct.publicSummary,
      primaryProduct.firstStep,
    ),
  );
  const explicitSupportingRoute = buildSupportingRoute(answers, primaryProduct);
  addUniqueRoute(routes, explicitSupportingRoute);
  if (!explicitSupportingRoute) {
    const fallbackSupportingProduct = selectedProducts.find(
      (item) => item.product.id !== primaryProduct.id && item.score >= 35,
    )?.product;

    if (fallbackSupportingProduct) {
      addUniqueRoute(
        routes,
        toRouteRecommendation(
          "supporting",
          fallbackSupportingProduct,
          answers,
          "This is a supporting route to compare if your strongest route does not work after document review.",
        ),
      );
    }
  }
  addUniqueRoute(routes, buildBackupRoute(answers, primaryProduct, selectedProducts));
  buildNotRecommendedRoutes(ruleHits, answers).forEach((route) => addUniqueRoute(routes, route));

  if (routes.length === 1) {
    addUniqueRoute(
      routes,
      toRouteRecommendation(
        "advisor_review",
        primaryProduct,
        answers,
        "This route needs review before any application sequence starts because one or more important details are still missing.",
      ),
    );
  }

  return routes.slice(0, 4);
}

function buildPublicReadinessSignals(
  answers: AssessmentAnswers,
  product: StudyProductCard,
  blockers: string[],
  missingFields: string[],
  requirements: StudyRequirementCard[],
) {
  const checks = new Set<string>();

  checks.add(`You need to confirm that ${qualificationLabel(answers)} fits the exact programme level and course field.`);
  checks.add("You need your transcript, certificate, CV, passport validity, and admission documents checked before applications move forward.");

  if (product.productType === "research_route") {
    checks.add("You need a clear research topic, course relevance, and proposal readiness.");
  }

  if (answers.languageTestStatus === "not_taken" || answers.languageTestStatus === "not_sure") {
    checks.add("You need to confirm whether this route needs a language-test result or a valid waiver.");
  }

  if (
    fundingProfile(answers) === "support_needed" ||
    fundingProfile(answers) === "loan_support" ||
    fundingProfile(answers) === "scholarship"
  ) {
    checks.add("We recommend reviewing funding support options before applications move forward.");
  }

  if (requestedScholarshipButNotEligible(answers) && product.country === "uk") {
    checks.add("Because UK scholarships currently need a 2:1 or first-class profile, verify the UK loan-backed route instead of assuming scholarship fit.");
  }

  if (requestedScholarshipButNotEligible(answers) && product.country === "canada") {
    checks.add(
      isCanadaLoanAgeEligible(answers)
        ? "Because scholarship is not the current fit, verify whether the 18 to 33 Canada loan route is realistic for you."
        : "Because scholarship is not the current fit and Canada loan support is age-limited, confirm a different funding route during consultation.",
    );
  }

  if (answers.previousRefusal === "yes") {
    checks.add("You need to review the previous refusal reason before any new application is started.");
  }

  blockers.slice(0, 2).forEach((blocker) => checks.add(`Resolve this blocker: ${blocker}`));
  missingFields.slice(0, 2).forEach((field) => checks.add(`Fill the missing ${field.replace(/([A-Z])/g, " $1").toLowerCase()} detail during consultation.`));
  requirements.slice(0, 2).forEach((requirement) => checks.add(`Verify ${requirement.item.toLowerCase()} for this route.`));

  return Array.from(checks).slice(0, 5);
}

function buildFinancialReadinessSignals(answers: AssessmentAnswers) {
  const signals = new Set<string>();
  const funding = fundingProfile(answers);

  signals.add("We need to confirm your proof-of-funds plan before visa planning begins.");

  if (requestedScholarshipButNotEligible(answers) && answers.destinationInterest === "uk") {
    signals.add("Scholarship review is currently limited to 2:1 and first-class profiles, so the grounded UK support route to review is the loan-backed option.");
    signals.add("The current UK loan-backed route does not have an age limit, but it still needs academic and document review.");
    return Array.from(signals).slice(0, 3);
  }

  if (requestedScholarshipButNotEligible(answers) && answers.destinationInterest === "canada") {
    signals.add(
      isCanadaLoanAgeEligible(answers)
        ? "Scholarship is not the grounded fit here, so the Canada loan route is only realistic if you fall within the 18 to 33 age window."
        : "Scholarship is not the grounded fit here, and the Canada loan route is not available outside ages 18 to 33.",
    );
    signals.add("Do not treat any support route as approved until the academic documents, age fit, and route conditions have been reviewed.");
    return Array.from(signals).slice(0, 3);
  }

  if (
    funding === "support_needed" ||
    funding === "loan_support" ||
    funding === "scholarship"
  ) {
    signals.add("Because you asked for support, we recommend discussing scholarship, loan, institutional funding, or sponsor options that still fit your profile.");
    signals.add("Do not treat any funding option as approved until your documents have been reviewed.");
  } else if (funding === "self") {
    signals.add("You selected self-funding, so the next check is whether your documents can prove the route is affordable.");
  } else {
    signals.add("We need to decide whether self-funding, institutional funding, scholarship options, or sponsor support fits your case.");
  }

  return Array.from(signals).slice(0, 3);
}

function buildFirstPracticalStep(answers: AssessmentAnswers, product: StudyProductCard) {
  if (answers.passportStatus === "no_passport") {
    return "Your first practical step is passport readiness. Apply for your international passport before applications, visa processing, or bookings.";
  }

  if (product.productType === "research_route") {
    return "Prepare your research topic, gather your transcript and certificates, and confirm whether your course background fits the research direction.";
  }

  return "Gather your academic documents, confirm course fit, and check the route conditions before applications move forward.";
}

function questionAlreadyAnswered(question: string, answers: AssessmentAnswers) {
  const value = question.toLowerCase();

  if (answers.passportStatus && value.includes("passport")) {
    return true;
  }

  if (answers.destinationInterest && answers.destinationInterest !== "not_sure" && /country|destination|targeting/.test(value)) {
    return true;
  }

  if (answers.highestEducation && /highest qualification|qualification do you have|at least|degree class|cgpa/.test(value)) {
    return true;
  }

  if (answers.studyLevel && answers.studyLevel !== "not_sure" && /level are you applying|masters|phd|undergraduate/.test(value)) {
    return true;
  }

  if (answers.ageRange && value.includes("age")) {
    return true;
  }

  if (answers.languageTestStatus === "valid_result" && /english test|language/.test(value)) {
    return true;
  }

  return false;
}

function chooseGuidanceProducts(
  answers: AssessmentAnswers,
  ruleHits: StudyRecommendationRule[],
) {
  const allLiveProducts = PRODUCTS.filter(
    (product) => product.status === LIVE || product.status === REVIEW,
  );
  const candidateProducts =
    allLiveProducts.filter((product) => productPassesHardFilters(product, answers));
  const avoidProductIds = new Set(ruleHits.flatMap((rule) => rule.avoidProductIds));
  const preferredProductIds = new Set(ruleHits.flatMap((rule) => rule.recommendedProductIds));

  const eligible = candidateProducts.filter(
    (product) => !avoidProductIds.has(product.id) && productMatchesQualification(product, qualificationFits(answers)),
  );
  const preferred = eligible.filter((product) => preferredProductIds.has(product.id));
  const scoringPool =
    preferred.length > 0
      ? preferred
      : eligible.length > 0
        ? eligible
        : candidateProducts.length > 0
          ? candidateProducts.filter((product) => !avoidProductIds.has(product.id))
          : allLiveProducts.filter((product) => !avoidProductIds.has(product.id));

  return choosePrimaryProduct(scoringPool, answers);
}

export function getStudyGuidance(answers: AssessmentAnswers): StudyGuidance {
  const destination = normalizeDestination(answers.destinationInterest);
  const ruleHits = RULES.filter((rule) => matchRule(rule, answers));
  const selectedProducts = chooseGuidanceProducts(answers, ruleHits);
  const matchedProductIds = selectedProducts.map((item) => item.product.id);
  const publicProduct =
    selectedProducts.find(
      (item) => item.product.status === LIVE && item.product.disclosureLevel !== "internal_only",
    )?.product ??
    PRODUCTS.find((product) => product.status === LIVE) ??
    selectedProducts[0]?.product;
  const fallbackCountry = getCountryFallback(publicProduct?.country ?? destination) ?? COUNTRY_CARDS[0];
  const topScore = selectedProducts[0]?.score ?? 0;
  const blockers = buildBlockers(
    answers,
    selectedProducts.map((item) => item.product),
    ruleHits,
  );
  const biggestBlocker = blockers[0] ?? null;
  const requirements = selectRequirements(matchedProductIds, answers);
  const questionsToAsk = Array.from(
    new Set([
      ...(ruleHits[0]?.askNext ?? []),
      ...requirements.flatMap((item) => item.questionsToAsk),
    ]),
  )
    .filter((question) => !questionAlreadyAnswered(question, answers))
    .slice(0, 4);
  const firstPracticalStep = buildFirstPracticalStep(answers, publicProduct);
  const missingFields = buildMissingFields(answers);
  const disclosureWarnings = Array.from(
    new Set([
      "This is a guidance shortlist, not a final admission decision.",
      "Support details are private planning guidance and must be verified before final route decisions.",
      "Admission, scholarship, loan, and visa outcomes are never guaranteed.",
      ...ruleHits.flatMap((rule) => rule.warnings),
      ...(selectedProducts.some((item) => item.product.disclosureLevel !== "public")
        ? ["Some matched routes may require a consultation review before you act."]
        : []),
    ]),
  ).slice(0, 6);

  const whyThisFits = buildWhyThisFits(
    answers,
    publicProduct,
    selectedProducts[0]?.reasons ?? [],
    fallbackCountry,
  );
  const routeSummary = buildRouteSummary(publicProduct, fallbackCountry, answers);
  const fitSummary = buildFitSummary(answers, publicProduct, whyThisFits, biggestBlocker);
  const publicRecommendation = buildPersonalizedRecommendation(
    answers,
    publicProduct,
    fallbackCountry,
    whyThisFits,
    biggestBlocker,
  );
  const routeRecommendations = buildRouteRecommendations(
    answers,
    publicProduct,
    selectedProducts,
    ruleHits,
    whyThisFits,
  );
  const publicReadinessSignals = buildPublicReadinessSignals(
    answers,
    publicProduct,
    blockers,
    missingFields,
    requirements,
  );
  const financialReadinessSignals = buildFinancialReadinessSignals(answers);
  const publicPathwayName = publicRouteNameForAnswers(publicProduct, answers);

  const publicGuidance: PublicStudyGuidance = {
    publicPathwayName,
    country: publicProduct.country ?? destination,
    publicLocation: publicProduct.publicLocation ?? fallbackCountry.publicLocation,
    confidenceLabel: buildConfidenceLabel(answers, blockers, missingFields, topScore),
    routeSummary,
    fitSummary,
    whyThisFits,
    publicRecommendation,
    biggestBlocker,
    blockers,
    keyRequirements: requirements.map(toPublicRequirement),
    questionsToAsk,
    firstPracticalStep,
    fitHighlights: buildFitHighlights(answers, publicProduct, fallbackCountry),
    routeRecommendations,
    documentChecklist: buildDocumentChecklist(answers, publicProduct),
    financialReadinessSignals,
    milestoneTimeline: buildMilestoneTimeline(answers, publicProduct),
    consultationAgenda: buildConsultationAgenda(answers, publicProduct, blockers, questionsToAsk),
    publicReadinessSignals,
  };

  const internalGuidance: InternalStudyGuidance = {
    matchedProductIds,
    matchedPublicRouteNames: selectedProducts.map((item) => item.product.publicName),
    triggeredRuleIds: ruleHits.map((rule) => rule.id),
    advisorNotes: buildAdvisorNotes(
      selectedProducts.map((item) => item.product),
      ruleHits,
    ),
    disclosureWarnings,
    missingFields,
  };

  return {
    public: publicGuidance,
    internal: internalGuidance,
  };
}

export {
  COUNTRY_CARDS as STUDY_COUNTRY_CARDS,
  PRODUCTS as STUDY_PRODUCT_CARDS,
  REQUIREMENTS as STUDY_REQUIREMENT_CARDS,
  RULES as STUDY_RECOMMENDATION_RULES,
};
