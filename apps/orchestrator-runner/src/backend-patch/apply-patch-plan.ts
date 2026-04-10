import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { AgentSpecificValidationError } from "../adapters/live/core/errors.js";
import type { ApplyPatchPlanResult, BackendPatchPlan } from "./types.js";

export type ApplyPatchPlanOptions = {
  dryRun?: boolean;
};

export async function applyBackendPatchPlan(
  plan: BackendPatchPlan,
  options: ApplyPatchPlanOptions = {}
): Promise<ApplyPatchPlanResult> {
  const dryRun = options.dryRun ?? false;
  const appliedOperations: ApplyPatchPlanResult["appliedOperations"] = [];

  for (const diff of plan.proposedDiffs) {
    if (!dryRun) {
      if (diff.operation === "update") {
        await assertExists(diff.absolutePath, diff.filePath);
      } else {
        await assertNotExists(diff.absolutePath, diff.filePath);
      }

      await mkdir(dirname(diff.absolutePath), { recursive: true });
      await writeFile(diff.absolutePath, diff.content, "utf8");
    }

    appliedOperations.push({
      filePath: diff.filePath,
      operation: diff.operation,
      applied: true
    });
  }

  return {
    appliedOperations,
    dryRun
  };
}

async function assertExists(absolutePath: string, relativePath: string): Promise<void> {
  try {
    await access(absolutePath);
  } catch {
    throw new AgentSpecificValidationError(
      `Schema validation failed for live backend output: update operation requires existing file '${relativePath}'`
    );
  }
}

async function assertNotExists(absolutePath: string, relativePath: string): Promise<void> {
  try {
    await access(absolutePath);
    throw new AgentSpecificValidationError(
      `Schema validation failed for live backend output: create operation requires non-existing file '${relativePath}'`
    );
  } catch (error) {
    if (error instanceof AgentSpecificValidationError) {
      throw error;
    }
  }
}
