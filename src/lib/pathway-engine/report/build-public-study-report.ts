import { REPORT_DISCLAIMER } from "../report-copy";
import {
  REPORT_ACCURACY_WARNING,
  REPORT_VERSION,
} from "../report-knowledge";
import { getStudyGuidance, STUDY_PRODUCT_CARDS } from "../study-knowledge";
import {
  ageRangeOptions,
  destinationOptionsByGoal,
  highestEducationOptions,
  passportStatusOptions,
  previousRefusalOptions,
  primaryGoalOptions,
  studyFundingReadinessOptions,
  studyLevelOptions,
  timelineOptions,
} from "../options";
import type {
  AssessmentAnswers,
  GeneratedReport,
  InternalStudyGuidance,
  PublicStudyGuidance,
  RouteRecommendation,
  StudyDocumentChecklistItem,
  StudyGuidance,
  StudyProductCard,
  StudyTimelineStep,
} from "../types";
import {
  destinationLabel,
  normalizeAssessmentAnswers,
  type Destination,
  type NormalizedAssessmentProfile,
  type Qualification,
} from "./answer-normalizer";
import {
  sanitizePublicReport,
  sanitizePublicText,
  validatePublicReport,
} from "./public-copy-guard";
import type {
  AdvisorPathwayReport,
  DecisionSignal,
  PublicBlocker,
  PublicCTA,
  PublicDocumentItem,
  PublicFundingCheckItem,
  PublicNextStep,
  PublicPathwayReport,
  PublicRoadmapItem,
  PublicRouteCard,
  PublicRouteRole,
  PublicSnapshotItem,
  ReportPayload,
  RouteScore,
} from "./public-report.types";

type GuidanceInput =
  | PublicStudyGuidance
  | StudyGuidance
  | (Partial<PublicStudyGuidance> & Partial<InternalStudyGuidance> & {
      public?: PublicStudyGuidance;
      internal?: InternalStudyGuidance;
    });

type GeneratedReportMetadata = Pick<
  GeneratedReport,
  "reportId" | "createdAt" | "reportVersion" | "readinessLevel" | "readinessSummary"
>;

type ActiveProduct = StudyProductCard & { status: "live" };

const ACTIVE_PRODUCTS = STUDY_PRODUCT_CARDS.filter(
  (product): product is ActiveProduct => product.status === "live",
);
const ACTIVE_DESTINATIONS = new Set<Destination>(
  ACTIVE_PRODUCTS.map((product) => product.country),
);
const ACTIVE_SCHOLARSHIP_DESTINATIONS = new Set<Destination>(
  ACTIVE_PRODUCTS.filter((product) => product.productType === "scholarship_route").map(
    (product) => product.country,
  ),
);
const STRONG_QUALIFICATIONS = new Set<Qualification>([
  "second_class_upper",
  "first_class",
  "masters",
  "phd",
]);
const CANADA_LOAN_QUALIFICATIONS = new Set<Qualification>([
  "waec_neco",
  "ond",
  "hnd_lower_credit",
  "hnd_upper_credit",
]);
const FLEXIBLE_FRANCE_QUALIFICATIONS = new Set<Qualification>([
  "hnd_lower_credit",
  "hnd_upper_credit",
  "third_class",
  "second_class_lower",
]);

function cleanSentence(value: string) {
  return sanitizePublicText(value).trim().replace(/\s+/g, " ").replace(/[.]+$/g, "");
}

function withPeriod(value: string) {
  const cleaned = cleanSentence(value);
  if (!cleaned) {
    return cleaned;
  }

  return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`;
}

function humanList(values: string[]) {
  if (values.length <= 1) {
    return values[0] ?? "";
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function findProductById(productId: string | undefined) {
  return productId ? ACTIVE_PRODUCTS.find((product) => product.id === productId) ?? null : null;
}

function productTitle(product: ActiveProduct, profile: NormalizedAssessmentProfile) {
  if (product.id === "PRODUCT-UK-MRES-001") {
    return profile.qualification === "masters" || profile.qualification === "phd"
      ? "Research-based UK PhD pathway"
      : "Research-based UK Masters pathway";
  }

  if (product.id === "PRODUCT-UK-LOAN-001") {
    return "UK tuition-support pathway";
  }

  if (product.id === "PRODUCT-CANADA-DIPLOMA-LOAN-001") {
    return "Loan-supported Canada diploma pathway";
  }

  return sanitizePublicText(product.publicName);
}

function productCountryLabel(product: ActiveProduct) {
  switch (product.country) {
    case "uk":
      return "United Kingdom";
    case "canada":
      return "Canada";
    case "france":
      return "France";
    case "new_zealand":
      return "New Zealand";
    default:
      return sanitizePublicText(product.publicLocation);
  }
}

function routeTypeLabel(product: ActiveProduct) {
  switch (product.productType) {
    case "research_route":
      return "Research route";
    case "graduate_certificate_route":
      return "Graduate certificate route";
    case "loan_supported_route":
      return "Loan-supported route";
    case "scholarship_route":
      return "Scholarship route";
    case "diploma_route":
      return "Diploma route";
    case "masters_route":
      return "Masters route";
    default:
      return "Study pathway route";
  }
}

function activeDestinationLabel(destination: Destination) {
  return ACTIVE_DESTINATIONS.has(destination) ? destinationLabel(destination) : "Active study destinations";
}

function isResearchRoute(product: ActiveProduct) {
  return product.productType === "research_route";
}

function requiresEnglishEvidence(product: ActiveProduct) {
  return Boolean(product.englishTestRule) || product.country === "new_zealand";
}

function canadaLoanAgeFits(profile: NormalizedAssessmentProfile) {
  return Boolean(profile.age && profile.age <= 33);
}

function canadaLoanAcademicFits(profile: NormalizedAssessmentProfile) {
  return CANADA_LOAN_QUALIFICATIONS.has(profile.qualification);
}

function scholarshipDestinationActive(destination: Destination) {
  return ACTIVE_SCHOLARSHIP_DESTINATIONS.has(destination);
}

function strongAcademicProfile(profile: NormalizedAssessmentProfile) {
  return STRONG_QUALIFICATIONS.has(profile.qualification);
}

function resolveGuidance(args: {
  answers: AssessmentAnswers | Record<string, unknown>;
  guidance?: GuidanceInput | null;
  generatedReport?: Partial<GeneratedReport> | null;
}) {
  if (args.guidance && "public" in args.guidance && args.guidance.public) {
    return {
      publicGuidance: args.guidance.public,
      internalGuidance: args.guidance.internal ?? null,
    };
  }

  if (args.generatedReport?.studyGuidance) {
    return {
      publicGuidance: args.generatedReport.studyGuidance,
      internalGuidance: args.generatedReport.internalStudyGuidance ?? null,
    };
  }

  if (args.guidance) {
    const guidance = args.guidance as Partial<PublicStudyGuidance> & Partial<InternalStudyGuidance>;
    return {
      publicGuidance:
        "publicPathwayName" in guidance && guidance.publicPathwayName
          ? (guidance as PublicStudyGuidance)
          : null,
      internalGuidance:
        "matchedProductIds" in guidance && Array.isArray(guidance.matchedProductIds)
          ? (guidance as InternalStudyGuidance)
          : null,
    };
  }

  if ("firstName" in args.answers && "primaryGoal" in args.answers) {
    const guidance = getStudyGuidance(args.answers as AssessmentAnswers);
    return {
      publicGuidance: guidance.public,
      internalGuidance: guidance.internal,
    };
  }

  return {
    publicGuidance: null,
    internalGuidance: null,
  };
}

function resolveMetadata(
  generatedReport?: Partial<GeneratedReportMetadata> | null,
): GeneratedReportMetadata {
  return {
    reportId: generatedReport?.reportId ?? "FC-LEGACY",
    createdAt: generatedReport?.createdAt ?? new Date(0).toISOString(),
    reportVersion: generatedReport?.reportVersion ?? REPORT_VERSION,
    readinessLevel: generatedReport?.readinessLevel ?? "Foundation",
    readinessSummary:
      generatedReport?.readinessSummary ??
      "This report was rebuilt from saved assessment data, so a guided review is still the best next step.",
  };
}

function productFromRouteRecommendation(
  route: RouteRecommendation,
  profile: NormalizedAssessmentProfile,
) {
  const routeName = cleanSentence(route.publicRouteName).toLowerCase();

  return (
    ACTIVE_PRODUCTS.find((product) => cleanSentence(productTitle(product, profile)).toLowerCase() === routeName) ??
    ACTIVE_PRODUCTS.find((product) => {
      const title = productTitle(product, profile).toLowerCase();
      return routeName.includes(title) || title.includes(routeName);
    }) ??
    null
  );
}

function rankedProductsFromKnowledge(
  profile: NormalizedAssessmentProfile,
  publicGuidance: PublicStudyGuidance | null,
  internalGuidance: InternalStudyGuidance | null,
) {
  const ordered: ActiveProduct[] = [];
  const seen = new Set<string>();

  function add(product: ActiveProduct | null) {
    if (!product || seen.has(product.id)) {
      return;
    }

    seen.add(product.id);
    ordered.push(product);
  }

  internalGuidance?.matchedProductIds?.forEach((productId) => add(findProductById(productId)));
  publicGuidance?.routeRecommendations?.forEach((route) =>
    add(productFromRouteRecommendation(route, profile)),
  );

  ACTIVE_PRODUCTS.filter((product) => product.country === profile.destination).forEach(add);

  if (!ordered.length) {
    ACTIVE_PRODUCTS.forEach(add);
  }

  return ordered;
}

function choosePrimaryProduct(
  profile: NormalizedAssessmentProfile,
  rankedProducts: ActiveProduct[],
) {
  const byId = (productId: string) => rankedProducts.find((product) => product.id === productId) ?? null;

  if (profile.destination === "uk") {
    if (
      profile.qualification === "masters" ||
      profile.qualification === "phd" ||
      profile.wantsDependants === true ||
      profile.primaryGoal === "family_relocation" ||
      profile.qualification === "second_class_lower" ||
      profile.qualification === "second_class_upper" ||
      profile.qualification === "first_class"
    ) {
      return byId("PRODUCT-UK-MRES-001") ?? rankedProducts[0];
    }

    if (profile.fundingPosition === "needs_scholarship" && strongAcademicProfile(profile)) {
      return byId("PRODUCT-UK-SCHOLARSHIP-GENERAL-001") ?? byId("PRODUCT-UK-MRES-001") ?? rankedProducts[0];
    }

    return byId("PRODUCT-UK-MRES-001") ?? rankedProducts[0];
  }

  if (profile.destination === "canada") {
    if (
      profile.fundingPosition === "needs_study_loan" &&
      canadaLoanAgeFits(profile) &&
      canadaLoanAcademicFits(profile)
    ) {
      return byId("PRODUCT-CANADA-DIPLOMA-LOAN-001") ?? rankedProducts[0];
    }

    return byId("PRODUCT-CANADA-GRAD-CERT-001") ?? rankedProducts[0];
  }

  if (profile.destination === "france") {
    if (FLEXIBLE_FRANCE_QUALIFICATIONS.has(profile.qualification)) {
      return byId("PRODUCT-FRANCE-FLEXIBLE-BUSINESS-TECH-001") ?? rankedProducts[0];
    }

    return byId("PRODUCT-FRANCE-BUSINESS-STRICT-001") ??
      byId("PRODUCT-FRANCE-FLEXIBLE-BUSINESS-TECH-001") ??
      rankedProducts[0];
  }

  if (profile.destination === "new_zealand") {
    return byId("PRODUCT-NEW-ZEALAND-STUDY-001") ?? rankedProducts[0];
  }

  return rankedProducts[0];
}

function buildRouteScores(rankedProducts: ActiveProduct[], profile: NormalizedAssessmentProfile): RouteScore[] {
  return rankedProducts.slice(0, 5).map((product, index) => ({
    routeId: product.id,
    title: productTitle(product, profile),
    score: Math.max(24, 100 - index * 12),
  }));
}

function pushSignal(
  collection: DecisionSignal[],
  label: string,
  accepted: boolean,
  detail: string,
) {
  collection.push({
    label,
    accepted,
    detail,
  });
}

function buildDecisionSignals(
  profile: NormalizedAssessmentProfile,
  primaryProduct: ActiveProduct,
  backupProducts: ActiveProduct[],
) {
  const accepted: DecisionSignal[] = [];
  const rejected: DecisionSignal[] = [];

  pushSignal(
    accepted,
    "destination",
    ACTIVE_DESTINATIONS.has(profile.destination),
    ACTIVE_DESTINATIONS.has(profile.destination)
      ? `${destinationLabel(profile.destination)} has active route coverage in the knowledge base.`
      : "The chosen destination was not active, so the report stayed within live destinations only.",
  );

  pushSignal(
    accepted,
    "primary_route",
    true,
    `${productTitle(primaryProduct, profile)} stayed as the strongest real route for public display.`,
  );

  const researchNeeded = isResearchRoute(primaryProduct);
  pushSignal(
    researchNeeded && profile.researchReadiness !== "has_topic" ? rejected : accepted,
    "research_readiness",
    !researchNeeded || profile.researchReadiness === "has_topic",
    researchNeeded
      ? profile.researchReadiness === "has_topic"
        ? "Research readiness is already strong enough to support the current route."
        : "Research readiness still needs work before the route should be treated as dependable."
      : "Research readiness is not a primary blocker for this route.",
  );

  pushSignal(
    profile.passportStatus === "no_passport" ? rejected : accepted,
    "passport",
    profile.passportStatus !== "no_passport",
    profile.passportStatus === "no_passport"
      ? "Passport readiness is the first blocker."
      : "Passport status does not remove route planning.",
  );

  if (backupProducts.length) {
    pushSignal(
      accepted,
      "fallback_routes",
      true,
      `${backupProducts.length} live backup route${backupProducts.length > 1 ? "s" : ""} remained available.`,
    );
  }

  return { accepted, rejected };
}

/* eslint-disable @typescript-eslint/no-unused-vars */
function openingForProfile(
  profile: NormalizedAssessmentProfile,
  primaryProduct: ActiveProduct,
) {
  const hasNoPassport = profile.passportStatus === "no_passport";
  const hasPreviousRefusal = profile.hasPreviousRefusal === true;

  if (hasNoPassport) {
    return "Your pathway can still be planned, but your passport is the first blocker. Before applications, visa steps, flights, hotel bookings, or advanced processing, your first practical step is to secure a valid international passport.";
  }

  if (hasPreviousRefusal) {
    return "Your pathway can still be reviewed, but your previous refusal needs to be handled carefully. Before choosing a pathway or submitting a new application, the refusal reason should be reviewed so the next application directly addresses the earlier concern.";
  }

  if (
    profile.qualification === "first_class" &&
    profile.destination === "canada" &&
    profile.fundingPosition === "needs_scholarship" &&
    !scholarshipDestinationActive("canada")
  ) {
    return "Your academic background is strong. Scholarship planning is worth reviewing, but this report should not treat scholarship as the main pathway until an active scholarship option, deadline, and eligibility criteria are confirmed.";
  }

  if (profile.qualification === "first_class" && profile.fundingPosition === "self_funded") {
    return "Because you are able to self-fund your programme, your pathway can focus on academic fit, destination fit, and long-term value instead of being driven mainly by funding support.";
  }

  if (
    (profile.qualification === "hnd_lower_credit" || profile.qualification === "hnd_upper_credit") &&
    profile.destination === "france"
  ) {
    return "Your HND background does not close the door. Because you selected France, your strongest direction is a flexible France business or technology pathway that can consider HND applicants, provided your course field, documents, and funding plan are confirmed.";
  }

  if (profile.qualification === "third_class" && profile.destination === "canada") {
    return "Your third-class result does not automatically remove Canada as an option. Based on your answers, your strongest direction is a Canada graduate certificate or postgraduate certificate pathway, with course choice and long-term study-to-work planning reviewed carefully.";
  }

  if (
    profile.destination === "uk" &&
    profile.qualification === "second_class_lower" &&
    profile.wantsDependants === true
  ) {
    return "Because you selected the UK, entered a 2:2 degree, and want to plan with dependants, your strongest direction is a research-based UK Masters pathway. This pathway depends on course relevance, research-topic readiness, documents, and funding readiness.";
  }

  if (
    profile.destination === "uk" &&
    (profile.qualification === "masters" || profile.qualification === "phd")
  ) {
    return "Because you selected the UK and already have a Masters-level background, a research-based UK PhD pathway can be reviewed if your research topic, supervisor fit, academic documents, and funding plan are strong enough.";
  }

  const activeLabels = [...ACTIVE_DESTINATIONS].map(destinationLabel);
  const destinationMessage = ACTIVE_DESTINATIONS.has(profile.destination)
    ? activeDestinationLabel(profile.destination)
    : humanList(activeLabels.slice(0, 3));

  return `Based on your answers, your strongest direction right now is ${productTitle(primaryProduct, profile)}. Your profile can be reviewed for strong study options in destinations like ${destinationMessage}, but this report keeps the focus on the live pathway that currently fits you best.`;
}

function readinessLabel(metadata: GeneratedReportMetadata) {
  switch (metadata.readinessLevel) {
    case "Action-ready":
      return "Strong profile with checks";
    case "Advancing":
      return "Progressing with key checks";
    case "Emerging":
      return "Preparation still matters";
    default:
      return "Preparation first";
  }
}

function snapshotTone(value: "positive" | "caution" | "neutral"): PublicSnapshotItem["tone"] {
  return value;
}

function fundingLabel(profile: NormalizedAssessmentProfile) {
  switch (profile.fundingPosition) {
    case "self_funded":
      return "Self-funded";
    case "needs_study_loan":
      return "Study-support review needed";
    case "needs_scholarship":
      return "Scholarship review needed";
    case "lowest_cost":
      return "Lowest-cost route focus";
    case "sponsor_funded":
      return "Sponsor-backed plan";
    default:
      return "Funding still needs review";
  }
}

function familyLabel(profile: NormalizedAssessmentProfile) {
  if (profile.wantsDependants === true) {
    return "Dependants part of the plan";
  }

  if (profile.wantsDependants === false) {
    return "Solo study plan";
  }

  return "Family plan still to confirm";
}

function buildSnapshot(
  profile: NormalizedAssessmentProfile,
  metadata: GeneratedReportMetadata,
): { title: string; items: PublicSnapshotItem[] } {
  return {
    title: "Pathway Snapshot",
    items: [
      {
        label: "Destination",
        value: activeDestinationLabel(profile.destination),
        tone: snapshotTone("positive"),
      },
      {
        label: "Academic background",
        value: profile.qualificationLabel,
        tone: snapshotTone("positive"),
      },
      {
        label: "Funding position",
        value: fundingLabel(profile),
        tone: snapshotTone(
          profile.fundingPosition === "self_funded" ? "positive" : "caution",
        ),
      },
      {
        label: "Family plan",
        value: familyLabel(profile),
        tone: snapshotTone(profile.wantsDependants === true ? "neutral" : "positive"),
      },
      {
        label: "Readiness",
        value: readinessLabel(metadata),
        tone: snapshotTone(
          profile.passportStatus === "no_passport" || profile.hasPreviousRefusal === true
            ? "caution"
            : "neutral",
        ),
      },
    ],
  };
}

function routeReason(profile: NormalizedAssessmentProfile, product: ActiveProduct) {
  if (product.id === "PRODUCT-UK-MRES-001") {
    if (profile.qualification === "masters" || profile.qualification === "phd") {
      return "Because you selected the UK and already have a Masters-level background, this route keeps your profile aligned with research-based progression instead of a generic taught option.";
    }

    if (profile.wantsDependants === true) {
      return "You selected the UK, want to plan seriously, and want a route that can still support dependant planning. That makes this research-based Masters direction stronger than a generic taught option.";
    }

    return "Based on your answers, this UK route stays strongest because it combines academic fit, research-led positioning, and long-term study value.";
  }

  if (product.id === "PRODUCT-CANADA-GRAD-CERT-001") {
    if (profile.qualification === "third_class") {
      return "This route stays strongest because Canada graduate-certificate planning is more realistic for your current academic background than a generic direct-Masters assumption.";
    }

    return "This route stays strongest because it keeps Canada planning practical, course-led, and easier to validate before applications begin.";
  }

  if (product.id === "PRODUCT-CANADA-DIPLOMA-LOAN-001") {
    return "Because you asked for funding support and fit the live age and academic window, this Canada diploma route can be reviewed as a structured study-support option.";
  }

  if (product.id === "PRODUCT-FRANCE-FLEXIBLE-BUSINESS-TECH-001") {
    return "This route stays strongest because it is the most flexible live France option for applicants who need a realistic business or technology path with more academic flexibility.";
  }

  if (product.id === "PRODUCT-FRANCE-BUSINESS-STRICT-001") {
    return "This route stays strongest because your academic background is strong enough to keep a more selective France study direction realistic.";
  }

  if (product.id === "PRODUCT-NEW-ZEALAND-STUDY-001") {
    return "This route stays strongest because it combines study, work flexibility, and a calmer long-term planning path without forcing a rushed decision.";
  }

  return product.publicSummary;
}

function routeCondition(profile: NormalizedAssessmentProfile, product: ActiveProduct) {
  if (profile.passportStatus === "no_passport") {
    return "Before you rely on this route, secure your international passport first.";
  }

  if (product.id === "PRODUCT-UK-MRES-001") {
    return "Before you rely on this route, confirm your course relevance, research topic, academic documents, and funding readiness.";
  }

  if (product.id === "PRODUCT-CANADA-DIPLOMA-LOAN-001") {
    return "Before you rely on this route, confirm the age window, academic fit, passport readiness, and study-support review.";
  }

  if (product.id === "PRODUCT-FRANCE-FLEXIBLE-BUSINESS-TECH-001") {
    return "Before you rely on this route, confirm your course field, documents, and overall funding plan.";
  }

  return "Before you rely on this route, confirm your documents, route conditions, and application timing.";
}

function routeFirstStep(profile: NormalizedAssessmentProfile, product: ActiveProduct) {
  if (profile.passportStatus === "no_passport") {
    return "Secure your passport before you move into applications, visa steps, or travel bookings.";
  }

  if (product.id === "PRODUCT-UK-MRES-001") {
    return "Choose a research direction, gather your transcript and certificate, and review whether the route still fits before applications begin.";
  }

  if (product.id === "PRODUCT-CANADA-GRAD-CERT-001") {
    return "Shortlist practical course options and confirm the best course direction before applications begin.";
  }

  if (product.id === "PRODUCT-CANADA-DIPLOMA-LOAN-001") {
    return "Confirm age and academic fit, then review whether the study-support route is truly realistic before you treat it as confirmed.";
  }

  if (product.id === "PRODUCT-FRANCE-FLEXIBLE-BUSINESS-TECH-001") {
    return "Confirm the business or technology field that best matches your background before applications begin.";
  }

  return "Gather your academic documents and confirm route fit before applications begin.";
}

function buildProductRouteCard(
  role: PublicRouteRole,
  product: ActiveProduct,
  profile: NormalizedAssessmentProfile,
  overrides?: Partial<PublicRouteCard>,
): PublicRouteCard {
  return {
    role,
    title: overrides?.title ?? productTitle(product, profile),
    countryLabel: overrides?.countryLabel ?? productCountryLabel(product),
    routeTypeLabel: overrides?.routeTypeLabel ?? routeTypeLabel(product),
    reason: withPeriod(overrides?.reason ?? routeReason(profile, product)),
    keyCondition: overrides?.keyCondition ?? withPeriod(routeCondition(profile, product)),
    firstStep: overrides?.firstStep ?? withPeriod(routeFirstStep(profile, product)),
    statusLabel: overrides?.statusLabel,
  };
}

function buildSupportingRoutes(
  profile: NormalizedAssessmentProfile,
  primaryProduct: ActiveProduct,
) {
  const routes: PublicRouteCard[] = [];

  if (
    primaryProduct.id === "PRODUCT-UK-MRES-001" &&
    (profile.fundingPosition === "needs_study_loan" || profile.fundingPosition === "lowest_cost")
  ) {
    routes.push({
      role: "supporting",
      title: "UK tuition-support review",
      countryLabel: "United Kingdom",
      routeTypeLabel: "Support option",
      reason: withPeriod(
        "Because you selected funding support, a UK tuition-support option should be reviewed alongside your main route. This should not replace the primary route unless your admission fit, documents, passport status, and funding plan support it",
      ),
      keyCondition: "Confirm admission fit, passport readiness, and whether the support review is realistic before you treat it as dependable.",
      firstStep: "Gather your academic documents, passport, and funding-readiness details before the support review.",
      statusLabel: "Supporting option",
    });
  }

  if (
    strongAcademicProfile(profile) &&
    profile.fundingPosition === "needs_scholarship"
  ) {
    routes.push({
      role: "supporting",
      title: "Scholarship review",
      countryLabel: ACTIVE_DESTINATIONS.has(profile.destination)
        ? activeDestinationLabel(profile.destination)
        : "Active destination review",
      routeTypeLabel: "Support option",
      reason: withPeriod(
        "Because your academic profile is strong, scholarship planning is worth reviewing. It should not be treated as guaranteed, and it should not replace the main route unless your deadlines, target course, documents, and funding backup are realistic",
      ),
      keyCondition: "Confirm that the scholarship route is active, deadline-fit, and realistic before you depend on it.",
      firstStep: "Prepare your transcript, certificate, CV, references, and a realistic funding backup.",
      statusLabel: "Supporting option",
    });
  }

  return routes.slice(0, 2);
}

function buildBackupRoutes(
  profile: NormalizedAssessmentProfile,
  rankedProducts: ActiveProduct[],
  primaryProduct: ActiveProduct,
) {
  return rankedProducts
    .filter((product) => product.id !== primaryProduct.id)
    .filter((product) => product.country === primaryProduct.country || product.country !== profile.destination)
    .slice(0, 2)
    .map((product) =>
      buildProductRouteCard("backup", product, profile, {
        reason:
          "Keep this route in reserve so you still have a grounded option if your strongest route stops fitting your documents, timing, or route conditions.",
        statusLabel: "Backup route",
      }),
    );
}

function buildNotRecommendedRoutes(
  profile: NormalizedAssessmentProfile,
  publicGuidance: PublicStudyGuidance | null,
) {
  const routes = (publicGuidance?.routeRecommendations ?? [])
    .filter((route) => route.role === "not_recommended")
    .map((route) => productFromRouteRecommendation(route, profile))
    .filter((product): product is ActiveProduct => Boolean(product))
    .map((product) =>
      buildProductRouteCard("not_recommended", product, profile, {
        reason:
          "This option should stay off your main plan right now because your current answers do not support it strongly enough.",
        statusLabel: "Not recommended now",
      }),
    );

  return routes.slice(0, 2);
}

function blockerFromProfile(
  category: PublicBlocker["category"],
  title: string,
  body: string,
  priority: PublicBlocker["priority"],
): PublicBlocker {
  return {
    category,
    title,
    body: withPeriod(body),
    priority,
  };
}

function buildBlockers(
  profile: NormalizedAssessmentProfile,
  primaryProduct: ActiveProduct,
  publicGuidance: PublicStudyGuidance | null,
) {
  const blockers: PublicBlocker[] = [];

  if (profile.passportStatus === "no_passport") {
    blockers.push(
      blockerFromProfile(
        "passport",
        "Passport first",
        "Your international passport is the first blocker. Secure this before applications, visa steps, flights, hotel bookings, or advanced processing",
        "critical",
      ),
    );
  } else if (profile.passportStatus === "expired_passport") {
    blockers.push(
      blockerFromProfile(
        "passport",
        "Passport renewal timing",
        "Your passport must be renewed and back in hand before tight application or travel timing should be trusted",
        "high",
      ),
    );
  }

  if (
    primaryProduct.id === "PRODUCT-CANADA-DIPLOMA-LOAN-001" &&
    !canadaLoanAgeFits(profile)
  ) {
    blockers.push(
      blockerFromProfile(
        "age",
        "Age range",
        "Your academic profile may be workable, but this route has an age-related condition. It should not be treated as final until your age fit is confirmed",
        "high",
      ),
    );
  }

  if (isResearchRoute(primaryProduct) && profile.researchReadiness !== "has_topic") {
    blockers.push(
      blockerFromProfile(
        "route_condition",
        "Research proposal readiness",
        "This route depends on a clear research topic and proposal direction. Your research idea must connect with your previous study or work background",
        "high",
      ),
    );
  }

  if (
    profile.fundingPosition === "needs_study_loan" ||
    primaryProduct.productType === "loan_supported_route"
  ) {
    blockers.push(
      blockerFromProfile(
        "funding",
        "Loan-readiness check",
        "Your academic profile may be strong, but a study-loan route still depends on loan-readiness checks, admission fit, and document review",
        "medium",
      ),
    );
  } else if (
    profile.fundingPosition === "needs_scholarship" ||
    profile.fundingPosition === "lowest_cost"
  ) {
    blockers.push(
      blockerFromProfile(
        "funding",
        "Funding readiness",
        "Your route should not be treated as settled until your funding plan is realistic for documents, admission, and visa-readiness",
        "medium",
      ),
    );
  }

  if (requiresEnglishEvidence(primaryProduct) && profile.englishTestStatus === "needs_test") {
    blockers.push(
      blockerFromProfile(
        "english",
        "English-test readiness",
        "You still need to confirm whether this route needs a valid English test result or another accepted waiver",
        "medium",
      ),
    );
  }

  if (profile.timelineUrgency === "urgent") {
    blockers.push(
      blockerFromProfile(
        "timeline",
        "Timeline pressure",
        "Your timeline is tight, so the route should be sequenced carefully before applications begin",
        "low",
      ),
    );
  }

  if (profile.hasPreviousRefusal === true) {
    blockers.push(
      blockerFromProfile(
        "previous_refusal",
        "Previous refusal review",
        "Before a new application is submitted, the refusal reason should be reviewed so the next route directly addresses the earlier concern",
        "high",
      ),
    );
  }

  const documentGaps =
    publicGuidance?.documentChecklist?.filter((item) => item.status !== "ready").length ?? 0;
  if (documentGaps > 0) {
    blockers.push(
      blockerFromProfile(
        "documents",
        "Document completeness",
        "Some of your route documents still need review before this pathway should be treated as dependable",
        "low",
      ),
    );
  }

  return blockers;
}

function buildWhyThisFits(
  profile: NormalizedAssessmentProfile,
  primaryProduct: ActiveProduct,
): PublicPathwayReport["whyThisFits"] {
  return [
    {
      title: "Why this pathway fits you",
      body: routeReason(profile, primaryProduct),
    },
  ].map((item) => ({
    title: sanitizePublicText(item.title),
    body: withPeriod(item.body),
  }));
}

function buildSmartNextSteps(
  profile: NormalizedAssessmentProfile,
  primaryProduct: ActiveProduct,
): PublicNextStep[] {
  if (profile.passportStatus === "no_passport" || profile.passportRenewalInProgress) {
    return [
      {
        title: "Apply for or renew your international passport",
        body: "Do this first before you move into applications, visa forms, flights, hotels, or advanced processing.",
      },
      {
        title: "Pause major travel commitments",
        body: "Do not pay for visa forms, flights, hotels, or advanced processing yet.",
      },
      {
        title: "Return to route validation after passport readiness",
        body: "Once passport readiness is confirmed, review your academic documents and route options.",
      },
    ];
  }

  if (profile.hasPreviousRefusal === true) {
    return [
      {
        title: "Review the refusal reason first",
        body: "Understand the earlier refusal before you choose a new route.",
      },
      {
        title: "Test the new route against the refusal issue",
        body: "Check whether the new application directly addresses the previous refusal concern.",
      },
      {
        title: "Avoid rushing a new submission",
        body: "Do not submit a new application until the refusal risk has been reviewed properly.",
      },
    ];
  }

  if (isResearchRoute(primaryProduct) && profile.researchReadiness !== "has_topic") {
    return [
      {
        title: "Choose a research topic",
        body: "Pick a topic connected to your academic or work background.",
      },
      {
        title: "Gather your evidence",
        body: "Prepare your transcript, certificate, CV, and any project or research evidence.",
      },
      {
        title: "Review topic fit before applications begin",
        body: "Confirm that the route and research direction still align before applications begin.",
      },
    ];
  }

  if (
    primaryProduct.id === "PRODUCT-CANADA-DIPLOMA-LOAN-001" &&
    !canadaLoanAgeFits(profile)
  ) {
    return [
      {
        title: "Review the age condition first",
        body: "Do not treat this study-support route as final until the age condition is confirmed.",
      },
      {
        title: "Keep a non-loan backup route ready",
        body: "Compare a route that does not depend on the same age condition.",
      },
      {
        title: "Confirm route fit before applications begin",
        body: "Use the review to decide whether the live route still makes sense or should stay as a backup only.",
      },
    ];
  }

  if (profile.fundingPosition === "needs_study_loan") {
    return [
      {
        title: "Confirm study-support readiness",
        body: "Check whether you meet the live support-readiness requirements before you treat the route as confirmed.",
      },
      {
        title: "Prepare your core documents",
        body: "Gather your academic documents, passport, admission details, and any sponsor or income evidence.",
      },
      {
        title: "Keep the route conditional until review is complete",
        body: "Do not treat the study-support route as confirmed until the funding review is complete.",
      },
    ];
  }

  if (profile.fundingPosition === "needs_scholarship") {
    return [
      {
        title: "Confirm scholarship realism",
        body: "Check that your age, academic record, target course, and deadline still fit any scholarship planning.",
      },
      {
        title: "Prepare your strongest documents",
        body: "Gather your transcript, certificate, CV, references, and statement documents.",
      },
      {
        title: "Keep a backup route ready",
        body: "Maintain a self-funded or admission-led backup route in case the scholarship route is not realistic.",
      },
    ];
  }

  if (profile.fundingPosition === "self_funded") {
    return [
      {
        title: "Confirm programme and destination fit",
        body: "Shortlist the course direction that best matches your background and long-term goal.",
      },
      {
        title: "Prepare your academic documents and passport",
        body: "Keep your transcript, certificate, CV, and passport ready for route review.",
      },
      {
        title: "Review visa-readiness requirements before applications begin",
        body: "Check proof-of-funds and route sequencing before applications begin.",
      },
    ];
  }

  return [
    {
      title: "Validate the route first",
      body: "Confirm that your strongest route still matches your background, documents, and course direction.",
    },
    {
      title: "Prepare your core documents",
      body: "Gather the documents that matter to this route before applications begin.",
    },
    {
      title: "Use the review to sequence your next move",
      body: "Confirm the application order before you commit to the next step.",
    },
  ];
}

function mapChecklistStatus(
  status: StudyDocumentChecklistItem["status"],
): PublicDocumentItem["status"] {
  switch (status) {
    case "ready":
      return "confirmed";
    case "missing":
      return "missing";
    default:
      return "needs_confirmation";
  }
}

function documentConceptKey(title: string) {
  const lower = cleanSentence(title).toLowerCase();

  if (
    lower.includes("academic document") ||
    lower.includes("academic certificate") ||
    lower.includes("certificate") ||
    lower.includes("transcript")
  ) {
    return "academic_documents";
  }

  if (
    lower.includes("funding") ||
    lower.includes("sponsor") ||
    lower.includes("proof-of-funds") ||
    lower.includes("proof of funds")
  ) {
    return "funding_evidence";
  }

  if (lower === "cv" || lower.includes("resume")) {
    return "cv";
  }

  if (lower.includes("research")) {
    return "research";
  }

  if (lower.includes("english")) {
    return "english";
  }

  if (lower.includes("passport")) {
    return "passport";
  }

  if (lower.includes("refusal")) {
    return "previous_refusal";
  }

  if (lower.includes("reference") || lower.includes("personal statement")) {
    return "references_statement";
  }

  return lower.replace(/\s+/g, "_");
}

function mergeDocumentStatus(
  current: PublicDocumentItem["status"],
  incoming: PublicDocumentItem["status"],
): PublicDocumentItem["status"] {
  const priority: Record<PublicDocumentItem["status"], number> = {
    blocked: 5,
    missing: 4,
    needs_confirmation: 3,
    confirmed: 2,
    not_required: 1,
  };

  return priority[incoming] > priority[current] ? incoming : current;
}

function mergeDocumentBody(
  key: string,
  currentBody: string,
  incomingBody: string,
) {
  if (key === "academic_documents") {
    return "Prepare your certificate and transcript so your final course and pathway match can be reviewed.";
  }

  if (key === "funding_evidence") {
    return currentBody.length >= incomingBody.length ? currentBody : incomingBody;
  }

  return currentBody.length >= incomingBody.length ? currentBody : incomingBody;
}

function upsertDocument(
  documents: PublicDocumentItem[],
  item: PublicDocumentItem,
) {
  const key = documentConceptKey(item.title);
  const existingIndex = documents.findIndex((document) => documentConceptKey(document.title) === key);

  if (existingIndex === -1) {
    documents.push(item);
    return;
  }

  const existing = documents[existingIndex];
  documents[existingIndex] = {
    ...existing,
    title: key === "academic_documents" ? "Academic documents" : existing.title,
    status: mergeDocumentStatus(existing.status, item.status),
    body: mergeDocumentBody(key, existing.body, item.body),
  };
}

function buildDocumentsToPrepare(
  profile: NormalizedAssessmentProfile,
  primaryProduct: ActiveProduct,
  publicGuidance: PublicStudyGuidance | null,
  supportingRoutes: PublicRouteCard[],
) {
  const documents: PublicDocumentItem[] = [];

  upsertDocument(documents, {
    title: "International passport",
    status:
      profile.passportStatus === "valid_passport"
        ? "confirmed"
        : profile.passportStatus === "no_passport"
          ? "missing"
          : "needs_confirmation",
    body:
      profile.passportStatus === "valid_passport"
        ? "Your passport status already supports route planning."
        : profile.passportStatus === "no_passport"
          ? "Secure your passport before applications, visa steps, or travel bookings."
          : "Confirm that your renewed passport will be ready before applications begin.",
  });

  upsertDocument(documents, {
    title: "Academic documents",
    status: "needs_confirmation",
    body: "Prepare your certificate and transcript so your final course and pathway match can be reviewed.",
  });

  upsertDocument(documents, {
    title: "CV",
    status: "needs_confirmation",
    body: "Prepare your CV so the route review can connect your background and next direction clearly.",
  });

  if (profile.fundingPosition !== "unknown") {
    upsertDocument(documents, {
      title: "Funding or sponsor evidence",
      status: profile.fundingPosition === "self_funded" ? "needs_confirmation" : "missing",
      body:
        profile.fundingPosition === "self_funded"
          ? "Review your funding evidence before applications begin."
          : "Prepare the funding evidence needed to review whether your route is truly realistic.",
    });
  }

  if (isResearchRoute(primaryProduct)) {
    upsertDocument(documents, {
      title: "Research topic or proposal",
      status: profile.researchReadiness === "has_topic" ? "confirmed" : "needs_confirmation",
      body: "Prepare a research topic or proposal summary that connects clearly to your background.",
    });
  }

  if (requiresEnglishEvidence(primaryProduct)) {
    upsertDocument(documents, {
      title: "English-test or waiver evidence",
      status:
        profile.englishTestStatus === "has_test" || profile.englishTestStatus === "waiver_possible"
          ? "confirmed"
          : "needs_confirmation",
      body:
        profile.englishTestStatus === "waiver_possible"
          ? "Prepare the documents needed to support an English-language waiver review."
          : "Prepare your English-test or language-proof evidence for review.",
    });
  }

  if (supportingRoutes.some((route) => route.title === "Scholarship review")) {
    upsertDocument(documents, {
      title: "References and personal statement",
      status: "needs_confirmation",
      body: "Prepare references and statement documents so scholarship planning can be reviewed properly.",
    });
  }

  if (profile.hasPreviousRefusal === true) {
    upsertDocument(documents, {
      title: "Previous refusal documents",
      status: "needs_confirmation",
      body: "Prepare the refusal record and the supporting documents that explain how the next route addresses it.",
    });
  }

  if (publicGuidance?.documentChecklist?.length) {
    publicGuidance.documentChecklist.forEach((item) => {
      const normalizedTitle = sanitizePublicText(item.title);
      const lowerTitle = normalizedTitle.toLowerCase();

      if (lowerTitle.includes("programme") && lowerTitle.includes("matching")) {
        return;
      }

      upsertDocument(documents, {
        title: normalizedTitle,
        status: mapChecklistStatus(item.status),
        body: withPeriod(item.note),
      });
    });
  }

  return documents.slice(0, 5);
}

function buildRoadmapItems(
  profile: NormalizedAssessmentProfile,
  primaryProduct: ActiveProduct,
  timeline: StudyTimelineStep[] | undefined,
) {
  if (timeline?.length) {
    return timeline.slice(0, 4).map<PublicRoadmapItem>((item) => ({
      title: sanitizePublicText(item.window || item.title),
      body: withPeriod(item.description),
    }));
  }

  if (isResearchRoute(primaryProduct)) {
    return [
      {
        title: "Route validation",
        body: "Confirm course relevance, research direction, and the route conditions before applications begin.",
      },
      {
        title: "Document preparation",
        body: "Gather your transcript, certificate, CV, and research evidence for review.",
      },
      {
        title: "Application sequencing",
        body: "Move into applications only after the route, funding plan, and document checks stay aligned.",
      },
    ];
  }

  return [
    {
      title: "Route validation",
      body: "Confirm that the strongest route still matches your profile before applications begin.",
    },
    {
      title: "Readiness checks",
      body: "Settle your passport, documents, funding plan, and language evidence in the right order.",
    },
    {
      title: "Application planning",
      body: "Move into applications only after the route and readiness checks are properly confirmed.",
    },
  ];
}
/* eslint-enable @typescript-eslint/no-unused-vars */

function buildQuestionsToClarify(
  profile: NormalizedAssessmentProfile,
  publicGuidance: PublicStudyGuidance | null,
) {
  const questions = (publicGuidance?.questionsToAsk ?? [])
    .map((question) => sanitizePublicText(question))
    .filter((question) => {
      const lower = question.toLowerCase();
      if (profile.passportStatus !== "unknown" && lower.includes("passport")) {
        return false;
      }

      if (profile.englishTestStatus !== "unknown" && lower.includes("english")) {
        return false;
      }

      if (profile.researchReadiness !== "unknown" && lower.includes("research")) {
        return false;
      }

      return true;
    });

  return questions.slice(0, 4);
}

function buildConsultationFocus(
  profile: NormalizedAssessmentProfile,
  primaryProduct: ActiveProduct,
) {
  if (isResearchRoute(primaryProduct)) {
    return [
      "Your consultation should confirm whether the research-based route remains the strongest option after your documents, course relevance, and research topic are reviewed.",
    ];
  }

  if (profile.fundingPosition === "needs_scholarship") {
    return [
      "Your consultation should confirm whether scholarship planning is realistic for your age, academic record, target course, and deadline.",
    ];
  }

  if (profile.fundingPosition === "needs_study_loan") {
    return [
      "Your consultation should review whether a study-support route is suitable based on your funding position, admission fit, and support-readiness checks.",
    ];
  }

  return [
    "Your consultation should shortlist the best-fit routes, confirm your application sequence, and review visa-readiness requirements before applications begin.",
  ];
}

function buildCta(
  profile: NormalizedAssessmentProfile,
  primaryProduct: ActiveProduct,
): PublicCTA {
  if (profile.passportStatus === "no_passport" || profile.passportRenewalInProgress) {
    return {
      eyebrow: "Start with passport readiness",
      title: "Start with passport readiness",
      body: "Secure your passport first, then review the strongest live route when that blocker is cleared.",
      actionLabel: "Plan My Route After Passport",
      href: "/consultation/pathway-review",
    };
  }

  if (isResearchRoute(primaryProduct)) {
    return {
      eyebrow: "Review my research route",
      title: "Review my research route",
      body: "Use a guided review to confirm whether this research-based route still fits after your documents and topic are checked.",
      actionLabel: "Schedule Research Route Review",
      href: "/consultation/pathway-review",
    };
  }

  if (
    profile.fundingPosition === "needs_study_loan" &&
    primaryProduct.productType === "loan_supported_route"
  ) {
    return {
      eyebrow: "Review my funding-linked pathway",
      title: "Review my funding-linked pathway",
      body: "Review whether the loan-supported pathway is realistic before you treat it as confirmed.",
      actionLabel: "Schedule Funding Route Review",
      href: "/consultation/pathway-review",
    };
  }

  if (profile.fundingPosition === "needs_scholarship") {
    return {
      eyebrow: "Review my scholarship fit",
      title: "Review my scholarship fit",
      body: "Test whether scholarship planning is realistic while keeping your main route grounded.",
      actionLabel: "Schedule Scholarship Review",
      href: "/consultation/pathway-review",
    };
  }

  return {
    eyebrow: "Shortlist my best study routes",
    title: "Shortlist my best study routes",
    body: "Use a guided review to confirm the strongest route, sequence your application steps, and avoid premature decisions.",
    actionLabel: "Schedule Route Shortlist Review",
    href: "/consultation/pathway-review",
  };
}

function buildOptionLabelMap(options: Array<{ value: string; label: string }>) {
  return new Map(options.map((option) => [option.value, option.label]));
}

const GOAL_LABELS = buildOptionLabelMap(primaryGoalOptions);
const STUDY_LEVEL_LABELS = buildOptionLabelMap(studyLevelOptions);
const EDUCATION_LABELS = buildOptionLabelMap(highestEducationOptions);
const FUNDING_LABELS = buildOptionLabelMap(studyFundingReadinessOptions);
const AGE_LABELS = buildOptionLabelMap(ageRangeOptions);
const PASSPORT_LABELS = buildOptionLabelMap(passportStatusOptions);
const TIMELINE_LABELS = buildOptionLabelMap(timelineOptions);
const REFUSAL_LABELS = buildOptionLabelMap(previousRefusalOptions);

function destinationOptionLabel(answers: AssessmentAnswers) {
  const goal = answers.primaryGoal ?? "study_abroad";
  const options = destinationOptionsByGoal[goal] ?? destinationOptionsByGoal.study_abroad;
  return buildOptionLabelMap(options).get(answers.destinationInterest ?? "") ?? null;
}

function answerLabel(
  labels: Map<string, string>,
  value: string | null | undefined,
  fallback = "Not provided",
) {
  if (!value) {
    return fallback;
  }

  return labels.get(value) ?? value;
}

function submittedProfileItems(
  answers: AssessmentAnswers,
  profile: NormalizedAssessmentProfile,
  primaryProduct: ActiveProduct,
): PublicSnapshotItem[] {
  const items: PublicSnapshotItem[] = [
    {
      label: "Goal",
      value: answerLabel(GOAL_LABELS, answers.primaryGoal, "Study abroad"),
      tone: "positive",
    },
    {
      label: "Preferred destination",
      value:
        destinationOptionLabel(answers) ??
        (ACTIVE_DESTINATIONS.has(profile.destination)
          ? destinationLabel(profile.destination)
          : "Not fully covered by live study routes"),
      tone: ACTIVE_DESTINATIONS.has(profile.destination) ? "positive" : "caution",
    },
    {
      label: "Intended study level",
      value: answerLabel(STUDY_LEVEL_LABELS, answers.studyLevel, "Not provided"),
      tone: answers.studyLevel && answers.studyLevel !== "not_sure" ? "positive" : "neutral",
    },
    {
      label: "Education level",
      value:
        EDUCATION_LABELS.get(answers.highestEducation ?? "") ??
        profile.qualificationLabel,
      tone:
        profile.qualification === "bachelors_unknown" ||
        profile.qualification === "professional_certification" ||
        profile.qualification === "unknown"
          ? "caution"
          : "positive",
    },
    {
      label: "Funding preference",
      value: answerLabel(FUNDING_LABELS, answers.studyFundingReadiness, "Not provided"),
      tone:
        profile.fundingPosition === "unknown" ||
        profile.fundingPosition === "application_costs_only"
          ? "caution"
          : "positive",
    },
    {
      label: "Strongest pathway to review first",
      value: productTitle(primaryProduct, profile),
      tone: "positive",
    },
  ];

  if (answers.ageRange) {
    items.push({
      label: "Age range",
      value: answerLabel(AGE_LABELS, answers.ageRange),
      tone: "neutral",
    });
  }

  items.push({
    label: "Passport status",
    value: answerLabel(PASSPORT_LABELS, answers.passportStatus, "Not provided"),
    tone: profile.passportStatus === "valid_passport" ? "positive" : "caution",
  });

  items.push({
    label: "Timeline",
    value: answerLabel(TIMELINE_LABELS, answers.timeline, "Not provided"),
    tone: profile.timelineUrgency === "urgent" ? "caution" : "neutral",
  });

  if (answers.previousRefusal) {
    items.push({
      label: "Previous refusal",
      value: answerLabel(REFUSAL_LABELS, answers.previousRefusal),
      tone: profile.hasPreviousRefusal === true ? "caution" : "positive",
    });
  }

  return items.slice(0, 9);
}

function guidancePrimaryProduct(
  publicGuidance: PublicStudyGuidance | null,
  profile: NormalizedAssessmentProfile,
): ActiveProduct | null {
  const primaryRoute =
    publicGuidance?.routeRecommendations.find((route) => route.role === "primary") ??
    publicGuidance?.routeRecommendations[0];

  return primaryRoute ? productFromRouteRecommendation(primaryRoute, profile) : null;
}

function routeReasonFromAnswers(
  profile: NormalizedAssessmentProfile,
  product: ActiveProduct,
  role: PublicRouteRole,
): string {
  if (role === "primary") {
    if (profile.destination === "canada" && product.id === "PRODUCT-CANADA-DIPLOMA-LOAN-001") {
      return withPeriod(
        "You selected Canada and asked for loan support, so this is the strongest funding-linked route to review first if the age and academic checks still fit.",
      );
    }

    if (profile.destination === "canada" && product.id === "PRODUCT-CANADA-GRAD-CERT-001") {
      return withPeriod(
        "You selected Canada, and your education profile points more naturally toward a graduate certificate review than a direct Masters-first assumption.",
      );
    }

    if (profile.destination === "france" && product.id === "PRODUCT-FRANCE-FLEXIBLE-BUSINESS-TECH-001") {
      return withPeriod(
        "You selected France, and your education profile fits the more flexible France pathway better than the stricter France business route.",
      );
    }

    if (profile.destination === "france" && product.id === "PRODUCT-FRANCE-BUSINESS-STRICT-001") {
      return withPeriod(
        "You selected France, and your academic profile is strong enough to review the more selective business-focused France pathway first.",
      );
    }

    if (profile.destination === "uk" && product.productType === "scholarship_route") {
      return withPeriod(
        "You selected the UK and entered a strong academic result, so a competitive scholarship review is worth checking first while keeping backup funding in view.",
      );
    }

    if (profile.destination === "uk" && product.productType === "research_route") {
      return withPeriod(
        "You selected the UK, and your study level and academic background point more toward a research-led route review than a generic taught-path assumption.",
      );
    }
  }

  if (role === "supporting" && product.productType === "loan_supported_route") {
    return withPeriod(
      "This stays worth reviewing if you still want structured funding support and the age, academic, and document checks line up.",
    );
  }

  if (role === "supporting" && product.productType === "scholarship_route") {
    return withPeriod(
      "This stays worth reviewing only as a competitive funding option, not as a guaranteed outcome.",
    );
  }

  if (product.country === "uk") {
    return withPeriod(
      "The UK may be worth reviewing if your academic profile is stronger for a research-led or scholarship-reviewed route than your current first choice.",
    );
  }

  if (product.country === "canada") {
    return withPeriod(
      "Canada may still be worth reviewing if you want a practical certificate or diploma route and your funding plan remains workable.",
    );
  }

  if (product.country === "france") {
    return withPeriod(
      "France may be worth reviewing if you need a more flexible study direction for business or technology-related programmes.",
    );
  }

  return withPeriod(
    "This is worth keeping in reserve if your first-choice pathway becomes weaker after funding, document, or programme review.",
  );
}

function routeCardFromProduct(
  role: PublicRouteRole,
  product: ActiveProduct,
  profile: NormalizedAssessmentProfile,
): PublicRouteCard {
  const statusLabel =
    role === "primary"
      ? "Strongest pathway to review first"
      : role === "supporting"
        ? "Supporting pathway to compare"
        : role === "backup"
          ? "Backup pathway"
          : "Not the strongest fit now";

  return {
    role,
    title: productTitle(product, profile),
    countryLabel: productCountryLabel(product),
    routeTypeLabel: routeTypeLabel(product),
    reason: routeReasonFromAnswers(profile, product, role),
    keyCondition: withPeriod(
      product.productType === "loan_supported_route"
        ? "Check the funding conditions, age fit, academic fit, and documents before treating this as a serious plan."
        : product.productType === "scholarship_route"
          ? "Treat this as a competitive review path, not a guaranteed funding outcome."
          : "Use review to confirm programme fit, documents, timing, and funding before applications begin.",
    ),
    firstStep: withPeriod(product.firstStep),
    statusLabel,
  };
}

function routeCardsFromGuidance(
  publicGuidance: PublicStudyGuidance | null,
  rankedProducts: ActiveProduct[],
  profile: NormalizedAssessmentProfile,
  primaryProduct: ActiveProduct,
) {
  const supportingRoutes: PublicRouteCard[] = [];
  const backupRoutes: PublicRouteCard[] = [];
  const notRecommendedRoutes: PublicRouteCard[] = [];
  const seen = new Set<string>([primaryProduct.id]);

  for (const route of publicGuidance?.routeRecommendations ?? []) {
    if (route.role === "primary") {
      continue;
    }

    const product =
      productFromRouteRecommendation(route, profile) ??
      rankedProducts.find((item) => cleanSentence(productTitle(item, profile)) === cleanSentence(route.publicRouteName));

    if (!product || seen.has(product.id)) {
      continue;
    }

    seen.add(product.id);
    const card = routeCardFromProduct(
      route.role === "supporting"
        ? "supporting"
        : route.role === "backup"
          ? "backup"
          : "not_recommended",
      product,
      profile,
    );

    if (card.role === "supporting") {
      supportingRoutes.push(card);
    } else if (card.role === "backup") {
      backupRoutes.push(card);
    } else {
      notRecommendedRoutes.push(card);
    }
  }

  rankedProducts
    .filter((product) => product.id !== primaryProduct.id && !seen.has(product.id))
    .slice(0, 2)
    .forEach((product, index) => {
      const card = routeCardFromProduct(index === 0 ? "backup" : "not_recommended", product, profile);
      if (index === 0) {
        backupRoutes.push(card);
      } else {
        notRecommendedRoutes.push(card);
      }
    });

  if (
    profile.destination === "canada" &&
    profile.fundingPosition === "needs_study_loan" &&
    canadaLoanAgeFits(profile) &&
    canadaLoanAcademicFits(profile) &&
    primaryProduct.id !== "PRODUCT-CANADA-DIPLOMA-LOAN-001"
  ) {
    const canadaLoanProduct = findProductById("PRODUCT-CANADA-DIPLOMA-LOAN-001");
    if (
      canadaLoanProduct &&
      !supportingRoutes.some((route) => route.title === productTitle(canadaLoanProduct, profile))
    ) {
      supportingRoutes.unshift(routeCardFromProduct("supporting", canadaLoanProduct, profile));
    }
  }

  const supportingTitles = new Set(supportingRoutes.map((route) => route.title));

  return {
    supportingRoutes: supportingRoutes.slice(0, 2),
    backupRoutes: backupRoutes.filter((route) => !supportingTitles.has(route.title)).slice(0, 2),
    notRecommendedRoutes: notRecommendedRoutes
      .filter((route) => !supportingTitles.has(route.title))
      .slice(0, 2),
  };
}

function readinessSummaryForPublic(
  profile: NormalizedAssessmentProfile,
  primaryProduct: ActiveProduct,
) {
  if (profile.passportStatus === "no_passport") {
    return "This report shows a workable pathway to review, but execution should pause until your passport is ready.";
  }

  if (profile.hasPreviousRefusal === true) {
    return "This report points to a workable pathway to review, but the previous refusal should be addressed before any fresh application step.";
  }

  if (primaryProduct.productType === "loan_supported_route") {
    return "This report highlights a funding-linked pathway worth reviewing first, but the age, academic, and document checks still need to hold up.";
  }

  if (profile.fundingPosition === "needs_scholarship") {
    return "This report highlights the strongest route to review first, but scholarship thinking should stay competitive and backed by a realistic funding plan.";
  }

  return "This report highlights the strongest pathway to review first from your answers, but programme, funding, and document checks still matter before you act.";
}

function heroOpening(
  profile: NormalizedAssessmentProfile,
  primaryProduct: ActiveProduct,
) {
  const firstLine = `Based on your answers, your strongest pathway to review first is ${productTitle(primaryProduct, profile)}.`;

  if (profile.passportStatus === "no_passport") {
    return `${firstLine} Your passport is not ready yet, so passport readiness should come before applications, visa steps, or travel spending.`;
  }

  if (profile.passportRenewalInProgress || profile.passportStatus === "expired_passport") {
    return `${firstLine} Your passport status still needs attention, so renewal timing should be settled before applications move forward.`;
  }

  if (profile.hasPreviousRefusal === true) {
    return `${firstLine} Your previous refusal needs review before any new application plan should be treated as active.`;
  }

  if (profile.fundingPosition === "needs_study_loan" && primaryProduct.productType !== "loan_supported_route") {
    return `${firstLine} You asked for loan support, but this report is keeping the main recommendation separate from funding approval until the route review is complete.`;
  }

  if (!ACTIVE_DESTINATIONS.has(profile.destination)) {
    return `${firstLine} This is the closest pathway to review while your preferred destination stays outside the destinations we can recommend confidently today.`;
  }

  if (profile.fundingPosition === "needs_scholarship") {
    return `${firstLine} Scholarship review can still be explored where it fits, but this report is keeping the main recommendation grounded in the live route that matches your answers best.`;
  }

  if (profile.fundingPosition === "self_funded") {
    return `${firstLine} Because you selected self-funding, the next review can stay focused on academic fit, destination fit, and application order.`;
  }

  if (profile.destination === "canada" && profile.qualification === "third_class") {
    return `${firstLine} Your third-class result does not automatically remove Canada, but the route should stay careful, practical, and review-led.`;
  }

  return `${firstLine} This recommendation is based on your destination choice, education level, funding preference, and the live study routes currently available.`;
}

function whyThisWasRecommended(
  answers: AssessmentAnswers,
  profile: NormalizedAssessmentProfile,
  primaryProduct: ActiveProduct,
): PublicPathwayReport["whyThisFits"] {
  const reasons: PublicPathwayReport["whyThisFits"] = [];

  if (answers.destinationInterest) {
    reasons.push({
      title: "Main reason",
      body: `You selected ${destinationOptionLabel(answers) ?? destinationLabel(profile.destination)} as your preferred study destination.`,
    });
  }

  if (primaryProduct.id === "PRODUCT-CANADA-GRAD-CERT-001") {
    reasons.push({
      title: "Education match",
      body:
        profile.qualification === "third_class" || profile.qualification === "second_class_lower"
          ? "Your education level points toward a graduate certificate review rather than a direct Masters-first assumption."
          : "Your education background can still be reviewed through a practical Canada graduate certificate pathway.",
    });
  } else if (primaryProduct.id === "PRODUCT-CANADA-DIPLOMA-LOAN-001") {
    reasons.push({
      title: "Age and funding signal",
      body: canadaLoanAgeFits(profile)
        ? "You asked for loan support, and your age range sits inside the current Canada loan-supported route window."
        : "You asked for loan support, but this route should only stay active if the age window still fits.",
    });
  } else if (primaryProduct.country === "france") {
    reasons.push({
      title: "Academic fit",
      body:
        primaryProduct.id === "PRODUCT-FRANCE-FLEXIBLE-BUSINESS-TECH-001"
          ? "Your education profile points toward the more flexible France route rather than the stricter business-only option."
          : "Your academic profile is strong enough to review the more selective France business pathway first.",
    });
  } else if (primaryProduct.country === "uk") {
    reasons.push({
      title: "Academic fit",
      body:
        primaryProduct.productType === "scholarship_route"
          ? "Your academic result is strong enough for a competitive UK scholarship review, but scholarships remain competitive and not guaranteed."
          : "Your education level points more naturally toward a research-led UK review than a generic course-first assumption.",
    });
  }

  if (profile.fundingPosition === "needs_scholarship") {
    reasons.push({
      title: "Funding signal",
      body: "You selected scholarship support, so scholarship review and backup funding both need to stay part of the next step.",
    });
  } else if (profile.fundingPosition === "needs_study_loan") {
    reasons.push({
      title: "Funding signal",
      body: "You selected loan support, so funding review is part of the next step, but this report is not treating support as approved.",
    });
  } else if (profile.fundingPosition === "self_funded" || profile.fundingPosition === "payment_plan") {
    reasons.push({
      title: "Funding signal",
      body: "You did not ask for scholarship-first planning, so the route can stay focused on destination fit, academic fit, and application order.",
    });
  }

  if (!profile.targetField) {
    reasons.push({
      title: "Programme direction",
      body: "Your exact course field is still unclear from this assessment, so the final programme match should be confirmed during review.",
    });
  }

  return reasons.slice(0, 4);
}

function fundingChecksForReport(
  profile: NormalizedAssessmentProfile,
  primaryProduct: ActiveProduct,
  supportingRoutes: PublicRouteCard[],
): PublicFundingCheckItem[] {
  const scholarshipRequested = profile.fundingPosition === "needs_scholarship";
  const loanRequested = profile.fundingPosition === "needs_study_loan";
  const hasLoanRoute =
    primaryProduct.productType === "loan_supported_route" ||
    supportingRoutes.some((route) => /loan-supported/i.test(route.routeTypeLabel));

  const scholarshipCheck: PublicFundingCheckItem = scholarshipRequested
    ? strongAcademicProfile(profile) && scholarshipDestinationActive(profile.destination)
      ? {
          title: "Scholarship review",
          statusLabel: "Potential fit for review",
          body: "Your academic profile may meet the first screening condition for scholarship review, but scholarships are competitive and not guaranteed.",
          nextAction: "Review scholarship deadlines and keep backup funding in place.",
        }
      : {
          title: "Scholarship review",
          statusLabel: "Not the strongest fit from your answers",
          body: "Your current answers do not support treating scholarship as the main plan, either because the academic profile is not strong enough yet or the live destination coverage does not support it.",
          nextAction: "Compare a support route or self-funded backup before relying on scholarship-first planning.",
        }
    : {
        title: "Scholarship review",
        statusLabel: "Not requested",
        body: "Scholarship-first planning was not selected in this assessment.",
        nextAction: "Keep scholarship review optional unless funding strategy changes.",
      };

  const loanCheck: PublicFundingCheckItem = loanRequested
    ? profile.destination === "canada" && !canadaLoanAgeFits(profile)
      ? {
          title: "Loan-supported route",
          statusLabel: "Age window may not fit",
          body: "Your current age range may not fit the live Canada loan-supported route window, so this should not be treated as the main plan.",
          nextAction: "Review a graduate certificate or another funding route instead.",
        }
      : profile.destination === "canada" && !canadaLoanAcademicFits(profile)
        ? {
            title: "Loan-supported route",
            statusLabel: "Education level may not fit",
            body: "Your current education level does not clearly match the live Canada loan-supported route requirements.",
            nextAction: "Review another funding plan or a non-loan route first.",
          }
        : hasLoanRoute
          ? {
              title: "Loan-supported route",
              statusLabel: "Potential fit for review",
              body:
                primaryProduct.country === "canada"
                  ? "Your answers keep a loan-supported route worth reviewing, but age, academic fit, documents, and final funding checks still need review."
                  : "Your answers keep a support route worth reviewing, but documents and affordability checks still need review.",
              nextAction: "Check the funding conditions before applications.",
            }
          : {
              title: "Loan-supported route",
              statusLabel: "Needs review before you rely on it",
              body: "You asked for loan support, but the strongest route from your answers is not currently a loan-supported route.",
              nextAction: "Review funding options without treating loan support as approved.",
            }
    : {
        title: "Loan-supported route",
        statusLabel: "Not requested",
        body: "Loan support was not selected in this assessment.",
        nextAction: "Keep this as a secondary option unless funding needs change.",
      };

  const fundingPlanCheck: PublicFundingCheckItem =
    profile.fundingPosition === "unknown"
      ? {
          title: "Funding plan",
          statusLabel: "Funding plan still unclear",
          body: "This assessment does not yet show a clear self-funded, sponsor-backed, or structured payment plan.",
          nextAction: "Clarify how you plan to cover tuition, living costs, and application stages.",
        }
      : profile.fundingPosition === "application_costs_only"
        ? {
            title: "Funding plan",
            statusLabel: "Needs review before you move forward",
            body: "You said you can cover application and document costs, but the wider tuition and settlement plan still needs review.",
            nextAction: "Compare a full funding plan before applications move forward.",
          }
        : profile.fundingPosition === "payment_plan"
          ? {
              title: "Funding plan",
              statusLabel: "Potential fit for review",
              body: "A tuition payment plan may help, but it should be reviewed as payment sequencing rather than loan approval.",
              nextAction: "Check the actual tuition payment structure before relying on it.",
            }
          : {
              title: "Funding plan",
              statusLabel: "Potential fit for review",
              body:
                profile.fundingPosition === "self_funded"
                  ? "Your answers support self-funded planning, so the next check is whether the route stays practical for tuition, living costs, timing, and funding evidence review."
                  : "Your answers suggest a clearer funding path than scholarship-first planning, but final funding evidence still needs review.",
              nextAction: "Prepare funding or sponsor evidence for review.",
            };

  return [scholarshipCheck, loanCheck, fundingPlanCheck];
}

function practicalBlockersForReport(
  profile: NormalizedAssessmentProfile,
  primaryProduct: ActiveProduct,
): PublicBlocker[] {
  const blockers: PublicBlocker[] = [];

  if (profile.passportStatus === "no_passport") {
    blockers.push({
      category: "passport",
      title: "Passport not ready",
      body: "Apply for or renew your passport before any application, visa, or travel-payment step.",
      priority: "critical",
    });
  }

  if (profile.hasPreviousRefusal === true) {
    blockers.push({
      category: "previous_refusal",
      title: "Previous refusal needs review",
      body: "Review the previous refusal reason before starting a new application plan.",
      priority: "high",
    });
  }

  if (profile.fundingPosition === "needs_study_loan" && profile.destination === "canada" && !canadaLoanAgeFits(profile)) {
    blockers.push({
      category: "age",
      title: "Current age range may not fit the Canada loan-supported route",
      body: "Do not treat the Canada loan-supported route as your main plan until the age window is confirmed.",
      priority: "high",
    });
  }

  if (profile.fundingPosition === "needs_study_loan" && profile.destination === "canada" && !canadaLoanAcademicFits(profile)) {
    blockers.push({
      category: "academic",
      title: "Current education level may not fit the Canada loan-supported route",
      body: "Review a different funding route if your academic background does not match the current Canada loan-supported path.",
      priority: "high",
    });
  }

  if (!profile.targetField) {
    blockers.push({
      category: "route_condition",
      title: "Course direction still needs review",
      body: "Your exact course field is still unclear from this assessment, so the final programme match still needs review.",
      priority: "medium",
    });
  }

  if (requiresEnglishEvidence(primaryProduct) && profile.englishTestStatus === "needs_test") {
    blockers.push({
      category: "english",
      title: "English test or waiver may need review",
      body: "Confirm whether this route needs a valid test result or whether a waiver can be reviewed.",
      priority: "medium",
    });
  }

  if (profile.timelineUrgency === "urgent") {
    blockers.push({
      category: "timeline",
      title: "Timeline is tight",
      body: "Move carefully so urgency does not force a weak programme, funding, or document choice.",
      priority: "medium",
    });
  }

  if (profile.fundingPosition === "unknown" || profile.fundingPosition === "application_costs_only") {
    blockers.push({
      category: "funding",
      title: "Funding route needs review",
      body: "The wider tuition and settlement plan is not clear enough yet to treat this as execution-ready.",
      priority: "medium",
    });
  }

  return blockers.slice(0, 4);
}

function smartNextStepsForReport(
  profile: NormalizedAssessmentProfile,
  primaryProduct: ActiveProduct,
): PublicNextStep[] {
  if (profile.passportStatus === "no_passport") {
    return [
      {
        title: "Apply for or renew your passport first",
        body: "Keep the route in view, but pause applications, visa steps, and travel spending until your passport is ready.",
      },
      {
        title: "Prepare your academic documents for review",
        body: "Have your transcript, certificate, and CV ready so the route can move quickly once passport readiness is solved.",
      },
      {
        title: "Confirm programme direction after passport readiness",
        body: "Use review to confirm the final course direction before applications begin.",
      },
    ];
  }

  if (profile.passportRenewalInProgress || profile.passportStatus === "expired_passport") {
    return [
      {
        title: "Settle your passport status first",
        body: "Finish the renewal or confirm passport validity before you move into applications or visa preparation.",
      },
      {
        title: "Prepare your academic documents for review",
        body: "Have your transcript, certificate, and CV ready while the passport issue is being cleared.",
      },
      {
        title: "Confirm programme direction after passport readiness",
        body: "Use review to confirm the final pathway once the passport timing is clear.",
      },
    ];
  }

  if (profile.hasPreviousRefusal === true) {
    return [
      {
        title: "Review the previous refusal reason before a new application",
        body: "Do not rush a new application until the earlier refusal issue has been understood and addressed.",
      },
      {
        title: "Prepare the documents tied to that refusal",
        body: "Keep the refusal record and any supporting explanation ready for review.",
      },
      {
        title: "Confirm the safest route before reapplying",
        body: "Use review to decide whether the current pathway still makes sense after the refusal is considered.",
      },
    ];
  }

  if (profile.fundingPosition === "needs_scholarship") {
    return strongAcademicProfile(profile) && scholarshipDestinationActive(profile.destination)
      ? [
          {
            title: "Review scholarship deadlines and backup funding",
            body: "Treat scholarship as competitive and keep a self-funded or support-backed backup ready.",
          },
          {
            title: "Prepare your strongest academic documents",
            body: "Have your transcript, certificate, CV, and statement materials ready for review.",
          },
          {
            title: "Confirm the final programme match",
            body: "Use review to align the course choice with scholarship timing and route fit.",
          },
        ]
      : [
          {
            title: "Do not rely on scholarship-first planning",
            body: "Your current answers do not make scholarship the safest first plan, so compare support or self-funded options now.",
          },
          {
            title: "Review the strongest non-scholarship route",
            body: "Keep the route grounded in destination fit, education fit, and realistic funding timing.",
          },
          {
            title: "Prepare backup funding evidence",
            body: "Bring sponsor or self-funding evidence into review before applications begin.",
          },
        ];
  }

  if (profile.fundingPosition === "needs_study_loan") {
    return primaryProduct.productType === "loan_supported_route" ||
      (profile.destination === "canada" && canadaLoanAgeFits(profile) && canadaLoanAcademicFits(profile))
      ? [
          {
            title: "Check loan-supported route conditions before applications",
            body: "Use review to confirm the age, academic, and document conditions before treating support as realistic.",
          },
          {
            title: "Prepare your academic documents and passport",
            body: "Have your transcript, certificate, CV, and passport ready for route review.",
          },
          {
            title: "Keep a non-loan backup plan visible",
            body: "Do not rely on funding approval alone; compare the route against a backup option too.",
          },
        ]
      : [
          {
            title: "Do not treat loan support as the main plan",
            body: "Your current answers do not make the loan-supported route the safest first move, so review alternative funding routes now.",
          },
          {
            title: "Confirm the main study route separately from funding",
            body: "Check whether the pathway itself stays strong before layering funding decisions on top.",
          },
          {
            title: "Prepare funding or sponsor evidence for review",
            body: "Bring in the documents needed to compare realistic funding options.",
          },
        ];
  }

  if (!profile.targetField) {
    return [
      {
        title: "Confirm programme direction before applications",
        body: "Your exact course field is still unclear from this assessment, so the first step is to match your background to the right programme direction.",
      },
      {
        title: "Prepare your academic documents for review",
        body: "Have your transcript, certificate, and CV ready for route review.",
      },
      {
        title: "Check the funding plan beside the route",
        body: "Make sure the route and the money plan still fit each other before applications begin.",
      },
    ];
  }

  return [
    {
      title: "Review the strongest pathway first",
      body: "Confirm the final programme match, funding plan, and timing before applications begin.",
    },
    {
      title: "Prepare your core documents for review",
      body: "Have your transcript, certificate, CV, passport, and funding evidence ready.",
    },
    {
      title: "Check application order before spending",
      body: "Use review to decide the safest sequence for course choice, applications, funding, and visa preparation.",
    },
  ];
}

function publicDocumentItemsForReport(
  profile: NormalizedAssessmentProfile,
  primaryProduct: ActiveProduct,
  fundingChecks: PublicFundingCheckItem[],
): PublicDocumentItem[] {
  const documents: PublicDocumentItem[] = [
    {
      title: "International passport",
      status:
        profile.passportStatus === "valid_passport"
          ? "confirmed"
          : profile.passportStatus === "no_passport"
            ? "missing"
            : "needs_confirmation",
      body:
        profile.passportStatus === "valid_passport"
          ? "Based on your answer, your passport is reported ready."
          : profile.passportStatus === "no_passport"
            ? "Your passport was not provided in this assessment. Prepare it before review."
            : "Based on your answer, passport renewal or confirmation still needs to be completed before review.",
    },
    {
      title: "Transcript and certificate",
      status: "needs_confirmation",
      body: "Prepare your transcript and certificate for review.",
    },
    {
      title: "CV",
      status: "needs_confirmation",
      body: "Prepare your CV for review so the route can be matched to your background properly.",
    },
    {
      title: "Funding or sponsor evidence",
      status:
        fundingChecks.some((item) => /unclear|needs advisor review|not the strongest/i.test(item.statusLabel))
          ? "missing"
          : "needs_confirmation",
      body: "Prepare funding or sponsor evidence if you want this route reviewed seriously.",
    },
  ];

  if (requiresEnglishEvidence(primaryProduct)) {
    documents.push({
      title: "English test or waiver evidence",
      status:
        profile.englishTestStatus === "has_test" || profile.englishTestStatus === "waiver_possible"
          ? "confirmed"
          : "needs_confirmation",
      body:
        profile.englishTestStatus === "has_test"
          ? "Based on your answer, an English test result is reported ready."
          : "Prepare your English test or waiver evidence for review.",
    });
  }

  if (profile.hasPreviousRefusal === true) {
    documents.push({
      title: "Previous refusal record",
      status: "needs_confirmation",
      body: "Prepare the previous refusal record and the explanation documents for review.",
    });
  }

  return documents.slice(0, 5);
}

function cleanReadinessLabel(metadata: GeneratedReportMetadata) {
  return metadata.readinessLevel;
}

function publicRoadmapForReport(primaryProduct: ActiveProduct): PublicRoadmapItem[] {
  return [
    {
      title: "Route review",
      body: "Confirm the programme match, route conditions, and final pathway choice before applications begin.",
    },
    {
      title: "Document preparation",
      body: "Prepare the documents that will be used during review instead of assuming they have already been checked.",
    },
    {
      title: "Funding and timing check",
      body: "Check how the funding plan, application order, and timing work together before you spend money.",
    },
    {
      title: "Application decision",
      body:
        primaryProduct.productType === "scholarship_route"
          ? "Move forward only after scholarship reality and backup funding have both been reviewed."
          : "Move forward only after the route, documents, and funding plan stay aligned.",
    },
  ];
}

function buildAdvisorReport(
  opening: string,
  internalGuidance: InternalStudyGuidance | null,
  routeScores: RouteScore[],
): AdvisorPathwayReport | undefined {
  if (!internalGuidance && !routeScores.length) {
    return undefined;
  }

  return {
    applicantSummary: opening,
    advisorNotes: internalGuidance?.advisorNotes ?? [],
    internalProviderNotes: [],
    internalFinancialDetails: [],
    routeScores,
    riskFlags: internalGuidance?.disclosureWarnings ?? [],
    consultationScript: internalGuidance?.missingFields ?? [],
  };
}

export function buildPublicStudyReportPayload(args: {
  answers: AssessmentAnswers | Record<string, unknown>;
  guidance?: GuidanceInput | null;
  generatedReport?: Partial<GeneratedReport> | null;
}): ReportPayload {
  const profile = normalizeAssessmentAnswers(args.answers);
  const metadata = resolveMetadata(
    args.generatedReport
      ? {
          reportId: args.generatedReport.reportId,
          createdAt: args.generatedReport.createdAt,
          reportVersion: args.generatedReport.reportVersion,
          readinessLevel: args.generatedReport.readinessLevel,
          readinessSummary: args.generatedReport.readinessSummary,
        }
      : undefined,
  );
  const { publicGuidance, internalGuidance } = resolveGuidance(args);
  const rankedProducts = rankedProductsFromKnowledge(profile, publicGuidance, internalGuidance);
  const primaryProduct =
    guidancePrimaryProduct(publicGuidance, profile) ?? choosePrimaryProduct(profile, rankedProducts);

  if (!primaryProduct) {
    throw new Error("No active study route could be resolved for the public report.");
  }

  const routeScores = buildRouteScores(rankedProducts, profile);
  const backupProducts = rankedProducts
    .filter((product) => product.id !== primaryProduct.id)
    .slice(0, 2);
  const decisionSignals = buildDecisionSignals(profile, primaryProduct, backupProducts);
  const { supportingRoutes, backupRoutes, notRecommendedRoutes } = routeCardsFromGuidance(
    publicGuidance,
    rankedProducts,
    profile,
    primaryProduct,
  );
  const blockers = practicalBlockersForReport(profile, primaryProduct);
  const smartNextSteps = smartNextStepsForReport(profile, primaryProduct);
  const fundingChecks = fundingChecksForReport(profile, primaryProduct, supportingRoutes);
  const documentsToPrepare = publicDocumentItemsForReport(profile, primaryProduct, fundingChecks);
  const opening = heroOpening(profile, primaryProduct);
  const publicReport: PublicPathwayReport = {
    reportType: "public_pathway_report",
    metadata: {
      reportId: metadata.reportId,
      createdAt: metadata.createdAt,
      reportVersion: metadata.reportVersion,
      readinessLevel: metadata.readinessLevel,
      readinessSummary: sanitizePublicText(readinessSummaryForPublic(profile, primaryProduct)),
      accuracyNotice: REPORT_ACCURACY_WARNING,
    },
    hero: {
      title: profile.name ? `${profile.name}, your study pathway report.` : "Your Study Pathway Report",
      opening: withPeriod(opening),
      destinationLabel: activeDestinationLabel(profile.destination),
      readinessLabel: cleanReadinessLabel(metadata),
    },
    snapshot: {
      title: "Your submitted profile",
      items: submittedProfileItems(args.answers as AssessmentAnswers, profile, primaryProduct),
    },
    primaryRoute: routeCardFromProduct("primary", primaryProduct, profile),
    supportingRoutes,
    backupRoutes,
    notRecommendedRoutes,
    whyThisFits: whyThisWasRecommended(args.answers as AssessmentAnswers, profile, primaryProduct),
    fundingChecks,
    blockers,
    smartNextSteps,
    documentsToPrepare,
    roadmap: {
      title: "Review roadmap",
      items: publicRoadmapForReport(primaryProduct),
    },
    consultationFocus: buildConsultationFocus(profile, primaryProduct).map(withPeriod),
    questionsToClarify: buildQuestionsToClarify(profile, publicGuidance),
    cta: buildCta(profile, primaryProduct),
    disclaimer: sanitizePublicText(REPORT_DISCLAIMER),
  };

  const sanitizedPublicReport = sanitizePublicReport(publicReport);
  validatePublicReport(sanitizedPublicReport);

  return {
    publicReport: sanitizedPublicReport,
    advisorReport: buildAdvisorReport(opening, internalGuidance, routeScores),
    internalDecision: {
      normalizedProfile: profile as unknown as Record<string, unknown>,
      routeScores,
      primaryRouteId: primaryProduct.id,
      supportingRouteIds: [],
      backupRouteIds: backupProducts.map((product) => product.id),
      notRecommendedRouteIds: notRecommendedRoutes.map((route) => route.title),
      blockedRouteIds: blockers.filter((blocker) => blocker.priority === "critical").map((blocker) => blocker.title),
      decisionSignals: decisionSignals.accepted,
      rejectedSignals: decisionSignals.rejected,
    },
  };
}

export function buildPublicStudyReport(args: {
  answers: AssessmentAnswers | Record<string, unknown>;
  guidance?: GuidanceInput | null;
  generatedReport?: Partial<GeneratedReport> | null;
}): PublicPathwayReport {
  return buildPublicStudyReportPayload(args).publicReport;
}
