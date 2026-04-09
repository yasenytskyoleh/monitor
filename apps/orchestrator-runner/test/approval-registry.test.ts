import * as assert from "node:assert/strict";
import { test } from "node:test";

import type { RuntimeConfigSnapshot } from "@monitor/agent-config";

import { ApprovalRegistry } from "../src/approvals/registry.js";
import { ApprovalValidationError } from "../src/approvals/types.js";

function createSnapshot(): RuntimeConfigSnapshot {
  return {
    version: "v1",
    environment: "local",
    compiledAt: "2026-04-09T10:00:00.000Z",
    checksum: "checksum",
    runtimeDefaults: {
      jsonModeRequired: true,
      provider: "openai",
      model: "gpt-5.4-mini",
      fallbackModel: "gpt-5.4-mini",
      temperature: 0.2,
      maxTokens: 1000,
      maxArtifactsPerOutput: 10,
      retryPolicy: { retries: 1, backoffMs: 100, retryOn: ["timeout"] },
      timeoutMs: 1000,
      concurrency: { maxParallelTasks: 1, maxParallelActionsPerTask: 1 }
    },
    approvalPolicy: { allowMockApprovals: true },
    promptSetVersion: "v1",
    promptSetChecksum: "prompt-checksum",
    workflow: {
      states: ["DESIGN", "FORMALIZE", "APPROVAL", "PUBLISH_SIGNAL"],
      initialState: "DESIGN",
      terminalStates: ["PUBLISH_SIGNAL"],
      transitions: [
        {
          from: "DESIGN",
          to: "FORMALIZE",
          requiresApproval: true,
          approvalType: "ARCHITECTURE",
          approvalExpiresInMinutes: 60
        },
        {
          from: "APPROVAL",
          to: "PUBLISH_SIGNAL",
          requiresApproval: true,
          approvalType: "SIGNAL_PUBLISH",
          approvalExpiresInMinutes: 60
        }
      ],
      stateOwners: {
        DESIGN: "ARCHITECT",
        FORMALIZE: "QUANT_PATTERN",
        APPROVAL: "HUMAN",
        PUBLISH_SIGNAL: "SYSTEM"
      }
    },
    agents: []
  };
}

test("valid approval allows transition and records approval evidence", () => {
  const registry = new ApprovalRegistry(createSnapshot(), "run_001");
  const result = registry.validateForTransition({
    taskId: "task_001",
    from: "DESIGN",
    to: "FORMALIZE",
    nowUtc: "2026-04-09T10:10:00.000Z",
    approvalRef: {
      approvalId: "approval_001",
      approvalType: "ARCHITECTURE",
      approvedBy: "arch-reviewer",
      approvedAtUtc: "2026-04-09T10:00:00.000Z",
      status: "approved"
    }
  });

  assert.equal(result.evidence.validationStatus, "approved");
  assert.equal(result.approval?.approvalRef, "approval_001");
  assert.equal(registry.listApprovals().length, 1);
});

test("missing approval blocks required transition", () => {
  const registry = new ApprovalRegistry(createSnapshot(), "run_001");

  assert.throws(
    () =>
      registry.validateForTransition({
        taskId: "task_001",
        from: "DESIGN",
        to: "FORMALIZE"
      }),
    (error: unknown) =>
      error instanceof ApprovalValidationError && error.code === "MISSING_APPROVAL"
  );
});

test("wrong approval type blocks transition", () => {
  const registry = new ApprovalRegistry(createSnapshot(), "run_001");

  assert.throws(
    () =>
      registry.validateForTransition({
        taskId: "task_001",
        from: "DESIGN",
        to: "FORMALIZE",
        approvalRef: {
          approvalId: "approval_wrong_type",
          approvalType: "SIGNAL_PUBLISH",
          approvedBy: "approver",
          approvedAtUtc: "2026-04-09T10:00:00.000Z",
          status: "approved"
        }
      }),
    (error: unknown) =>
      error instanceof ApprovalValidationError && error.code === "INVALID_APPROVAL_TYPE"
  );
});

test("approval cannot be reused across different tasks", () => {
  const registry = new ApprovalRegistry(createSnapshot(), "run_001");
  registry.validateForTransition({
    taskId: "task_001",
    from: "DESIGN",
    to: "FORMALIZE",
    nowUtc: "2026-04-09T10:10:00.000Z",
    approvalRef: {
      approvalId: "approval_reused",
      approvalType: "ARCHITECTURE",
      approvedBy: "approver",
      approvedAtUtc: "2026-04-09T10:00:00.000Z",
      status: "approved"
    }
  });

  assert.throws(
    () =>
      registry.validateForTransition({
        taskId: "task_002",
        from: "DESIGN",
        to: "FORMALIZE",
        nowUtc: "2026-04-09T10:10:00.000Z",
        approvalRef: {
          approvalId: "approval_reused",
          approvalType: "ARCHITECTURE",
          approvedBy: "approver",
          approvedAtUtc: "2026-04-09T10:00:00.000Z",
          status: "approved"
        }
      }),
    (error: unknown) =>
      error instanceof ApprovalValidationError && error.code === "APPROVAL_TASK_MISMATCH"
  );
});

test("approval cannot be reused for a different gated transition", () => {
  const registry = new ApprovalRegistry(createSnapshot(), "run_001");
  registry.validateForTransition({
    taskId: "task_001",
    from: "DESIGN",
    to: "FORMALIZE",
    nowUtc: "2026-04-09T10:10:00.000Z",
    approvalRef: {
      approvalId: "approval_transition_binding",
      approvalType: "ARCHITECTURE",
      approvedBy: "approver",
      approvedAtUtc: "2026-04-09T10:00:00.000Z",
      status: "approved"
    }
  });

  assert.throws(
    () =>
      registry.validateForTransition({
        taskId: "task_001",
        from: "APPROVAL",
        to: "PUBLISH_SIGNAL",
        nowUtc: "2026-04-09T10:20:00.000Z",
        approvalRef: {
          approvalId: "approval_transition_binding",
          approvalType: "SIGNAL_PUBLISH",
          approvedBy: "approver",
          approvedAtUtc: "2026-04-09T10:00:00.000Z",
          status: "approved"
        }
      }),
    (error: unknown) =>
      error instanceof ApprovalValidationError && error.code === "APPROVAL_TRANSITION_MISMATCH"
  );
});

test("expired approval blocks transition", () => {
  const registry = new ApprovalRegistry(createSnapshot(), "run_001");

  assert.throws(
    () =>
      registry.validateForTransition({
        taskId: "task_001",
        from: "DESIGN",
        to: "FORMALIZE",
        nowUtc: "2026-04-09T12:00:00.000Z",
        approvalRef: {
          approvalId: "approval_expired",
          approvalType: "ARCHITECTURE",
          approvedBy: "approver",
          approvedAtUtc: "2026-04-09T10:00:00.000Z",
          status: "approved"
        }
      }),
    (error: unknown) =>
      error instanceof ApprovalValidationError && error.code === "APPROVAL_EXPIRED"
  );
});

test("revoked approval blocks transition", () => {
  const registry = new ApprovalRegistry(createSnapshot(), "run_001");

  assert.throws(
    () =>
      registry.validateForTransition({
        taskId: "task_001",
        from: "DESIGN",
        to: "FORMALIZE",
        approvalRef: {
          approvalId: "approval_revoked",
          approvalType: "ARCHITECTURE",
          approvedBy: "approver",
          approvedAtUtc: "2026-04-09T10:00:00.000Z",
          status: "approved",
          revokedAtUtc: "2026-04-09T10:05:00.000Z",
          revokedBy: "approver"
        }
      }),
    (error: unknown) =>
      error instanceof ApprovalValidationError && error.code === "APPROVAL_REVOKED"
  );
});
