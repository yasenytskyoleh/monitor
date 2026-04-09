import type { AgentOutputEnvelope } from "@monitor/orchestrator-core";

import { AgentSpecificValidationError } from "../core/errors.js";

export function assertEscalationForNeedsEscalation(output: AgentOutputEnvelope, message: string): void {
  if (output.status !== "needs_escalation") {
    return;
  }

  const escalation = output.escalation;
  if (!escalation || typeof escalation !== "object" || Array.isArray(escalation)) {
    throw new AgentSpecificValidationError(message);
  }
}

export function assertRequiredString(value: unknown, message: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AgentSpecificValidationError(message);
  }
}

export function assertStringArray(value: unknown, message: string, allowEmpty = false): void {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    throw new AgentSpecificValidationError(message);
  }

  for (const item of value) {
    if (typeof item !== "string" || item.trim().length === 0) {
      throw new AgentSpecificValidationError(message);
    }
  }
}
