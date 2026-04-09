import type { AgentOutputEnvelope } from "@monitor/orchestrator-core";

import { AgentSpecificValidationError } from "../core/errors.js";
import { assertEscalationForNeedsEscalation, assertRequiredString, assertStringArray } from "./shared.js";

export function assertProductOutput(output: AgentOutputEnvelope): void {
  assertEscalationForNeedsEscalation(
    output,
    "Live Product Agent output must include escalation for needs_escalation status"
  );

  const metrics = output.metrics;
  if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) {
    throw new AgentSpecificValidationError(
      "Live Product Agent output must include metrics object with planning fields"
    );
  }

  assertRequiredString(
    metrics.problemStatement,
    "Live Product Agent output missing required metrics.problemStatement"
  );
  assertRequiredString(metrics.scope, "Live Product Agent output missing required metrics.scope");
  assertRequiredString(metrics.backlogItem, "Live Product Agent output missing required metrics.backlogItem");
  assertStringArray(
    metrics.assumptions,
    "Live Product Agent output missing required metrics.assumptions"
  );
  assertStringArray(
    metrics.acceptanceCriteria,
    "Live Product Agent output missing required metrics.acceptanceCriteria"
  );
}
