import * as assert from "node:assert/strict";
import { test } from "node:test";

import { buildStabilityReassessment } from "../src/stability/build-stability-reassessment.js";

test("buildStabilityReassessment marks passed for isolated apply with clean promotion flow", () => {
  const reassessment = buildStabilityReassessment({
    runId: "run_reassess_001",
    scenario: "helper_file_create_and_promote",
    finalState: "DONE",
    outcome: "success",
    patchResults: [
      {
        taskId: "task-001",
        applyMode: "apply",
        applied: true,
        changedFiles: ["apps/orchestrator-runner/test/fixtures/helper.json"],
        createdFiles: ["apps/orchestrator-runner/test/fixtures/helper.json"],
        helperCreatedFiles: ["apps/orchestrator-runner/test/fixtures/helper.json"],
        updatedFiles: [],
        postApplyValidationPassed: true,
        failureCategory: null,
        failureReason: null
      }
    ],
    verificationResults: [
      {
        taskId: "task-001",
        applied: true,
        hooksRequested: [],
        hooksExecuted: [],
        overallStatus: "skipped"
      }
    ],
    rollbackResults: [
      {
        taskId: "task-001",
        rollbackAttempted: false,
        triggerReason: null,
        restoredFiles: [],
        deletedCreatedFiles: [],
        status: "skipped",
        failureReason: null
      }
    ],
    promotionResults: [
      {
        taskId: "task-001",
        promotionMode: "promote_verified",
        promotionAttempted: true,
        filesPlannedForPromotion: ["apps/orchestrator-runner/test/fixtures/helper.json"],
        filesPromoted: ["apps/orchestrator-runner/test/fixtures/helper.json"],
        filesBlocked: [],
        helperPromotedFiles: ["apps/orchestrator-runner/test/fixtures/helper.json"],
        helperBlockedFiles: [],
        conflictDetected: false,
        conflicts: [],
        status: "succeeded",
        failureReason: null
      }
    ],
    workspaceSummaries: [
      {
        taskId: "task-001",
        isolationEnabled: true,
        workspaceId: "workspace-001",
        workspacePath: "/tmp/workspace-001",
        copiedFilesCount: 5,
        patchedFiles: ["apps/orchestrator-runner/test/fixtures/helper.json"],
        verificationRanInWorkspace: false,
        cleanupStatus: "succeeded",
        cleanupFailureReason: null
      }
    ]
  });

  assert.equal(reassessment.overallStatus, "passed");
  assert.equal(reassessment.isolatedExecutionPassed, true);
  assert.equal(reassessment.workspaceCleanlinessPassed, true);
});

test("buildStabilityReassessment marks failed on promotion failure", () => {
  const reassessment = buildStabilityReassessment({
    runId: "run_reassess_002",
    scenario: "promotion_conflict",
    finalState: "FAILED",
    outcome: "runtime_failure",
    patchResults: [],
    verificationResults: [],
    rollbackResults: [],
    promotionResults: [
      {
        taskId: "task-002",
        promotionMode: "promote_verified",
        promotionAttempted: true,
        filesPlannedForPromotion: ["apps/orchestrator-runner/src/x.ts"],
        filesPromoted: [],
        filesBlocked: ["apps/orchestrator-runner/src/x.ts"],
        helperPromotedFiles: [],
        helperBlockedFiles: [],
        conflictDetected: true,
        conflicts: [
          {
            filePath: "apps/orchestrator-runner/src/x.ts",
            expectedFingerprint: "a",
            currentFingerprint: "b"
          }
        ],
        status: "failed",
        failureReason: "conflict"
      }
    ],
    workspaceSummaries: [
      {
        taskId: "task-002",
        isolationEnabled: true,
        workspaceId: "workspace-002",
        workspacePath: "/tmp/workspace-002",
        copiedFilesCount: 5,
        patchedFiles: ["apps/orchestrator-runner/src/x.ts"],
        verificationRanInWorkspace: false,
        cleanupStatus: "succeeded",
        cleanupFailureReason: null
      }
    ]
  });

  assert.equal(reassessment.promotionPassed, false);
  assert.equal(reassessment.overallStatus, "failed");
});
