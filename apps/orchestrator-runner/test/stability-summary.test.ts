import * as assert from "node:assert/strict";
import { test } from "node:test";

import { buildStabilitySummary } from "../src/stability/build-stability-summary.js";

test("buildStabilitySummary marks pass for successful dry-run evidence", () => {
  const summary = buildStabilitySummary({
    runId: "run_stability_001",
    mode: "mock",
    finalState: "DONE",
    outcome: "success",
    scenarios: [{ scenario: "happy", finalState: "DONE" }],
    patchResults: [
      {
        taskId: "task-1",
        scenario: "happy",
        applyMode: "dry-run",
        applied: false,
        changedFiles: [],
        postApplyValidationPassed: true,
        failureCategory: null,
        failureReason: null
      }
    ],
    verificationResults: [
      {
        taskId: "task-1",
        scenario: "happy",
        applied: false,
        hooksRequested: [],
        hooksExecuted: [],
        overallStatus: "skipped"
      }
    ],
    rollbackResults: [
      {
        taskId: "task-1",
        scenario: "happy",
        rollbackAttempted: false,
        triggerReason: null,
        restoredFiles: [],
        deletedCreatedFiles: [],
        status: "skipped",
        failureReason: null
      }
    ]
  });

  assert.equal(summary.overallStatus, "passed");
  assert.equal(summary.applyStatus, "passed");
  assert.equal(summary.verificationStatus, "skipped");
  assert.equal(summary.rollbackStatus, "skipped");
});

test("buildStabilitySummary marks fail when verification and rollback evidence fail", () => {
  const summary = buildStabilitySummary({
    runId: "run_stability_002",
    mode: "live",
    finalState: "FAILED",
    outcome: "runtime_failure",
    patchResults: [
      {
        taskId: "task-2",
        applyMode: "apply",
        applied: true,
        changedFiles: ["apps/orchestrator-runner/src/fail.ts"],
        postApplyValidationPassed: false,
        failureCategory: "typecheck_failed",
        failureReason: "Typecheck failed"
      }
    ],
    verificationResults: [
      {
        taskId: "task-2",
        applied: true,
        hooksRequested: ["typecheck"],
        hooksExecuted: [
          {
            name: "typecheck",
            status: "failed",
            command: "pnpm --filter @monitor/orchestrator-runner typecheck",
            exitCode: 2,
            durationMs: 1000
          }
        ],
        overallStatus: "failed"
      }
    ],
    rollbackResults: [
      {
        taskId: "task-2",
        rollbackAttempted: true,
        triggerReason: "verification_failed",
        restoredFiles: [],
        deletedCreatedFiles: [],
        status: "failed",
        failureReason: "permission denied"
      }
    ]
  });

  assert.equal(summary.overallStatus, "failed");
  assert.equal(summary.applyStatus, "failed");
  assert.equal(summary.verificationStatus, "failed");
  assert.equal(summary.rollbackStatus, "failed");
  assert.ok(summary.failureCategories.includes("typecheck_failed"));
  assert.ok(summary.failureCategories.includes("rollback_failed"));
});
