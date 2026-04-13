import * as assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";

import { applyBackendPatchPlan } from "../src/backend-patch/apply-patch-plan.js";
import { isBackendPatchError } from "../src/backend-patch/errors.js";
import { validatePostApplyResult } from "../src/backend-patch/post-apply-validate.js";
import { validateBackendPatchPlan } from "../src/backend-patch/validate-patch-plan.js";

test("backend patch dry-run validates and does not write", async (context) => {
  const workspaceRoot = await mkdtemp(join(tmpdir(), "backend-patch-dry-run-"));
  context.after(async () => rm(workspaceRoot, { recursive: true, force: true }));

  const targetFile = "apps/orchestrator-runner/src/dry-run-target.ts";
  const targetPath = join(workspaceRoot, targetFile);
  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, "export const dryRunValue = 0;\n", "utf8");

  const patchPlan = validateBackendPatchPlan({
    taskId: "task-backend-dry-run",
    rootDir: workspaceRoot,
    metrics: createMetrics(targetFile, "export const dryRunValue = 1;\n")
  });
  const applyResult = await applyBackendPatchPlan(patchPlan, {
    dryRun: true
  });
  const postApply = await validatePostApplyResult({
    patchPlan,
    applyResult
  });

  const content = await readFile(targetPath, "utf8");
  assert.equal(content, "export const dryRunValue = 0;\n");
  assert.equal(applyResult.applyMode, "dry-run");
  assert.equal(applyResult.applied, false);
  assert.deepEqual(applyResult.changedFiles, []);
  assert.equal(postApply.passed, true);
});

test("backend patch apply mode writes only validated files", async (context) => {
  const workspaceRoot = await mkdtemp(join(tmpdir(), "backend-patch-apply-"));
  context.after(async () => rm(workspaceRoot, { recursive: true, force: true }));

  const targetFile = "apps/orchestrator-runner/src/apply-target.ts";
  const targetPath = join(workspaceRoot, targetFile);
  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, "export const applyValue = 0;\n", "utf8");

  const patchPlan = validateBackendPatchPlan({
    taskId: "task-backend-apply",
    rootDir: workspaceRoot,
    metrics: createMetrics(targetFile, "export const applyValue = 1;\n")
  });
  const applyResult = await applyBackendPatchPlan(patchPlan, {
    dryRun: false
  });
  const postApply = await validatePostApplyResult({
    patchPlan,
    applyResult
  });

  const content = await readFile(targetPath, "utf8");
  assert.equal(content, "export const applyValue = 1;\n");
  assert.equal(applyResult.applyMode, "apply");
  assert.equal(applyResult.applied, true);
  assert.deepEqual(applyResult.changedFiles, [targetFile]);
  assert.equal(postApply.passed, true);
});

test("backend patch limits reject excessive target file count", () => {
  const targetFiles = Array.from({ length: 13 }, (_, index) => `apps/orchestrator-runner/src/t-${index}.ts`);
  const metrics = {
    changePlan: ["Apply multi-file patch"],
    targetFiles,
    changeType: "patch_only",
    requiresSchemaChange: false,
    requiresArchitectureChange: false,
    requiresMigration: false,
    proposedDiffs: targetFiles.map((filePath) => ({
      filePath,
      operation: "update",
      content: "export const x = 1;\n"
    })),
    testsPlan: ["pnpm --filter @monitor/orchestrator-runner test"],
    knownLimitations: ["Constrained mode"]
  };

  assert.throws(
    () =>
      validateBackendPatchPlan({
        taskId: "task-backend-limit-files",
        rootDir: "/tmp",
        metrics
      }),
    /patch_limit_exceeded|exceeds safety limit/
  );
});

test("backend patch limits reject oversized patch content", () => {
  const metrics = createMetrics(
    "apps/orchestrator-runner/src/oversized.ts",
    "x".repeat(5_000)
  );

  assert.throws(
    () =>
      validateBackendPatchPlan({
        taskId: "task-backend-limit-size",
        rootDir: "/tmp",
        metrics,
        limits: {
          maxTargetFiles: 5,
          maxTotalContentBytes: 512,
          maxPerFileContentBytes: 256,
          enforceSingleRoot: true
        }
      }),
    /patch_limit_exceeded/
  );
});

test("backend patch limits reject cross-root target sets", () => {
  const metrics = {
    changePlan: ["Cross-root patch"],
    targetFiles: [
      "apps/orchestrator-runner/src/cross-root.ts",
      "docs/project/cross-root.md"
    ],
    changeType: "patch_only",
    requiresSchemaChange: false,
    requiresArchitectureChange: false,
    requiresMigration: false,
    proposedDiffs: [
      {
        filePath: "apps/orchestrator-runner/src/cross-root.ts",
        operation: "update",
        content: "export const rootA = true;\n"
      },
      {
        filePath: "docs/project/cross-root.md",
        operation: "update",
        content: "# root B\n"
      }
    ],
    testsPlan: ["pnpm --filter @monitor/orchestrator-runner test"],
    knownLimitations: ["Constrained mode"]
  };

  assert.throws(
    () =>
      validateBackendPatchPlan({
        taskId: "task-backend-cross-root",
        rootDir: "/tmp",
        metrics
      }),
    /single root|patch_limit_exceeded/
  );
});

test("post-apply validator rejects unexpected writes", async (context) => {
  const workspaceRoot = await mkdtemp(join(tmpdir(), "backend-post-apply-"));
  context.after(async () => rm(workspaceRoot, { recursive: true, force: true }));

  const targetFile = "apps/orchestrator-runner/src/post-apply-target.ts";
  const targetPath = join(workspaceRoot, targetFile);
  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, "export const postApplyValue = 0;\n", "utf8");

  const patchPlan = validateBackendPatchPlan({
    taskId: "task-backend-post-apply",
    rootDir: workspaceRoot,
    metrics: createMetrics(targetFile, "export const postApplyValue = 1;\n")
  });

  const applyResult = await applyBackendPatchPlan(patchPlan, {
    dryRun: false
  });
  const tamperedApplyResult = {
    ...applyResult,
    changedFiles: [...applyResult.changedFiles, "apps/orchestrator-runner/src/unexpected.ts"]
  };

  await assert.rejects(
    () =>
      validatePostApplyResult({
        patchPlan,
        applyResult: tamperedApplyResult
      }),
    (error: unknown) =>
      isBackendPatchError(error) && error.failureCategory === "post_apply_validation_failure"
  );
});

function createMetrics(targetFile: string, content: string): Record<string, unknown> {
  return {
    changePlan: ["Apply constrained backend patch"],
    targetFiles: [targetFile],
    changeType: "patch_only",
    requiresSchemaChange: false,
    requiresArchitectureChange: false,
    requiresMigration: false,
    proposedDiffs: [
      {
        filePath: targetFile,
        operation: "update",
        content
      }
    ],
    testsPlan: ["pnpm --filter @monitor/orchestrator-runner test"],
    knownLimitations: ["Constrained mode"]
  };
}
