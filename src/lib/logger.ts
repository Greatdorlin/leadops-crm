import pino, { type DestinationStream } from "pino";

/** Log identifiers and operations; never log lead records, payloads, or credentials. */
export function createLogger(destination?: DestinationStream) {
  return pino(
    {
      name: "leads-desk",
      level: process.env.LOG_LEVEL || "info",
      base: undefined,
      redact: {
        paths: [
          "password",
          "token",
          "secret",
          "authorization",
          "cookie",
          "*.password",
          "*.token",
          "*.secret",
          "*.authorization",
          "*.cookie",
          "req.headers",
          "request.headers",
          "request.body",
        ],
        censor: "[REDACTED]",
      },
    },
    destination,
  );
}

export const logger = createLogger();

/** Database/provider errors can contain SQL parameters and URLs. Log a safe classification. */
export function classifyError(error: unknown) {
  return { type: error instanceof Error ? error.name : "UnknownError" };
}
