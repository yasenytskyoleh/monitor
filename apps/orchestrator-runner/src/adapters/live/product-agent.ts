import { OrchestratorExecutionError } from "@monitor/orchestrator-core";
import type { AgentHandlerContext, AgentOutputEnvelope } from "@monitor/orchestrator-core";
import {
  ESCALATION_SCHEMA,
  nullableSchema,
  strictObjectSchema
} from "./schemas/openai-strict-schema.js";
import { createStructuredLiveAgentHandler } from "./structured-live-handler.js";
import type { LiveAdapterOptions } from "./structured-live-handler.js";

export type LiveProductAgentOptions = LiveAdapterOptions;

const AGENT_OUTPUT_RESPONSE_SCHEMA: Record<string, unknown> = strictObjectSchema({
  taskId: { type: "string", minLength: 1 },
  agentRole: { type: "string", enum: ["PRODUCT"] },
  status: { type: "string", enum: ["completed", "blocked", "needs_escalation", "rejected"] },
  summary: { type: "string", minLength: 1 },
  artifacts: {
    type: "array",
    minItems: 1,
    items: { type: "string", minLength: 1 }
  },
  nextAction: {
    type: "string",
    enum: ["handoff_to_architect", "request_more_context", "close_task", "reject_task", "await_approval"]
  },
  risks: nullableSchema({
    type: "array",
    items: { type: "string", minLength: 1 }
  }),
  notes: nullableSchema({
    anyOf: [
      { type: "string", minLength: 1 },
      {
        type: "array",
        items: { type: "string", minLength: 1 }
      }
    ]
  }),
  metrics: strictObjectSchema({
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
  }),
  escalation: ESCALATION_SCHEMA
});

export function createLiveProductAgentHandler(options: LiveProductAgentOptions) {
  return createStructuredLiveAgentHandler(options, {
    adapterLabel: "Live Product",
    boundAgentId: "product-agent",
    expectedRole: "PRODUCT",
    responseFormatName: "agent_output_envelope_v1",
    responseSchema: AGENT_OUTPUT_RESPONSE_SCHEMA,
    envelopeValidationContext: "live product agent output",
    nullableFields: ["risks", "notes", "escalation"],
    buildUserPrompt,
    assertDomainOutput: assertProductPlanningFields
  });
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
  if (output.status === "needs_escalation") {
    const escalation = output.escalation;
    if (!escalation || typeof escalation !== "object" || Array.isArray(escalation)) {
      throw new OrchestratorExecutionError(
        "Live Product Agent output must include escalation for needs_escalation status"
      );
    }
  }

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
