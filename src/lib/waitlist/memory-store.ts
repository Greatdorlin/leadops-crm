import type { GoalWaitlistRecord, WaitlistStorage } from "./types";

// In-memory storage is acceptable for local development only.
// It is not production-safe on serverless or multi-instance deployments.
export class MemoryWaitlistStore implements WaitlistStorage {
  private readonly records = new Map<string, GoalWaitlistRecord>();

  async save(record: GoalWaitlistRecord) {
    this.records.set(record.id, record);
  }

  async list() {
    return Array.from(this.records.values()).sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );
  }
}
