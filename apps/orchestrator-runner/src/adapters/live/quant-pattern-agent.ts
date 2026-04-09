import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { getSchemaValidator } from "@monitor/agent-config";
import { OrchestratorExecutionError } from "@monitor/orchestrator-core";
import type { AgentHandler, AgentHandlerContext, AgentOutputEnvelope } from "@monitor/orchestrator-core";

import { LiveOpenAiClient } from "./client.js";
import { assertQuantPatternOutput } from "./quant-pattern-output.js";
import { normalizeNullableFields } from "./schemas/openai-strict-schema.js";
import { QUANT_PATTERN_RESPONSE_SCHEMA } from "./schemas/quant-pattern-agent-response-schema.js";

export type LiveQuantPatternAgentOptions = {
  apiKey: string;
  promptsRootDir: string;
  model?: string;
  temperature?: number;
  timeoutMs?: number;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
};

const PROMPT_CACHE = new Map<string, string>();

export function createLiveQuantPatternAgentHandler(options: LiveQuantPatternAgentOptions): AgentHandler {
  const client = new LiveOpenAiClient({
    apiKey: options.apiKey,
    timeoutMs: options.timeoutMs,
    baseUrl: options.baseUrl,
    fetchImpl: options.fetchImpl
  });

  return async (context: AgentHandlerContext): Promise<AgentOutputEnvelope> => {
    if (context.agent.id !== "quant-pattern-agent") {
      throw new OrchestratorExecutionError(
        `Live Quant Pattern adapter is bound to 'quant-pattern-agent', received '${context.agent.id}'`
      );
    }

    const promptText = await loadPromptTemplate(
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
          name: "quant_pattern_agent_output_v1",
          schema: QUANT_PATTERN_RESPONSE_SCHEMA,
          strict: true
        }
      },
      messages: [
        {
          role: "system",
          content: [
            promptText,
            "Phase 1 boundaries are strict: spot-only, no leverage, no futures/perpetual assumptions, no funding-rate dependency.",
            "Return JSON only.",
            "No markdown, no code fences, no prose."
          ].join("\n\n")
        },
        {
          role: "user",
          content: buildUserPrompt(context)
        }
      ]
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
    } catch (error) {
      throw new OrchestratorExecutionError(
        `Failed to parse OpenAI JSON output: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    normalizeNullableFields(parsed, ["risks", "notes", "metrics", "escalation"]);

    await getSchemaValidator().validateOrThrow(
      "https://monitor/schemas/agent-output-envelope.schema.json",
      parsed,
      "live quant pattern output"
    );

    const output = parsed as AgentOutputEnvelope;
    if (output.taskId !== context.task.taskId) {
      throw new OrchestratorExecutionError(
        `Live Quant Pattern Agent taskId mismatch: '${output.taskId}' != '${context.task.taskId}'`
      );
    }

    if (output.agentRole !== "QUANT_PATTERN") {
      throw new OrchestratorExecutionError(
        `Live Quant Pattern Agent role must be 'QUANT_PATTERN', received '${output.agentRole}'`
      );
    }

    assertQuantPatternOutput(output);
    return output;
  };
}

async function loadPromptTemplate(
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

function buildUserPrompt(context: AgentHandlerContext): string {
  const requiredArtifactsForTargetState =
    context.snapshot.workflow.requiredArtifactsByState?.[context.targetState] ?? [];

  const payload = {
    task: context.task,
    targetState: context.targetState,
    outputRequirements: {
      status: "Use completed, blocked, needs_escalation, or rejected.",
      nextAction:
        "Use one valid action from the schema. For successful formalization handoff use handoff_to_backend.",
      artifacts:
        "Return an array of non-empty string artifact refs. Include pattern-definition and metrics-plan artifacts.",
      quantFormalization:
        "When status=completed include metrics.patternDefinition, measurableConditions[], metricsPlan[], evaluationHorizon, invalidationAssumptions[], edgeHypothesis, testScenarios[], and phaseScope with SPOT_ONLY boundaries.",
      phase1Boundaries:
        "No futures/perpetual, no leverage, no funding-rate dependency, no discretionary language.",
      requiredArtifactsForTargetState
    }
  };

  return [
    "Produce Quant Pattern Agent output for this task.",
    "Return exactly one JSON object following the provided schema.",
    JSON.stringify(payload, null, 2)
  ].join("\n\n");
}
