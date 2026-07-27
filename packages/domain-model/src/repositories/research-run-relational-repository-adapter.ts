import type { ResearchRunDurableRecord } from "../storage/research-run-relational-slice.js";
import type { RepositoryErrorCode } from "./repository-error.js";

export const RESEARCH_RUN_RELATIONAL_ADAPTER_OPERATIONS = [
  "load_research_run_record",
  "list_research_run_records_by_hypothesis_id",
  "list_research_run_records_by_status",
  "insert_research_run_record",
  "update_research_run_record"
] as const;
export type ResearchRunRelationalAdapterOperation =
  (typeof RESEARCH_RUN_RELATIONAL_ADAPTER_OPERATIONS)[number];

export const RESEARCH_RUN_RELATIONAL_DETERMINISTIC_ERROR_CODES = [
  "already_exists",
  "not_found",
  "version_mismatch"
] as const;
export type ResearchRunRelationalDeterministicErrorCode =
  (typeof RESEARCH_RUN_RELATIONAL_DETERMINISTIC_ERROR_CODES)[number];

export const RESEARCH_RUN_RELATIONAL_RETRYABLE_ERROR_CODES = [
  "transient_failure",
  "unknown_failure"
] as const;
export type ResearchRunRelationalRetryableErrorCode =
  (typeof RESEARCH_RUN_RELATIONAL_RETRYABLE_ERROR_CODES)[number];

export type ResearchRunRecordWriteRequest = {
  record: ResearchRunDurableRecord;
  expectedVersion: number | null;
};

export type ResearchRunRelationalRepositoryAdapter = {
  loadResearchRunRecord(runId: string): Promise<ResearchRunDurableRecord | null>;
  listResearchRunRecordsByHypothesisId(hypothesisId: string): Promise<ResearchRunDurableRecord[]>;
  listResearchRunRecordsByStatus(
    statuses: ResearchRunDurableRecord["researchRunStatus"][]
  ): Promise<ResearchRunDurableRecord[]>;
  insertResearchRunRecord(request: ResearchRunRecordWriteRequest): Promise<ResearchRunDurableRecord>;
  updateResearchRunRecord(request: ResearchRunRecordWriteRequest): Promise<ResearchRunDurableRecord>;
};

export const isResearchRunRelationalDeterministicErrorCode = (
  code: RepositoryErrorCode
): code is ResearchRunRelationalDeterministicErrorCode =>
  RESEARCH_RUN_RELATIONAL_DETERMINISTIC_ERROR_CODES.includes(
    code as ResearchRunRelationalDeterministicErrorCode
  );
