import type { AgentHandler, AgentHandlerContext, AgentOutputEnvelope } from "@monitor/orchestrator-core";

import { LiveOpenAiClient } from "../client.js";
import {
  AgentSpecificValidationError,
  EnvelopeValidationError,
  LiveAdapterError,
  ModelCallError,
  toErrorMessage
} from "./errors.js";
import { loadPromptTemplateCached } from "./load-prompt.js";
import { parseOpenAiStructuredResponse } from "./parse-response.js";
import type { LiveAdapterOptions, LiveAgentPipelineConfig } from "./types.js";
import { assertAgentOutputIdentity, validateAgentEnvelopeOutput } from "./validate-envelope.js";

export function createLiveAgentHandler(
  options: LiveAdapterOptions,
  config: LiveAgentPipelineConfig
): AgentHandler {
  const client = new LiveOpenAiClient({
    apiKey: options.apiKey,
    timeoutMs: options.timeoutMs,
    baseUrl: options.baseUrl,
    fetchImpl: options.fetchImpl
  });

  return async (context: AgentHandlerContext): Promise<AgentOutputEnvelope> => {
    assertBoundAdapterContext(context, config);

    const promptText = await loadPromptTemplateCached(
      options.promptsRootDir,
      context.agent.prompt.version,
      context.agent.prompt.template
    );

    const model = options.model ?? process.env.OPENAI_MODEL ?? context.agent.runtime.model;
    const temperature = options.temperature ?? context.agent.runtime.temperature;
    const maxCompletionTokens = context.agent.runtime.maxTokens;

    const rawJson = await completeModelJson({
      client,
      model,
      temperature,
      maxCompletionTokens,
      systemPrompt: [
        promptText,
        ...(config.additionalSystemInstructions ?? []),
        "Return JSON only.",
        "No markdown, no code fences, no prose."
      ].join("\n\n"),
      userPrompt: config.buildUserPrompt(context),
      responseFormatName: config.responseFormatName,
      responseSchema: config.responseSchema
    });

    const parsed = parseOpenAiStructuredResponse(rawJson);
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

    assertAgentSpecificOutput(output, config);
    const emittedArtifacts = filterPreviouslyKnownArtifacts(output.artifacts, context.task.artifactRefs);
    return {
      ...output,
      artifacts: ensureTargetArtifacts(emittedArtifacts, context)
    };
  };
}

function assertBoundAdapterContext(
  context: AgentHandlerContext,
  config: Pick<LiveAgentPipelineConfig, "adapterLabel" | "boundAgentId">
): void {
  if (context.agent.id !== config.boundAgentId) {
    throw new EnvelopeValidationError(
      `${config.adapterLabel} adapter is bound to '${config.boundAgentId}', received '${context.agent.id}'`
    );
  }
}

async function completeModelJson(input: {
  client: LiveOpenAiClient;
  model: string;
  temperature: number;
  maxCompletionTokens: number;
  systemPrompt: string;
  userPrompt: string;
  responseFormatName: string;
  responseSchema: Record<string, unknown>;
}): Promise<string> {
  try {
    return await input.client.completeJson({
      model: input.model,
      temperature: input.temperature,
      maxCompletionTokens: input.maxCompletionTokens,
      responseFormat: {
        type: "json_schema",
        jsonSchema: {
          name: input.responseFormatName,
          schema: input.responseSchema,
          strict: true
        }
      },
      messages: [
        {
          role: "system",
          content: input.systemPrompt
        },
        {
          role: "user",
          content: input.userPrompt
        }
      ]
    });
  } catch (error) {
    if (error instanceof ModelCallError) {
      throw error;
    }

    throw new ModelCallError(toErrorMessage(error, "OpenAI request failed"), {
      cause: error
    });
  }
}

function assertAgentSpecificOutput(
  output: AgentOutputEnvelope,
  config: Pick<LiveAgentPipelineConfig, "assertSpecificOutput">
): void {
  try {
    config.assertSpecificOutput(output);
  } catch (error) {
    if (error instanceof AgentSpecificValidationError || error instanceof LiveAdapterError) {
      throw error;
    }

    throw new AgentSpecificValidationError(
      toErrorMessage(error, "Agent-specific output validation failed"),
      {
        cause: error
      }
    );
  }
}

function ensureTargetArtifacts(
  artifacts: string[],
  context: AgentHandlerContext
): string[] {
  const requiredArtifacts = context.snapshot.workflow.requiredArtifactsByState?.[context.targetState] ?? [];
  if (requiredArtifacts.length === 0) {
    return artifacts;
  }

  const merged = [...artifacts];
  for (const artifact of requiredArtifacts) {
    if (!merged.includes(artifact)) {
      merged.push(artifact);
    }
  }
  return merged;
}

function filterPreviouslyKnownArtifacts(artifacts: string[], existingArtifactRefs: string[]): string[] {
  if (artifacts.length === 0 || existingArtifactRefs.length === 0) {
    return artifacts;
  }

  const known = new Set(existingArtifactRefs.map((value) => value.trim()).filter((value) => value.length > 0));
  return artifacts.filter((artifact) => !known.has(artifact));
}
