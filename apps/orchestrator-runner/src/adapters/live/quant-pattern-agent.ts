import type { AgentHandlerContext } from "@monitor/orchestrator-core";
import { createLiveAgentHandler } from "./core/execute-live-agent.js";
import type { LiveAdapterOptions } from "./core/types.js";
import { QUANT_PATTERN_RESPONSE_SCHEMA } from "./schemas/quant-pattern-agent-response-schema.js";
import { assertQuantPatternOutput } from "./validators/assert-quant-pattern-output.js";

export type LiveQuantPatternAgentOptions = LiveAdapterOptions;

export function createLiveQuantPatternAgentHandler(options: LiveQuantPatternAgentOptions) {
  return createLiveAgentHandler(options, {
    adapterLabel: "Live Quant Pattern",
    boundAgentId: "quant-pattern-agent",
    expectedRole: "QUANT_PATTERN",
    responseFormatName: "quant_pattern_agent_output_v1",
    responseSchema: QUANT_PATTERN_RESPONSE_SCHEMA,
    envelopeValidationContext: "live quant pattern output",
    nullableFields: ["risks", "notes", "metrics", "escalation"],
    additionalSystemInstructions: [
      "Phase 1 boundaries are strict: spot-only, no leverage, no futures/perpetual assumptions, no funding-rate dependency."
    ],
    buildUserPrompt,
    assertSpecificOutput: assertQuantPatternOutput
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
