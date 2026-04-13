import * as assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";

import { applyPromotion } from "../src/backend-promotion/apply-promotion.js";
import { preparePromotion } from "../src/backend-promotion/prepare-promotion.js";
import { validatePromotion } from "../src/backend-promotion/validate-promotion.js";
import { validateBackendPatchPlan } from "../src/backend-patch/validate-patch-plan.js";

test("validatePromotion blocks promotion when main workspace fingerprint changed", async (context) => {
  const workspaceRoot = await mkdtemp(join(tmpdir(), "backend-promotion-conflict-"));
  const isolatedRoot = await mkdtemp(join(tmpdir(), "backend-promotion-conflict-iso-"));
  context.after(async () => {
    await rm(workspaceRoot, { recursive: true, force: true });
    await rm(isolatedRoot, { recursive: true, force: true });
  });

  const targetFile = "apps/orchestrator-runner/src/promotion-conflict.ts";
  const targetPath = join(workspaceRoot, targetFile);
  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, "export const conflictValue = 0;\n", "utf8");

  const patchPlan = createPatchPlan({
    taskId: "task-promotion-conflict",
    rootDir: workspaceRoot,
    targetFile,
    content: "export const conflictValue = 1;\n"
  });
  const preparedPromotion = await preparePromotion({
    rootDir: workspaceRoot,
    patchPlan
  });

  await writeFile(targetPath, "export const conflictValue = 2;\n", "utf8");

  const isolatedTargetPath = join(isolatedRoot, targetFile);
  await mkdir(dirname(isolatedTargetPath), { recursive: true });
  await writeFile(isolatedTargetPath, "export const conflictValue = 1;\n", "utf8");

  const validation = await validatePromotion({
    mode: "promote_verified",
    rootDir: workspaceRoot,
    isolatedWorkspaceRoot: isolatedRoot,
    patchPlan,
    applyResult: {
      appliedOperations: [
        {
          filePath: targetFile,
          operation: "update",
          applied: true
        }
      ],
      applyMode: "apply",
      applied: true,
      changedFiles: [targetFile],
      dryRun: false
    },
    verificationResult: {
      applied: true,
      hooksRequested: [],
      hooksExecuted: [],
      overallStatus: "skipped"
    },
    preparedPromotion
  });

  assert.equal(validation.eligible, false);
  assert.equal(validation.conflictDetected, true);
  assert.ok(validation.filesBlocked.includes(targetFile));
  assert.match(validation.failureReason ?? "", /changed after isolated execution started/);
});

test("applyPromotion copies only explicitly listed files from isolated workspace", async (context) => {
  const workspaceRoot = await mkdtemp(join(tmpdir(), "backend-promotion-explicit-"));
  const isolatedRoot = await mkdtemp(join(tmpdir(), "backend-promotion-explicit-iso-"));
  context.after(async () => {
    await rm(workspaceRoot, { recursive: true, force: true });
    await rm(isolatedRoot, { recursive: true, force: true });
  });

  const targetFile = "apps/orchestrator-runner/src/promotion-target.ts";
  const extraFile = "apps/orchestrator-runner/src/promotion-extra.ts";

  await writeFileWithParents(join(workspaceRoot, targetFile), "export const target = false;\n");
  await writeFileWithParents(join(workspaceRoot, extraFile), "export const extra = false;\n");

  await writeFileWithParents(join(isolatedRoot, targetFile), "export const target = true;\n");
  await writeFileWithParents(join(isolatedRoot, extraFile), "export const extra = true;\n");

  const result = await applyPromotion({
    rootDir: workspaceRoot,
    isolatedWorkspaceRoot: isolatedRoot,
    filesToPromote: [targetFile]
  });

  assert.deepEqual(result.filesPromoted, [targetFile]);
  assert.equal(await readFile(join(workspaceRoot, targetFile), "utf8"), "export const target = true;\n");
  assert.equal(await readFile(join(workspaceRoot, extraFile), "utf8"), "export const extra = false;\n");
});

test("applyPromotion keeps all-or-nothing behavior when any promotion source is missing", async (context) => {
  const workspaceRoot = await mkdtemp(join(tmpdir(), "backend-promotion-all-or-nothing-"));
  const isolatedRoot = await mkdtemp(join(tmpdir(), "backend-promotion-all-or-nothing-iso-"));
  context.after(async () => {
    await rm(workspaceRoot, { recursive: true, force: true });
    await rm(isolatedRoot, { recursive: true, force: true });
  });

  const firstFile = "apps/orchestrator-runner/src/promotion-first.ts";
  const missingFile = "apps/orchestrator-runner/src/promotion-missing.ts";

  await writeFileWithParents(join(workspaceRoot, firstFile), "export const first = false;\n");
  await writeFileWithParents(join(isolatedRoot, firstFile), "export const first = true;\n");

  await assert.rejects(
    () =>
      applyPromotion({
        rootDir: workspaceRoot,
        isolatedWorkspaceRoot: isolatedRoot,
        filesToPromote: [firstFile, missingFile]
      }),
    /ENOENT/
  );

  assert.equal(await readFile(join(workspaceRoot, firstFile), "utf8"), "export const first = false;\n");
});

test("validatePromotion blocks unexpected apply file sets with clear reason", async (context) => {
  const workspaceRoot = await mkdtemp(join(tmpdir(), "backend-promotion-apply-mismatch-"));
  const isolatedRoot = await mkdtemp(join(tmpdir(), "backend-promotion-apply-mismatch-iso-"));
  context.after(async () => {
    await rm(workspaceRoot, { recursive: true, force: true });
    await rm(isolatedRoot, { recursive: true, force: true });
  });

  const targetFile = "apps/orchestrator-runner/src/promotion-apply-match.ts";
  const extraFile = "apps/orchestrator-runner/src/promotion-apply-extra.ts";

  await writeFileWithParents(join(workspaceRoot, targetFile), "export const target = false;\n");
  await writeFileWithParents(join(workspaceRoot, extraFile), "export const extra = false;\n");
  await writeFileWithParents(join(isolatedRoot, targetFile), "export const target = true;\n");

  const patchPlan = createPatchPlan({
    taskId: "task-promotion-apply-mismatch",
    rootDir: workspaceRoot,
    targetFile,
    content: "export const target = true;\n"
  });
  const preparedPromotion = await preparePromotion({
    rootDir: workspaceRoot,
    patchPlan
  });

  const validation = await validatePromotion({
    mode: "promote_verified",
    rootDir: workspaceRoot,
    isolatedWorkspaceRoot: isolatedRoot,
    patchPlan,
    applyResult: {
      appliedOperations: [
        {
          filePath: targetFile,
          operation: "update",
          applied: true
        },
        {
          filePath: extraFile,
          operation: "update",
          applied: true
        }
      ],
      applyMode: "apply",
      applied: true,
      changedFiles: [targetFile, extraFile],
      dryRun: false
    },
    verificationResult: {
      applied: true,
      hooksRequested: [],
      hooksExecuted: [],
      overallStatus: "skipped"
    },
    preparedPromotion
  });

  assert.equal(validation.eligible, false);
  assert.equal(validation.conflictDetected, false);
  assert.ok(validation.filesBlocked.includes(extraFile));
  assert.match(validation.failureReason ?? "", /outside validated plan/);
});

function createPatchPlan(input: {
  taskId: string;
  rootDir: string;
  targetFile: string;
  content: string;
}) {
  return validateBackendPatchPlan({
    taskId: input.taskId,
    rootDir: input.rootDir,
    metrics: {
      changePlan: ["Update promotion target"],
      targetFiles: [input.targetFile],
      changeType: "patch_only",
      requiresSchemaChange: false,
      requiresArchitectureChange: false,
      requiresMigration: false,
      proposedDiffs: [
        {
          filePath: input.targetFile,
          operation: "update",
          content: input.content
        }
      ],
      testsPlan: ["pnpm --filter @monitor/orchestrator-runner test"],
      knownLimitations: ["Constrained patch mode only."]
    }
  });
}

async function writeFileWithParents(pathValue: string, content: string): Promise<void> {
  await mkdir(dirname(pathValue), { recursive: true });
  await writeFile(pathValue, content, "utf8");
}
