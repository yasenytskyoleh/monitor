import type { AgentHandlerContext } from "@monitor/orchestrator-core";
import { createLiveAgentHandler } from "./core/execute-live-agent.js";
import type { LiveAdapterOptions } from "./core/types.js";
import { ARCHITECT_RESPONSE_SCHEMA } from "./schemas/architect-agent-response-schema.js";
import { assertArchitectOutput } from "./validators/assert-architect-output.js";

export type LiveArchitectAgentOptions = LiveAdapterOptions;

export function createLiveArchitectAgentHandler(options: LiveArchitectAgentOptions) {
  return createLiveAgentHandler(options, {
    adapterLabel: "Live Architect",
    boundAgentId: "architect-agent",
    expectedRole: "ARCHITECT",
    responseFormatName: "architect_agent_output_v1",
    responseSchema: ARCHITECT_RESPONSE_SCHEMA,
    envelopeValidationContext: "live architect agent output",
    nullableFields: ["risks", "notes", "metrics", "escalation"],
    buildUserPrompt,
    assertSpecificOutput: assertArchitectOutput
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
        "Use one valid action from the schema. For DESIGN -> FORMALIZE handoff use handoff_to_quant or await_approval.",
      artifacts:
        "Return only allowed Architect artifact types: architecture-design, adr-draft.",
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
