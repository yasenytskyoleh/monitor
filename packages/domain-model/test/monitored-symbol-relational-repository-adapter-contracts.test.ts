import assert from "node:assert/strict";
import test from "node:test";

import {
  MONITORED_SYMBOL_RELATIONAL_ADAPTER_ERROR_MAPPING,
  MONITORED_SYMBOL_RELATIONAL_ADAPTER_OPERATIONS,
  MONITORED_SYMBOL_RELATIONAL_DETERMINISTIC_ERROR_CODES,
  MONITORED_SYMBOL_RELATIONAL_RETRYABLE_ERROR_CODES,
  isMonitoredSymbolRelationalDeterministicErrorCode
} from "../src/index.js";

test("exposes monitored-symbol relational adapter operations", () => {
  assert.deepEqual(MONITORED_SYMBOL_RELATIONAL_ADAPTER_OPERATIONS, [
    "load_monitored_symbol_record",
    "list_monitored_symbol_records_by_status",
    "insert_monitored_symbol_record",
    "update_monitored_symbol_record",
    "update_monitored_symbol_record_status"
  ]);
});

test("maps monitored-symbol adapter errors deterministically", () => {
  assert.deepEqual(MONITORED_SYMBOL_RELATIONAL_ADAPTER_ERROR_MAPPING, {
    deterministic: ["already_exists", "not_found", "version_mismatch"],
    retryable: ["transient_failure", "unknown_failure"]
  });
  assert.equal(isMonitoredSymbolRelationalDeterministicErrorCode("version_mismatch"), true);
  assert.equal(isMonitoredSymbolRelationalDeterministicErrorCode("transient_failure"), false);
  assert.deepEqual(MONITORED_SYMBOL_RELATIONAL_DETERMINISTIC_ERROR_CODES, [
    "already_exists",
    "not_found",
    "version_mismatch"
  ]);
  assert.deepEqual(MONITORED_SYMBOL_RELATIONAL_RETRYABLE_ERROR_CODES, [
    "transient_failure",
    "unknown_failure"
  ]);
});
