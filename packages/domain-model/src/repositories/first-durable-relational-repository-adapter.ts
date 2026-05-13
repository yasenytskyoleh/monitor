import type {
  ResearchHypothesisDurableRecord,
  ResearchHypothesisSetupDefinitionLinkRecord,
  SetupDefinitionDurableRecord
} from "../storage/first-durable-relational-slice.js";
import type { RepositoryErrorCode } from "./repository-error.js";

export const FIRST_DURABLE_RELATIONAL_ADAPTER_OPERATIONS = [
  "load_setup_definition_record",
  "list_setup_definition_records_by_status",
  "insert_setup_definition_record",
  "update_setup_definition_record",
  "load_research_hypothesis_bundle",
  "list_research_hypothesis_bundles_by_status",
  "insert_research_hypothesis_bundle",
  "update_research_hypothesis_bundle"
] as const;
export type FirstDurableRelationalAdapterOperation =
  (typeof FIRST_DURABLE_RELATIONAL_ADAPTER_OPERATIONS)[number];

export const FIRST_DURABLE_RELATIONAL_DETERMINISTIC_ERROR_CODES = [
  "already_exists",
  "not_found",
  "version_mismatch",
  "invalid_reference"
] as const;
export type FirstDurableRelationalDeterministicErrorCode =
  (typeof FIRST_DURABLE_RELATIONAL_DETERMINISTIC_ERROR_CODES)[number];

export const FIRST_DURABLE_RELATIONAL_RETRYABLE_ERROR_CODES = [
  "transient_failure",
  "unknown_failure"
] as const;
export type FirstDurableRelationalRetryableErrorCode =
  (typeof FIRST_DURABLE_RELATIONAL_RETRYABLE_ERROR_CODES)[number];

export type ResearchHypothesisDurableRecordBundle = {
  hypothesisRecord: ResearchHypothesisDurableRecord;
  setupDefinitionLinkRecords: ResearchHypothesisSetupDefinitionLinkRecord[];
};

export type SetupDefinitionRecordWriteRequest = {
  record: SetupDefinitionDurableRecord;
  expectedVersion: number | null;
};

export type ResearchHypothesisBundleWriteRequest = {
  bundle: ResearchHypothesisDurableRecordBundle;
  expectedVersion: number | null;
};

export type FirstDurableRelationalAdapterErrorMapping = {
  deterministic: FirstDurableRelationalDeterministicErrorCode[];
  retryable: FirstDurableRelationalRetryableErrorCode[];
};

export const FIRST_DURABLE_RELATIONAL_ADAPTER_ERROR_MAPPING: FirstDurableRelationalAdapterErrorMapping =
  {
    deterministic: [...FIRST_DURABLE_RELATIONAL_DETERMINISTIC_ERROR_CODES],
    retryable: [...FIRST_DURABLE_RELATIONAL_RETRYABLE_ERROR_CODES]
  };

export type FirstDurableRelationalRepositoryAdapter = {
  loadSetupDefinitionRecord(setupDefinitionId: string): Promise<SetupDefinitionDurableRecord | null>;
  listSetupDefinitionRecordsByStatus(
    statuses: SetupDefinitionDurableRecord["definitionStatus"][]
  ): Promise<SetupDefinitionDurableRecord[]>;
  insertSetupDefinitionRecord(
    request: SetupDefinitionRecordWriteRequest
  ): Promise<SetupDefinitionDurableRecord>;
  updateSetupDefinitionRecord(
    request: SetupDefinitionRecordWriteRequest
  ): Promise<SetupDefinitionDurableRecord>;
  loadResearchHypothesisBundle(
    researchHypothesisId: string
  ): Promise<ResearchHypothesisDurableRecordBundle | null>;
  listResearchHypothesisBundlesByStatus(
    statuses: ResearchHypothesisDurableRecord["hypothesisStatus"][]
  ): Promise<ResearchHypothesisDurableRecordBundle[]>;
  insertResearchHypothesisBundle(
    request: ResearchHypothesisBundleWriteRequest
  ): Promise<ResearchHypothesisDurableRecordBundle>;
  updateResearchHypothesisBundle(
    request: ResearchHypothesisBundleWriteRequest
  ): Promise<ResearchHypothesisDurableRecordBundle>;
};

export const isFirstDurableRelationalDeterministicErrorCode = (
  code: RepositoryErrorCode
): code is FirstDurableRelationalDeterministicErrorCode =>
  FIRST_DURABLE_RELATIONAL_DETERMINISTIC_ERROR_CODES.includes(
    code as FirstDurableRelationalDeterministicErrorCode
  );
