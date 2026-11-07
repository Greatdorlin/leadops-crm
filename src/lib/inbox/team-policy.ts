import { InboxError } from "./contracts";
/** Runtime boundary: historical email records stay stored, but cannot be opened or sent. */
export function requireTeamChannel(
  channel: unknown,
): asserts channel is "team" {
  if (channel !== "team")
    throw new InboxError(
      "Inbox is for private team messages. Email is no longer available.",
      410,
    );
}
