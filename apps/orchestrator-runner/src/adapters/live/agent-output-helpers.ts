import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { getSchemaValidator } from "@monitor/agent-config";
import { OrchestratorExecutionError } from "@monitor/orchestrator-core";
import type { AgentOutputEnvelope } from "@monitor/orchestrator-core";

import { normalizeNullableFields } from "./schemas/openai-strict-schema.js";

const PROMPT_CACHE = new Map<string, string>();

export async function loadPromptTemplateCached(
  promptsRootDir: string,
  promptVersion: string,
  promptFile: string
): Promise<string> {
  const cacheKey = `${promptsRootDir}/${promptVersion}/${promptFile}`;
  const cached = PROMPT_CACHE.get(cacheKey);
  if (cached) {
    return cached;
  }

  const promptPath = join(promptsRootDir, promptVersion, promptFile);
  const promptText = await readFile(promptPath, "utf8");
  PROMPT_CACHE.set(cacheKey, promptText);
  return promptText;
}

export function parseOpenAiJsonOutput(rawJson: string): unknown {
  try {
    return JSON.parse(rawJson);
  } catch (error) {
    throw new OrchestratorExecutionError(
      `Failed to parse OpenAI JSON output: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function validateAgentEnvelopeOutput(input: {
  parsed: unknown;
  context: string;
  nullableFields: string[];
}): Promise<AgentOutputEnvelope> {
  normalizeNullableFields(input.parsed, input.nullableFields);

  await getSchemaValidator().validateOrThrow(
    "https://monitor/schemas/agent-output-envelope.schema.json",
    input.parsed,
    input.context
  );

  return input.parsed as AgentOutputEnvelope;
}

export function assertAgentOutputIdentity(
  output: AgentOutputEnvelope,
  options: {
    expectedTaskId: string;
    expectedRole: AgentOutputEnvelope["agentRole"];
    adapterLabel: string;
  }
): void {
  if (output.taskId !== options.expectedTaskId) {
    throw new OrchestratorExecutionError(
      `${options.adapterLabel} Agent taskId mismatch: '${output.taskId}' != '${options.expectedTaskId}'`
    );
  }

  if (output.agentRole !== options.expectedRole) {
    throw new OrchestratorExecutionError(
      `${options.adapterLabel} Agent role must be '${options.expectedRole}', received '${output.agentRole}'`
    );
  }
}

