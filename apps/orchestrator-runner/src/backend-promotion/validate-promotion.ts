import { access } from "node:fs/promises";
import { resolve } from "node:path";

import type { ApplyPatchPlanResult, BackendPatchPlan } from "../backend-patch/types.js";
import { BackendPatchError } from "../backend-patch/errors.js";
import { validateBackendPatchPlan } from "../backend-patch/validate-patch-plan.js";
import type { BackendVerificationResult } from "../backend-verification/types.js";
import { computeWorkspaceFileFingerprint } from "./prepare-promotion.js";
import type {
  BackendPromotionMode,
  PreparedPromotion,
  PromotionValidationResult
} from "./types.js";

export type ValidatePromotionInput = {
  mode: BackendPromotionMode;
  rootDir: string;
  isolatedWorkspaceRoot: string | null;
  patchPlan: BackendPatchPlan;
  applyResult: ApplyPatchPlanResult;
  verificationResult: BackendVerificationResult;
  preparedPromotion: PreparedPromotion | null;
};

export async function validatePromotion(
  input: ValidatePromotionInput
): Promise<PromotionValidationResult> {
  const filesPlannedForPromotion = uniqueStrings(input.patchPlan.proposedDiffs.map((diff) => diff.filePath));

  if (input.mode === "none") {
    return buildFailedValidation(filesPlannedForPromotion, [], "Promotion mode is disabled");
  }

  if (input.isolatedWorkspaceRoot === null) {
    return buildFailedValidation(
      filesPlannedForPromotion,
      filesPlannedForPromotion,
      "Promotion requires isolated workspace execution"
    );
  }

  if (input.preparedPromotion === null) {
    return buildFailedValidation(
      filesPlannedForPromotion,
      filesPlannedForPromotion,
      "Promotion preparation evidence is missing"
    );
  }

  if (input.applyResult.applyMode !== "apply" || input.applyResult.applied !== true) {
    return buildFailedValidation(
      filesPlannedForPromotion,
      filesPlannedForPromotion,
      "Promotion requires successful apply mode execution"
    );
  }

  if (input.verificationResult.overallStatus === "failed") {
    return buildFailedValidation(
      filesPlannedForPromotion,
      filesPlannedForPromotion,
      "Promotion requires successful verification result"
    );
  }

  revalidatePromotionSafetyPlan(input.patchPlan, input.rootDir);

  const appliedFiles = uniqueStrings(input.applyResult.changedFiles);
  const unexpectedApplied = appliedFiles.filter((filePath) => !filesPlannedForPromotion.includes(filePath));
  if (unexpectedApplied.length > 0) {
    return buildFailedValidation(
      filesPlannedForPromotion,
      unexpectedApplied,
      `Promotion blocked: apply result contains files outside validated plan (${unexpectedApplied.join(", ")})`
    );
  }

  const missingApplied = filesPlannedForPromotion.filter((filePath) => !appliedFiles.includes(filePath));
  if (missingApplied.length > 0) {
    return buildFailedValidation(
      filesPlannedForPromotion,
      missingApplied,
      `Promotion blocked: validated target files missing from apply result (${missingApplied.join(", ")})`
    );
  }

  const sourceMissingFiles = await collectMissingIsolatedSources({
    isolatedWorkspaceRoot: input.isolatedWorkspaceRoot,
    filePaths: filesPlannedForPromotion
  });
  if (sourceMissingFiles.length > 0) {
    return buildFailedValidation(
      filesPlannedForPromotion,
      sourceMissingFiles,
      `Promotion blocked: isolated workspace is missing promoted file(s) (${sourceMissingFiles.join(", ")})`
    );
  }

  const conflicts = await collectConflicts({
    rootDir: input.rootDir,
    filesPlannedForPromotion,
    expectedFingerprints: input.preparedPromotion.originalFingerprints
  });

  if (conflicts.length > 0) {
    return {
      eligible: false,
      filesPlannedForPromotion,
      filesBlocked: conflicts.map((conflict) => conflict.filePath),
      conflictDetected: true,
      conflicts,
      failureReason:
        "Promotion blocked: one or more main workspace files changed after isolated execution started"
    };
  }

  return {
    eligible: true,
    filesPlannedForPromotion,
    filesBlocked: [],
    conflictDetected: false,
    conflicts: [],
    failureReason: null
  };
}

function revalidatePromotionSafetyPlan(patchPlan: BackendPatchPlan, rootDir: string): void {
  validateBackendPatchPlan({
    taskId: patchPlan.taskId,
    rootDir,
    metrics: {
      changePlan: ["Revalidate backend patch plan for promotion safety"],
      targetFiles: patchPlan.targetFiles,
      changeType: patchPlan.changeType,
      requiresSchemaChange: false,
      requiresArchitectureChange: false,
      requiresMigration: false,
      proposedDiffs: patchPlan.proposedDiffs.map((diff) => ({
        filePath: diff.filePath,
        operation: diff.operation,
        content: diff.content
      })),
      testsPlan: patchPlan.testsPlan,
      knownLimitations: patchPlan.knownLimitations
    }
  });
}

async function collectMissingIsolatedSources(input: {
  isolatedWorkspaceRoot: string;
  filePaths: string[];
}): Promise<string[]> {
  const missingFiles: string[] = [];
  for (const filePath of input.filePaths) {
    const sourcePath = resolve(input.isolatedWorkspaceRoot, normalizeRelativePath(filePath));
    assertInsideRoot(sourcePath, input.isolatedWorkspaceRoot, filePath, "isolated workspace");
    if (!(await pathExists(sourcePath))) {
      missingFiles.push(filePath);
    }
  }
  return missingFiles;
}

async function collectConflicts(input: {
  rootDir: string;
  filesPlannedForPromotion: string[];
  expectedFingerprints: Record<string, string | null>;
}): Promise<PromotionValidationResult["conflicts"]> {
  const conflicts: PromotionValidationResult["conflicts"] = [];
  for (const filePath of input.filesPlannedForPromotion) {
    const expectedFingerprint = input.expectedFingerprints[filePath] ?? null;
    const currentFingerprint = await computeWorkspaceFileFingerprint({
      rootDir: input.rootDir,
      filePath
    });
    if (expectedFingerprint !== currentFingerprint) {
      conflicts.push({
        filePath,
        expectedFingerprint,
        currentFingerprint
      });
    }
  }
  return conflicts;
}

function buildFailedValidation(
  filesPlannedForPromotion: string[],
  filesBlocked: string[],
  failureReason: string
): PromotionValidationResult {
  return {
    eligible: false,
    filesPlannedForPromotion,
    filesBlocked: uniqueStrings(filesBlocked),
    conflictDetected: false,
    conflicts: [],
    failureReason
  };
}

function normalizeRelativePath(value: string): string {
  return value.replace(/\\/gu, "/").replace(/^\.\/+/u, "");
}

function assertInsideRoot(
  absolutePath: string,
  root: string,
  label: string,
  rootName: "repository root" | "isolated workspace"
): void {
  const normalizedRoot = root.endsWith("/") ? root : `${root}/`;
  if (!absolutePath.startsWith(normalizedRoot)) {
    throw new BackendPatchError(
      "forbidden_path",
      `Promotion path '${label}' escapes ${rootName}`
    );
  }
}

async function pathExists(pathValue: string): Promise<boolean> {
  try {
    await access(pathValue);
    return true;
  } catch {
    return false;
  }
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((item) => item.trim()).filter((item) => item.length > 0)));
}
