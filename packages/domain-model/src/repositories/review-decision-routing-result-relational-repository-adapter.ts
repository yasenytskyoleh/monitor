import type { ReviewDecisionRoutingResultDurableRecord } from "../storage/review-decision-routing-result-relational-slice.js";
import type { RepositoryErrorCode } from "./repository-error.js";

export const REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_ADAPTER_OPERATIONS = [
  "load_review_decision_routing_result_record",
  "list_review_decision_routing_result_records_by_research_review_decision_id",
  "insert_review_decision_routing_result_record"
] as const;
export type ReviewDecisionRoutingResultRelationalAdapterOperation =
  (typeof REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_ADAPTER_OPERATIONS)[number];

export const REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_DETERMINISTIC_ERROR_CODES = [
  "already_exists",
  "invalid_reference"
] as const;
export type ReviewDecisionRoutingResultRelationalDeterministicErrorCode =
  (typeof REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_DETERMINISTIC_ERROR_CODES)[number];

export const REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_RETRYABLE_ERROR_CODES = [
  "transient_failure",
  "unknown_failure"
] as const;
export type ReviewDecisionRoutingResultRelationalRetryableErrorCode =
  (typeof REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_RETRYABLE_ERROR_CODES)[number];

export type ReviewDecisionRoutingResultRecordWriteRequest = {
  record: ReviewDecisionRoutingResultDurableRecord;
};

export type ReviewDecisionRoutingResultRelationalAdapterErrorMapping = {
  deterministic: ReviewDecisionRoutingResultRelationalDeterministicErrorCode[];
  retryable: ReviewDecisionRoutingResultRelationalRetryableErrorCode[];
};

export const REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_ADAPTER_ERROR_MAPPING:
  ReviewDecisionRoutingResultRelationalAdapterErrorMapping = {
    deterministic: [...REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_DETERMINISTIC_ERROR_CODES],
    retryable: [...REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_RETRYABLE_ERROR_CODES]
  };

export type ReviewDecisionRoutingResultRelationalRepositoryAdapter = {
  loadReviewDecisionRoutingResultRecord(
    reviewDecisionRoutingResultId: string
  ): Promise<ReviewDecisionRoutingResultDurableRecord | null>;
  listReviewDecisionRoutingResultRecordsByResearchReviewDecisionId(
    researchReviewDecisionId: string
  ): Promise<ReviewDecisionRoutingResultDurableRecord[]>;
  insertReviewDecisionRoutingResultRecord(
    request: ReviewDecisionRoutingResultRecordWriteRequest
  ): Promise<ReviewDecisionRoutingResultDurableRecord>;
};

export const isReviewDecisionRoutingResultRelationalDeterministicErrorCode = (
  code: RepositoryErrorCode
): code is ReviewDecisionRoutingResultRelationalDeterministicErrorCode =>
  REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_DETERMINISTIC_ERROR_CODES.includes(
    code as ReviewDecisionRoutingResultRelationalDeterministicErrorCode
  );
