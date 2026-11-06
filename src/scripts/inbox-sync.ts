import "dotenv/config";
import { syncMailbox, flushQueuedMessages } from "@/lib/inbox/mailbox";
import { closeDb } from "@/lib/db/client";
async function main() {
  try {
    await flushQueuedMessages();
    const result = await syncMailbox();
    console.info(JSON.stringify({ event: "inbox.sync.complete", ...result }));
  } catch {
    console.error(JSON.stringify({ event: "inbox.sync.failed" }));
    process.exitCode = 1;
  } finally {
    await closeDb();
  }
}
void main();
