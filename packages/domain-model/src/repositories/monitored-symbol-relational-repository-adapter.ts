import type { MonitoredSymbolDurableRecord } from "../storage/monitored-symbol-relational-slice.js";
import type { RepositoryErrorCode } from "./repository-error.js";

export const MONITORED_SYMBOL_RELATIONAL_ADAPTER_OPERATIONS = [
  "load_monitored_symbol_record",
  "list_monitored_symbol_records_by_status",
  "insert_monitored_symbol_record",
  "update_monitored_symbol_record",
  "update_monitored_symbol_record_status"
] as const;
export type MonitoredSymbolRelationalAdapterOperation =
  (typeof MONITORED_SYMBOL_RELATIONAL_ADAPTER_OPERATIONS)[number];

export const MONITORED_SYMBOL_RELATIONAL_DETERMINISTIC_ERROR_CODES = [
  "already_exists",
  "not_found",
  "version_mismatch"
] as const;
export type MonitoredSymbolRelationalDeterministicErrorCode =
  (typeof MONITORED_SYMBOL_RELATIONAL_DETERMINISTIC_ERROR_CODES)[number];

export const MONITORED_SYMBOL_RELATIONAL_RETRYABLE_ERROR_CODES = [
  "transient_failure",
  "unknown_failure"
] as const;
export type MonitoredSymbolRelationalRetryableErrorCode =
  (typeof MONITORED_SYMBOL_RELATIONAL_RETRYABLE_ERROR_CODES)[number];

export type MonitoredSymbolRecordWriteRequest = {
  record: MonitoredSymbolDurableRecord;
  expectedVersion: number | null;
};

export type MonitoredSymbolRelationalAdapterErrorMapping = {
  deterministic: MonitoredSymbolRelationalDeterministicErrorCode[];
  retryable: MonitoredSymbolRelationalRetryableErrorCode[];
};

export const MONITORED_SYMBOL_RELATIONAL_ADAPTER_ERROR_MAPPING: MonitoredSymbolRelationalAdapterErrorMapping = {
  deterministic: [...MONITORED_SYMBOL_RELATIONAL_DETERMINISTIC_ERROR_CODES],
  retryable: [...MONITORED_SYMBOL_RELATIONAL_RETRYABLE_ERROR_CODES]
};

export type MonitoredSymbolRelationalRepositoryAdapter = {
  loadMonitoredSymbolRecord(symbolId: string): Promise<MonitoredSymbolDurableRecord | null>;
  listMonitoredSymbolRecordsByStatus(
    statuses: MonitoredSymbolDurableRecord["symbolStatus"][]
  ): Promise<MonitoredSymbolDurableRecord[]>;
  insertMonitoredSymbolRecord(
    request: MonitoredSymbolRecordWriteRequest
  ): Promise<MonitoredSymbolDurableRecord>;
  updateMonitoredSymbolRecord(
    request: MonitoredSymbolRecordWriteRequest
  ): Promise<MonitoredSymbolDurableRecord>;
  updateMonitoredSymbolRecordStatus(
    request: MonitoredSymbolRecordWriteRequest
  ): Promise<MonitoredSymbolDurableRecord>;
};

export const isMonitoredSymbolRelationalDeterministicErrorCode = (
  code: RepositoryErrorCode
): code is MonitoredSymbolRelationalDeterministicErrorCode =>
  MONITORED_SYMBOL_RELATIONAL_DETERMINISTIC_ERROR_CODES.includes(
    code as MonitoredSymbolRelationalDeterministicErrorCode
  );
