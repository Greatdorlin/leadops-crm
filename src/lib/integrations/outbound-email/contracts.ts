import "server-only";

export type OutboundMailboxProvider = "smtp" | "google_oauth" | "microsoft_oauth";

export interface OutboundEmailAddress {
  email: string;
  name?: string | null;
}

export interface OutboundEmailMessage {
  to: OutboundEmailAddress[];
  cc?: OutboundEmailAddress[];
  bcc?: OutboundEmailAddress[];
  replyTo?: OutboundEmailAddress | null;
  subject: string;
  text?: string | null;
  html?: string | null;
  correlationId?: string | null;
}

export interface OutboundEmailResult {
  providerMessageId: string;
  accepted: string[];
  rejected: string[];
}

export interface OutboundMailboxHealth {
  ok: boolean;
  provider: OutboundMailboxProvider;
  detail: string;
}

export interface OutboundMailboxAdapter {
  readonly provider: OutboundMailboxProvider;
  verify(): Promise<OutboundMailboxHealth>;
  send(message: OutboundEmailMessage): Promise<OutboundEmailResult>;
}

export interface OutboundMailboxAdapterFactory<TConfig> {
  readonly provider: OutboundMailboxProvider;
  create(config: TConfig): OutboundMailboxAdapter;
}
