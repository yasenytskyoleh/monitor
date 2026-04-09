import type { AgentOutputEnvelope } from "@monitor/orchestrator-core";

import { AgentSpecificValidationError } from "../core/errors.js";
import { assertEscalationForNeedsEscalation, assertRequiredString, assertStringArray } from "./shared.js";

const DISALLOWED_TERMS = ["futures", "perpetual", "funding rate", "funding-rate", "leverage"];

export function assertQuantPatternOutput(output: AgentOutputEnvelope): void {
  assertEscalationForNeedsEscalation(
    output,
    "Schema validation failed for live quant pattern output: escalation is required for needs_escalation status"
  );

  if (output.status !== "completed") {
    return;
  }

  const metrics = output.metrics;
  if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) {
    throw new AgentSpecificValidationError(
      "Schema validation failed for live quant pattern output: metrics must be an object for completed status"
    );
  }

  assertRequiredString(
    metrics.patternDefinition,
    "Schema validation failed for live quant pattern output: metrics.patternDefinition is required"
  );
  assertStringArray(
    metrics.measurableConditions,
    "Schema validation failed for live quant pattern output: metrics.measurableConditions must be a non-empty string array"
  );
  assertStringArray(
    metrics.metricsPlan,
    "Schema validation failed for live quant pattern output: metrics.metricsPlan must be a non-empty string array"
  );
  assertRequiredString(
    metrics.evaluationHorizon,
    "Schema validation failed for live quant pattern output: metrics.evaluationHorizon is required"
  );
  assertStringArray(
    metrics.invalidationAssumptions,
    "Schema validation failed for live quant pattern output: metrics.invalidationAssumptions must be a non-empty string array"
  );
  assertRequiredString(
    metrics.edgeHypothesis,
    "Schema validation failed for live quant pattern output: metrics.edgeHypothesis is required"
  );
  assertStringArray(
    metrics.testScenarios,
    "Schema validation failed for live quant pattern output: metrics.testScenarios must be a non-empty string array"
  );
  assertPhaseScope(metrics.phaseScope);
  assertNoDisallowedTerms(
    output.summary,
    "Schema validation failed for live quant pattern output: summary contains unsupported Phase 1 term"
  );
  assertNoDisallowedTerms(
    metrics.patternDefinition,
    "Schema validation failed for live quant pattern output: metrics.patternDefinition contains unsupported Phase 1 term"
  );
  assertNoDisallowedTerms(
    metrics.edgeHypothesis,
    "Schema validation failed for live quant pattern output: metrics.edgeHypothesis contains unsupported Phase 1 term"
  );
}

function assertPhaseScope(value: unknown): void {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AgentSpecificValidationError(
      "Schema validation failed for live quant pattern output: metrics.phaseScope is required"
    );
  }

  const phaseScope = value as Record<string, unknown>;
  if (phaseScope.marketType !== "SPOT_ONLY") {
    throw new AgentSpecificValidationError(
      "Schema validation failed for live quant pattern output: metrics.phaseScope.marketType must be SPOT_ONLY"
    );
  }
  if (phaseScope.leverage !== "NONE") {
    throw new AgentSpecificValidationError(
      "Schema validation failed for live quant pattern output: metrics.phaseScope.leverage must be NONE"
    );
  }
  if (phaseScope.fundingRateDependency !== "NOT_REQUIRED") {
    throw new AgentSpecificValidationError(
      "Schema validation failed for live quant pattern output: metrics.phaseScope.fundingRateDependency must be NOT_REQUIRED"
    );
  }
  if (phaseScope.derivatives !== "NONE") {
    throw new AgentSpecificValidationError(
      "Schema validation failed for live quant pattern output: metrics.phaseScope.derivatives must be NONE"
    );
  }
}

function assertNoDisallowedTerms(value: unknown, messagePrefix: string): void {
  if (typeof value !== "string") {
    return;
  }

  const normalized = value.toLowerCase();
  for (const term of DISALLOWED_TERMS) {
    if (normalized.includes(term)) {
      throw new AgentSpecificValidationError(`${messagePrefix} '${term}'`);
    }
  }
}
