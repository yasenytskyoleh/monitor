import * as assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";

import { cleanupIsolatedWorkspace } from "../src/backend-isolation/cleanup-isolated-workspace.js";
import { prepareIsolatedWorkspace } from "../src/backend-isolation/prepare-isolated-workspace.js";
import { applyBackendPatchPlan } from "../src/backend-patch/apply-patch-plan.js";
import { validateBackendPatchPlan } from "../src/backend-patch/validate-patch-plan.js";
import { runBackendVerificationHooks } from "../src/backend-verification/run-verification-hooks.js";

test("isolated workspace apply mutates workspace copy and leaves main workspace unchanged", async (context) => {
  const rootDir = await mkdtemp(join(tmpdir(), "backend-isolation-main-"));
  context.after(async () => rm(rootDir, { recursive: true, force: true }));

  const targetFile = "apps/orchestrator-runner/src/isolation-target.ts";
  const mainTargetPath = join(rootDir, targetFile);
  await mkdir(dirname(mainTargetPath), { recursive: true });
  await writeFile(mainTargetPath, "export const isolationValue = 0;\n", "utf8");

  const patchPlan = validateBackendPatchPlan({
    taskId: "task-isolation-001",
    rootDir,
    metrics: {
      changePlan: ["Update isolation target"],
      targetFiles: [targetFile],
      changeType: "patch_only",
      requiresSchemaChange: false,
      requiresArchitectureChange: false,
      requiresMigration: false,
      proposedDiffs: [
        {
          filePath: targetFile,
          operation: "update",
          content: "export const isolationValue = 1;\n"
        }
      ],
      testsPlan: ["pnpm --filter @monitor/orchestrator-runner test"],
      knownLimitations: ["Constrained mode"]
    }
  });

  const prepared = await prepareIsolatedWorkspace({
    rootDir,
    patchPlan,
    verificationMode: "none"
  });

  const applyResult = await applyBackendPatchPlan(prepared.executionPatchPlan, {
    dryRun: false
  });
  assert.equal(applyResult.applied, true);

  assert.equal(await readFile(mainTargetPath, "utf8"), "export const isolationValue = 0;\n");

  const isolatedTargetPath = join(prepared.workspaceRoot, targetFile);
  assert.equal(await readFile(isolatedTargetPath, "utf8"), "export const isolationValue = 1;\n");

  const cleanup = await cleanupIsolatedWorkspace({
    workspaceRoot: prepared.workspaceRoot
  });
  assert.equal(cleanup.status, "succeeded");
  await assert.rejects(() => access(prepared.workspaceRoot));
});

test("verification hooks run against isolated workspace cwd", async (context) => {
  const rootDir = await mkdtemp(join(tmpdir(), "backend-isolation-verify-"));
  context.after(async () => rm(rootDir, { recursive: true, force: true }));

  const targetFile = "apps/orchestrator-runner/src/isolation-verify.ts";
  const targetPath = join(rootDir, targetFile);
  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, "export const verifyValue = 0;\n", "utf8");

  const patchPlan = validateBackendPatchPlan({
    taskId: "task-isolation-verify",
    rootDir,
    metrics: {
      changePlan: ["Update verification target"],
      targetFiles: [targetFile],
      changeType: "patch_only",
      requiresSchemaChange: false,
      requiresArchitectureChange: false,
      requiresMigration: false,
      proposedDiffs: [
        {
          filePath: targetFile,
          operation: "update",
          content: "export const verifyValue = 1;\n"
        }
      ],
      testsPlan: ["pnpm --filter @monitor/orchestrator-runner test"],
      knownLimitations: ["Constrained mode"]
    }
  });

  const prepared = await prepareIsolatedWorkspace({
    rootDir,
    patchPlan,
    verificationMode: "lint"
  });

  let capturedCwd = "";
  const result = await runBackendVerificationHooks({
    mode: "lint",
    cwd: prepared.workspaceRoot,
    applied: true,
    runner: async (input) => {
      capturedCwd = input.cwd;
      return {
        exitCode: 0,
        timedOut: false,
        stdout: "ok",
        stderr: "",
        durationMs: 1
      };
    }
  });

  assert.equal(result.overallStatus, "passed");
  assert.equal(capturedCwd, prepared.workspaceRoot);

  const cleanup = await cleanupIsolatedWorkspace({
    workspaceRoot: prepared.workspaceRoot
  });
  assert.equal(cleanup.status, "succeeded");
});
