import * as assert from "node:assert/strict";
import { test } from "node:test";

import { formatRunnerOutput } from "../src/output.js";
import type { RunnerOutput } from "../src/types.js";

function createBaseResult(): RunnerOutput {
  return {
    status: "ok",
    runId: "run_test_001",
    artifactsPath: "runtime/runs/run_test_001",
    outcome: "success",
    agentModes: {
      "product-agent": "live",
      "architect-agent": "mock",
      "quant-pattern-agent": "mock",
      "backend-agent": "mock",
      "docs-reviewer-agent": "mock"
    },
    snapshot: {
      version: "v1"
    },
    transitionLogPath: "runtime/logs/local-v1.jsonl",
    taskState: "DONE",
    artifacts: [],
    transitions: []
  };
}

test("formatRunnerOutput returns text output by default", () => {
  const output = formatRunnerOutput(createBaseResult());
  assert.match(output, /Run completed/);
  assert.match(output, /Run ID: run_test_001/);
  assert.match(output, /Final state: DONE/);
  assert.match(output, /Outcome: success/);
  assert.match(output, /Artifacts: runtime\/runs\/run_test_001/);
});

test("formatRunnerOutput returns machine-readable json output", () => {
  const output = formatRunnerOutput(createBaseResult(), "json");
  const parsed = JSON.parse(output) as Record<string, unknown>;

  assert.equal(parsed.status, "ok");
  assert.equal(parsed.runId, "run_test_001");
  assert.equal(parsed.finalState, "DONE");
  assert.equal(parsed.outcome, "success");
  assert.equal(parsed.artifactsPath, "runtime/runs/run_test_001");
  assert.equal((parsed.agentModes as Record<string, unknown>)["product-agent"], "live");
  assert.equal(parsed.transitionsCount, 0);
});
