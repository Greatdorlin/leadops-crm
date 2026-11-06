import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

function keyRing() {
  const current = process.env.CRM_INBOX_DATA_KEY?.trim();
  if (!current)
    throw new Error(
      "Secure messaging is not configured. Ask the workspace owner to finish setup.",
    );
  const keys = [
    current,
    ...(process.env.CRM_INBOX_PREVIOUS_ENCRYPTION_KEYS ?? "")
      .split(",")
      .filter(Boolean),
  ].map((value) => {
    const key = Buffer.from(value.trim(), "base64");
    if (key.length !== 32 || key.toString("base64") !== value.trim())
      throw new Error("Messaging encryption configuration is invalid.");
    return {
      key,
      id: createHash("sha256").update(key).digest("hex").slice(0, 16),
    };
  });
  return keys;
}
export function encryptionReady() {
  try {
    keyRing();
    return true;
  } catch {
    return false;
  }
}
export function encryptMessage(value: unknown, context: string) {
  const { key, id } = keyRing()[0];
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(context));
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return JSON.stringify({
    v: 1,
    key: id,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: encrypted.toString("base64"),
  });
}
export function decryptMessage<T>(envelope: string, context: string): T {
  const value = JSON.parse(envelope);
  if (value.v !== 1) throw new Error("Unsupported encrypted message.");
  const selected = keyRing().find((k) => k.id === value.key);
  if (!selected)
    throw new Error("The encryption key for this message is unavailable.");
  const iv = Buffer.from(value.iv, "base64"),
    tag = Buffer.from(value.tag, "base64");
  if (iv.length !== 12 || tag.length !== 16)
    throw new Error("Invalid encrypted message.");
  const decipher = createDecipheriv("aes-256-gcm", selected.key, iv);
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(tag);
  return JSON.parse(
    Buffer.concat([
      decipher.update(Buffer.from(value.data, "base64")),
      decipher.final(),
    ]).toString("utf8"),
  );
}
