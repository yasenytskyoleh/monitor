import type { BackendPatchDiff } from "./types.js";
import { BackendPatchError } from "./errors.js";
import {
  DEFAULT_BACKEND_PATCH_LIMITS,
  deriveRootKey,
  type BackendPatchLimits,
  type PatchLimitValidation
} from "./limits.js";

export type ValidatePatchLimitsInput = {
  targetFiles: string[];
  proposedDiffs: BackendPatchDiff[];
  limits?: BackendPatchLimits;
};

export function validateBackendPatchLimits(input: ValidatePatchLimitsInput): PatchLimitValidation {
  const limits = input.limits ?? DEFAULT_BACKEND_PATCH_LIMITS;
  const uniqueTargets = uniqueStrings(input.targetFiles);

  if (uniqueTargets.length === 0) {
    throw new BackendPatchError(
      "patch_validation_failure",
      "Patch plan must include at least one target file"
    );
  }

  if (uniqueTargets.length > limits.maxTargetFiles) {
    throw new BackendPatchError(
      "patch_limit_exceeded",
      `Patch target file count ${uniqueTargets.length} exceeds limit ${limits.maxTargetFiles}`
    );
  }

  if (limits.enforceSingleRoot) {
    const rootKeys = Array.from(new Set(uniqueTargets.map(deriveRootKey)));
    if (rootKeys.length > 1) {
      throw new BackendPatchError(
        "patch_limit_exceeded",
        `Patch target files must stay under a single root. Found: ${rootKeys.join(", ")}`
      );
    }
  }

  let totalContentBytes = 0;
  for (const diff of input.proposedDiffs) {
    const contentBytes = Buffer.byteLength(diff.content, "utf8");
    totalContentBytes += contentBytes;
    if (contentBytes > limits.maxPerFileContentBytes) {
      throw new BackendPatchError(
        "patch_limit_exceeded",
        `Patch content for '${diff.filePath}' exceeds per-file limit ${limits.maxPerFileContentBytes} bytes`
      );
    }
  }

  if (totalContentBytes > limits.maxTotalContentBytes) {
    throw new BackendPatchError(
      "patch_limit_exceeded",
      `Patch total content size ${totalContentBytes} exceeds limit ${limits.maxTotalContentBytes} bytes`
    );
  }

  return {
    singleRootKey: deriveRootKey(uniqueTargets[0] ?? "unknown"),
    totalContentBytes,
    limitChecks: {
      maxFilesPassed: true,
      maxSizePassed: true,
      maxPerFileSizePassed: true,
      singleRootPassed: true
    }
  };
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((item) => item.trim()).filter((item) => item.length > 0)));
}
