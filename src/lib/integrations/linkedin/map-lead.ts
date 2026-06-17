import type { ExternalLeadUpsertInput } from "@/lib/storage/types";
import {
  normalizeIntegrationFieldKey,
  readIntegrationFieldValue,
  splitIntegrationFullName,
} from "@/lib/integrations/shared/field-map";
import { type LinkedInLeadFormResponse } from "./client";

function buildFieldMap(response: LinkedInLeadFormResponse) {
  const questionMap = new Map(
    (response.form?.content?.questions ?? [])
      .filter((question) => question.questionId != null)
      .map((question) => [question.questionId as number, question]),
  );

  return new Map(
    (response.formResponse?.answers ?? []).flatMap((answer) => {
      const value =
        answer.accepted?.answer?.trim() ??
        answer.answerDetails?.textQuestionAnswer?.answer?.trim() ??
        "";
      if (!value) {
        return [];
      }

      const question = answer.questionId != null ? questionMap.get(answer.questionId) : null;
      const candidates = [
        answer.name,
        question?.name,
        question?.label,
        question?.predefinedField,
      ]
        .filter((candidate): candidate is string => Boolean(candidate?.trim()))
        .map((candidate) => normalizeIntegrationFieldKey(candidate));

      return candidates.map((candidate) => [candidate, value] as const);
    }),
  );
}

export function mapLinkedInLeadToExternalInput(
  response: LinkedInLeadFormResponse,
): ExternalLeadUpsertInput {
  const fields = buildFieldMap(response);
  const fullName =
    readIntegrationFieldValue(fields, ["full_name", "name"]) ||
    `${readIntegrationFieldValue(fields, ["first_name", "firstname"])} ${readIntegrationFieldValue(fields, ["last_name", "lastname"])}`.trim();
  const splitName = splitIntegrationFullName(fullName);
  const formName = response.form?.name?.trim() ?? "";
  const formId = response.form?.id?.trim() ?? "";

  return {
    source: "linkedin_lead_gen_forms",
    sourceDetail: formName || formId || "linkedin_lead_gen_forms",
    externalLeadId: response.id ?? null,
    externalFormId: formId || null,
    firstName:
      readIntegrationFieldValue(fields, ["first_name", "firstname"]) || splitName.firstName,
    lastName:
      readIntegrationFieldValue(fields, ["last_name", "lastname"]) || splitName.lastName,
    email: readIntegrationFieldValue(fields, ["email", "work_email"]),
    whatsappNumber: readIntegrationFieldValue(fields, [
      "phone_number",
      "work_phone_number",
      "phone",
      "mobile",
    ]),
    state: readIntegrationFieldValue(fields, ["state", "region", "state_of_residence"]),
    sourcePayload: response as Record<string, unknown>,
    answers: {
      stateOfResidence:
        readIntegrationFieldValue(fields, ["state", "region", "state_of_residence"]) || null,
      destinationInterest:
        readIntegrationFieldValue(fields, [
          "destination",
          "destination_interest",
          "country_interest",
        ]) || null,
      timeline:
        readIntegrationFieldValue(fields, ["timeline", "travel_timeline", "move_timeline"]) ||
        null,
    },
  };
}
