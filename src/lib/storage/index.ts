import { NeonLeadStore } from "./neon-store";
import type { LeadStore } from "./types";

// Transitional alias: the runtime is Postgres-compatible, while the concrete
// implementation class still carries inherited Neon naming.
export const PostgresLeadStore = NeonLeadStore;

let sharedLeadStore: LeadStore | null = null;

export function createLeadStore(): LeadStore {
  return new PostgresLeadStore();
}

export function getLeadStore(): LeadStore {
  if (!sharedLeadStore) {
    sharedLeadStore = createLeadStore();
  }

  return sharedLeadStore;
}

export const leadStore = getLeadStore();

export type {
  LeadCreateInput,
  LeadDetailResult,
  LeadListResult,
  LeadStore,
  LeadUpdateInput,
} from "./types";
