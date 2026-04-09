import type { AgentOutputEnvelope } from "@monitor/orchestrator-core";

import { AgentSpecificValidationError } from "../core/errors.js";
import { assertEscalationForNeedsEscalation, assertStringArray } from "./shared.js";

export function assertDocsReviewerOutput(output: AgentOutputEnvelope): void {
  assertEscalationForNeedsEscalation(
    output,
    "Schema validation failed for live docs reviewer output: escalation is required for needs_escalation status"
  );

  if (output.status !== "completed") {
    return;
  }

  const metrics = output.metrics;
  if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) {
    throw new AgentSpecificValidationError(
      "Schema validation failed for live docs reviewer output: metrics must be an object for completed status"
    );
  }

  assertStringArray(
    metrics.docsUpdates,
    "Schema validation failed for live docs reviewer output: metrics.docsUpdates must be a non-empty string array"
  );
  assertStringArray(
    metrics.reviewFindings,
    "Schema validation failed for live docs reviewer output: metrics.reviewFindings must be a non-empty string array"
  );
  assertStringArray(
    metrics.changelogNotes,
    "Schema validation failed for live docs reviewer output: metrics.changelogNotes must be a non-empty string array"
  );
  assertStringArray(
    metrics.missingArtifactWarnings,
    "Schema validation failed for live docs reviewer output: metrics.missingArtifactWarnings must be a string array",
    true
  );
  assertStringArray(
    metrics.driftWarnings,
    "Schema validation failed for live docs reviewer output: metrics.driftWarnings must be a string array",
    true
  );

  const traceability = metrics.traceabilityConfirmation;
  if (!traceability || typeof traceability !== "object" || Array.isArray(traceability)) {
    throw new AgentSpecificValidationError(
      "Schema validation failed for live docs reviewer output: metrics.traceabilityConfirmation is required"
    );
  }

  const traceabilityRecord = traceability as Record<string, unknown>;
  if (typeof traceabilityRecord.isTraceable !== "boolean") {
    throw new AgentSpecificValidationError(
      "Schema validation failed for live docs reviewer output: metrics.traceabilityConfirmation.isTraceable must be boolean"
    );
  }

  assertStringArray(
    traceabilityRecord.notes,
    "Schema validation failed for live docs reviewer output: metrics.traceabilityConfirmation.notes must be a non-empty string array"
  );
}
