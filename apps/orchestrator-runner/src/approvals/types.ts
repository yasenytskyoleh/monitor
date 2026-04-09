import type { ApprovalReference, ApprovalType } from "@monitor/agent-config";

export type WorkflowApprovalStatus = "granted" | "expired" | "revoked";

export type WorkflowApproval = {
  approvalRef: string;
  approvalType: ApprovalType;
  taskId: string;
  runId: string;
  issuedFor: {
    from: string;
    to: string;
  };
  grantedBy: string;
  grantedAtUtc: string;
  expiresAtUtc?: string;
  status: WorkflowApprovalStatus;
  notes?: string[];
};

export type TransitionValidationStatus = "approved" | "not_required" | "blocked";

export type ApprovalTransitionEvidence = {
  approvalRef?: string;
  approvalType?: ApprovalType;
  validationStatus: TransitionValidationStatus;
  evidenceSummary: string;
};

export type ApprovalValidationResult = {
  approval?: WorkflowApproval;
  evidence: ApprovalTransitionEvidence;
};

export type ApprovalValidationErrorCategory = "policy" | "runtime";

export class ApprovalValidationError extends Error {
  public readonly code: string;
  public readonly category: ApprovalValidationErrorCategory;

  public constructor(message: string, options: { code: string; category: ApprovalValidationErrorCategory }) {
    super(message);
    this.name = "ApprovalValidationError";
    this.code = options.code;
    this.category = options.category;
  }
}

export function isApprovalValidationError(error: unknown): error is ApprovalValidationError {
  return error instanceof ApprovalValidationError;
}

export function isPolicyApprovalError(error: unknown): error is ApprovalValidationError {
  return isApprovalValidationError(error) && error.category === "policy";
}

export type TransitionApprovalInput = {
  taskId: string;
  from: string;
  to: string;
  nowUtc?: string;
  approvalRef?: ApprovalReference;
};
