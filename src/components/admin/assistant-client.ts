type Pending = {
  targetName: string;
  summary?: string | null;
  id: string;
  action: {
    kind: string;
    leadId?: string;
    rule?: {name:string;conditionField:string;conditionValue:string;conditionOperator:string;actionType:string;actionValue:string};
    note?: string;
    title?: string;
    priority?: string;
  };
  expiresAt: string;
};
export type State = {
  name: string;
  personalName: string;
  showLauncher: boolean;
  enabled: boolean;
  canWrite: boolean;
  canReport: boolean;
  owner: boolean;
  currentUserId: string;
  mcpUrl: string;
  workspace: { name: string; nameLocked: boolean; enabled: boolean };
  pending: Pending[];
  connections: {
    clientName: string;
    familyId: string;
    clientId: string;
    expiresAt: string;
  }[];
  members?: { id: string; name: string; isActive: boolean }[];
  grants?: { userId: string; enabled: boolean; canWrite: boolean }[];
};
export type Lead = { id: string; name: string; company?: string | null };
export type Performance = {
  scope: string;
  staff: {
    id: string;
    label: string;
    wonValue: number;
    wonLeads: number;
    assignedLeads: number;
  }[];
};
export async function send(value: unknown) {
  const r = await fetch("/api/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
    signal: AbortSignal.timeout(20000),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Please try again.");
  return data;
}
