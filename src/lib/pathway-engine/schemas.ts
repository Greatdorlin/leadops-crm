import { z } from "zod";
import {
  ASSESSMENT_STEP_KEYS,
  CRM_STATUSES,
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  PRIMARY_GOALS,
} from "./types";

const optionalString = z.string().trim().min(1).nullable();
const draftOptionalString = z.string().trim().max(200).nullable();
const optionalEmail = z
  .string()
  .trim()
  .max(120)
  .refine((value) => value.length === 0 || z.email().safeParse(value).success, {
    message: "Please enter a valid email address.",
  });

export const assessmentDraftAnswersSchema = z.object({
  firstName: z.string().trim().max(80),
  lastName: z.string().trim().max(80),
  whatsappNumber: z.string().trim().max(30),
  email: optionalEmail,
  primaryGoal: z.enum(PRIMARY_GOALS).nullable(),
  countryClarity: draftOptionalString,
  destinationInterest: draftOptionalString,
  studyLevel: draftOptionalString,
  ageRange: draftOptionalString,
  highestEducation: draftOptionalString,
  studyFundingReadiness: draftOptionalString,
  workField: draftOptionalString,
  workExperienceYears: draftOptionalString,
  languageTestStatus: draftOptionalString,
  businessMoveType: draftOptionalString,
  businessStage: draftOptionalString,
  visitTravelType: draftOptionalString,
  visitTravelWindow: draftOptionalString,
  eventType: draftOptionalString,
  eventPurpose: draftOptionalString,
  familyComposition: draftOptionalString,
  familyOpenPathway: draftOptionalString,
  unsurePriority: draftOptionalString,
  openCountries: draftOptionalString,
  stateOfResidence: draftOptionalString,
  nigeriaState: draftOptionalString,
  passportStatus: draftOptionalString,
  passportValidity: draftOptionalString,
  timeline: draftOptionalString,
  fundingReadiness: draftOptionalString,
  previousRefusal: draftOptionalString,
  highestQualification: draftOptionalString,
  degreeClass: draftOptionalString,
  graduationYear: draftOptionalString,
  studiedCourse: draftOptionalString,
  desiredCourse: draftOptionalString,
  targetField: draftOptionalString,
  targetIntake: draftOptionalString,
  assessmentReadiness: draftOptionalString,
  contactTimeline: draftOptionalString,
  consent: draftOptionalString,
  sendReportConsent: z.boolean(),
  wantsHumanSupport: z.boolean(),
  marketingConsent: z.boolean(),
});

export const assessmentSubmissionSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  whatsappNumber: z.string().trim().min(7).max(30),
  email: z.email().max(120),
  primaryGoal: z.enum(PRIMARY_GOALS),
  countryClarity: optionalString,
  destinationInterest: optionalString,
  studyLevel: optionalString,
  ageRange: optionalString,
  highestEducation: optionalString,
  studyFundingReadiness: optionalString,
  workField: optionalString,
  workExperienceYears: optionalString,
  languageTestStatus: optionalString,
  businessMoveType: optionalString,
  businessStage: optionalString,
  visitTravelType: optionalString,
  visitTravelWindow: optionalString,
  eventType: optionalString,
  eventPurpose: optionalString,
  familyComposition: optionalString,
  familyOpenPathway: optionalString,
  unsurePriority: optionalString,
  openCountries: optionalString,
  stateOfResidence: optionalString,
  nigeriaState: optionalString,
  passportStatus: optionalString,
  passportValidity: optionalString,
  timeline: optionalString,
  fundingReadiness: optionalString,
  previousRefusal: optionalString,
  highestQualification: optionalString,
  degreeClass: optionalString,
  graduationYear: optionalString,
  studiedCourse: optionalString,
  desiredCourse: optionalString,
  targetField: optionalString,
  targetIntake: optionalString,
  assessmentReadiness: optionalString,
  contactTimeline: optionalString,
  consent: optionalString,
  sendReportConsent: z.literal(true),
  wantsHumanSupport: z.boolean(),
  marketingConsent: z.boolean(),
});

export const assessmentDraftSchema = z.object({
  leadId: z.string().uuid().nullable().optional(),
  currentStepKey: z.enum(ASSESSMENT_STEP_KEYS),
  currentStepIndex: z.number().int().min(0),
  progressPercent: z.number().int().min(0).max(100),
  answers: assessmentDraftAnswersSchema,
});

export const analyticsSchema = z.object({
  token: z.string().trim().min(8),
  event: z.enum(["report_viewed", "whatsapp_clicked", "consultation_clicked"]),
});

export const adminLeadStatusSchema = z.object({
  crmStatus: z.enum(CRM_STATUSES),
});

export const adminLeadUpdateSchema = z.object({
  crmStatus: z.enum(CRM_STATUSES).optional(),
  priority: z.enum(LEAD_PRIORITIES).optional(),
  assignedTo: z.string().trim().email().nullable().optional(),
  assignedToList: z.array(z.string().trim().email()).max(10).optional(),
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().max(80).nullable().optional(),
  email: z.string().trim().email().max(120).nullable().optional(),
  whatsappNumber: z.string().trim().min(7).max(30).nullable().optional(),
  state: z.string().trim().max(120).nullable().optional(),
  primaryGoal: z.enum(PRIMARY_GOALS).nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: "Add at least one lead update before saving.",
});

export const leadNoteSchema = z.object({
  note: z.string().trim().min(2).max(2000),
});

export const leadTaskSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).nullable().optional(),
  dueAt: z.string().trim().nullable().optional(),
  assignedTo: z.string().trim().email().nullable().optional(),
});

export const adminLeadCreateSchema = z
  .object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().max(80).nullable().optional(),
    email: z.string().trim().email().max(120).nullable().optional(),
    whatsappNumber: z.string().trim().min(7).max(30).nullable().optional(),
    state: z.string().trim().max(120).nullable().optional(),
    primaryGoal: z.enum(PRIMARY_GOALS).nullable().optional(),
    crmStatus: z.enum(CRM_STATUSES),
    priority: z.enum(LEAD_PRIORITIES),
    assignedTo: z.string().trim().email().nullable().optional(),
    source: z.enum(LEAD_SOURCES).optional(),
    sourceDetail: z.string().trim().max(200).nullable().optional(),
  })
  .superRefine((value, context) => {
    if (!value.email && !value.whatsappNumber) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add an email or WhatsApp number before saving this lead.",
        path: ["email"],
      });
    }
  });

export const adminLeadImportSchema = z.object({
  csvText: z.string().trim().min(1),
  assignedTo: z.string().trim().email().nullable().optional(),
  sourceDetail: z.string().trim().max(200).nullable().optional(),
});

export type AssessmentSubmission = z.infer<typeof assessmentSubmissionSchema>;
