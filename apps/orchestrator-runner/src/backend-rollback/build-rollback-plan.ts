import { access, readFile } from "node:fs/promises";

import { BackendPatchError } from "../backend-patch/errors.js";
import type { BackendPatchPlan } from "../backend-patch/types.js";
import type { BackendRollbackPlan } from "./types.js";

export async function buildRollbackPlan(input: {
  patchPlan: BackendPatchPlan;
  applyMode: "dry-run" | "apply";
}): Promise<BackendRollbackPlan | null> {
  if (input.applyMode !== "apply") {
    return null;
  }

  const entries: BackendRollbackPlan["entries"] = [];
  const seen = new Set<string>();
  for (const diff of input.patchPlan.proposedDiffs) {
    if (seen.has(diff.filePath)) {
      continue;
    }
    seen.add(diff.filePath);

    const existedBefore = await fileExists(diff.absolutePath);
    const previousContent = existedBefore ? await readFile(diff.absolutePath, "utf8") : null;
    entries.push({
      filePath: diff.filePath,
      absolutePath: diff.absolutePath,
      existedBefore,
      previousContent
    });
  }

  if (entries.length === 0) {
    throw new BackendPatchError(
      "patch_validation_failure",
      "Rollback plan cannot be built: patch plan has no entries"
    );
  }

  return {
    taskId: input.patchPlan.taskId,
    applyMode: "apply",
    entries
  };
}

async function fileExists(pathValue: string): Promise<boolean> {
  try {
    await access(pathValue);
    return true;
  } catch {
    return false;
  }
}
