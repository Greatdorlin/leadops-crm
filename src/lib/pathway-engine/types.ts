import type { PublicStudyReport } from "./report/public-report.types";

export const PRIMARY_GOALS = [
  "study_abroad",
  "work_and_relocate",
  "business_abroad",
  "visit_or_tour",
  "event_travel",
  "family_relocation",
  "not_sure_yet",
] as const;

export const PATHWAY_IDS = [
  "passport_readiness",
  "skilled_work_preparation",
  "study_to_work",
  "employer_sponsored",
  "scholarship_funded_study",
  "tourism_visitor",
  "business_trade_travel",
  "conference_event_travel",
  "family_dependent",
  "digital_talent_tech",
  "healthcare_care",
  "entrepreneur_investment",
  "low_budget_preparation",
  "exploration_not_sure",
] as const;

export const COMPLETION_STATUSES = ["incomplete", "complete"] as const;
export const CRM_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "consultation_booked",
  "application_started",
  "documents_pending",
  "payment_pending",
  "converted",
  "lost",
  "unresponsive",
  "unqualified",
  "closed",
] as const;
export const LEAD_SOURCES = [
  "pathway_finder",
  "website_form",
  "facebook_lead_ads",
  "google_ads",
  "tiktok_lead_ads",
  "linkedin_lead_gen_forms",
  "google_sheets",
  "whatsapp_inquiry",
  "manual_entry",
  "agent",
  "referral",
] as const;
export const LEAD_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export const SYNC_STATES = [
  "pending",
  "success",
  "failed",
  "not_configured",
  "skipped",
] as const;
export const CRM_USER_ROLES = [
  "admin",
  "manager",
  "sales_agent",
  "ad_manager",
  "consultant",
  "finance",
] as const;
export const SOURCE_PAYLOAD_PROCESSING_STATUSES = [
  "pending",
  "processing",
  "processed",
  "failed",
  "duplicate",
  "skipped",
] as const;
export const INTEGRATION_PROVIDERS = [
  "facebook",
  "google_sheets",
  "google_ads",
  "tiktok",
  "linkedin",
  "sender",
  "website",
] as const;
export const INTEGRATION_STATUSES = [
  "healthy",
  "pending_sync",
  "failed",
  "not_configured",
  "disabled",
] as const;
export const SYNC_JOB_STATUSES = [
  "pending",
  "running",
  "success",
  "failed",
  "partial",
] as const;

export const ASSESSMENT_STEP_KEYS = [
  "trust",
  "first_name",
  "greeting",
  "primary_goal",
  "country_clarity",
  "destination_interest",
  "study_level",
  "age_range",
  "highest_education",
  "study_funding_readiness",
  "work_field",
  "work_experience_years",
  "language_test_status",
  "business_move_type",
  "business_stage",
  "visit_travel_type",
  "visit_travel_window",
  "event_type",
  "event_purpose",
  "family_composition",
  "family_open_pathway",
  "unsure_priority",
  "open_countries",
  "state_of_residence",
  "passport_status",
  "passport_validity",
  "timeline",
  "funding_readiness",
  "previous_refusal",
  "contact",
  "analysis",
] as const;

export type PrimaryGoal = (typeof PRIMARY_GOALS)[number];
export type PathwayId = (typeof PATHWAY_IDS)[number];
export type CompletionStatus = (typeof COMPLETION_STATUSES)[number];
export type CrmStatus = (typeof CRM_STATUSES)[number];
export type LeadSource = (typeof LEAD_SOURCES)[number];
export type LeadPriority = (typeof LEAD_PRIORITIES)[number];
export type SyncState = (typeof SYNC_STATES)[number];
export type CrmUserRole = (typeof CRM_USER_ROLES)[number];
export type SourcePayloadProcessingStatus = (typeof SOURCE_PAYLOAD_PROCESSING_STATUSES)[number];
export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];
export type IntegrationStatus = (typeof INTEGRATION_STATUSES)[number];
export type SyncJobStatus = (typeof SYNC_JOB_STATUSES)[number];
export type ReadinessLevel = "Foundation" | "Emerging" | "Advancing" | "Action-ready";
export type LeadSegment =
  | "Consultation priority"
  | "High-intent nurturance"
  | "Preparation-first"
  | "Explorer";
export type StepKind = "notice" | "text" | "single-select" | "contact" | "analysis";
export type ScoreLabel =
  | "Strong fit"
  | "Promising fit"
  | "Possible fit"
  | "Early-stage fit"
  | "Not a priority now";
export type AnalyticsEventType = "report_viewed" | "whatsapp_clicked" | "consultation_clicked";
export type DisclosureLevel = "public" | "advisor_only" | "internal_only";
export type KnowledgeStatus = "draft" | "ready_for_review" | "live" | "archived";
export type StudyDestination = "uk" | "canada" | "france" | "new_zealand";
export type StudyProductType =
  | "study_route"
  | "loan_supported_route"
  | "scholarship_route"
  | "research_route"
  | "diploma_route"
  | "graduate_certificate_route"
  | "masters_route";
export type QualificationFit =
  | "waec_neco"
  | "ond"
  | "hnd_lower_credit"
  | "hnd_upper_credit"
  | "third_class"
  | "second_class_lower"
  | "second_class_upper"
  | "first_class"
  | "masters";
export type RequirementPriority = "blocker" | "important" | "supporting" | "conditional";

export type AssessmentStepKey = (typeof ASSESSMENT_STEP_KEYS)[number];

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface AssessmentStepDefinition {
  stepKey: AssessmentStepKey;
  kind: StepKind;
  title: string;
  description: string;
  field?: keyof AssessmentAnswers;
  options?: SelectOption[];
  helperText?: string;
  optional?: boolean;
}

export interface AssessmentAnswers {
  firstName: string;
  lastName: string;
  whatsappNumber: string;
  email: string;
  primaryGoal: PrimaryGoal | null;
  countryClarity: string | null;
  destinationInterest: string | null;
  studyLevel: string | null;
  ageRange: string | null;
  highestEducation: string | null;
  studyFundingReadiness: string | null;
  workField: string | null;
  workExperienceYears: string | null;
  languageTestStatus: string | null;
  businessMoveType: string | null;
  businessStage: string | null;
  visitTravelType: string | null;
  visitTravelWindow: string | null;
  eventType: string | null;
  eventPurpose: string | null;
  familyComposition: string | null;
  familyOpenPathway: string | null;
  unsurePriority: string | null;
  openCountries: string | null;
  stateOfResidence: string | null;
  nigeriaState?: string | null;
  passportStatus: string | null;
  passportValidity: string | null;
  timeline: string | null;
  fundingReadiness: string | null;
  previousRefusal: string | null;
  highestQualification?: string | null;
  degreeClass?: string | null;
  graduationYear?: string | null;
  studiedCourse?: string | null;
  desiredCourse?: string | null;
  targetField?: string | null;
  targetIntake?: string | null;
  assessmentReadiness?: string | null;
  contactTimeline?: string | null;
  consent?: string | null;
  sendReportConsent: boolean;
  wantsHumanSupport: boolean;
  marketingConsent: boolean;
}

export interface PathwaySignalSet {
  goal: PrimaryGoal | null;
  destinationKnown: boolean;
  passportMissing: boolean;
  passportExpiringSoon: boolean;
  lowBudgetFocus: boolean;
  needsScholarship: boolean;
  languageTestReady: boolean;
  languageTestMissing: boolean;
  urgentTimeline: boolean;
  exploringMode: boolean;
  priorRefusal: boolean;
  workField: string | null;
  workExperienceYears: string | null;
  familyMode: boolean;
  businessMode: boolean;
}

export interface PathwayDefinition {
  id: PathwayId;
  title: string;
  shortDescription: string;
  fitReason: string;
}

export interface PathwayScore {
  id: PathwayId;
  score: number;
  label: ScoreLabel;
}

export interface ReportBlocker {
  id: string;
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
}

export interface OfferRecommendation {
  id: string;
  title: string;
  description: string;
  ctaLabel: string;
}

export interface KnowledgeAudit {
  status: KnowledgeStatus;
  sourceLabel: string;
  lastReviewed: string;
  missingFields?: string[];
  reviewNotes?: string[];
}

export interface StudyCountryCard extends KnowledgeAudit {
  id: string;
  country: StudyDestination;
  publicName: string;
  publicLocation: string;
  publicPositioning: string;
  bestFor: string[];
  publicNotes: string[];
  advisorNotes: string[];
}

export interface StudyProductCard extends KnowledgeAudit {
  id: string;
  publicName: string;
  internalName?: string;
  disclosureLevel: DisclosureLevel;
  country: StudyDestination;
  publicLocation: string;
  internalProviderNotes?: string[];
  productType: StudyProductType;
  bestFor: string[];
  notBestFor: string[];
  acceptedQualifications: QualificationFit[];
  minimumAcademicRequirement?: string;
  ageRule?: string;
  studyGapRule?: string;
  englishTestRule?: string;
  dependantRule?: string;
  workWhileStudying?: string;
  postStudyWork?: string;
  tuitionRange?: string;
  depositRange?: string;
  scholarshipOrFunding?: string;
  proofOfFundsSummary?: string;
  publicSummary: string;
  advisorSummary: string;
  firstStep: string;
}

export interface StudyRequirementCard extends KnowledgeAudit {
  id: string;
  country: StudyDestination | "general";
  productIds: string[];
  group: string;
  item: string;
  priority: RequirementPriority;
  publicDescription: string;
  advisorNote?: string;
  ifMissingRecommendation: string;
  questionsToAsk: string[];
}

export interface StudyRecommendationRule extends KnowledgeAudit {
  id: string;
  triggerSummary: string;
  matchSignals: string[];
  recommendedProductIds: string[];
  avoidProductIds: string[];
  publicRecommendation: string;
  advisorReason: string;
  askNext: string[];
  warnings: string[];
}

export interface PublicStudyRequirement {
  id: string;
  group: string;
  item: string;
  priority: RequirementPriority;
  publicDescription: string;
  ifMissingRecommendation: string;
}

export interface StudyFitHighlight {
  title: string;
  description: string;
}

export interface StudyDocumentChecklistItem {
  title: string;
  status: "ready" | "review" | "missing";
  note: string;
}

export interface StudyFinancialSnapshot {
  tuitionRange: string | null;
  depositRange: string | null;
  scholarshipOrFunding: string | null;
  proofOfFundsSummary: string | null;
}

export interface StudyTimelineStep {
  window: string;
  title: string;
  description: string;
}

export type RouteRecommendationRole =
  | "primary"
  | "supporting"
  | "backup"
  | "not_recommended"
  | "advisor_review";

export interface RouteRecommendation {
  role: RouteRecommendationRole;
  publicRouteName: string;
  publicLocation: string;
  publicReason: string;
  keyCondition: string;
  nextStep: string;
}

export interface PublicStudyGuidance {
  publicPathwayName: string;
  country: StudyDestination | "general";
  publicLocation: string;
  confidenceLabel: string;
  routeSummary: string;
  fitSummary: string;
  whyThisFits: string[];
  publicRecommendation: string;
  biggestBlocker: string | null;
  blockers: string[];
  keyRequirements: PublicStudyRequirement[];
  questionsToAsk: string[];
  firstPracticalStep: string;
  fitHighlights: StudyFitHighlight[];
  routeRecommendations: RouteRecommendation[];
  documentChecklist: StudyDocumentChecklistItem[];
  financialReadinessSignals: string[];
  milestoneTimeline: StudyTimelineStep[];
  consultationAgenda: string[];
  publicReadinessSignals: string[];
}

export interface InternalStudyGuidance {
  matchedProductIds: string[];
  matchedPublicRouteNames: string[];
  triggeredRuleIds: string[];
  advisorNotes: string[];
  disclosureWarnings: string[];
  missingFields: string[];
}

export interface StudyGuidance {
  public: PublicStudyGuidance;
  internal: InternalStudyGuidance;
}

export interface PathwayMatch {
  id: PathwayId;
  title: string;
  score: number;
  scoreLabel: ScoreLabel;
  summary: string;
  reason: string;
}

export interface PathwayContrast {
  id: PathwayId;
  title: string;
  score: number;
  scoreLabel: ScoreLabel;
  fitReason: string;
}

export const ACTION_PLAN_TITLES = [
  "30-day plan",
  "60-day plan",
  "90-day plan",
  "120-day plan",
  "180-day plan",
] as const;

export type ActionPlanTitle = (typeof ACTION_PLAN_TITLES)[number];

export interface ActionPlanWindow {
  title: ActionPlanTitle;
  steps: string[];
}

export interface GeneratedReport {
  reportId: string;
  createdAt: string;
  reportVersion: string;
  firstName: string;
  summaryDiagnosis: string;
  readinessLevel: ReadinessLevel;
  readinessSummary: string;
  topMatches: PathwayMatch[];
  pathwayContrasts: PathwayContrast[];
  blockers: ReportBlocker[];
  problems: {
    title: string;
    description: string;
  }[];
  firstPracticalStep: string;
  whyThesePathwaysFit: string[];
  currentActionPlanTitle: ActionPlanTitle;
  actionPlans: ActionPlanWindow[];
  recommendedOffer: OfferRecommendation;
  recommendedOfferReason: string;
  disclaimer: string;
  whatsappSummary: string;
  leadSegment: LeadSegment;
  studyGuidance: PublicStudyGuidance | null;
  internalStudyGuidance: InternalStudyGuidance | null;
}

export type PublicGeneratedReport = Omit<GeneratedReport, "internalStudyGuidance">;

export type PublicAssessmentResult =
  | {
      kind: "study";
      report: PublicStudyReport;
    }
  | {
      kind: "general";
      report: PublicGeneratedReport;
    };

export interface SyncStatus {
  status: SyncState;
  message?: string;
  lastAttemptAt?: string | null;
  syncedAt?: string | null;
}

export interface LeadRecord {
  id: string;
  reportToken: string | null;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  completedAt: string | null;
  deletedAt: string | null;
  deletedBy: string | null;
  completionStatus: CompletionStatus;
  crmStatus: CrmStatus;
  source: LeadSource | null;
  sourceDetail: string | null;
  priority: LeadPriority;
  assignedTo: string | null;
  assignedToList: string[];
  firstName: string;
  lastName: string;
  email: string;
  whatsappNumber: string;
  state: string | null;
  externalLeadId: string | null;
  externalFormId: string | null;
  facebookLeadgenId: string | null;
  facebookFormId: string | null;
  facebookPageId: string | null;
  facebookCampaignId: string | null;
  facebookAdId: string | null;
  facebookAdsetId: string | null;
  googleClickId: string | null;
  googleCampaignId: string | null;
  googleAdGroupId: string | null;
  googleAdId: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  landingPage: string | null;
  sourcePayload: Record<string, unknown> | null;
  primaryGoal: PrimaryGoal | null;
  currentStepKey: AssessmentStepKey;
  currentStepIndex: number;
  progressPercent: number;
  readinessLevel: ReadinessLevel | null;
  topPathwayTitle: string | null;
  answers: AssessmentAnswers;
  report: GeneratedReport | null;
  publicReport: PublicAssessmentResult | null;
  sync: {
    googleSheets: SyncStatus;
    sender: SyncStatus;
  };
  analytics: {
    whatsappClicked: boolean;
    consultationClicked: boolean;
    reportViewed: boolean;
  };
}

export interface CrmUserRecord {
  id: string;
  email: string;
  fullName: string;
  role: CrmUserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LeadEventRecord {
  id: string;
  leadId: string;
  eventType: string;
  eventData: Record<string, unknown> | null;
  createdBy: string | null;
  createdAt: string;
}

export interface LeadNoteRecord {
  id: string;
  leadId: string;
  note: string;
  createdBy: string | null;
  createdAt: string;
}

export interface LeadTaskRecord {
  id: string;
  leadId: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  completedAt: string | null;
  assignedTo: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface LeadSourcePayloadRecord {
  id: string;
  source: string;
  externalId: string | null;
  payload: Record<string, unknown>;
  processingStatus: SourcePayloadProcessingStatus;
  processedAt: string | null;
  errorMessage: string | null;
  retryCount: number;
  createdAt: string;
}

export interface IntegrationRecord {
  id: string;
  provider: IntegrationProvider;
  accountName: string | null;
  externalAccountId: string | null;
  status: IntegrationStatus;
  accessTokenEncrypted: string | null;
  refreshTokenEncrypted: string | null;
  config: Record<string, unknown> | null;
  lastSyncAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SyncJobRecord {
  id: string;
  provider: IntegrationProvider;
  jobType: string;
  status: SyncJobStatus;
  startedAt: string | null;
  finishedAt: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AdCampaignMetricRecord {
  id: string;
  provider: IntegrationProvider;
  accountId: string;
  campaignId: string;
  campaignName: string;
  adGroupId: string;
  adGroupName: string;
  adId: string;
  adName: string;
  date: string;
  impressions: number;
  clicks: number;
  spend: string;
  leads: number;
  conversions: number;
  rawMetrics: Record<string, unknown> | null;
  createdAt: string;
}
