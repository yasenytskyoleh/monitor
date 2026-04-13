import * as assert from "node:assert/strict";
import { test } from "node:test";

import type { AgentOutputEnvelope } from "@monitor/orchestrator-core";

import { BACKEND_RESPONSE_SCHEMA } from "../src/adapters/live/schemas/backend-agent-response-schema.js";
import { assertBackendOutput } from "../src/adapters/live/validators/assert-backend-output.js";

test("backend response schema declares required safety metrics contract", () => {
  const schema = BACKEND_RESPONSE_SCHEMA as Record<string, unknown>;
  const properties = schema.properties as Record<string, unknown>;
  const metricsAnyOf = (properties.metrics as Record<string, unknown>).anyOf as Array<Record<string, unknown>>;
  const metricsObject = metricsAnyOf.find((entry) => entry.type === "object");

  assert.ok(metricsObject);
  const metricsProperties = metricsObject?.properties as Record<string, unknown>;
  assert.ok(metricsProperties.changePlan);
  assert.ok(metricsProperties.targetFiles);
  assert.ok(metricsProperties.changeType);
  assert.ok(metricsProperties.requiresSchemaChange);
  assert.ok(metricsProperties.requiresArchitectureChange);
  assert.ok(metricsProperties.requiresMigration);
  assert.ok(metricsProperties.proposedDiffs);
  assert.ok(metricsProperties.testsPlan);
  assert.ok(metricsProperties.knownLimitations);
});

test("valid backend structured output passes safety validator", () => {
  const output = createValidBackendOutput();
  assert.doesNotThrow(() => assertBackendOutput(output));
});

test("backend safety validator blocks forbidden target paths", () => {
  const output = createValidBackendOutput({
    metrics: {
      targetFiles: ["packages/orchestrator-core/src/orchestrator.ts"],
      proposedDiffs: [
        {
          filePath: "packages/orchestrator-core/src/orchestrator.ts",
          operation: "update",
          content: "patched content"
        }
      ]
    }
  });

  assert.throws(() => assertBackendOutput(output), /outside allowlisted boundaries|forbidden target path/);
});

test("backend safety validator allows narrow single new file creation", () => {
  const output = createValidBackendOutput({
    metrics: {
      changeType: "new_file",
      proposedDiffs: [
        {
          filePath: "apps/orchestrator-runner/src/new-file.ts",
          operation: "create",
          content: "export const x = 1;"
        }
      ],
      targetFiles: ["apps/orchestrator-runner/src/new-file.ts"]
    }
  });

  assert.doesNotThrow(() => assertBackendOutput(output));
});

test("backend safety validator blocks create path outside create allowlist", () => {
  const output = createValidBackendOutput({
    metrics: {
      changeType: "new_file",
      proposedDiffs: [
        {
          filePath: "docs/project/new-file.md",
          operation: "create",
          content: "# unsupported create target"
        }
      ],
      targetFiles: ["docs/project/new-file.md"]
    }
  });

  assert.throws(() => assertBackendOutput(output), /outside create allowlist/);
});

test("backend safety validator blocks more than one create operation", () => {
  const output = createValidBackendOutput({
    metrics: {
      changeType: "test_focused_multi_file",
      proposedDiffs: [
        {
          filePath: "apps/orchestrator-runner/src/new-a.ts",
          operation: "create",
          content: "export const a = 1;"
        },
        {
          filePath: "apps/orchestrator-runner/test/new-b.test.ts",
          operation: "create",
          content: "export const b = 2;"
        }
      ],
      targetFiles: [
        "apps/orchestrator-runner/src/new-a.ts",
        "apps/orchestrator-runner/test/new-b.test.ts"
      ]
    }
  });

  assert.throws(() => assertBackendOutput(output), /create operation count 2 exceeds limit 1/);
});

test("backend safety validator blocks hidden file creation", () => {
  const output = createValidBackendOutput({
    metrics: {
      changeType: "new_file",
      proposedDiffs: [
        {
          filePath: "apps/orchestrator-runner/src/.hidden.ts",
          operation: "create",
          content: "export const hidden = true;"
        }
      ],
      targetFiles: ["apps/orchestrator-runner/src/.hidden.ts"]
    }
  });

  assert.throws(() => assertBackendOutput(output), /must not create hidden files/);
});

test("backend safety validator blocks disallowed create extension", () => {
  const output = createValidBackendOutput({
    metrics: {
      changeType: "new_file",
      proposedDiffs: [
        {
          filePath: "apps/orchestrator-runner/src/new-script.sh",
          operation: "create",
          content: "echo unsafe"
        }
      ],
      targetFiles: ["apps/orchestrator-runner/src/new-script.sh"]
    }
  });

  assert.throws(() => assertBackendOutput(output), /extension is not allowlisted/);
});

test("backend safety validator blocks schema changes without permission", () => {
  const output = createValidBackendOutput({
    metrics: {
      requiresSchemaChange: true
    }
  });

  assert.throws(() => assertBackendOutput(output), /requiresSchemaChange=true is forbidden/);
});

test("backend safety validator blocks migration changes without permission", () => {
  const output = createValidBackendOutput({
    metrics: {
      requiresMigration: true
    }
  });

  assert.throws(() => assertBackendOutput(output), /requiresMigration=true is forbidden/);
});

test("backend safety validator requires tests plan", () => {
  const output = createValidBackendOutput({
    metrics: {
      testsPlan: []
    }
  });

  assert.throws(() => assertBackendOutput(output), /metrics.testsPlan must be a non-empty string array/);
});

test("backend safety validator requires target files", () => {
  const output = createValidBackendOutput({
    metrics: {
      targetFiles: []
    }
  });

  assert.throws(() => assertBackendOutput(output), /metrics.targetFiles must be a non-empty string array/);
});

type BackendOutputOverrides = {
  status?: AgentOutputEnvelope["status"];
  metrics?: Partial<{
    changePlan: string[];
    targetFiles: string[];
    changeType: string;
    requiresSchemaChange: boolean;
    requiresArchitectureChange: boolean;
    requiresMigration: boolean;
    proposedDiffs: Array<{
      filePath: string;
      operation: "create" | "update";
      content: string;
    }>;
    testsPlan: string[];
    knownLimitations: string[];
  }>;
};

function createValidBackendOutput(overrides: BackendOutputOverrides = {}): AgentOutputEnvelope {
  const metrics = {
    changePlan: ["Update service handler to support validated output"],
    targetFiles: ["apps/orchestrator-runner/src/runner.ts"],
    changeType: "patch_only",
    requiresSchemaChange: false,
    requiresArchitectureChange: false,
    requiresMigration: false,
    proposedDiffs: [
      {
        filePath: "apps/orchestrator-runner/src/runner.ts",
        operation: "update" as const,
        content: "/* patch content */"
      }
    ],
    testsPlan: ["pnpm --filter @monitor/orchestrator-runner test"],
    knownLimitations: ["No cross-package changes in this patch set"],
    ...overrides.metrics
  };

  return {
    taskId: "task-backend-safety-001",
    agentRole: "BACKEND",
    status: overrides.status ?? "completed",
    summary: "Backend patch plan prepared",
    artifacts: ["code-change", "tests", "implementation-notes"],
    nextAction: "handoff_to_docs_reviewer",
    metrics
  };
}
