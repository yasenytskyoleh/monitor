import assert from "node:assert/strict";
import test from "node:test";
import { join } from "node:path";

import { compileRuntimeConfig } from "../src/compiler.js";
import { ConfigValidationError } from "../src/errors.js";
import { cleanupTempWorkspace, createTempWorkspace, updateYamlFile } from "./helpers.js";

test("applies merge precedence base < env overlay < env vars", async (context) => {
  const workspaceRoot = await createTempWorkspace();
  context.after(async () => cleanupTempWorkspace(workspaceRoot));

  const snapshot = await compileRuntimeConfig({
    rootDir: workspaceRoot,
    environment: "local",
    version: "test-version",
    envVars: {
      AGENTCFG_TIMEOUT_MS: "120000"
    }
  });

  assert.equal(snapshot.runtimeDefaults.model, "gpt-5.4-mini");
  assert.equal(snapshot.runtimeDefaults.temperature, 0.2);
  assert.equal(snapshot.runtimeDefaults.maxTokens, 4000);
  assert.equal(snapshot.runtimeDefaults.timeoutMs, 120000);
  assert.equal(snapshot.runtimeDefaults.jsonModeRequired, true);
  assert.equal(snapshot.runtimeDefaults.fallbackModel, "gpt-5.4-mini");
  assert.equal(snapshot.runtimeDefaults.maxArtifactsPerOutput, 10);
  assert.equal(snapshot.runtimeDefaults.retryPolicy.retries, 2);
  assert.equal(snapshot.runtimeDefaults.retryPolicy.backoffMs, 1000);
  assert.deepEqual(snapshot.runtimeDefaults.retryPolicy.retryOn, ["timeout", "rate_limit", "transient_error"]);
  assert.equal(snapshot.runtimeDefaults.concurrency.maxParallelTasks, 3);
  assert.equal(snapshot.runtimeDefaults.concurrency.maxParallelActionsPerTask, 1);
  assert.equal(snapshot.approvalPolicy.allowMockApprovals, true);
  assert.equal(snapshot.promptSetVersion, "v1");
  assert.match(snapshot.promptSetChecksum, /^[a-f0-9]{64}$/);

  const docsReviewer = snapshot.agents.find((agent) => agent.id === "docs-reviewer-agent");
  const productAgent = snapshot.agents.find((agent) => agent.id === "product-agent");

  assert.ok(docsReviewer);
  assert.ok(productAgent);
  assert.equal(docsReviewer.runtime.model, "gpt-5.4-mini");
  assert.equal(productAgent.runtime.timeoutMs, 120000);

  const hasReviewBackToImplementTransition = snapshot.workflow.transitions.some(
    (transition) => transition.from === "REVIEW" && transition.to === "IMPLEMENT"
  );

  assert.equal(hasReviewBackToImplementTransition, true);
});

test("fails startup when schema validation fails", async (context) => {
  const workspaceRoot = await createTempWorkspace();
  context.after(async () => cleanupTempWorkspace(workspaceRoot));

  await updateYamlFile<{ runtime: { maxTokens: number } }>(
    join(workspaceRoot, "configs/agents/base/runtime-defaults.yaml"),
    (config) => {
      config.runtime.maxTokens = 0;
      return config;
    }
  );

  await assert.rejects(compileRuntimeConfig({ rootDir: workspaceRoot, environment: "dev" }), ConfigValidationError);
});

test("fails startup when prompt checksum does not match manifest", async (context) => {
  const workspaceRoot = await createTempWorkspace();
  context.after(async () => cleanupTempWorkspace(workspaceRoot));

  await updateYamlFile<{
    prompts: {
      entries: Array<{ file: string; sha256: string; version: string }>;
    };
  }>(join(workspaceRoot, "configs/agents/versions/manifest.yaml"), (config) => {
    const productPrompt = config.prompts.entries.find((entry) => entry.file === "product-agent.txt");
    if (!productPrompt) {
      throw new Error("Expected product-agent.txt entry in prompt manifest");
    }
    productPrompt.sha256 = "0000000000000000000000000000000000000000000000000000000000000000";
    return config;
  });

  await assert.rejects(compileRuntimeConfig({ rootDir: workspaceRoot, environment: "dev" }), ConfigValidationError);
});
