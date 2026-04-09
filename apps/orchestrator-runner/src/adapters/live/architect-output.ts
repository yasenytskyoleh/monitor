import { OrchestratorExecutionError } from "@monitor/orchestrator-core";
import type { AgentOutputEnvelope } from "@monitor/orchestrator-core";

export function assertArchitectDesignOutput(output: AgentOutputEnvelope): void {
  if (output.status === "needs_escalation") {
    const escalation = output.escalation;
    if (!escalation || typeof escalation !== "object" || Array.isArray(escalation)) {
      throw new OrchestratorExecutionError(
        "Schema validation failed for live architect agent output: escalation is required for needs_escalation status"
      );
    }
  }

  if (output.status !== "completed") {
    return;
  }

  const metrics = output.metrics;
  if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) {
    throw new OrchestratorExecutionError(
      "Schema validation failed for live architect agent output: metrics must be an object for completed status"
    );
  }

  assertStringArray(metrics.moduleBoundaries, "metrics.moduleBoundaries");
  assertStringArray(metrics.dataFlow, "metrics.dataFlow");
  assertStringArray(metrics.contractDefinitions, "metrics.contractDefinitions");
  assertRequiredString(metrics.adrDraft, "metrics.adrDraft");
  assertStringArray(metrics.riskNotes, "metrics.riskNotes");
}

function assertRequiredString(value: unknown, fieldName: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new OrchestratorExecutionError(
      `Schema validation failed for live architect agent output: ${fieldName} is required`
    );
  }
}

function assertStringArray(value: unknown, fieldName: string): void {
  if (!Array.isArray(value) || value.length === 0) {
    throw new OrchestratorExecutionError(
      `Schema validation failed for live architect agent output: ${fieldName} must be a non-empty string array`
    );
  }

  for (const item of value) {
    if (typeof item !== "string" || item.trim().length === 0) {
      throw new OrchestratorExecutionError(
        `Schema validation failed for live architect agent output: ${fieldName} must contain only non-empty strings`
      );
    }
  }
}
