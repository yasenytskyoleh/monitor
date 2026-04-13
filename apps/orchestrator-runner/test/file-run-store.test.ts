import * as assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";

import { FileRunStore } from "../src/persistence/file-run-store.js";
import type {
  PersistedRunRecord,
  PersistedTerminalOutcomeRecord,
  PersistedTransitionRecord
} from "../src/persistence/types.js";

test("FileRunStore supports deterministic clock and run-id generator", async (context) => {
  const workspaceRoot = await mkdtemp(join(tmpdir(), "orchestrator-run-store-"));
  context.after(async () => rm(workspaceRoot, { recursive: true, force: true }));

  const fixedNow = new Date("2026-04-09T10:00:00.000Z");
  const runStore = new FileRunStore(workspaceRoot, {
    clock: {
      now: () => fixedNow
    },
    runIdGenerator: () => "run_fixed_001"
  });

  assert.equal(runStore.nowIsoUtc(), "2026-04-09T10:00:00.000Z");
  assert.equal(runStore.createRunId(), "run_fixed_001");

  const runRecord: PersistedRunRecord = {
    runId: "run_fixed_001",
    taskId: "task-001",
    env: "local",
    mode: "mock",
    agentModes: {
      "product-agent": "mock",
      "architect-agent": "mock",
      "quant-pattern-agent": "mock",
      "backend-agent": "mock",
      "docs-reviewer-agent": "mock"
    },
    scenario: "happy",
    startedAtUtc: "2026-04-09T10:00:00.000Z",
    finishedAtUtc: "2026-04-09T10:00:02.000Z",
    finalState: "DONE",
    outcome: "success",
    configVersion: "v1",
    promptSetVersion: "v1",
    schemaVersion: 1,
    snapshotChecksum: "checksum-1"
  };

  const transitions: PersistedTransitionRecord[] = [
    {
      runId: "run_fixed_001",
      index: 1,
      from: "INTAKE",
      to: "DESIGN",
      requestedBy: "product-agent",
      executedBy: "orchestrator-runner",
      timestampUtc: "2026-04-09T10:00:01.000Z",
      reason: "valid transition",
      artifactRefs: ["product-brief"]
    }
  ];

  const terminalOutcome: PersistedTerminalOutcomeRecord = {
    runId: "run_fixed_001",
    finalState: "DONE",
    outcome: "success",
    transitionCount: 1,
    artifactSummary: ["product-brief"]
  };

  const persisted = await runStore.persist({
    runId: "run_fixed_001",
    runRecord,
    transitions,
    terminalOutcome,
    approvals: [
      {
        approvalRef: "approval_001",
        approvalType: "ARCHITECTURE",
        taskId: "task-001",
        runId: "run_fixed_001",
        issuedFor: {
          from: "DESIGN",
          to: "FORMALIZE"
        },
        grantedBy: "approver",
        grantedAtUtc: "2026-04-09T10:00:00.000Z",
        status: "granted"
      }
    ],
    artifacts: [
      {
        artifactRef: "happy:product-brief:v1",
        artifactType: "product-brief",
        producedBy: "product-agent",
        taskId: "task-001",
        runId: "run_fixed_001",
        state: "INTAKE",
        createdAtUtc: "2026-04-09T10:00:01.000Z",
        version: 1,
        scenario: "happy"
      }
    ],
    patchPlans: [
      {
        taskId: "task-001",
        scenario: "happy",
        transitionChecksum: "checksum-1",
        fromState: "IMPLEMENT",
        toState: "REVIEW",
        patchMode: "single_file",
        testFocused: false,
        changeType: "patch_only",
        applyMode: "apply",
        singleRootKey: "apps/orchestrator-runner",
        totalContentBytes: 128,
        limitChecks: {
          maxFilesPassed: true,
          maxSizePassed: true,
          maxPerFileSizePassed: true,
          singleRootPassed: true
        },
        targetFiles: ["apps/orchestrator-runner/src/runner.ts"],
        createdFiles: [],
        updatedFiles: ["apps/orchestrator-runner/src/runner.ts"],
        operations: [
          {
            filePath: "apps/orchestrator-runner/src/runner.ts",
            operation: "update"
          }
        ],
        proposedDiffCount: 1,
        testsPlan: ["pnpm --filter @monitor/orchestrator-runner test"],
        knownLimitations: ["Constrained patch mode only."],
        appliedOperations: [
          {
            filePath: "apps/orchestrator-runner/src/runner.ts",
            operation: "update",
            applied: true
          }
        ],
        dryRun: false
      }
    ],
    patchResults: [
      {
        taskId: "task-001",
        scenario: "happy",
        transitionChecksum: "checksum-1",
        fromState: "IMPLEMENT",
        toState: "REVIEW",
        applyMode: "apply",
        applied: true,
        changedFiles: ["apps/orchestrator-runner/src/runner.ts"],
        createdFiles: [],
        updatedFiles: ["apps/orchestrator-runner/src/runner.ts"],
        postApplyValidationPassed: true,
        failureCategory: null,
        failureReason: null
      }
    ],
    workspaceSummaries: [
      {
        taskId: "task-001",
        scenario: "happy",
        transitionChecksum: "checksum-1",
        fromState: "IMPLEMENT",
        toState: "REVIEW",
        isolationEnabled: true,
        workspaceId: "workspace_run_fixed_001",
        workspacePath: "/tmp/workspace_run_fixed_001",
        copiedFilesCount: 8,
        patchedFiles: ["apps/orchestrator-runner/src/runner.ts"],
        verificationRanInWorkspace: true,
        cleanupStatus: "succeeded",
        cleanupFailureReason: null
      }
    ],
    rollbackPlans: [
      {
        taskId: "task-001",
        scenario: "happy",
        transitionChecksum: "checksum-1",
        fromState: "IMPLEMENT",
        toState: "REVIEW",
        applyMode: "apply",
        entries: [
          {
            filePath: "apps/orchestrator-runner/src/runner.ts",
            existedBefore: true,
            previousContent: "export const before = true;\n"
          }
        ]
      }
    ],
    rollbackResults: [
      {
        taskId: "task-001",
        scenario: "happy",
        transitionChecksum: "checksum-1",
        fromState: "IMPLEMENT",
        toState: "REVIEW",
        rollbackAttempted: false,
        triggerReason: null,
        restoredFiles: [],
        deletedCreatedFiles: [],
        status: "skipped",
        failureReason: null
      }
    ],
    verificationResults: [
      {
        taskId: "task-001",
        scenario: "happy",
        transitionChecksum: "checksum-1",
        fromState: "IMPLEMENT",
        toState: "REVIEW",
        applied: true,
        hooksRequested: ["lint", "typecheck"],
        hooksExecuted: [
          {
            name: "lint",
            status: "passed",
            command: "pnpm --filter @monitor/orchestrator-runner lint",
            exitCode: 0,
            durationMs: 1100
          },
          {
            name: "typecheck",
            status: "passed",
            command: "pnpm --filter @monitor/orchestrator-runner typecheck",
            exitCode: 0,
            durationMs: 1700
          }
        ],
        overallStatus: "passed"
      }
    ],
    promotionResults: [
      {
        taskId: "task-001",
        scenario: "happy",
        transitionChecksum: "checksum-1",
        fromState: "IMPLEMENT",
        toState: "REVIEW",
        promotionMode: "promote_verified",
        promotionAttempted: true,
        filesPlannedForPromotion: ["apps/orchestrator-runner/src/runner.ts"],
        filesPromoted: ["apps/orchestrator-runner/src/runner.ts"],
        filesBlocked: [],
        conflictDetected: false,
        conflicts: [],
        status: "succeeded",
        failureReason: null
      }
    ],
    stabilitySummary: {
      runId: "run_fixed_001",
      mode: "mock",
      finalState: "DONE",
      outcome: "success",
      overallStatus: "passed",
      applyStatus: "passed",
      verificationStatus: "passed",
      rollbackStatus: "skipped",
      failureCategories: [],
      determinism: {
        status: "not_evaluated",
        note: "Determinism is evaluated by repeated-run stability matrix tests."
      },
      scenarios: [
        {
          scenario: "happy",
          finalState: "DONE",
          applyStatus: "passed",
          verificationStatus: "passed",
          rollbackStatus: "skipped",
          failureCategories: []
        }
      ]
    }
  });

  assert.equal(persisted.relativeRunDir, "runtime/runs/run_fixed_001");

  const runJson = JSON.parse(
    await readFile(join(workspaceRoot, "runtime/runs/run_fixed_001/run.json"), "utf8")
  ) as Record<string, unknown>;
  assert.equal(runJson.runId, "run_fixed_001");
  assert.equal(runJson.finalState, "DONE");

  const artifactsJson = JSON.parse(
    await readFile(join(workspaceRoot, "runtime/runs/run_fixed_001/artifacts.json"), "utf8")
  ) as Array<Record<string, unknown>>;
  assert.equal(artifactsJson.length, 1);
  assert.equal(artifactsJson[0]?.artifactType, "product-brief");

  const approvalsJson = JSON.parse(
    await readFile(join(workspaceRoot, "runtime/runs/run_fixed_001/approvals.json"), "utf8")
  ) as Array<Record<string, unknown>>;
  assert.equal(approvalsJson.length, 1);
  assert.equal(approvalsJson[0]?.approvalRef, "approval_001");

  const patchPlanJson = JSON.parse(
    await readFile(join(workspaceRoot, "runtime/runs/run_fixed_001/patch-plan.json"), "utf8")
  ) as Array<Record<string, unknown>>;
  assert.equal(patchPlanJson.length, 1);
  assert.equal(patchPlanJson[0]?.changeType, "patch_only");
  assert.equal(patchPlanJson[0]?.applyMode, "apply");

  const patchResultJson = JSON.parse(
    await readFile(join(workspaceRoot, "runtime/runs/run_fixed_001/patch-result.json"), "utf8")
  ) as Array<Record<string, unknown>>;
  assert.equal(patchResultJson.length, 1);
  assert.equal(patchResultJson[0]?.applied, true);

  const workspaceSummaryJson = JSON.parse(
    await readFile(join(workspaceRoot, "runtime/runs/run_fixed_001/workspace-summary.json"), "utf8")
  ) as Array<Record<string, unknown>>;
  assert.equal(workspaceSummaryJson.length, 1);
  assert.equal(workspaceSummaryJson[0]?.isolationEnabled, true);
  assert.equal(workspaceSummaryJson[0]?.cleanupStatus, "succeeded");

  const rollbackPlanJson = JSON.parse(
    await readFile(join(workspaceRoot, "runtime/runs/run_fixed_001/rollback-plan.json"), "utf8")
  ) as Array<Record<string, unknown>>;
  assert.equal(rollbackPlanJson.length, 1);
  assert.equal(rollbackPlanJson[0]?.applyMode, "apply");

  const rollbackResultJson = JSON.parse(
    await readFile(join(workspaceRoot, "runtime/runs/run_fixed_001/rollback-result.json"), "utf8")
  ) as Array<Record<string, unknown>>;
  assert.equal(rollbackResultJson.length, 1);
  assert.equal(rollbackResultJson[0]?.status, "skipped");

  const verificationResultJson = JSON.parse(
    await readFile(join(workspaceRoot, "runtime/runs/run_fixed_001/verification-result.json"), "utf8")
  ) as Array<Record<string, unknown>>;
  assert.equal(verificationResultJson.length, 1);
  assert.equal(verificationResultJson[0]?.overallStatus, "passed");

  const promotionResultJson = JSON.parse(
    await readFile(join(workspaceRoot, "runtime/runs/run_fixed_001/promotion-result.json"), "utf8")
  ) as Array<Record<string, unknown>>;
  assert.equal(promotionResultJson.length, 1);
  assert.equal(promotionResultJson[0]?.status, "succeeded");

  const stabilitySummaryJson = JSON.parse(
    await readFile(join(workspaceRoot, "runtime/runs/run_fixed_001/stability-summary.json"), "utf8")
  ) as Record<string, unknown>;
  assert.equal(stabilitySummaryJson.overallStatus, "passed");
  assert.equal(stabilitySummaryJson.mode, "mock");
});
