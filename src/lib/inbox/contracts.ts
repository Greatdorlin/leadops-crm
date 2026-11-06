import { z } from "zod";
export class InboxError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export const threadSchema = z.object({
  requestId: z.string().uuid(),
  subject: z
    .string()
    .trim()
    .min(2)
    .max(160)
    .refine((v) => !/[\r\n]/.test(v), "Use a single-line subject."),
  text: z.string().trim().min(1).max(12000),
  participantIds: z.array(z.string().uuid()).max(19).default([]),
  leadId: z.string().uuid().nullable().optional(),
  channel: z.enum(["team", "email"]).default("team"),
});
export const messageSchema = z.object({
  threadId: z.string().uuid(),
  requestId: z.string().uuid(),
  text: z.string().trim().min(1).max(12000),
});
export type MessageContent = {
  text: string;
  author: string;
  from?: string;
  attachmentsSkipped?: number;
  truncated?: boolean;
};
