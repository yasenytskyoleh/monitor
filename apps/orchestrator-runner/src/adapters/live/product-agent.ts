import type { AgentHandlerContext } from "@monitor/orchestrator-core";
import {
  ESCALATION_SCHEMA,
  nullableSchema,
  strictObjectSchema
} from "./schemas/openai-strict-schema.js";
import { createLiveAgentHandler } from "./core/execute-live-agent.js";
import type { LiveAdapterOptions } from "./core/types.js";
import { assertProductOutput } from "./validators/assert-product-output.js";

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
  return createLiveAgentHandler(options, {
    adapterLabel: "Live Product",
    boundAgentId: "product-agent",
    expectedRole: "PRODUCT",
    responseFormatName: "agent_output_envelope_v1",
    responseSchema: AGENT_OUTPUT_RESPONSE_SCHEMA,
    envelopeValidationContext: "live product agent output",
    nullableFields: ["risks", "notes", "escalation"],
    buildUserPrompt,
    assertSpecificOutput: assertProductOutput
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
