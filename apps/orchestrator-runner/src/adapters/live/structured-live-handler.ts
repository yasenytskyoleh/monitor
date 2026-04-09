import type { AgentHandlerContext, AgentOutputEnvelope } from "@monitor/orchestrator-core";

import { createLiveAgentHandler } from "./core/execute-live-agent.js";
import type { LiveAdapterOptions } from "./core/types.js";

type StructuredLiveHandlerConfig = {
  adapterLabel: string;
  boundAgentId: string;
  expectedRole: AgentOutputEnvelope["agentRole"];
  responseFormatName: string;
  responseSchema: Record<string, unknown>;
  envelopeValidationContext: string;
  nullableFields: string[];
  additionalSystemInstructions?: string[];
  buildUserPrompt: (context: AgentHandlerContext) => string;
  assertDomainOutput: (output: AgentOutputEnvelope) => void;
};

export function createStructuredLiveAgentHandler(
  options: LiveAdapterOptions,
  config: StructuredLiveHandlerConfig
) {
  return createLiveAgentHandler(options, {
    ...config,
    assertSpecificOutput: config.assertDomainOutput
  });
}

export type { LiveAdapterOptions };
