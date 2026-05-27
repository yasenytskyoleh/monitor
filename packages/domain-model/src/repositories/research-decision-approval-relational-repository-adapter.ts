import type { ResearchDecisionApprovalDurableRecord } from "../storage/research-decision-approval-relational-slice.js";
import type { RepositoryErrorCode } from "./repository-error.js";

export const RESEARCH_DECISION_APPROVAL_RELATIONAL_ADAPTER_OPERATIONS = [
  "load_research_decision_approval_record",
  "list_research_decision_approval_records_by_research_feedback_decision_id",
  "insert_research_decision_approval_record"
] as const;
export type ResearchDecisionApprovalRelationalAdapterOperation =
  (typeof RESEARCH_DECISION_APPROVAL_RELATIONAL_ADAPTER_OPERATIONS)[number];

export const RESEARCH_DECISION_APPROVAL_RELATIONAL_DETERMINISTIC_ERROR_CODES = [
  "already_exists",
  "invalid_reference"
] as const;
export type ResearchDecisionApprovalRelationalDeterministicErrorCode =
  (typeof RESEARCH_DECISION_APPROVAL_RELATIONAL_DETERMINISTIC_ERROR_CODES)[number];

export const RESEARCH_DECISION_APPROVAL_RELATIONAL_RETRYABLE_ERROR_CODES = [
  "transient_failure",
  "unknown_failure"
] as const;
export type ResearchDecisionApprovalRelationalRetryableErrorCode =
  (typeof RESEARCH_DECISION_APPROVAL_RELATIONAL_RETRYABLE_ERROR_CODES)[number];

export type ResearchDecisionApprovalRecordWriteRequest = {
  record: ResearchDecisionApprovalDurableRecord;
};

export type ResearchDecisionApprovalRelationalAdapterErrorMapping = {
  deterministic: ResearchDecisionApprovalRelationalDeterministicErrorCode[];
  retryable: ResearchDecisionApprovalRelationalRetryableErrorCode[];
};

export const RESEARCH_DECISION_APPROVAL_RELATIONAL_ADAPTER_ERROR_MAPPING:
  ResearchDecisionApprovalRelationalAdapterErrorMapping = {
    deterministic: [...RESEARCH_DECISION_APPROVAL_RELATIONAL_DETERMINISTIC_ERROR_CODES],
    retryable: [...RESEARCH_DECISION_APPROVAL_RELATIONAL_RETRYABLE_ERROR_CODES]
  };

export type ResearchDecisionApprovalRelationalRepositoryAdapter = {
  loadResearchDecisionApprovalRecord(
    researchDecisionApprovalId: string
  ): Promise<ResearchDecisionApprovalDurableRecord | null>;
  listResearchDecisionApprovalRecordsByResearchFeedbackDecisionId(
    researchFeedbackDecisionId: string
  ): Promise<ResearchDecisionApprovalDurableRecord[]>;
  insertResearchDecisionApprovalRecord(
    request: ResearchDecisionApprovalRecordWriteRequest
  ): Promise<ResearchDecisionApprovalDurableRecord>;
};

export const isResearchDecisionApprovalRelationalDeterministicErrorCode = (
  code: RepositoryErrorCode
): code is ResearchDecisionApprovalRelationalDeterministicErrorCode =>
  RESEARCH_DECISION_APPROVAL_RELATIONAL_DETERMINISTIC_ERROR_CODES.includes(
    code as ResearchDecisionApprovalRelationalDeterministicErrorCode
  );
