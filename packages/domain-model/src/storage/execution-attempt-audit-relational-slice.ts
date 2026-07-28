import type { ExecutionAttemptAuditStatus } from "../execution/execution-attempt-audit.js";
import type { DownstreamActionTarget } from "../review/downstream-action-target.js";
import type { ReviewDecisionDownstreamCommandType } from "../review/review-decision-routing-result.js";
import type { DurableRelationalRecordBase } from "./first-durable-relational-slice.js";

export const EXECUTION_ATTEMPT_AUDIT_RELATIONAL_ENTITY_TYPES = [
  "execution_attempt_audit"
] as const;
export type ExecutionAttemptAuditRelationalEntityType =
  (typeof EXECUTION_ATTEMPT_AUDIT_RELATIONAL_ENTITY_TYPES)[number];

export type ExecutionAttemptAuditDurableRecord =
  DurableRelationalRecordBase<"execution_attempt_audit"> & {
    executionAttemptAuditStatus: ExecutionAttemptAuditStatus;
    routedActionExecutionEnvelopeId: string | null;
    reviewDecisionRoutingResultId: string | null;
    researchReviewDecisionId: string | null;
    actionTarget: DownstreamActionTarget;
    downstreamCommandType: ReviewDecisionDownstreamCommandType;
    attemptedBy: string;
    attemptedAtUtc: string;
    completedAtUtc: string | null;
    outcomeCode: string | null;
    outcomeSummary: string | null;
    warningCodes: string[];
  };
