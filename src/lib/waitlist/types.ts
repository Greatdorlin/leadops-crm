export interface GoalWaitlistRecord {
  id: string;
  createdAt: string;
  source: "goal_waitlist";
  goalValue: string;
  goalLabel: string;
  firstName: string;
  email: string;
  whatsappNumber: string;
}

export interface WaitlistStorage {
  save(record: GoalWaitlistRecord): Promise<void>;
  list(): Promise<GoalWaitlistRecord[]>;
}
