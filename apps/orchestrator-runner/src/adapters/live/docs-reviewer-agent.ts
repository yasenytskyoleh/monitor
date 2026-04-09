import { OrchestratorExecutionError } from "@monitor/orchestrator-core";
import type { AgentHandler, AgentHandlerContext, AgentOutputEnvelope } from "@monitor/orchestrator-core";

import {
  assertAgentOutputIdentity,
  loadPromptTemplateCached,
  parseOpenAiJsonOutput,
  validateAgentEnvelopeOutput
} from "./agent-output-helpers.js";
import { LiveOpenAiClient } from "./client.js";
import { assertDocsReviewerOutput } from "./docs-reviewer-output.js";
import { DOCS_REVIEWER_RESPONSE_SCHEMA } from "./schemas/docs-reviewer-agent-response-schema.js";

export type LiveDocsReviewerAgentOptions = {
  apiKey: string;
  promptsRootDir: string;
  model?: string;
  temperature?: number;
  timeoutMs?: number;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
};

export function createLiveDocsReviewerAgentHandler(options: LiveDocsReviewerAgentOptions): AgentHandler {
  const client = new LiveOpenAiClient({
    apiKey: options.apiKey,
    timeoutMs: options.timeoutMs,
    baseUrl: options.baseUrl,
    fetchImpl: options.fetchImpl
  });

  return async (context: AgentHandlerContext): Promise<AgentOutputEnvelope> => {
    if (context.agent.id !== "docs-reviewer-agent") {
      throw new OrchestratorExecutionError(
        `Live Docs Reviewer adapter is bound to 'docs-reviewer-agent', received '${context.agent.id}'`
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
          name: "docs_reviewer_agent_output_v1",
          schema: DOCS_REVIEWER_RESPONSE_SCHEMA,
          strict: true
        }
      },
      messages: [
        {
          role: "system",
          content: [
            promptText,
            "You are bounded to review semantics only. Do not invent architecture or implementation decisions.",
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

    const parsed = parseOpenAiJsonOutput(rawJson);
    const output = await validateAgentEnvelopeOutput({
      parsed,
      context: "live docs reviewer output",
      nullableFields: ["risks", "notes", "metrics", "escalation"]
    });
    assertAgentOutputIdentity(output, {
      expectedTaskId: context.task.taskId,
      expectedRole: "DOCS_REVIEWER",
      adapterLabel: "Live Docs Reviewer"
    });

    assertDocsReviewerOutput(output);
    return output;
  };
}

function buildUserPrompt(context: AgentHandlerContext): string {
  const requiredArtifactsForTargetState =
    context.snapshot.workflow.requiredArtifactsByState?.[context.targetState] ?? [];

  const payload = {
    task: context.task,
    targetState: context.targetState,
    artifactInventory: context.task.artifactRefs,
    outputRequirements: {
      status: "Use completed, blocked, needs_escalation, or rejected.",
      nextAction:
        "Use one valid action from the schema. Prefer await_approval when review evidence is complete.",
      artifacts:
        "Return an array of non-empty string artifact refs. Include docs-update and review-report when status is completed.",
      docsReviewFields:
        "When status=completed include metrics.docsUpdates[], metrics.reviewFindings[], metrics.changelogNotes[], metrics.traceabilityConfirmation.{isTraceable,notes[]}, metrics.missingArtifactWarnings[], metrics.driftWarnings[].",
      requiredArtifactsForTargetState
    }
  };

  return [
    "Produce Docs Reviewer Agent output for this task.",
    "Return exactly one JSON object following the provided schema.",
    JSON.stringify(payload, null, 2)
  ].join("\n\n");
}
