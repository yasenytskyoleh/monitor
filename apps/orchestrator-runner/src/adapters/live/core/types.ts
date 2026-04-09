import type { AgentHandlerContext, AgentOutputEnvelope } from "@monitor/orchestrator-core";

export type LiveAdapterOptions = {
  apiKey: string;
  promptsRootDir: string;
  model?: string;
  temperature?: number;
  timeoutMs?: number;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
};

export type LiveAgentSpecificValidator = (output: AgentOutputEnvelope) => void;

export type BuildUserPrompt = (context: AgentHandlerContext) => string;

export type LiveAgentPipelineConfig = {
  adapterLabel: string;
  boundAgentId: string;
  expectedRole: AgentOutputEnvelope["agentRole"];
  responseFormatName: string;
  responseSchema: Record<string, unknown>;
  envelopeValidationContext: string;
  nullableFields: string[];
  additionalSystemInstructions?: string[];
  buildUserPrompt: BuildUserPrompt;
  assertSpecificOutput: LiveAgentSpecificValidator;
};
