import { resolve } from "node:path";

import { AgentSpecificValidationError } from "../adapters/live/core/errors.js";
import {
  DEFAULT_BACKEND_SAFETY_POLICY,
  parseBackendSafetyMetrics,
  type BackendSafetyPolicy,
  validateBackendSafetyRules
} from "../adapters/live/validators/backend-safety-rules.js";
import type { BackendPatchPlan } from "./types.js";

export type ValidatePatchPlanInput = {
  taskId: string;
  rootDir: string;
  metrics: unknown;
  policy?: BackendSafetyPolicy;
};

export function validateBackendPatchPlan(input: ValidatePatchPlanInput): BackendPatchPlan {
  const policy = input.policy ?? DEFAULT_BACKEND_SAFETY_POLICY;
  const metrics = parseBackendSafetyMetrics(input.metrics);
  validateBackendSafetyRules(metrics, policy);

  const rootDirAbs = resolve(input.rootDir);
  const proposedDiffs = metrics.proposedDiffs.map((diff) => ({
    ...diff,
    absolutePath: resolve(rootDirAbs, diff.filePath)
  }));

  for (const diff of proposedDiffs) {
    assertInsideRoot(diff.absolutePath, rootDirAbs, diff.filePath);
  }

  return {
    taskId: input.taskId,
    changeType: metrics.changeType,
    targetFiles: [...metrics.targetFiles],
    testsPlan: [...metrics.testsPlan],
    knownLimitations: [...metrics.knownLimitations],
    proposedDiffs
  };
}

function assertInsideRoot(absolutePath: string, rootDirAbs: string, relativePath: string): void {
  const normalizedRoot = rootDirAbs.endsWith("/") ? rootDirAbs : `${rootDirAbs}/`;
  if (!absolutePath.startsWith(normalizedRoot)) {
    throw new AgentSpecificValidationError(
      `Schema validation failed for live backend output: target path '${relativePath}' escapes repository root`
    );
  }
}
