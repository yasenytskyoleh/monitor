import type { RuntimeConfigSnapshot, WorkflowTransition } from "@monitor/agent-config";

import {
  ApprovalValidationError,
  type ApprovalValidationResult,
  type TransitionApprovalInput,
  type WorkflowApproval
} from "./types.js";

export class ApprovalRegistry {
  private readonly approvalsByRef = new Map<string, WorkflowApproval>();

  public constructor(
    private readonly snapshot: RuntimeConfigSnapshot,
    private readonly runId: string
  ) {}

  public validateForTransition(input: TransitionApprovalInput): ApprovalValidationResult {
    const transition = this.findTransition(input.from, input.to);
    if (!transition) {
      return {
        evidence: {
          validationStatus: "not_required",
          evidenceSummary: "Transition is not declared in workflow graph"
        }
      };
    }

    if (!transition.requiresApproval) {
      return {
        evidence: {
          validationStatus: "not_required",
          evidenceSummary: "Transition does not require approval"
        }
      };
    }

    if (!input.approvalRef) {
      throw new ApprovalValidationError(
        `Missing required approval for transition ${input.from} -> ${input.to}`,
        { code: "MISSING_APPROVAL", category: "policy" }
      );
    }

    const approvalRef = input.approvalRef;
    const expectedType = transition.approvalType;
    if (!expectedType) {
      throw new ApprovalValidationError(
        `Workflow transition ${input.from} -> ${input.to} is approval-gated but has no approvalType`,
        { code: "APPROVAL_CONFIG_INCONSISTENT", category: "runtime" }
      );
    }

    if (approvalRef.approvalType !== expectedType) {
      throw new ApprovalValidationError(
        `Approval type mismatch for ${input.from} -> ${input.to}: expected '${expectedType}', received '${approvalRef.approvalType}'`,
        { code: "INVALID_APPROVAL_TYPE", category: "policy" }
      );
    }

    if (approvalRef.revokedAtUtc || approvalRef.revokedBy) {
      throw new ApprovalValidationError(
        `Approval '${approvalRef.approvalId}' is revoked`,
        { code: "APPROVAL_REVOKED", category: "policy" }
      );
    }

    if (approvalRef.status === "revoked") {
      throw new ApprovalValidationError(
        `Approval '${approvalRef.approvalId}' is revoked`,
        { code: "APPROVAL_REVOKED", category: "policy" }
      );
    }

    if (approvalRef.status !== "approved") {
      throw new ApprovalValidationError(
        `Approval '${approvalRef.approvalId}' is not granted (status '${approvalRef.status}')`,
        { code: "INVALID_APPROVAL_STATUS", category: "policy" }
      );
    }

    const grantedAt = parseUtcDate(approvalRef.approvedAtUtc, "approvalRef.approvedAtUtc");
    const effectiveExpiresAt = resolveEffectiveExpiryUtc(approvalRef, transition, grantedAt);
    const now = input.nowUtc ? parseUtcDate(input.nowUtc, "transition.nowUtc") : new Date();
    if (effectiveExpiresAt && effectiveExpiresAt.getTime() <= now.getTime()) {
      this.approvalsByRef.set(approvalRef.approvalId, {
        approvalRef: approvalRef.approvalId,
        approvalType: approvalRef.approvalType,
        taskId: input.taskId,
        runId: this.runId,
        issuedFor: {
          from: input.from,
          to: input.to
        },
        grantedBy: approvalRef.approvedBy,
        grantedAtUtc: approvalRef.approvedAtUtc,
        expiresAtUtc: effectiveExpiresAt.toISOString(),
        status: "expired",
        notes: ["Approval expired before transition execution"]
      });

      throw new ApprovalValidationError(
        `Approval '${approvalRef.approvalId}' is expired for transition ${input.from} -> ${input.to}`,
        { code: "APPROVAL_EXPIRED", category: "policy" }
      );
    }

    const existing = this.approvalsByRef.get(approvalRef.approvalId);
    if (existing) {
      if (existing.taskId !== input.taskId) {
        throw new ApprovalValidationError(
          `Approval '${approvalRef.approvalId}' was issued for task '${existing.taskId}', not '${input.taskId}'`,
          { code: "APPROVAL_TASK_MISMATCH", category: "policy" }
        );
      }

      if (existing.runId !== this.runId) {
        throw new ApprovalValidationError(
          `Approval '${approvalRef.approvalId}' was issued for run '${existing.runId}', not '${this.runId}'`,
          { code: "APPROVAL_RUN_MISMATCH", category: "policy" }
        );
      }

      if (existing.issuedFor.from !== input.from || existing.issuedFor.to !== input.to) {
        throw new ApprovalValidationError(
          `Approval '${approvalRef.approvalId}' was issued for ${existing.issuedFor.from} -> ${existing.issuedFor.to}, not ${input.from} -> ${input.to}`,
          { code: "APPROVAL_TRANSITION_MISMATCH", category: "policy" }
        );
      }

      if (existing.status !== "granted") {
        throw new ApprovalValidationError(
          `Approval '${approvalRef.approvalId}' is not granted (status '${existing.status}')`,
          { code: "INVALID_APPROVAL_STATUS", category: "policy" }
        );
      }
    }

    const approvalRecord: WorkflowApproval = {
      approvalRef: approvalRef.approvalId,
      approvalType: approvalRef.approvalType,
      taskId: input.taskId,
      runId: this.runId,
      issuedFor: {
        from: input.from,
        to: input.to
      },
      grantedBy: approvalRef.approvedBy,
      grantedAtUtc: approvalRef.approvedAtUtc,
      ...(effectiveExpiresAt ? { expiresAtUtc: effectiveExpiresAt.toISOString() } : {}),
      status: "granted"
    };

    this.approvalsByRef.set(approvalRef.approvalId, approvalRecord);
    return {
      approval: approvalRecord,
      evidence: {
        approvalRef: approvalRef.approvalId,
        approvalType: approvalRef.approvalType,
        validationStatus: "approved",
        evidenceSummary: `Approval '${approvalRef.approvalId}' validated for ${input.from} -> ${input.to}`
      }
    };
  }

  public listApprovals(): WorkflowApproval[] {
    return Array.from(this.approvalsByRef.values()).sort((left, right) =>
      left.grantedAtUtc.localeCompare(right.grantedAtUtc)
    );
  }

  private findTransition(from: string, to: string): WorkflowTransition | undefined {
    return this.snapshot.workflow.transitions.find(
      (transition) => transition.from === from && transition.to === to
    );
  }
}

function resolveEffectiveExpiryUtc(
  approvalRef: TransitionApprovalInput["approvalRef"],
  transition: WorkflowTransition,
  grantedAt: Date
): Date | undefined {
  if (!approvalRef) {
    return undefined;
  }

  if (approvalRef.expiresAtUtc) {
    return parseUtcDate(approvalRef.expiresAtUtc, "approvalRef.expiresAtUtc");
  }

  if (transition.approvalExpiresInMinutes && Number.isInteger(transition.approvalExpiresInMinutes)) {
    return new Date(grantedAt.getTime() + transition.approvalExpiresInMinutes * 60_000);
  }

  return undefined;
}

function parseUtcDate(value: string, field: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApprovalValidationError(`Invalid UTC timestamp for ${field}: ${value}`, {
      code: "MALFORMED_APPROVAL",
      category: "runtime"
    });
  }
  return parsed;
}
