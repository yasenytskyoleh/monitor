import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { BackendPatchError } from "./errors.js";
import type { ApplyPatchPlanResult, BackendPatchPlan } from "./types.js";

export type ApplyPatchPlanOptions = {
  dryRun?: boolean;
};

export async function applyBackendPatchPlan(
  plan: BackendPatchPlan,
  options: ApplyPatchPlanOptions = {}
): Promise<ApplyPatchPlanResult> {
  const dryRun = options.dryRun ?? true;
  const appliedOperations: ApplyPatchPlanResult["appliedOperations"] = [];
  const changedFiles: string[] = [];

  for (const diff of plan.proposedDiffs) {
    try {
      if (!dryRun) {
        if (diff.operation === "update") {
          await assertExists(diff.absolutePath, diff.filePath);
        } else {
          await assertNotExists(diff.absolutePath, diff.filePath);
        }

        await mkdir(dirname(diff.absolutePath), { recursive: true });
        await writeFile(diff.absolutePath, diff.content, "utf8");
        changedFiles.push(diff.filePath);
      }
    } catch (error) {
      if (error instanceof BackendPatchError) {
        throw error;
      }
      throw new BackendPatchError(
        "apply_failure",
        `Failed to apply backend patch for '${diff.filePath}': ${
          error instanceof Error ? error.message : String(error)
        }`,
        { cause: error }
      );
    }

    appliedOperations.push({
      filePath: diff.filePath,
      operation: diff.operation,
      applied: !dryRun
    });
  }

  return {
    appliedOperations,
    applyMode: dryRun ? "dry-run" : "apply",
    applied: !dryRun && changedFiles.length > 0,
    changedFiles,
    dryRun
  };
}

async function assertExists(absolutePath: string, relativePath: string): Promise<void> {
  try {
    await access(absolutePath);
  } catch {
    throw new BackendPatchError(
      "apply_failure",
      `Schema validation failed for live backend output: update operation requires existing file '${relativePath}'`
    );
  }
}

async function assertNotExists(absolutePath: string, relativePath: string): Promise<void> {
  try {
    await access(absolutePath);
    throw new BackendPatchError(
      "apply_failure",
      `Schema validation failed for live backend output: create operation requires non-existing file '${relativePath}'`
    );
  } catch (error) {
    if (error instanceof BackendPatchError) {
      throw error;
    }
  }
}
