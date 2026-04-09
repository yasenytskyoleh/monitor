import type { AgentOutputEnvelope } from "@monitor/orchestrator-core";

import { AgentSpecificValidationError } from "../core/errors.js";
import { assertEscalationForNeedsEscalation, assertRequiredString, assertStringArray } from "./shared.js";

export function assertArchitectOutput(output: AgentOutputEnvelope): void {
  assertEscalationForNeedsEscalation(
    output,
    "Schema validation failed for live architect agent output: escalation is required for needs_escalation status"
  );

  if (output.status !== "completed") {
    return;
  }

  const metrics = output.metrics;
  if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) {
    throw new AgentSpecificValidationError(
      "Schema validation failed for live architect agent output: metrics must be an object for completed status"
    );
  }

  assertStringArray(
    metrics.moduleBoundaries,
    "Schema validation failed for live architect agent output: metrics.moduleBoundaries must be a non-empty string array"
  );
  assertStringArray(
    metrics.dataFlow,
    "Schema validation failed for live architect agent output: metrics.dataFlow must be a non-empty string array"
  );
  assertStringArray(
    metrics.contractDefinitions,
    "Schema validation failed for live architect agent output: metrics.contractDefinitions must be a non-empty string array"
  );
  assertRequiredString(
    metrics.adrDraft,
    "Schema validation failed for live architect agent output: metrics.adrDraft is required"
  );
  assertStringArray(
    metrics.riskNotes,
    "Schema validation failed for live architect agent output: metrics.riskNotes must be a non-empty string array"
  );
}
