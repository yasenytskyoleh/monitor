import assert from "node:assert/strict";
import test from "node:test";

import { PermissionDeniedError, WorkflowTransitionError } from "../src/errors.js";
import { assertActionAllowed } from "../src/permissions.js";
import { assertTransitionAllowed } from "../src/workflow-guard.js";
import type { ResolvedAgentConfig, WorkflowGraphConfig } from "../src/types.js";

const TEST_AGENT: ResolvedAgentConfig = {
  id: "product-agent",
  role: "PRODUCT",
  ownsStates: ["INTAKE"],
  allowedInputs: ["feature-request"],
  requiredOutputs: ["scope"],
  allowedNextActions: ["handoff_to_architect"],
  permissions: {
    allow: ["docs.read", "workflow.escalate"]
  },
  requiredArtifacts: ["product-brief"],
  outputContractSchemaRef: "agent-output-envelope.v1",
  escalationPolicy: {
    allowed: true,
    severities: ["low", "medium", "high", "critical"]
  },
  prompt: {
    version: "v1",
    template: "product-agent.txt"
  },
  runtime: {
    jsonModeRequired: true,
    provider: "openai",
    model: "gpt-5.4-mini",
    fallbackModel: "gpt-5.4-mini",
    temperature: 0.1,
    maxTokens: 1000,
    maxArtifactsPerOutput: 10,
    retryPolicy: {
      retries: 2,
      backoffMs: 500,
      retryOn: ["timeout"]
    },
    timeoutMs: 30000,
    concurrency: {
      maxParallelTasks: 1,
      maxParallelActionsPerTask: 1
    }
  }
};

const WORKFLOW: WorkflowGraphConfig = {
  states: ["DESIGN", "FORMALIZE", "APPROVAL", "PUBLISH_SIGNAL"],
  initialState: "DESIGN",
  terminalStates: ["PUBLISH_SIGNAL"],
  stateOwners: {
    DESIGN: "ARCHITECT",
    FORMALIZE: "QUANT_PATTERN",
    APPROVAL: "HUMAN",
    PUBLISH_SIGNAL: "SYSTEM"
  },
  transitions: [
    {
      from: "DESIGN",
      to: "FORMALIZE",
      requiresApproval: true,
      approvalType: "ARCHITECTURE"
    },
    {
      from: "APPROVAL",
      to: "PUBLISH_SIGNAL",
      requiresApproval: true,
      approvalType: "SIGNAL_PUBLISH"
    }
  ]
};

test("enforces deny-by-default action permissions", async () => {
  assert.doesNotThrow(() => assertActionAllowed(TEST_AGENT, "docs.read"));
  assert.throws(() => assertActionAllowed(TEST_AGENT, "code.write"), PermissionDeniedError);
});

test("blocks transitions without required approval", async () => {
  assert.throws(
    () =>
      assertTransitionAllowed(WORKFLOW, {
        from: "DESIGN",
        to: "FORMALIZE"
      }),
    WorkflowTransitionError
  );
});

test("blocks transitions with wrong approval type", async () => {
  assert.throws(
    () =>
      assertTransitionAllowed(WORKFLOW, {
        from: "DESIGN",
        to: "FORMALIZE",
        approvalRef: {
          approvalId: "appr-1",
          approvalType: "SIGNAL_PUBLISH",
          approvedBy: "reviewer-1",
          approvedAtUtc: "2026-04-08T10:00:00.000Z",
          status: "approved"
        }
      }),
    WorkflowTransitionError
  );
});

test("allows transitions with correct approval", async () => {
  assert.doesNotThrow(() =>
    assertTransitionAllowed(WORKFLOW, {
      from: "DESIGN",
      to: "FORMALIZE",
      approvalRef: {
        approvalId: "appr-1",
        approvalType: "ARCHITECTURE",
        approvedBy: "reviewer-1",
        approvedAtUtc: "2026-04-08T10:00:00.000Z",
        status: "approved"
      }
    })
  );
});

test("blocks expired approvals", async () => {
  assert.throws(
    () =>
      assertTransitionAllowed(WORKFLOW, {
        from: "DESIGN",
        to: "FORMALIZE",
        approvalRef: {
          approvalId: "appr-1",
          approvalType: "ARCHITECTURE",
          approvedBy: "reviewer-1",
          approvedAtUtc: "2026-04-08T10:00:00.000Z",
          status: "approved",
          expiresAtUtc: "2026-04-08T10:05:00.000Z"
        },
        nowUtc: "2026-04-08T10:06:00.000Z"
      }),
    WorkflowTransitionError
  );
});

test("blocks revoked approvals", async () => {
  assert.throws(
    () =>
      assertTransitionAllowed(WORKFLOW, {
        from: "DESIGN",
        to: "FORMALIZE",
        approvalRef: {
          approvalId: "appr-1",
          approvalType: "ARCHITECTURE",
          approvedBy: "reviewer-1",
          approvedAtUtc: "2026-04-08T10:00:00.000Z",
          status: "approved",
          revokedAtUtc: "2026-04-08T10:04:00.000Z",
          revokedBy: "reviewer-2"
        }
      }),
    WorkflowTransitionError
  );
});
