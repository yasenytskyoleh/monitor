import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { BackendPatchError } from "../backend-patch/errors.js";
import type { BackendRollbackPlan, BackendRollbackResult, RollbackTriggerReason } from "./types.js";

export async function applyRollback(input: {
  plan: BackendRollbackPlan;
  triggerReason: RollbackTriggerReason;
}): Promise<BackendRollbackResult> {
  const restoredFiles: string[] = [];
  const deletedCreatedFiles: string[] = [];
  const failures: string[] = [];

  for (const entry of input.plan.entries) {
    try {
      if (entry.existedBefore) {
        await mkdir(dirname(entry.absolutePath), { recursive: true });
        await writeFile(entry.absolutePath, entry.previousContent ?? "", "utf8");
        restoredFiles.push(entry.filePath);
      } else {
        await rm(entry.absolutePath, { force: true });
        deletedCreatedFiles.push(entry.filePath);
      }
    } catch (error) {
      failures.push(
        `${entry.filePath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  if (failures.length > 0) {
    return {
      rollbackAttempted: true,
      triggerReason: input.triggerReason,
      restoredFiles,
      deletedCreatedFiles,
      status: "failed",
      failureReason: failures.join("; ")
    };
  }

  return {
    rollbackAttempted: true,
    triggerReason: input.triggerReason,
    restoredFiles,
    deletedCreatedFiles,
    status: "succeeded",
    failureReason: null
  };
}

export function assertRollbackSucceeded(result: BackendRollbackResult): void {
  if (result.status === "failed") {
    throw new BackendPatchError(
      "rollback_failed",
      `Rollback failed after backend patch error: ${result.failureReason ?? "unknown rollback failure"}`
    );
  }
}
