import type { TimestampUtc } from "../common.js";
import type { DownstreamActionTarget } from "../review/downstream-action-target.js";
import type { ReviewDecisionDownstreamCommandType } from "../review/review-decision-routing-result.js";
import type { RoutedActionExecutionEnvelope } from "./routed-action-execution-envelope.js";

export const ROUTED_ACTION_EXECUTION_RESULT_STATUSES = [
  "prepared",
  "no_envelope",
  "rejected_validation",
  "rejected_lifecycle",
  "failed"
] as const;

export type RoutedActionExecutionResultStatus =
  (typeof ROUTED_ACTION_EXECUTION_RESULT_STATUSES)[number];

export type RoutedActionExecutionResult = {
  status: RoutedActionExecutionResultStatus;
  envelope?: RoutedActionExecutionEnvelope;
  envelopeId?: string;
  reviewDecisionRoutingResultId?: string;
  researchReviewDecisionId?: string;
  actionTarget?: DownstreamActionTarget;
  downstreamCommandType?: ReviewDecisionDownstreamCommandType;
  preparedAt?: TimestampUtc;
  reason?: string;
  warnings: string[];
};
