import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { getSchemaValidator } from "@monitor/agent-config";
import { OrchestratorExecutionError } from "@monitor/orchestrator-core";
import type { AgentHandler, AgentHandlerContext, AgentOutputEnvelope } from "@monitor/orchestrator-core";

import { LiveOpenAiClient } from "./client.js";

export type LiveProductAgentOptions = {
  apiKey: string;
  promptsRootDir: string;
  model?: string;
  temperature?: number;
  timeoutMs?: number;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
};

const PROMPT_CACHE = new Map<string, string>();

const AGENT_OUTPUT_RESPONSE_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    taskId: { type: "string", minLength: 1 },
    agentRole: { type: "string", enum: ["PRODUCT"] },
    status: { type: "string", enum: ["completed", "blocked", "needs_escalation", "rejected"] },
    summary: { type: "string", minLength: 1 },
    artifacts: {
      type: "array",
      minItems: 1,
      uniqueItems: true,
      items: { type: "string", minLength: 1 }
    },
    nextAction: {
      type: "string",
      enum: [
        "handoff_to_architect",
        "request_more_context",
        "close_task",
        "reject_task",
        "await_approval"
      ]
    },
    risks: {
      type: "array",
      items: { type: "string", minLength: 1 }
    },
    notes: {
      oneOf: [
        { type: "string", minLength: 1 },
        {
          type: "array",
          items: { type: "string", minLength: 1 }
        }
      ]
    },
    metrics: {
      type: "object",
      properties: {
        problemStatement: { type: "string", minLength: 1 },
        scope: { type: "string", minLength: 1 },
        assumptions: {
          type: "array",
          minItems: 1,
          items: { type: "string", minLength: 1 }
        },
        acceptanceCriteria: {
          type: "array",
          minItems: 1,
          items: { type: "string", minLength: 1 }
        },
        backlogItem: { type: "string", minLength: 1 }
      },
      required: [
        "problemStatement",
        "scope",
        "assumptions",
        "acceptanceCriteria",
        "backlogItem"
      ],
      additionalProperties: true
    },
    escalation: { type: "object", additionalProperties: true }
  },
  required: ["taskId", "agentRole", "status", "summary", "artifacts", "nextAction", "metrics"],
  allOf: [
    {
      if: {
        properties: {
          status: {
            const: "needs_escalation"
          }
        },
        required: ["status"]
      },
      then: {
        required: ["escalation"]
      }
    }
  ]
};

export function createLiveProductAgentHandler(options: LiveProductAgentOptions): AgentHandler {
  const client = new LiveOpenAiClient({
    apiKey: options.apiKey,
    timeoutMs: options.timeoutMs,
    baseUrl: options.baseUrl,
    fetchImpl: options.fetchImpl
  });

  return async (context: AgentHandlerContext): Promise<AgentOutputEnvelope> => {
    if (context.agent.id !== "product-agent") {
      throw new OrchestratorExecutionError(
        `Live Product adapter is bound to 'product-agent', received '${context.agent.id}'`
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
          name: "agent_output_envelope_v1",
          schema: AGENT_OUTPUT_RESPONSE_SCHEMA,
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

    await getSchemaValidator().validateOrThrow(
      "https://monitor/schemas/agent-output-envelope.schema.json",
      parsed,
      "live product agent output"
    );

    const output = parsed as AgentOutputEnvelope;

    if (output.taskId !== context.task.taskId) {
      throw new OrchestratorExecutionError(
        `Live Product Agent taskId mismatch: '${output.taskId}' != '${context.task.taskId}'`
      );
    }

    if (output.agentRole !== "PRODUCT") {
      throw new OrchestratorExecutionError(
        `Live Product Agent role must be 'PRODUCT', received '${output.agentRole}'`
      );
    }

    assertProductPlanningFields(output);
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
        "Use one valid action from Agent Output Envelope schema. For successful intake handoff use handoff_to_architect.",
      artifacts:
        "Return an array of non-empty string artifact refs. Include all artifacts required by target state.",
      productPlanningFields:
        "Populate metrics.problemStatement, metrics.scope, metrics.assumptions[], metrics.acceptanceCriteria[], metrics.backlogItem.",
      requiredArtifactsForTargetState
    }
  };

  return [
    "Produce Product Agent output for this task.",
    "Return exactly one JSON object following Agent Output Envelope v1.",
    JSON.stringify(payload, null, 2)
  ].join("\n\n");
}

function assertProductPlanningFields(output: AgentOutputEnvelope): void {
  const metrics = output.metrics;
  if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) {
    throw new OrchestratorExecutionError(
      "Live Product Agent output must include metrics object with planning fields"
    );
  }

  assertRequiredString(metrics.problemStatement, "metrics.problemStatement");
  assertRequiredString(metrics.scope, "metrics.scope");
  assertRequiredString(metrics.backlogItem, "metrics.backlogItem");
  assertStringArray(metrics.assumptions, "metrics.assumptions");
  assertStringArray(metrics.acceptanceCriteria, "metrics.acceptanceCriteria");
}

function assertRequiredString(value: unknown, fieldName: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new OrchestratorExecutionError(`Live Product Agent output missing required ${fieldName}`);
  }
}

function assertStringArray(value: unknown, fieldName: string): void {
  if (!Array.isArray(value) || value.length === 0) {
    throw new OrchestratorExecutionError(`Live Product Agent output missing required ${fieldName}`);
  }

  for (const item of value) {
    if (typeof item !== "string" || item.trim().length === 0) {
      throw new OrchestratorExecutionError(`${fieldName} must contain only non-empty strings`);
    }
  }
}
