import type { DomainEntityBase, TimestampUtc } from "../common.js";
import type { DownstreamActionTarget } from "../review/downstream-action-target.js";
import type { ReviewDecisionDownstreamCommandType } from "../review/review-decision-routing-result.js";

export const EXECUTION_ATTEMPT_AUDIT_STATUSES = [
  "received",
  "executed",
  "rejected",
  "failed"
] as const;

export type ExecutionAttemptAuditStatus =
  (typeof EXECUTION_ATTEMPT_AUDIT_STATUSES)[number];

export type ExecutionAttemptAudit = DomainEntityBase & {
  attemptId: string;
  routedActionExecutionEnvelopeId?: string;
  reviewDecisionRoutingResultId?: string;
  researchReviewDecisionId?: string;
  actionTarget: DownstreamActionTarget;
  downstreamCommandType: ReviewDecisionDownstreamCommandType;
  status: ExecutionAttemptAuditStatus;
  attemptedBy: string;
  attemptedAt: TimestampUtc;
  completedAt?: TimestampUtc;
  outcomeCode?: string;
  outcomeSummary?: string;
  warningCodes: string[];
};
