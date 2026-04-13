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

test("backend patch apply mode creates one allowlisted new file", async (context) => {
  const workspaceRoot = await mkdtemp(join(tmpdir(), "backend-patch-create-"));
  context.after(async () => rm(workspaceRoot, { recursive: true, force: true }));

  const newFile = "apps/orchestrator-runner/src/new-helper.ts";
  const newPath = join(workspaceRoot, newFile);

  const patchPlan = validateBackendPatchPlan({
    taskId: "task-backend-create",
    rootDir: workspaceRoot,
    metrics: {
      ...createMetrics("apps/orchestrator-runner/src/placeholder.ts", "export const placeholder = true;\n"),
      targetFiles: [newFile],
      changeType: "new_file",
      proposedDiffs: [
        {
          filePath: newFile,
          operation: "create",
          content: "export const createdHelper = true;\n"
        }
      ]
    }
  });

  const applyResult = await applyBackendPatchPlan(patchPlan, {
    dryRun: false
  });
  const postApply = await validatePostApplyResult({
    patchPlan,
    applyResult
  });

  const content = await readFile(newPath, "utf8");
  assert.equal(content, "export const createdHelper = true;\n");
  assert.equal(applyResult.applied, true);
  assert.deepEqual(applyResult.changedFiles, [newFile]);
  assert.equal(postApply.passed, true);
});

test("backend patch apply mode creates one allowlisted json helper fixture", async (context) => {
  const workspaceRoot = await mkdtemp(join(tmpdir(), "backend-patch-json-helper-"));
  context.after(async () => rm(workspaceRoot, { recursive: true, force: true }));

  const helperFile = "apps/orchestrator-runner/test/fixtures/new-helper.json";
  const helperPath = join(workspaceRoot, helperFile);

  const patchPlan = validateBackendPatchPlan({
    taskId: "task-backend-json-helper-create",
    rootDir: workspaceRoot,
    metrics: {
      ...createMetrics("apps/orchestrator-runner/src/placeholder.ts", "export const placeholder = true;\n"),
      targetFiles: [helperFile],
      changeType: "new_file",
      proposedDiffs: [
        {
          filePath: helperFile,
          operation: "create",
          content: "{\"helper\":true}\n"
        }
      ]
    }
  });

  const applyResult = await applyBackendPatchPlan(patchPlan, {
    dryRun: false
  });
  const postApply = await validatePostApplyResult({
    patchPlan,
    applyResult
  });

  const content = await readFile(helperPath, "utf8");
  assert.equal(content, "{\"helper\":true}\n");
  assert.equal(applyResult.applied, true);
  assert.deepEqual(applyResult.changedFiles, [helperFile]);
  assert.equal(postApply.passed, true);
});

test("backend patch validation allows mixed update + single create in one root", async (context) => {
  const workspaceRoot = await mkdtemp(join(tmpdir(), "backend-patch-mixed-create-"));
  context.after(async () => rm(workspaceRoot, { recursive: true, force: true }));

  const existingFile = "apps/orchestrator-runner/src/mixed-existing.ts";
  const existingPath = join(workspaceRoot, existingFile);
  await mkdir(dirname(existingPath), { recursive: true });
  await writeFile(existingPath, "export const mixedExisting = false;\n", "utf8");

  const createdFile = "apps/orchestrator-runner/test/mixed-created.test.ts";

  const patchPlan = validateBackendPatchPlan({
    taskId: "task-backend-mixed-create",
    rootDir: workspaceRoot,
    metrics: {
      ...createMetrics(existingFile, "export const mixedExisting = true;\n"),
      targetFiles: [existingFile, createdFile],
      changeType: "test_focused_multi_file",
      proposedDiffs: [
        {
          filePath: existingFile,
          operation: "update",
          content: "export const mixedExisting = true;\n"
        },
        {
          filePath: createdFile,
          operation: "create",
          content: "export const mixedCreated = true;\n"
        }
      ]
    }
  });

  const applyResult = await applyBackendPatchPlan(patchPlan, {
    dryRun: false
  });

  assert.equal(applyResult.applied, true);
  assert.deepEqual(applyResult.changedFiles.sort(), [createdFile, existingFile].sort());
});

test("backend patch apply mode rejects create when file already exists", async (context) => {
  const workspaceRoot = await mkdtemp(join(tmpdir(), "backend-patch-create-existing-"));
  context.after(async () => rm(workspaceRoot, { recursive: true, force: true }));

  const existingFile = "apps/orchestrator-runner/src/existing-create-target.ts";
  const existingPath = join(workspaceRoot, existingFile);
  await mkdir(dirname(existingPath), { recursive: true });
  await writeFile(existingPath, "export const alreadyThere = true;\n", "utf8");

  const patchPlan = validateBackendPatchPlan({
    taskId: "task-backend-create-existing",
    rootDir: workspaceRoot,
    metrics: {
      ...createMetrics("apps/orchestrator-runner/src/placeholder.ts", "export const placeholder = true;\n"),
      targetFiles: [existingFile],
      changeType: "new_file",
      proposedDiffs: [
        {
          filePath: existingFile,
          operation: "create",
          content: "export const shouldFail = true;\n"
        }
      ]
    }
  });

  await assert.rejects(
    () =>
      applyBackendPatchPlan(patchPlan, {
        dryRun: false
      }),
    /create operation requires non-existing file/
  );
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
      "apps/orchestrator-runner/test/cross-root.test.ts",
      "docs/project/cross-root.md"
    ],
    changeType: "test_focused_multi_file",
    requiresSchemaChange: false,
    requiresArchitectureChange: false,
    requiresMigration: false,
    proposedDiffs: [
      {
        filePath: "apps/orchestrator-runner/test/cross-root.test.ts",
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

test("backend patch validation rejects more than one create operation", () => {
  const metrics = {
    ...createMetrics("apps/orchestrator-runner/src/placeholder.ts", "export const placeholder = true;\n"),
    targetFiles: [
      "apps/orchestrator-runner/src/new-a.ts",
      "apps/orchestrator-runner/test/new-b.test.ts"
    ],
    changeType: "test_focused_multi_file",
    proposedDiffs: [
      {
        filePath: "apps/orchestrator-runner/src/new-a.ts",
        operation: "create",
        content: "export const a = true;\n"
      },
      {
        filePath: "apps/orchestrator-runner/test/new-b.test.ts",
        operation: "create",
        content: "export const b = true;\n"
      }
    ]
  };

  assert.throws(
    () =>
      validateBackendPatchPlan({
        taskId: "task-backend-too-many-create",
        rootDir: "/tmp",
        metrics
      }),
    /create operation count 2 exceeds limit 1/
  );
});

test("backend patch validation rejects new file outside create allowlist", () => {
  const metrics = {
    ...createMetrics("apps/orchestrator-runner/src/placeholder.ts", "export const placeholder = true;\n"),
    targetFiles: ["docs/project/new-file.md"],
    changeType: "new_file",
    proposedDiffs: [
      {
        filePath: "docs/project/new-file.md",
        operation: "create",
        content: "# should fail"
      }
    ]
  };

  assert.throws(
    () =>
      validateBackendPatchPlan({
        taskId: "task-backend-create-forbidden-path",
        rootDir: "/tmp",
        metrics
      }),
    /outside create allowlist/
  );
});

test("backend patch validation rejects json helper create outside fixtures", () => {
  const metrics = {
    ...createMetrics("apps/orchestrator-runner/src/placeholder.ts", "export const placeholder = true;\n"),
    targetFiles: ["apps/orchestrator-runner/src/new-helper.json"],
    changeType: "new_file",
    proposedDiffs: [
      {
        filePath: "apps/orchestrator-runner/src/new-helper.json",
        operation: "create",
        content: "{\"helper\":true}"
      }
    ]
  };

  assert.throws(
    () =>
      validateBackendPatchPlan({
        taskId: "task-backend-json-helper-forbidden-path",
        rootDir: "/tmp",
        metrics
      }),
    /outside json helper allowlist/
  );
});

test("backend patch validation rejects oversized json helper create content", () => {
  const metrics = {
    ...createMetrics("apps/orchestrator-runner/src/placeholder.ts", "export const placeholder = true;\n"),
    targetFiles: ["apps/orchestrator-runner/test/fixtures/oversized-helper.json"],
    changeType: "new_file",
    proposedDiffs: [
      {
        filePath: "apps/orchestrator-runner/test/fixtures/oversized-helper.json",
        operation: "create",
        content: "x".repeat(2_100)
      }
    ]
  };

  assert.throws(
    () =>
      validateBackendPatchPlan({
        taskId: "task-backend-json-helper-too-large",
        rootDir: "/tmp",
        metrics
      }),
    /json helper create content.*exceeds size limit 2000 bytes/
  );
});

test("backend patch validation rejects root-level create paths", () => {
  const metrics = {
    ...createMetrics("apps/orchestrator-runner/src/placeholder.ts", "export const placeholder = true;\n"),
    targetFiles: ["top-level.ts"],
    changeType: "new_file",
    proposedDiffs: [
      {
        filePath: "top-level.ts",
        operation: "create",
        content: "export const topLevel = true;\n"
      }
    ]
  };

  assert.throws(
    () =>
      validateBackendPatchPlan({
        taskId: "task-backend-create-root-level",
        rootDir: "/tmp",
        metrics
      }),
    /outside allowlisted boundaries|must not be root-level/
  );
});

test("backend patch validation rejects expanded mode without test file", () => {
  const metrics = {
    ...createMetrics("apps/orchestrator-runner/src/no-test-a.ts", "export const a = true;\n"),
    targetFiles: [
      "apps/orchestrator-runner/src/no-test-a.ts",
      "apps/orchestrator-runner/src/no-test-b.ts"
    ],
    changeType: "test_focused_multi_file",
    proposedDiffs: [
      {
        filePath: "apps/orchestrator-runner/src/no-test-a.ts",
        operation: "update",
        content: "export const a = true;\n"
      },
      {
        filePath: "apps/orchestrator-runner/src/no-test-b.ts",
        operation: "update",
        content: "export const b = true;\n"
      }
    ]
  };

  assert.throws(
    () =>
      validateBackendPatchPlan({
        taskId: "task-backend-expanded-no-test",
        rootDir: "/tmp",
        metrics
      }),
    /requires at least one test-related target file/
  );
});

test("backend patch validation rejects expanded mode over 3 files", () => {
  const metrics = {
    ...createMetrics("apps/orchestrator-runner/src/expanded-limit.ts", "export const a = true;\n"),
    targetFiles: [
      "apps/orchestrator-runner/src/expanded-limit.ts",
      "apps/orchestrator-runner/test/expanded-limit.test.ts",
      "apps/orchestrator-runner/test/expanded-helper.ts",
      "apps/orchestrator-runner/test/expanded-overflow.ts"
    ],
    changeType: "test_focused_multi_file",
    proposedDiffs: [
      {
        filePath: "apps/orchestrator-runner/src/expanded-limit.ts",
        operation: "update",
        content: "export const a = true;\n"
      },
      {
        filePath: "apps/orchestrator-runner/test/expanded-limit.test.ts",
        operation: "update",
        content: "export const t = true;\n"
      },
      {
        filePath: "apps/orchestrator-runner/test/expanded-helper.ts",
        operation: "update",
        content: "export const h = true;\n"
      },
      {
        filePath: "apps/orchestrator-runner/test/expanded-overflow.ts",
        operation: "update",
        content: "export const o = true;\n"
      }
    ]
  };

  assert.throws(
    () =>
      validateBackendPatchPlan({
        taskId: "task-backend-expanded-over-limit",
        rootDir: "/tmp",
        metrics
      }),
    /target count 4 exceeds limit 3|Patch target file count/
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
