import { OrchestratorExecutionError } from "@monitor/orchestrator-core";
import type { AgentOutputEnvelope } from "@monitor/orchestrator-core";

const DISALLOWED_TERMS = ["futures", "perpetual", "funding rate", "funding-rate", "leverage"];

export function assertQuantPatternOutput(output: AgentOutputEnvelope): void {
  if (output.status === "needs_escalation") {
    const escalation = output.escalation;
    if (!escalation || typeof escalation !== "object" || Array.isArray(escalation)) {
      throw new OrchestratorExecutionError(
        "Schema validation failed for live quant pattern output: escalation is required for needs_escalation status"
      );
    }
  }

  if (output.status !== "completed") {
    return;
  }

  const metrics = output.metrics;
  if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) {
    throw new OrchestratorExecutionError(
      "Schema validation failed for live quant pattern output: metrics must be an object for completed status"
    );
  }

  assertRequiredString(metrics.patternDefinition, "metrics.patternDefinition");
  assertStringArray(metrics.measurableConditions, "metrics.measurableConditions");
  assertStringArray(metrics.metricsPlan, "metrics.metricsPlan");
  assertRequiredString(metrics.evaluationHorizon, "metrics.evaluationHorizon");
  assertStringArray(metrics.invalidationAssumptions, "metrics.invalidationAssumptions");
  assertRequiredString(metrics.edgeHypothesis, "metrics.edgeHypothesis");
  assertStringArray(metrics.testScenarios, "metrics.testScenarios");
  assertPhaseScope(metrics.phaseScope);
  assertNoDisallowedTerms(output.summary, "summary");
  assertNoDisallowedTerms(metrics.patternDefinition, "metrics.patternDefinition");
  assertNoDisallowedTerms(metrics.edgeHypothesis, "metrics.edgeHypothesis");
}

function assertPhaseScope(value: unknown): void {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new OrchestratorExecutionError(
      "Schema validation failed for live quant pattern output: metrics.phaseScope is required"
    );
  }

  const phaseScope = value as Record<string, unknown>;
  if (phaseScope.marketType !== "SPOT_ONLY") {
    throw new OrchestratorExecutionError(
      "Schema validation failed for live quant pattern output: metrics.phaseScope.marketType must be SPOT_ONLY"
    );
  }
  if (phaseScope.leverage !== "NONE") {
    throw new OrchestratorExecutionError(
      "Schema validation failed for live quant pattern output: metrics.phaseScope.leverage must be NONE"
    );
  }
  if (phaseScope.fundingRateDependency !== "NOT_REQUIRED") {
    throw new OrchestratorExecutionError(
      "Schema validation failed for live quant pattern output: metrics.phaseScope.fundingRateDependency must be NOT_REQUIRED"
    );
  }
  if (phaseScope.derivatives !== "NONE") {
    throw new OrchestratorExecutionError(
      "Schema validation failed for live quant pattern output: metrics.phaseScope.derivatives must be NONE"
    );
  }
}

function assertRequiredString(value: unknown, fieldName: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new OrchestratorExecutionError(
      `Schema validation failed for live quant pattern output: ${fieldName} is required`
    );
  }
}

function assertStringArray(value: unknown, fieldName: string): void {
  if (!Array.isArray(value) || value.length === 0) {
    throw new OrchestratorExecutionError(
      `Schema validation failed for live quant pattern output: ${fieldName} must be a non-empty string array`
    );
  }

  for (const item of value) {
    if (typeof item !== "string" || item.trim().length === 0) {
      throw new OrchestratorExecutionError(
        `Schema validation failed for live quant pattern output: ${fieldName} must contain only non-empty strings`
      );
    }
  }
}

function assertNoDisallowedTerms(value: unknown, fieldName: string): void {
  if (typeof value !== "string") {
    return;
  }
  const normalized = value.toLowerCase();
  for (const term of DISALLOWED_TERMS) {
    if (normalized.includes(term)) {
      throw new OrchestratorExecutionError(
        `Schema validation failed for live quant pattern output: ${fieldName} contains unsupported Phase 1 term '${term}'`
      );
    }
  }
}
