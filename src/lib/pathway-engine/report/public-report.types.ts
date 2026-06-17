import type { ReadinessLevel } from "../types";

export type PublicRouteRole =
  | "primary"
  | "supporting"
  | "backup"
  | "not_recommended";

export type PublicReadinessStatus =
  | "confirmed"
  | "needs_confirmation"
  | "missing"
  | "not_required"
  | "blocked";

export type PublicBlockerPriority = "critical" | "high" | "medium" | "low";

export type PublicBlockerCategory =
  | "passport"
  | "academic"
  | "age"
  | "route_condition"
  | "funding"
  | "english"
  | "timeline"
  | "previous_refusal"
  | "documents";

export interface PublicReportMetadata {
  reportId: string;
  createdAt: string;
  reportVersion: string;
  readinessLevel: ReadinessLevel;
  readinessSummary: string;
  accuracyNotice: string;
}

export interface PublicHeroSection {
  title: string;
  opening: string;
  destinationLabel: string;
  readinessLabel: string;
}

export interface PublicSnapshotItem {
  label: string;
  value: string;
  tone: "positive" | "caution" | "neutral";
}

export interface PublicPathwaySnapshot {
  title: string;
  items: PublicSnapshotItem[];
}

export interface PublicFundingCheckItem {
  title: string;
  statusLabel: string;
  body: string;
  nextAction: string;
}

export interface PublicRouteCard {
  role: PublicRouteRole;
  title: string;
  countryLabel: string;
  routeTypeLabel: string;
  reason: string;
  keyCondition?: string;
  firstStep?: string;
  statusLabel?: string;
}

export interface PublicReasonCard {
  title: string;
  body: string;
}

export interface PublicBlocker {
  title: string;
  body: string;
  priority: PublicBlockerPriority;
  category: PublicBlockerCategory;
}

export interface PublicNextStep {
  title: string;
  body: string;
}

export interface PublicDocumentItem {
  title: string;
  status: PublicReadinessStatus;
  body: string;
}

export interface PublicRoadmap {
  title: string;
  items: PublicRoadmapItem[];
}

export interface PublicRoadmapItem {
  title: string;
  body: string;
}

export interface PublicCTA {
  eyebrow: string;
  title: string;
  body: string;
  actionLabel: string;
  href: string;
}

export interface PublicPathwayReport {
  reportType: "public_pathway_report";
  metadata: PublicReportMetadata;
  hero: PublicHeroSection;
  snapshot: PublicPathwaySnapshot;
  primaryRoute: PublicRouteCard;
  supportingRoutes: PublicRouteCard[];
  backupRoutes: PublicRouteCard[];
  notRecommendedRoutes: PublicRouteCard[];
  whyThisFits: PublicReasonCard[];
  fundingChecks: PublicFundingCheckItem[];
  blockers: PublicBlocker[];
  smartNextSteps: PublicNextStep[];
  documentsToPrepare: PublicDocumentItem[];
  roadmap: PublicRoadmap;
  consultationFocus: string[];
  questionsToClarify: string[];
  cta: PublicCTA;
  disclaimer: string;
}

export type PublicStudyReport = PublicPathwayReport;

export interface RouteScore {
  routeId: string;
  title: string;
  score: number;
}

export interface DecisionSignal {
  label: string;
  accepted: boolean;
  detail: string;
}

export interface AdvisorPathwayReport {
  applicantSummary: string;
  advisorNotes: string[];
  internalProviderNotes: string[];
  internalFinancialDetails: string[];
  routeScores: RouteScore[];
  riskFlags: string[];
  consultationScript: string[];
}

export interface InternalPathwayDecision {
  normalizedProfile: Record<string, unknown>;
  routeScores: RouteScore[];
  primaryRouteId: string;
  supportingRouteIds: string[];
  backupRouteIds: string[];
  notRecommendedRouteIds: string[];
  blockedRouteIds: string[];
  decisionSignals: DecisionSignal[];
  rejectedSignals: DecisionSignal[];
}

export interface ReportPayload {
  publicReport: PublicPathwayReport;
  advisorReport?: AdvisorPathwayReport;
  internalDecision?: InternalPathwayDecision;
}
