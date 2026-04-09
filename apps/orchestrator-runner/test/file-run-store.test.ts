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
    terminalOutcome
  });

  assert.equal(persisted.relativeRunDir, "runtime/runs/run_fixed_001");

  const runJson = JSON.parse(
    await readFile(join(workspaceRoot, "runtime/runs/run_fixed_001/run.json"), "utf8")
  ) as Record<string, unknown>;
  assert.equal(runJson.runId, "run_fixed_001");
  assert.equal(runJson.finalState, "DONE");
});
