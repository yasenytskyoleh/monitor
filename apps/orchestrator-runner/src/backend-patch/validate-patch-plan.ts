import { resolve } from "node:path";

import { AgentSpecificValidationError } from "../adapters/live/core/errors.js";
import {
  DEFAULT_BACKEND_SAFETY_POLICY,
  parseBackendSafetyMetrics,
  type BackendSafetyPolicy,
  validateBackendSafetyRules
} from "../adapters/live/validators/backend-safety-rules.js";
import { BackendPatchError } from "./errors.js";
import { DEFAULT_BACKEND_PATCH_LIMITS, type BackendPatchLimits } from "./limits.js";
import type { BackendPatchPlan } from "./types.js";
import { validateBackendPatchLimits } from "./validate-patch-limits.js";

export type ValidatePatchPlanInput = {
  taskId: string;
  rootDir: string;
  metrics: unknown;
  policy?: BackendSafetyPolicy;
  limits?: BackendPatchLimits;
};

export function validateBackendPatchPlan(input: ValidatePatchPlanInput): BackendPatchPlan {
  const policy = input.policy ?? DEFAULT_BACKEND_SAFETY_POLICY;
  const limits = input.limits ?? DEFAULT_BACKEND_PATCH_LIMITS;
  const metrics = parseMetricsWithCategorizedError(input.metrics, policy);

  const rootDirAbs = resolve(input.rootDir);
  const proposedDiffs = metrics.proposedDiffs.map((diff) => ({
    ...diff,
    absolutePath: resolve(rootDirAbs, diff.filePath)
  }));

  for (const diff of proposedDiffs) {
    assertInsideRoot(diff.absolutePath, rootDirAbs, diff.filePath);
  }

  const limitValidation = validateBackendPatchLimits({
    targetFiles: metrics.targetFiles,
    proposedDiffs,
    limits
  });

  return {
    taskId: input.taskId,
    changeType: metrics.changeType,
    singleRootKey: limitValidation.singleRootKey,
    totalContentBytes: limitValidation.totalContentBytes,
    limitChecks: limitValidation.limitChecks,
    targetFiles: [...metrics.targetFiles],
    testsPlan: [...metrics.testsPlan],
    knownLimitations: [...metrics.knownLimitations],
    proposedDiffs
  };
}

function assertInsideRoot(absolutePath: string, rootDirAbs: string, relativePath: string): void {
  const normalizedRoot = rootDirAbs.endsWith("/") ? rootDirAbs : `${rootDirAbs}/`;
  if (!absolutePath.startsWith(normalizedRoot)) {
    throw new BackendPatchError(
      "forbidden_path",
      `Schema validation failed for live backend output: target path '${relativePath}' escapes repository root`
    );
  }
}

function parseMetricsWithCategorizedError(
  metrics: unknown,
  policy: BackendSafetyPolicy
) {
  try {
    const parsed = parseBackendSafetyMetrics(metrics);
    validateBackendSafetyRules(parsed, policy);
    return parsed;
  } catch (error) {
    if (error instanceof BackendPatchError) {
      throw error;
    }

    if (error instanceof AgentSpecificValidationError) {
      const message = error.message.toLowerCase();
      if (
        message.includes("outside allowlisted boundaries") ||
        message.includes("outside create allowlist") ||
        message.includes("forbidden target path") ||
        message.includes("hidden files") ||
        message.includes("root-level")
      ) {
        throw new BackendPatchError("forbidden_path", error.message, { cause: error });
      }
      if (message.includes("changetype")) {
        throw new BackendPatchError("forbidden_change_type", error.message, { cause: error });
      }
      if (message.includes("exceeds safety limit")) {
        throw new BackendPatchError("patch_limit_exceeded", error.message, { cause: error });
      }
      throw new BackendPatchError("patch_validation_failure", error.message, { cause: error });
    }

    throw new BackendPatchError(
      "patch_validation_failure",
      error instanceof Error ? error.message : String(error),
      { cause: error }
    );
  }
}
