import type { SetupRefinementRequestDurableRecord } from "../storage/setup-refinement-request-relational-slice.js";
import type { RepositoryErrorCode } from "./repository-error.js";

export const SETUP_REFINEMENT_REQUEST_RELATIONAL_ADAPTER_OPERATIONS = [
  "load_setup_refinement_request",
  "list_setup_refinement_requests_by_setup_definition_id",
  "list_setup_refinement_requests_by_research_decision_approval_id",
  "insert_setup_refinement_request"
] as const;
export type SetupRefinementRequestRelationalAdapterOperation =
  (typeof SETUP_REFINEMENT_REQUEST_RELATIONAL_ADAPTER_OPERATIONS)[number];

export const SETUP_REFINEMENT_REQUEST_RELATIONAL_DETERMINISTIC_ERROR_CODES = [
  "already_exists",
  "invalid_reference"
] as const;
export type SetupRefinementRequestRelationalDeterministicErrorCode =
  (typeof SETUP_REFINEMENT_REQUEST_RELATIONAL_DETERMINISTIC_ERROR_CODES)[number];

export const SETUP_REFINEMENT_REQUEST_RELATIONAL_RETRYABLE_ERROR_CODES = [
  "transient_failure",
  "unknown_failure"
] as const;
export type SetupRefinementRequestRelationalRetryableErrorCode =
  (typeof SETUP_REFINEMENT_REQUEST_RELATIONAL_RETRYABLE_ERROR_CODES)[number];

export type SetupRefinementRequestRecordWriteRequest = {
  record: SetupRefinementRequestDurableRecord;
};

export type SetupRefinementRequestRelationalAdapterErrorMapping = {
  deterministic: SetupRefinementRequestRelationalDeterministicErrorCode[];
  retryable: SetupRefinementRequestRelationalRetryableErrorCode[];
};

export const SETUP_REFINEMENT_REQUEST_RELATIONAL_ADAPTER_ERROR_MAPPING:
  SetupRefinementRequestRelationalAdapterErrorMapping = {
    deterministic: [...SETUP_REFINEMENT_REQUEST_RELATIONAL_DETERMINISTIC_ERROR_CODES],
    retryable: [...SETUP_REFINEMENT_REQUEST_RELATIONAL_RETRYABLE_ERROR_CODES]
  };

export type SetupRefinementRequestRelationalRepositoryAdapter = {
  loadSetupRefinementRequest(
    setupRefinementRequestId: string
  ): Promise<SetupRefinementRequestDurableRecord | null>;
  listSetupRefinementRequestsBySetupDefinitionId(
    setupDefinitionId: string
  ): Promise<SetupRefinementRequestDurableRecord[]>;
  listSetupRefinementRequestsByResearchDecisionApprovalId(
    researchDecisionApprovalId: string
  ): Promise<SetupRefinementRequestDurableRecord[]>;
  insertSetupRefinementRequest(
    request: SetupRefinementRequestRecordWriteRequest
  ): Promise<SetupRefinementRequestDurableRecord>;
};

export const isSetupRefinementRequestRelationalDeterministicErrorCode = (
  code: RepositoryErrorCode
): code is SetupRefinementRequestRelationalDeterministicErrorCode =>
  SETUP_REFINEMENT_REQUEST_RELATIONAL_DETERMINISTIC_ERROR_CODES.includes(
    code as SetupRefinementRequestRelationalDeterministicErrorCode
  );
