import { NextResponse } from "next/server";
import { notifyCrmEvent } from "@/lib/crm/notifications";
import { leadEventTypes } from "@/lib/crm/lead-events";
import { leadStore } from "@/lib/storage";
import { z } from "zod";

const websiteLeadSchema = z
  .object({
    firstName: z.string().trim().optional(),
    first_name: z.string().trim().optional(),
    lastName: z.string().trim().optional(),
    last_name: z.string().trim().optional(),
    fullName: z.string().trim().optional(),
    full_name: z.string().trim().optional(),
    name: z.string().trim().optional(),
    email: z.string().trim().email().optional().or(z.literal("")),
    phone: z.string().trim().optional(),
    whatsapp: z.string().trim().optional(),
    whatsappNumber: z.string().trim().optional(),
    utmSource: z.string().trim().optional(),
    utm_source: z.string().trim().optional(),
    utmMedium: z.string().trim().optional(),
    utm_medium: z.string().trim().optional(),
    utmCampaign: z.string().trim().optional(),
    utm_campaign: z.string().trim().optional(),
    utmContent: z.string().trim().optional(),
    utm_content: z.string().trim().optional(),
    utmTerm: z.string().trim().optional(),
    utm_term: z.string().trim().optional(),
    landingPage: z.string().trim().optional(),
    landing_page: z.string().trim().optional(),
    referrer: z.string().trim().optional(),
    routeId: z.string().trim().optional(),
    route_id: z.string().trim().optional(),
    routeLabel: z.string().trim().optional(),
    route_label: z.string().trim().optional(),
    nigeriaState: z.string().trim().optional(),
    nigeria_state: z.string().trim().optional(),
    state: z.string().trim().optional(),
    answers: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough()
  .superRefine((value, ctx) => {
    const email = typeof value.email === "string" ? value.email.trim() : "";
    const phoneCandidates = [
      value.phone,
      value.whatsapp,
      value.whatsappNumber,
    ].filter((candidate) => typeof candidate === "string" && candidate.trim().length > 0);

    if (!email && phoneCandidates.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either an email address or phone number is required.",
      });
    }
  });

function splitName(rawName?: string) {
  if (!rawName) {
    return {
      firstName: "",
      lastName: "",
    };
  }

  const parts = rawName.trim().split(/\s+/);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

function getTrimmedString(
  record: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
}

export async function POST(request: Request) {
  const secret = process.env.CRM_INTAKE_SECRET;
  const headerSecret = request.headers.get("x-crm-intake-secret");

  if (!secret || headerSecret !== secret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const parsed = websiteLeadSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid website lead payload." }, { status: 400 });
  }

  const data = parsed.data;
  const payloadRecord = data as Record<string, unknown>;
  const answerRecord =
    data.answers && typeof data.answers === "object"
      ? (data.answers as Record<string, unknown>)
      : {};
  const fallbackName =
    data.fullName || data.full_name || data.name || undefined;
  const split = splitName(fallbackName);
  const firstName = data.firstName || data.first_name || split.firstName;
  const lastName = data.lastName || data.last_name || split.lastName;
  const email = typeof data.email === "string" ? data.email.trim() : "";
  const whatsappNumber = [
    data.whatsappNumber,
    data.whatsapp,
    data.phone,
  ].find((value) => typeof value === "string" && value.trim().length > 0) as string | undefined;
  const routeId = getTrimmedString(payloadRecord, ["routeId", "route_id"]);
  const routeLabel = getTrimmedString(payloadRecord, ["routeLabel", "route_label"]);
  const formType = getTrimmedString(payloadRecord, ["formType", "form_type"]);
  const isUkStudySupportRoute = routeId === "uk-mres" || routeId === "uk-master";
  const landingPage = getTrimmedString(payloadRecord, [
    "landingPage",
    "landing_page",
    "sourcePage",
    "source_page",
    "referrer",
  ]);
  const nigeriaState =
    getTrimmedString(answerRecord, ["nigeriaState", "nigeria_state", "state", "stateOfResidence"]) ||
    getTrimmedString(payloadRecord, ["nigeriaState", "nigeria_state", "state"]);
  const targetIntake =
    getTrimmedString(answerRecord, ["targetIntake", "selectedTimeline"]) ||
    getTrimmedString(payloadRecord, ["selectedTimeline", "selected_timeline"]);
  const passportStatus = getTrimmedString(answerRecord, ["passportStatus"]);
  const highestQualification = getTrimmedString(answerRecord, ["highestQualification"]);
  const degreeClass = getTrimmedString(answerRecord, ["degreeClass"]);
  const graduationYear = getTrimmedString(answerRecord, ["graduationYear"]);
  const studiedCourse = getTrimmedString(answerRecord, ["studiedCourse"]);
  const desiredCourse = getTrimmedString(answerRecord, ["desiredCourse"]);
  const fundingReadiness = getTrimmedString(answerRecord, [
    "assessmentReadiness",
    "studyFundingReadiness",
    "fundingReadiness",
  ]);
  const contactTimeline = getTrimmedString(answerRecord, ["contactTimeline"]);
  const consent = getTrimmedString(answerRecord, ["consent"]);
  const routeSummary =
    routeLabel ||
    (routeId === "uk-mres"
      ? "UK Master in Research Tuition Support"
      : routeId === "uk-master"
        ? "UK Master's Full Tuition Support (Loan)"
        : undefined) ||
    formType ||
    routeId;
  const payloadCapture = await leadStore.saveSourcePayload({
    source: "website_form",
    externalId: routeId || email || whatsappNumber || null,
    payload: payloadRecord,
  });

  try {
    await leadStore.markPayloadProcessing(payloadCapture.id);

    const result = await leadStore.upsertExternalLead({
      source: "website_form",
      sourceDetail: routeId || formType || routeLabel || "website_form",
      firstName,
      lastName,
      email,
      whatsappNumber,
      state: nigeriaState ?? null,
      primaryGoal: isUkStudySupportRoute ? "study_abroad" : null,
      utmSource: data.utmSource || data.utm_source || null,
      utmMedium: data.utmMedium || data.utm_medium || null,
      utmCampaign: data.utmCampaign || data.utm_campaign || null,
      utmContent: data.utmContent || data.utm_content || null,
      utmTerm: data.utmTerm || data.utm_term || null,
      landingPage: landingPage || null,
      topPathwayTitle: routeSummary || null,
      sourcePayload: payloadRecord,
      answers: {
        firstName,
        lastName,
        email,
        whatsappNumber: whatsappNumber ?? "",
        primaryGoal: isUkStudySupportRoute ? "study_abroad" : null,
        stateOfResidence: nigeriaState ?? null,
        nigeriaState: nigeriaState ?? null,
        destinationInterest: isUkStudySupportRoute ? "uk" : null,
        timeline: targetIntake ?? null,
        targetIntake: targetIntake ?? null,
        passportStatus: passportStatus ?? null,
        highestQualification: highestQualification ?? null,
        highestEducation: highestQualification ?? null,
        degreeClass: degreeClass ?? null,
        graduationYear: graduationYear ?? null,
        studiedCourse: studiedCourse ?? null,
        desiredCourse: desiredCourse ?? null,
        targetField: desiredCourse ?? null,
        studyFundingReadiness: fundingReadiness ?? null,
        fundingReadiness: fundingReadiness ?? null,
        assessmentReadiness: fundingReadiness ?? null,
        contactTimeline: contactTimeline ?? null,
        consent: consent ?? null,
      },
    });

    await leadStore.addLeadEvent({
      leadId: result.lead.id,
      eventType: leadEventTypes.websiteLeadReceived,
      eventData: {
        routeId: routeId ?? null,
        routeLabel: routeLabel ?? null,
        formType: formType ?? null,
      },
    });
    await leadStore.markPayloadProcessed(payloadCapture.id);
    await notifyCrmEvent("website_lead_received", {
      leadId: result.lead.id,
      source: "website_form",
      created: result.created,
    });

    return NextResponse.json({ ok: true, leadId: result.lead.id });
  } catch (error) {
    await leadStore.markPayloadFailed(
      payloadCapture.id,
      error instanceof Error ? error.message : "Website lead intake failed.",
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Website lead intake failed.",
      },
      { status: 500 },
    );
  }
}
