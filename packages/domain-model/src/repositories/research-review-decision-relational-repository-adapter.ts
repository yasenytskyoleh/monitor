import type { ResearchReviewDecisionDurableRecord } from "../storage/research-review-decision-relational-slice.js";
import type { RepositoryErrorCode } from "./repository-error.js";

export const RESEARCH_REVIEW_DECISION_RELATIONAL_ADAPTER_OPERATIONS = [
  "load_research_review_decision_record",
  "list_research_review_decision_records_by_review_packet_id",
  "list_research_review_decision_records_by_setup_family_id",
  "insert_research_review_decision_record"
] as const;
export type ResearchReviewDecisionRelationalAdapterOperation =
  (typeof RESEARCH_REVIEW_DECISION_RELATIONAL_ADAPTER_OPERATIONS)[number];

export const RESEARCH_REVIEW_DECISION_RELATIONAL_DETERMINISTIC_ERROR_CODES = [
  "already_exists",
  "invalid_reference"
] as const;
export type ResearchReviewDecisionRelationalDeterministicErrorCode =
  (typeof RESEARCH_REVIEW_DECISION_RELATIONAL_DETERMINISTIC_ERROR_CODES)[number];

export const RESEARCH_REVIEW_DECISION_RELATIONAL_RETRYABLE_ERROR_CODES = [
  "transient_failure",
  "unknown_failure"
] as const;
export type ResearchReviewDecisionRelationalRetryableErrorCode =
  (typeof RESEARCH_REVIEW_DECISION_RELATIONAL_RETRYABLE_ERROR_CODES)[number];

export type ResearchReviewDecisionRecordWriteRequest = {
  record: ResearchReviewDecisionDurableRecord;
};

export type ResearchReviewDecisionRelationalAdapterErrorMapping = {
  deterministic: ResearchReviewDecisionRelationalDeterministicErrorCode[];
  retryable: ResearchReviewDecisionRelationalRetryableErrorCode[];
};

export const RESEARCH_REVIEW_DECISION_RELATIONAL_ADAPTER_ERROR_MAPPING:
  ResearchReviewDecisionRelationalAdapterErrorMapping = {
    deterministic: [...RESEARCH_REVIEW_DECISION_RELATIONAL_DETERMINISTIC_ERROR_CODES],
    retryable: [...RESEARCH_REVIEW_DECISION_RELATIONAL_RETRYABLE_ERROR_CODES]
  };

export type ResearchReviewDecisionRelationalRepositoryAdapter = {
  loadResearchReviewDecisionRecord(
    researchReviewDecisionId: string
  ): Promise<ResearchReviewDecisionDurableRecord | null>;
  listResearchReviewDecisionRecordsByReviewPacketId(
    researchReviewPacketId: string
  ): Promise<ResearchReviewDecisionDurableRecord[]>;
  listResearchReviewDecisionRecordsBySetupFamilyId(
    setupFamilyId: string
  ): Promise<ResearchReviewDecisionDurableRecord[]>;
  insertResearchReviewDecisionRecord(
    request: ResearchReviewDecisionRecordWriteRequest
  ): Promise<ResearchReviewDecisionDurableRecord>;
};

export const isResearchReviewDecisionRelationalDeterministicErrorCode = (
  code: RepositoryErrorCode
): code is ResearchReviewDecisionRelationalDeterministicErrorCode =>
  RESEARCH_REVIEW_DECISION_RELATIONAL_DETERMINISTIC_ERROR_CODES.includes(
    code as ResearchReviewDecisionRelationalDeterministicErrorCode
  );
