import { OrchestratorExecutionError } from "@monitor/orchestrator-core";
import type { AgentHandler, AgentHandlerContext, AgentOutputEnvelope } from "@monitor/orchestrator-core";

import {
  assertAgentOutputIdentity,
  loadPromptTemplateCached,
  parseOpenAiJsonOutput,
  validateAgentEnvelopeOutput
} from "./agent-output-helpers.js";
import { LiveOpenAiClient } from "./client.js";

export type LiveAdapterOptions = {
  apiKey: string;
  promptsRootDir: string;
  model?: string;
  temperature?: number;
  timeoutMs?: number;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
};

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
): AgentHandler {
  const client = new LiveOpenAiClient({
    apiKey: options.apiKey,
    timeoutMs: options.timeoutMs,
    baseUrl: options.baseUrl,
    fetchImpl: options.fetchImpl
  });

  return async (context: AgentHandlerContext): Promise<AgentOutputEnvelope> => {
    if (context.agent.id !== config.boundAgentId) {
      throw new OrchestratorExecutionError(
        `${config.adapterLabel} adapter is bound to '${config.boundAgentId}', received '${context.agent.id}'`
      );
    }

    const promptText = await loadPromptTemplateCached(
      options.promptsRootDir,
      context.agent.prompt.version,
      context.agent.prompt.template
    );

    const model = options.model ?? process.env.OPENAI_MODEL ?? context.agent.runtime.model;
    const temperature = options.temperature ?? context.agent.runtime.temperature;
    const maxCompletionTokens = context.agent.runtime.maxTokens;

    const rawJson = await client.completeJson({
      model,
      temperature,
      maxCompletionTokens,
      responseFormat: {
        type: "json_schema",
        jsonSchema: {
          name: config.responseFormatName,
          schema: config.responseSchema,
          strict: true
        }
      },
      messages: [
        {
          role: "system",
          content: [
            promptText,
            ...(config.additionalSystemInstructions ?? []),
            "Return JSON only.",
            "No markdown, no code fences, no prose."
          ].join("\n\n")
        },
        {
          role: "user",
          content: config.buildUserPrompt(context)
        }
      ]
    });

    const parsed = parseOpenAiJsonOutput(rawJson);
    const output = await validateAgentEnvelopeOutput({
      parsed,
      context: config.envelopeValidationContext,
      nullableFields: config.nullableFields
    });
    assertAgentOutputIdentity(output, {
      expectedTaskId: context.task.taskId,
      expectedRole: config.expectedRole,
      adapterLabel: config.adapterLabel
    });

    config.assertDomainOutput(output);
    return output;
  };
}

