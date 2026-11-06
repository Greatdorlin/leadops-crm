import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { createTransport } from "nodemailer";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { z } from "zod";
import { InboxError } from "./contracts";
const host = z
  .string()
  .trim()
  .toLowerCase()
  .max(253)
  .regex(/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/, "Use a mail-server hostname.");
const credential = z.string().min(1).max(1000);
export const mailboxConfigSchema = z.object({
  fromEmail: z.email().max(254),
  fromName: z
    .string()
    .trim()
    .max(80)
    .refine((v) => !/[\r\n]/.test(v), "Use a single-line sender name.")
    .default("Sales team"),
  smtpHost: host,
  smtpPort: z.union([z.literal(465), z.literal(587)]).default(465),
  smtpUser: credential,
  smtpPassword: credential,
  imapHost: host,
  imapPort: z.union([z.literal(993), z.literal(143)]).default(993),
  imapUser: credential,
  imapPassword: credential,
  ownerUserId: z.string().uuid(),
});
export type MailboxConfig = z.infer<typeof mailboxConfigSchema>;
export type ReceivedEmail = {
  uid: number;
  messageId: string;
  references: string[];
  from: string;
  subject: string;
  text: string;
  attachmentsSkipped: number;
  truncated: boolean;
  date: Date;
};
export type MailBatch = {
  uidValidity: string;
  messages: ReceivedEmail[];
  lastUid: number;
};
export interface MailboxTransport {
  verify(): Promise<void>;
  send(input: {
    to: string;
    subject: string;
    text: string;
    messageId: string;
    inReplyTo?: string;
  }): Promise<{ accepted: boolean }>;
  read(input: {
    lastUid: number;
    uidValidity: string | null;
  }): Promise<MailBatch>;
}
const blocked = new BlockList();
const blockedV6 = new BlockList();
for (const [ip, bits] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.168.0.0", 16],
  ["100.64.0.0", 10],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
  ["198.18.0.0", 15],
  ["192.0.0.0", 24],
] as const)
  blocked.addSubnet(ip, bits, "ipv4");
for (const [ip, bits] of [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["::ffff:0:0", 96],
  ["64:ff9b::", 96],
  ["64:ff9b:1::", 48],
] as const)
  blockedV6.addSubnet(ip, bits, "ipv6");
export function isPublicMailAddress(ip: string) {
  const family = isIP(ip);
  return (
    family !== 0 &&
    !(family === 4 ? blocked.check(ip, "ipv4") : blockedV6.check(ip, "ipv6"))
  );
}
async function endpoint(name: string) {
  if (name === "localhost" || name.endsWith(".localhost"))
    throw new InboxError("Use a public mail-server hostname.");
  const addresses = await lookup(name, { all: true });
  if (
    !addresses.length ||
    addresses.some((a) => !isPublicMailAddress(a.address))
  )
    throw new InboxError("Mail servers must use public network addresses.");
  return addresses[0].address;
}
export async function smtpOptions(config: MailboxConfig) {
  return {
    host: await endpoint(config.smtpHost),
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    requireTLS: true,
    auth: { user: config.smtpUser, pass: config.smtpPassword },
    tls: {
      servername: config.smtpHost,
      rejectUnauthorized: true,
      minVersion: "TLSv1.2" as const,
    },
    connectionTimeout: 12000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    disableFileAccess: true,
    disableUrlAccess: true,
    logger: false as const,
    debug: false,
  };
}
async function imapClient(config: MailboxConfig) {
  return new ImapFlow({
    host: await endpoint(config.imapHost),
    port: config.imapPort,
    secure: config.imapPort === 993,
    doSTARTTLS: config.imapPort === 143,
    auth: { user: config.imapUser, pass: config.imapPassword },
    tls: {
      servername: config.imapHost,
      rejectUnauthorized: true,
      minVersion: "TLSv1.2",
    },
    logger: false,
    connectionTimeout: 12000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    disableAutoIdle: true,
  });
}
export async function parseEmail(
  source: Buffer,
  meta: { uid: number; size: number; date?: Date },
): Promise<ReceivedEmail> {
  const parsed = await simpleParser(source, {
    skipHtmlToText: false,
    skipTextToHtml: true,
    skipImageLinks: true,
    maxHtmlLengthToParse: 64000,
  });
  const refs = Array.isArray(parsed.references)
    ? parsed.references
    : parsed.references
      ? [parsed.references]
      : [];
  if (parsed.inReplyTo) refs.push(parsed.inReplyTo);
  return {
    uid: meta.uid,
    messageId: parsed.messageId || `missing-${meta.uid}`,
    references: refs,
    from: parsed.from?.value[0]?.address?.toLowerCase() || "",
    subject: (parsed.subject || "Email conversation")
      .replace(/[\r\n]/g, " ")
      .slice(0, 160),
    text: (
      parsed.text || "Open this email in your mailbox to view its content."
    ).slice(0, 32000),
    attachmentsSkipped: parsed.attachments.length,
    truncated: meta.size > 262144 || (parsed.text?.length ?? 0) > 32000,
    date:
      parsed.date && Number.isFinite(parsed.date.getTime())
        ? parsed.date
        : (meta.date ?? new Date()),
  };
}
export function createMailboxTransport(
  config: MailboxConfig,
): MailboxTransport {
  return {
    async verify() {
      const smtp = createTransport(await smtpOptions(config));
      try {
        await smtp.verify();
      } catch {
        throw new InboxError(
          "Could not connect securely to the outgoing mail server. Check its host, port, username and password.",
          502,
        );
      } finally {
        smtp.close();
      }
      const imap = await imapClient(config);
      try {
        await imap.connect();
        await imap.mailboxOpen("INBOX", { readOnly: true });
      } catch {
        throw new InboxError(
          "Could not connect securely to the incoming mail server. Check its host, port, username and password.",
          502,
        );
      } finally {
        await imap.logout().catch(() => imap.close());
      }
    },
    async send(input) {
      const smtp = createTransport(await smtpOptions(config));
      try {
        const result = await smtp.sendMail({
          from: { name: config.fromName, address: config.fromEmail },
          to: { address: input.to, name: "" },
          subject: input.subject,
          text: input.text,
          messageId: input.messageId,
          inReplyTo: input.inReplyTo,
          references: input.inReplyTo ? [input.inReplyTo] : undefined,
          disableFileAccess: true,
          disableUrlAccess: true,
        });
        return {
          accepted: result.accepted.length > 0 && result.rejected.length === 0,
        };
      } finally {
        smtp.close();
      }
    },
    async read(input) {
      const client = await imapClient(config);
      try {
        await client.connect();
        const lock = await client.getMailboxLock("INBOX", { readOnly: true });
        try {
          if (!client.mailbox) throw new Error("Mailbox unavailable");
          const validity = String(client.mailbox.uidValidity);
          const continuing =
            validity === input.uidValidity && input.lastUid > 0;
          let uids: number[];
          if (continuing) {
            const found = await client.search(
              { uid: `${input.lastUid + 1}:*` },
              { uid: true },
            );
            uids = (found || [])
              .filter((uid) => uid > input.lastUid)
              .slice(0, 50);
          } else {
            const start = Math.max(1, client.mailbox.exists - 49);
            uids = [];
            if (client.mailbox.exists)
              for await (const row of client.fetch(`${start}:*`, { uid: true }))
                uids.push(row.uid);
          }
          const messages: ReceivedEmail[] = [];
          const deadline = Date.now() + 45000;
          let lastUid = continuing ? input.lastUid : 0;
          for (const uid of uids) {
            if (Date.now() > deadline) break;
            const row = await client.fetchOne(
              String(uid),
              {
                uid: true,
                size: true,
                internalDate: true,
                source: { start: 0, maxLength: 262144 },
              },
              { uid: true },
            );
            if (!row) continue;
            if (row.source) {
              try {
                messages.push(
                  await parseEmail(row.source, {
                    uid,
                    size: row.size ?? row.source.length,
                    date:
                      row.internalDate instanceof Date
                        ? row.internalDate
                        : undefined,
                  }),
                );
              } catch {
                throw new InboxError(
                  "An email could not be parsed. Sync paused to avoid losing it.",
                  502,
                );
              }
            }
            lastUid = Math.max(lastUid, uid);
          }
          return { uidValidity: validity, messages, lastUid };
        } finally {
          lock.release();
        }
      } finally {
        await client.logout().catch(() => client.close());
      }
    },
  };
}
