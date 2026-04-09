import type { AgentOutputEnvelope } from "@monitor/orchestrator-core";

import {
  DEFAULT_BACKEND_SAFETY_POLICY,
  parseBackendSafetyMetrics,
  type BackendSafetyPolicy,
  validateBackendSafetyRules
} from "./backend-safety-rules.js";
import { assertEscalationForNeedsEscalation } from "./shared.js";

export function assertBackendOutput(
  output: AgentOutputEnvelope,
  policy: BackendSafetyPolicy = DEFAULT_BACKEND_SAFETY_POLICY
): void {
  assertEscalationForNeedsEscalation(
    output,
    "Schema validation failed for live backend output: escalation is required for needs_escalation status"
  );

  if (output.status !== "completed") {
    return;
  }

  const metrics = parseBackendSafetyMetrics(output.metrics);
  validateBackendSafetyRules(metrics, policy);
}
