export interface SenderSubscriberPayload {
  email: string;
  firstname: string;
  lastname: string;
  phone: string;
  groups: string[];
  trigger_automation: boolean;
  fields: Record<string, string>;
}
