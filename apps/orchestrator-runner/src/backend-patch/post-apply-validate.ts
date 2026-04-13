import { access } from "node:fs/promises";

import { BackendPatchError } from "./errors.js";
import type { ApplyPatchPlanResult, BackendPatchPlan } from "./types.js";

export type PostApplyValidationChecks = {
  expectedFilesExist: boolean;
  appliedSetMatchesPlan: boolean;
  noUnexpectedWrites: boolean;
  allowlistedPaths: boolean;
};

export type PostApplyValidationResult = {
  passed: true;
  checks: PostApplyValidationChecks;
};

export type PostApplyValidationInput = {
  patchPlan: BackendPatchPlan;
  applyResult: ApplyPatchPlanResult;
};

export async function validatePostApplyResult(
  input: PostApplyValidationInput
): Promise<PostApplyValidationResult> {
  const expectedFiles = uniqueStrings(input.patchPlan.proposedDiffs.map((diff) => diff.filePath));
  const changedFiles = uniqueStrings(input.applyResult.changedFiles);

  if (input.applyResult.applyMode === "dry-run") {
    const mutated = input.applyResult.appliedOperations.some((operation) => operation.applied);
    if (mutated || changedFiles.length > 0 || input.applyResult.applied) {
      throw new BackendPatchError(
        "post_apply_validation_failure",
        "Dry-run backend patch execution produced file mutations"
      );
    }

    return {
      passed: true,
      checks: {
        expectedFilesExist: true,
        appliedSetMatchesPlan: true,
        noUnexpectedWrites: true,
        allowlistedPaths: true
      }
    };
  }

  for (const filePath of changedFiles) {
    if (!expectedFiles.includes(filePath)) {
      throw new BackendPatchError(
        "post_apply_validation_failure",
        `Unexpected file write detected: '${filePath}'`
      );
    }
  }

  if (changedFiles.length !== expectedFiles.length) {
    throw new BackendPatchError(
      "post_apply_validation_failure",
      `Applied file count ${changedFiles.length} does not match validated plan count ${expectedFiles.length}`
    );
  }

  for (const expected of expectedFiles) {
    if (!changedFiles.includes(expected)) {
      throw new BackendPatchError(
        "post_apply_validation_failure",
        `Validated file '${expected}' was not written during apply mode`
      );
    }
  }

  for (const diff of input.patchPlan.proposedDiffs) {
    try {
      await access(diff.absolutePath);
    } catch {
      throw new BackendPatchError(
        "post_apply_validation_failure",
        `Post-apply check failed: expected file '${diff.filePath}' does not exist`
      );
    }
  }

  return {
    passed: true,
    checks: {
      expectedFilesExist: true,
      appliedSetMatchesPlan: true,
      noUnexpectedWrites: true,
      allowlistedPaths: true
    }
  };
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((item) => item.trim()).filter((item) => item.length > 0)));
}
