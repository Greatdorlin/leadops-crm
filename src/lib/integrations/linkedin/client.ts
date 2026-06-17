import { normalizeEnvValue } from "@/lib/env-utils";

export interface LinkedInLeadFormResponse {
  id?: string;
  submittedAt?: number;
  testLead?: boolean;
  ownerInfo?: {
    sponsoredAccount?: string;
    organization?: string;
  };
  owner?: {
    sponsoredAccount?: string;
    organization?: string;
  };
  form?: {
    id?: string;
    name?: string;
    content?: {
      questions?: Array<{
        questionId?: number;
        name?: string;
        label?: string;
        predefinedField?: string;
      }>;
    };
    hiddenFields?: Array<{
      name?: string;
      value?: string;
    }>;
  };
  formResponse?: {
    answers?: Array<{
      questionId?: number;
      name?: string;
      accepted?: {
        answer?: string;
        options?: number[];
      };
      answerDetails?: {
        textQuestionAnswer?: {
          answer?: string;
        };
        multipleChoiceAnswer?: {
          options?: number[];
        };
      };
    }>;
  };
  leadMetadataInfo?: {
    sponsoredLeadMetadataInfo?: {
      campaign?: {
        id?: string;
        name?: string;
      };
    };
  };
  associatedEntityInfo?: {
    associatedCreative?: {
      id?: string;
    };
  };
  [key: string]: unknown;
}

function getLinkedInAccessToken() {
  return normalizeEnvValue(process.env.LINKEDIN_ACCESS_TOKEN);
}

export function getLinkedInApiVersion() {
  return normalizeEnvValue(process.env.LINKEDIN_API_VERSION) || "202606";
}

export function getLinkedInClientSecret() {
  return normalizeEnvValue(process.env.LINKEDIN_CLIENT_SECRET);
}

export function isLinkedInLeadSyncConfigured() {
  return Boolean(getLinkedInAccessToken() && getLinkedInClientSecret());
}

export function parseLinkedInUrnId(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return "";
  }

  const matches = trimmed.match(/:([^:(),]+)(?:[),]\s*\d+)?$/);
  return matches?.[1]?.trim() ?? trimmed;
}

export async function fetchLinkedInLeadFormResponse(responseUrnOrId: string) {
  const accessToken = getLinkedInAccessToken();

  if (!accessToken) {
    throw new Error("LinkedIn Lead Sync access token is not configured.");
  }

  const id = parseLinkedInUrnId(responseUrnOrId);
  if (!id) {
    throw new Error("LinkedIn lead notification did not include a response id.");
  }

  const fields = [
    "ownerInfo",
    "associatedEntityInfo",
    "leadMetadataInfo",
    "owner",
    "leadType",
    "versionedLeadGenFormUrn",
    "id",
    "submittedAt",
    "testLead",
    "formResponse",
    "form:(hiddenFields,creationLocale,name,id,content)",
  ].join(",");

  const response = await fetch(
    `https://api.linkedin.com/rest/leadFormResponses/${encodeURIComponent(id)}?fields=${encodeURIComponent(fields)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Linkedin-Version": getLinkedInApiVersion(),
        "X-Restli-Protocol-Version": "2.0.0",
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`LinkedIn lead response request failed with ${response.status}.`);
  }

  return (await response.json()) as LinkedInLeadFormResponse;
}
