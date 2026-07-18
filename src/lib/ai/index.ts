import "server-only";

export const AI_CAPABILITY_IDS = [
  "text_generation",
  "structured_extraction",
  "classification",
  "summarization",
] as const;

export type AiCapabilityId = (typeof AI_CAPABILITY_IDS)[number];

export interface AiExecutionRequest {
  capability: AiCapabilityId;
  input: unknown;
  instructions?: string;
  traceId?: string;
}

export interface AiExecutionResult<TOutput = unknown> {
  output: TOutput;
  modelReference?: string;
  usage?: {
    inputUnits?: number;
    outputUnits?: number;
  };
}

/** Provider credentials belong inside the server-side implementation, never in this request contract. */
export interface AiAdapter {
  readonly id: string;
  supports(capability: AiCapabilityId): boolean;
  execute<TOutput = unknown>(request: AiExecutionRequest): Promise<AiExecutionResult<TOutput>>;
}

export interface AiCapabilityDefinition {
  id: AiCapabilityId;
  state: "disabled";
  adapterId: null;
  reason: string;
}

export const aiCapabilityRegistry: readonly AiCapabilityDefinition[] = AI_CAPABILITY_IDS.map((id) => ({
  id,
  state: "disabled" as const,
  adapterId: null,
  reason: "No AI capability is enabled for this release.",
}));

export function getAiCapability(id: AiCapabilityId) {
  return aiCapabilityRegistry.find((capability) => capability.id === id);
}
