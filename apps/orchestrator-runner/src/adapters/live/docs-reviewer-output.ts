import { OrchestratorExecutionError } from "@monitor/orchestrator-core";
import type { AgentOutputEnvelope } from "@monitor/orchestrator-core";

export function assertDocsReviewerOutput(output: AgentOutputEnvelope): void {
  if (output.status === "needs_escalation") {
    const escalation = output.escalation;
    if (!escalation || typeof escalation !== "object" || Array.isArray(escalation)) {
      throw new OrchestratorExecutionError(
        "Schema validation failed for live docs reviewer output: escalation is required for needs_escalation status"
      );
    }
  }

  if (output.status !== "completed") {
    return;
  }

  const metrics = output.metrics;
  if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) {
    throw new OrchestratorExecutionError(
      "Schema validation failed for live docs reviewer output: metrics must be an object for completed status"
    );
  }

  assertStringArray(metrics.docsUpdates, "metrics.docsUpdates");
  assertStringArray(metrics.reviewFindings, "metrics.reviewFindings");
  assertStringArray(metrics.changelogNotes, "metrics.changelogNotes");
  assertStringArray(metrics.missingArtifactWarnings, "metrics.missingArtifactWarnings", true);
  assertStringArray(metrics.driftWarnings, "metrics.driftWarnings", true);

  const traceability = metrics.traceabilityConfirmation;
  if (!traceability || typeof traceability !== "object" || Array.isArray(traceability)) {
    throw new OrchestratorExecutionError(
      "Schema validation failed for live docs reviewer output: metrics.traceabilityConfirmation is required"
    );
  }

  const traceabilityRecord = traceability as Record<string, unknown>;

  if (typeof traceabilityRecord.isTraceable !== "boolean") {
    throw new OrchestratorExecutionError(
      "Schema validation failed for live docs reviewer output: metrics.traceabilityConfirmation.isTraceable must be boolean"
    );
  }

  assertStringArray(traceabilityRecord.notes, "metrics.traceabilityConfirmation.notes");
}

function assertStringArray(value: unknown, fieldName: string, allowEmpty = false): void {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    throw new OrchestratorExecutionError(
      `Schema validation failed for live docs reviewer output: ${fieldName} must be ${allowEmpty ? "a string array" : "a non-empty string array"}`
    );
  }

  for (const item of value) {
    if (typeof item !== "string" || item.trim().length === 0) {
      throw new OrchestratorExecutionError(
        `Schema validation failed for live docs reviewer output: ${fieldName} must contain only non-empty strings`
      );
    }
  }
}
