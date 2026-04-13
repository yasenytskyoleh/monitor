import * as assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";

import { applyRollback } from "../src/backend-rollback/apply-rollback.js";
import { buildRollbackPlan } from "../src/backend-rollback/build-rollback-plan.js";

test("buildRollbackPlan returns null for dry-run mode", async (context) => {
  const workspaceRoot = await mkdtemp(join(tmpdir(), "backend-rollback-dry-run-"));
  context.after(async () => rm(workspaceRoot, { recursive: true, force: true }));

  const targetFile = "apps/orchestrator-runner/src/rb-dry.ts";
  const targetPath = join(workspaceRoot, targetFile);
  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, "export const v = 1;\n", "utf8");

  const plan = await buildRollbackPlan({
    applyMode: "dry-run",
    patchPlan: {
      taskId: "task-rollback-dry",
      changeType: "patch_only",
      singleRootKey: "apps/orchestrator-runner",
      totalContentBytes: 10,
      limitChecks: {
        maxFilesPassed: true,
        maxSizePassed: true,
        maxPerFileSizePassed: true,
        singleRootPassed: true
      },
      targetFiles: [targetFile],
      testsPlan: ["pnpm --filter @monitor/orchestrator-runner test"],
      knownLimitations: ["none"],
      proposedDiffs: [
        {
          filePath: targetFile,
          absolutePath: targetPath,
          operation: "update",
          content: "export const v = 2;\n"
        }
      ]
    }
  });

  assert.equal(plan, null);
});

test("applyRollback restores modified files and removes created files", async (context) => {
  const workspaceRoot = await mkdtemp(join(tmpdir(), "backend-rollback-apply-"));
  context.after(async () => rm(workspaceRoot, { recursive: true, force: true }));

  const modifiedFile = "apps/orchestrator-runner/src/rb-modified.ts";
  const modifiedPath = join(workspaceRoot, modifiedFile);
  await mkdir(dirname(modifiedPath), { recursive: true });
  await writeFile(modifiedPath, "export const before = true;\n", "utf8");

  const createdFile = "apps/orchestrator-runner/src/rb-created.ts";
  const createdPath = join(workspaceRoot, createdFile);
  await writeFile(createdPath, "export const created = true;\n", "utf8");

  const result = await applyRollback({
    triggerReason: "verification_failed",
    plan: {
      taskId: "task-rollback-apply",
      applyMode: "apply",
      entries: [
        {
          filePath: modifiedFile,
          absolutePath: modifiedPath,
          existedBefore: true,
          previousContent: "export const before = false;\n"
        },
        {
          filePath: createdFile,
          absolutePath: createdPath,
          existedBefore: false,
          previousContent: null
        }
      ]
    }
  });

  assert.equal(result.status, "succeeded");
  assert.equal(result.rollbackAttempted, true);
  assert.ok(result.restoredFiles.includes(modifiedFile));
  assert.ok(result.deletedCreatedFiles.includes(createdFile));

  const restored = await readFile(modifiedPath, "utf8");
  assert.equal(restored, "export const before = false;\n");
  await assert.rejects(() => access(createdPath));
});
