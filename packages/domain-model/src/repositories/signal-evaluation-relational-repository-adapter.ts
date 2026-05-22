import type {
  EvaluationResultDurableRecord,
  SignalCandidateDurableRecord
} from "../storage/signal-evaluation-relational-slice.js";
import type { RepositoryErrorCode } from "./repository-error.js";

export const SIGNAL_EVALUATION_RELATIONAL_ADAPTER_OPERATIONS = [
  "load_signal_candidate_record",
  "list_signal_candidate_records_by_setup_definition_id",
  "list_signal_candidate_records_by_monitored_symbol_id",
  "list_signal_candidate_records_by_status",
  "insert_signal_candidate_record",
  "update_signal_candidate_record",
  "load_evaluation_result_record",
  "load_evaluation_result_record_by_signal_candidate_and_window",
  "list_evaluation_result_records_by_signal_candidate_id",
  "list_evaluation_result_records_by_evaluation_window_id",
  "list_evaluation_result_records_by_status",
  "insert_evaluation_result_record",
  "update_evaluation_result_record"
] as const;
export type SignalEvaluationRelationalAdapterOperation =
  (typeof SIGNAL_EVALUATION_RELATIONAL_ADAPTER_OPERATIONS)[number];

export const SIGNAL_EVALUATION_RELATIONAL_DETERMINISTIC_ERROR_CODES = [
  "already_exists",
  "not_found",
  "version_mismatch",
  "invalid_reference"
] as const;
export type SignalEvaluationRelationalDeterministicErrorCode =
  (typeof SIGNAL_EVALUATION_RELATIONAL_DETERMINISTIC_ERROR_CODES)[number];

export const SIGNAL_EVALUATION_RELATIONAL_RETRYABLE_ERROR_CODES = [
  "transient_failure",
  "unknown_failure"
] as const;
export type SignalEvaluationRelationalRetryableErrorCode =
  (typeof SIGNAL_EVALUATION_RELATIONAL_RETRYABLE_ERROR_CODES)[number];

export type SignalCandidateRecordWriteRequest = {
  record: SignalCandidateDurableRecord;
  expectedVersion: number | null;
};

export type EvaluationResultRecordWriteRequest = {
  record: EvaluationResultDurableRecord;
  expectedVersion: number | null;
};

export type SignalEvaluationRelationalAdapterErrorMapping = {
  deterministic: SignalEvaluationRelationalDeterministicErrorCode[];
  retryable: SignalEvaluationRelationalRetryableErrorCode[];
};

export const SIGNAL_EVALUATION_RELATIONAL_ADAPTER_ERROR_MAPPING: SignalEvaluationRelationalAdapterErrorMapping =
  {
    deterministic: [...SIGNAL_EVALUATION_RELATIONAL_DETERMINISTIC_ERROR_CODES],
    retryable: [...SIGNAL_EVALUATION_RELATIONAL_RETRYABLE_ERROR_CODES]
  };

export type SignalEvaluationRelationalRepositoryAdapter = {
  loadSignalCandidateRecord(signalCandidateId: string): Promise<SignalCandidateDurableRecord | null>;
  listSignalCandidateRecordsBySetupDefinitionId(
    setupDefinitionId: string
  ): Promise<SignalCandidateDurableRecord[]>;
  listSignalCandidateRecordsByMonitoredSymbolId(
    monitoredSymbolId: string
  ): Promise<SignalCandidateDurableRecord[]>;
  listSignalCandidateRecordsByStatus(
    statuses: SignalCandidateDurableRecord["candidateStatus"][]
  ): Promise<SignalCandidateDurableRecord[]>;
  insertSignalCandidateRecord(
    request: SignalCandidateRecordWriteRequest
  ): Promise<SignalCandidateDurableRecord>;
  updateSignalCandidateRecord(
    request: SignalCandidateRecordWriteRequest
  ): Promise<SignalCandidateDurableRecord>;
  loadEvaluationResultRecord(
    evaluationResultId: string
  ): Promise<EvaluationResultDurableRecord | null>;
  loadEvaluationResultRecordBySignalCandidateAndWindow(
    signalCandidateId: string,
    evaluationWindowId: string
  ): Promise<EvaluationResultDurableRecord | null>;
  listEvaluationResultRecordsBySignalCandidateId(
    signalCandidateId: string
  ): Promise<EvaluationResultDurableRecord[]>;
  listEvaluationResultRecordsByEvaluationWindowId(
    evaluationWindowId: string
  ): Promise<EvaluationResultDurableRecord[]>;
  listEvaluationResultRecordsByStatus(
    statuses: EvaluationResultDurableRecord["evaluationStatus"][]
  ): Promise<EvaluationResultDurableRecord[]>;
  insertEvaluationResultRecord(
    request: EvaluationResultRecordWriteRequest
  ): Promise<EvaluationResultDurableRecord>;
  updateEvaluationResultRecord(
    request: EvaluationResultRecordWriteRequest
  ): Promise<EvaluationResultDurableRecord>;
};

export const isSignalEvaluationRelationalDeterministicErrorCode = (
  code: RepositoryErrorCode
): code is SignalEvaluationRelationalDeterministicErrorCode =>
  SIGNAL_EVALUATION_RELATIONAL_DETERMINISTIC_ERROR_CODES.includes(
    code as SignalEvaluationRelationalDeterministicErrorCode
  );
