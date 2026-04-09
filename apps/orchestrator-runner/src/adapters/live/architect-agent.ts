import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { getSchemaValidator } from "@monitor/agent-config";
import { OrchestratorExecutionError } from "@monitor/orchestrator-core";
import type { AgentHandler, AgentHandlerContext, AgentOutputEnvelope } from "@monitor/orchestrator-core";

import { assertArchitectDesignOutput } from "./architect-output.js";
import { LiveOpenAiClient } from "./client.js";
import { ARCHITECT_RESPONSE_SCHEMA } from "./schemas/architect-agent-response-schema.js";
import { normalizeNullableFields } from "./schemas/openai-strict-schema.js";

export type LiveArchitectAgentOptions = {
  apiKey: string;
  promptsRootDir: string;
  model?: string;
  temperature?: number;
  timeoutMs?: number;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
};

const PROMPT_CACHE = new Map<string, string>();

export function createLiveArchitectAgentHandler(options: LiveArchitectAgentOptions): AgentHandler {
  const client = new LiveOpenAiClient({
    apiKey: options.apiKey,
    timeoutMs: options.timeoutMs,
    baseUrl: options.baseUrl,
    fetchImpl: options.fetchImpl
  });

  return async (context: AgentHandlerContext): Promise<AgentOutputEnvelope> => {
    if (context.agent.id !== "architect-agent") {
      throw new OrchestratorExecutionError(
        `Live Architect adapter is bound to 'architect-agent', received '${context.agent.id}'`
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
          name: "architect_agent_output_v1",
          schema: ARCHITECT_RESPONSE_SCHEMA,
          strict: true
        }
      },
      messages: [
        {
          role: "system",
          content: [
            promptText,
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

    const validator = getSchemaValidator();
    await validator.validateOrThrow(
      "https://monitor/schemas/agent-output-envelope.schema.json",
      parsed,
      "live architect agent output"
    );

    const output = parsed as AgentOutputEnvelope;
    if (output.taskId !== context.task.taskId) {
      throw new OrchestratorExecutionError(
        `Live Architect Agent taskId mismatch: '${output.taskId}' != '${context.task.taskId}'`
      );
    }

    if (output.agentRole !== "ARCHITECT") {
      throw new OrchestratorExecutionError(
        `Live Architect Agent role must be 'ARCHITECT', received '${output.agentRole}'`
      );
    }

    assertArchitectDesignOutput(output);
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
        "Use one valid action from the schema. For DESIGN -> FORMALIZE handoff use handoff_to_quant or await_approval.",
      artifacts:
        "Return an array of non-empty string artifact refs. Include architecture artifacts and target-state required artifacts.",
      architectDesignFields:
        "When status=completed include metrics.moduleBoundaries[], metrics.dataFlow[], metrics.contractDefinitions[], metrics.adrDraft, metrics.riskNotes[].",
      requiredArtifactsForTargetState
    }
  };

  return [
    "Produce Architect Agent output for this task.",
    "Return exactly one JSON object following the provided schema.",
    JSON.stringify(payload, null, 2)
  ].join("\n\n");
}
