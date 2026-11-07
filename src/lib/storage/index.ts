import { PostgresLeadStore } from "./postgres-store";
import type { LeadStore } from "./types";

export { PostgresLeadStore };

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
