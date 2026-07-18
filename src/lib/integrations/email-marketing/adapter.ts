import "server-only";

export type EmailMarketingEventType =
  | "contact.upsert"
  | "contact.unsubscribe"
  | "contact.remove";

export interface EmailMarketingContact {
  externalId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  attributes?: Record<string, string | number | boolean | null>;
  listIds?: string[];
}

export interface EmailMarketingEvent {
  idempotencyKey: string;
  type: EmailMarketingEventType;
  contact: EmailMarketingContact;
  occurredAt: string;
}

export interface EmailMarketingDeliveryResult {
  accepted: boolean;
  providerReference?: string;
  retryable: boolean;
  message?: string;
}

export interface EmailMarketingHealth {
  status: "healthy" | "degraded" | "unavailable";
  checkedAt: string;
  message?: string;
}

/** Implementations own provider credentials and must only be constructed on the server. */
export interface EmailMarketingAdapter {
  readonly id: string;
  checkHealth(): Promise<EmailMarketingHealth>;
  deliver(event: EmailMarketingEvent): Promise<EmailMarketingDeliveryResult>;
}
