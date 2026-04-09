import type { TransitionResult } from "@monitor/orchestrator-core";

import type { ApprovalTransitionEvidence } from "./types.js";

export function approvalEvidenceByTransitionChecksum(
  transitionResult: TransitionResult,
  evidence: ApprovalTransitionEvidence
): Record<string, ApprovalTransitionEvidence> {
  return {
    [transitionResult.transition.transitionChecksum]: evidence
  };
}

