import { WorkflowTransitionError } from "./errors.js";
import type { TransitionRequest, WorkflowGraphConfig, WorkflowTransition } from "./types.js";

export function assertTransitionAllowed(
  workflow: WorkflowGraphConfig,
  request: TransitionRequest
): WorkflowTransition {
  const transition = workflow.transitions.find(
    (candidate) => candidate.from === request.from && candidate.to === request.to
  );

  if (!transition) {
    throw new WorkflowTransitionError(`Transition is not allowed: ${request.from} -> ${request.to}`);
  }

  if (transition.requiresApproval) {
    if (!request.approvalRef) {
      throw new WorkflowTransitionError(`Transition ${request.from} -> ${request.to} requires an approval reference`);
    }

    if (request.approvalRef.approvalType !== transition.approvalType) {
      throw new WorkflowTransitionError(
        `Transition ${request.from} -> ${request.to} requires approvalType '${transition.approvalType}'`
      );
    }

    if (request.approvalRef.status !== "approved") {
      throw new WorkflowTransitionError(
        `Transition ${request.from} -> ${request.to} has non-approved status '${request.approvalRef.status}'`
      );
    }

    if (request.approvalRef.revokedAtUtc) {
      throw new WorkflowTransitionError(
        `Transition ${request.from} -> ${request.to} approval '${request.approvalRef.approvalId}' is revoked`
      );
    }

    if (request.approvalRef.expiresAtUtc) {
      const expiryDate = parseUtcDate(request.approvalRef.expiresAtUtc, "approvalRef.expiresAtUtc");
      const nowDate = request.nowUtc ? parseUtcDate(request.nowUtc, "request.nowUtc") : new Date();
      if (expiryDate.getTime() <= nowDate.getTime()) {
        throw new WorkflowTransitionError(
          `Transition ${request.from} -> ${request.to} approval '${request.approvalRef.approvalId}' is expired`
        );
      }
    }
  }

  return transition;
}

function parseUtcDate(value: string, field: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new WorkflowTransitionError(`Invalid UTC timestamp for ${field}: ${value}`);
  }
  return parsed;
}
