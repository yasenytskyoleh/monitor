import type { ResearchFeedbackDecisionDurableRecord } from "../storage/research-feedback-decision-relational-slice.js";
import type { RepositoryErrorCode } from "./repository-error.js";

export const RESEARCH_FEEDBACK_DECISION_RELATIONAL_ADAPTER_OPERATIONS = [
  "load_research_feedback_decision_record",
  "list_research_feedback_decision_records_by_setup_definition_id",
  "list_research_feedback_decision_records_by_research_hypothesis_id",
  "insert_research_feedback_decision_record",
  "update_research_feedback_decision_record"
] as const;
export type ResearchFeedbackDecisionRelationalAdapterOperation =
  (typeof RESEARCH_FEEDBACK_DECISION_RELATIONAL_ADAPTER_OPERATIONS)[number];

export const RESEARCH_FEEDBACK_DECISION_RELATIONAL_DETERMINISTIC_ERROR_CODES = [
  "already_exists",
  "not_found",
  "version_mismatch",
  "invalid_reference"
] as const;
export type ResearchFeedbackDecisionRelationalDeterministicErrorCode =
  (typeof RESEARCH_FEEDBACK_DECISION_RELATIONAL_DETERMINISTIC_ERROR_CODES)[number];

export const RESEARCH_FEEDBACK_DECISION_RELATIONAL_RETRYABLE_ERROR_CODES = [
  "transient_failure",
  "unknown_failure"
] as const;
export type ResearchFeedbackDecisionRelationalRetryableErrorCode =
  (typeof RESEARCH_FEEDBACK_DECISION_RELATIONAL_RETRYABLE_ERROR_CODES)[number];

export type ResearchFeedbackDecisionRecordWriteRequest = {
  record: ResearchFeedbackDecisionDurableRecord;
  expectedVersion: number | null;
};

export type ResearchFeedbackDecisionRelationalAdapterErrorMapping = {
  deterministic: ResearchFeedbackDecisionRelationalDeterministicErrorCode[];
  retryable: ResearchFeedbackDecisionRelationalRetryableErrorCode[];
};

export const RESEARCH_FEEDBACK_DECISION_RELATIONAL_ADAPTER_ERROR_MAPPING:
  ResearchFeedbackDecisionRelationalAdapterErrorMapping = {
    deterministic: [...RESEARCH_FEEDBACK_DECISION_RELATIONAL_DETERMINISTIC_ERROR_CODES],
    retryable: [...RESEARCH_FEEDBACK_DECISION_RELATIONAL_RETRYABLE_ERROR_CODES]
  };

export type ResearchFeedbackDecisionRelationalRepositoryAdapter = {
  loadResearchFeedbackDecisionRecord(
    researchFeedbackDecisionId: string
  ): Promise<ResearchFeedbackDecisionDurableRecord | null>;
  listResearchFeedbackDecisionRecordsBySetupDefinitionId(
    setupDefinitionId: string
  ): Promise<ResearchFeedbackDecisionDurableRecord[]>;
  listResearchFeedbackDecisionRecordsByResearchHypothesisId(
    researchHypothesisId: string
  ): Promise<ResearchFeedbackDecisionDurableRecord[]>;
  insertResearchFeedbackDecisionRecord(
    request: ResearchFeedbackDecisionRecordWriteRequest
  ): Promise<ResearchFeedbackDecisionDurableRecord>;
  updateResearchFeedbackDecisionRecord(
    request: ResearchFeedbackDecisionRecordWriteRequest
  ): Promise<ResearchFeedbackDecisionDurableRecord>;
};

export const isResearchFeedbackDecisionRelationalDeterministicErrorCode = (
  code: RepositoryErrorCode
): code is ResearchFeedbackDecisionRelationalDeterministicErrorCode =>
  RESEARCH_FEEDBACK_DECISION_RELATIONAL_DETERMINISTIC_ERROR_CODES.includes(
    code as ResearchFeedbackDecisionRelationalDeterministicErrorCode
  );
