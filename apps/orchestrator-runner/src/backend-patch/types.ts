import type { AgentOutputEnvelope } from "@monitor/orchestrator-core";

import type { BackendChangeType, BackendDiffOperation } from "../adapters/live/validators/backend-safety-rules.js";
import type { BackendPatchFailureCategory } from "./errors.js";
import type { PatchLimitChecks } from "./limits.js";

export type BackendPatchDiff = {
  filePath: string;
  absolutePath: string;
  operation: BackendDiffOperation;
  content: string;
};

export type BackendPatchPlan = {
  taskId: string;
  changeType: BackendChangeType;
  singleRootKey: string;
  totalContentBytes: number;
  limitChecks: PatchLimitChecks;
  targetFiles: string[];
  testsPlan: string[];
  knownLimitations: string[];
  proposedDiffs: BackendPatchDiff[];
};

export type AppliedPatchOperation = {
  filePath: string;
  operation: BackendDiffOperation;
  applied: boolean;
};

export type PatchApplyMode = "dry-run" | "apply";

export type ApplyPatchPlanResult = {
  appliedOperations: AppliedPatchOperation[];
  applyMode: PatchApplyMode;
  applied: boolean;
  changedFiles: string[];
  dryRun: boolean;
};

export type PatchPlanEvidence = {
  taskId: string;
  scenario?: string;
  transitionChecksum?: string;
  fromState?: string;
  toState?: string;
  patchMode: "single_file" | "test_focused_multi_file";
  testFocused: boolean;
  changeType: BackendChangeType;
  applyMode: PatchApplyMode;
  singleRootKey: string;
  totalContentBytes: number;
  limitChecks: PatchLimitChecks;
  targetFiles: string[];
  createdFiles: string[];
  updatedFiles: string[];
  operations: Array<{
    filePath: string;
    operation: BackendDiffOperation;
  }>;
  proposedDiffCount: number;
  testsPlan: string[];
  knownLimitations: string[];
  appliedOperations: AppliedPatchOperation[];
  dryRun: boolean;
};

export type PatchResultEvidence = {
  taskId: string;
  scenario?: string;
  transitionChecksum?: string;
  fromState?: string;
  toState?: string;
  applyMode: PatchApplyMode;
  applied: boolean;
  changedFiles: string[];
  createdFiles: string[];
  updatedFiles: string[];
  postApplyValidationPassed: boolean;
  failureCategory: BackendPatchFailureCategory | null;
  failureReason: string | null;
};

export function extractPatchPlanEvidenceFromBackendOutput(input: {
  output?: AgentOutputEnvelope;
  scenario?: string;
  transitionChecksum?: string;
  fromState?: string;
  toState?: string;
}): PatchPlanEvidence | undefined {
  const output = input.output;
  if (!output || output.agentRole !== "BACKEND" || output.status !== "completed") {
    return undefined;
  }

  const metrics = output.metrics;
  if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) {
    return undefined;
  }

  const record = metrics as Record<string, unknown>;
  const changeType = record.changeType;
  if (
    changeType !== "patch_only" &&
    changeType !== "new_file" &&
    changeType !== "test_only" &&
    changeType !== "docs_only" &&
    changeType !== "test_focused_multi_file"
  ) {
    return undefined;
  }

  const targetFiles = toStringArray(record.targetFiles);
  const testsPlan = toStringArray(record.testsPlan);
  const knownLimitations = toStringArray(record.knownLimitations);
  const proposedDiffs = toPatchOperations(record.proposedDiffs) ?? [];
  const proposedDiffCount = proposedDiffs.length;

  const patchPlan =
    record.patchPlan && typeof record.patchPlan === "object" && !Array.isArray(record.patchPlan)
      ? (record.patchPlan as Record<string, unknown>)
      : undefined;
  const patchApplyResult =
    record.patchApplyResult && typeof record.patchApplyResult === "object" && !Array.isArray(record.patchApplyResult)
      ? (record.patchApplyResult as Record<string, unknown>)
      : undefined;

  const limitChecks = parseLimitChecks(patchPlan?.limitChecks);
  const applyMode = parseApplyMode(
    patchPlan?.applyMode,
    patchApplyResult?.applyMode,
    patchApplyResult?.dryRun
  );
  const singleRootKey =
    typeof patchPlan?.singleRootKey === "string" && patchPlan.singleRootKey.trim().length > 0
      ? patchPlan.singleRootKey.trim()
      : inferSingleRootKey(targetFiles);
  const totalContentBytes =
    typeof patchPlan?.totalContentBytes === "number" && Number.isFinite(patchPlan.totalContentBytes)
      ? patchPlan.totalContentBytes
      : 0;

  const operations =
    toPatchOperations(patchPlan?.operations) ??
    proposedDiffs ??
    [];
  const createdFiles = operations
    .filter((operation) => operation.operation === "create")
    .map((operation) => operation.filePath);
  const updatedFiles = operations
    .filter((operation) => operation.operation === "update")
    .map((operation) => operation.filePath);
  const appliedOperations = toAppliedOperations(patchApplyResult?.appliedOperations);
  const dryRun =
    patchApplyResult && typeof patchApplyResult.dryRun === "boolean" ? patchApplyResult.dryRun : false;

  return {
    taskId: output.taskId,
    scenario: input.scenario,
    transitionChecksum: input.transitionChecksum,
    fromState: input.fromState,
    toState: input.toState,
    patchMode: changeType === "test_focused_multi_file" ? "test_focused_multi_file" : "single_file",
    testFocused: changeType === "test_focused_multi_file",
    changeType,
    applyMode,
    singleRootKey,
    totalContentBytes,
    limitChecks,
    targetFiles,
    createdFiles,
    updatedFiles,
    operations,
    proposedDiffCount,
    testsPlan,
    knownLimitations,
    appliedOperations,
    dryRun
  };
}

export function extractPatchResultEvidenceFromBackendOutput(input: {
  output?: AgentOutputEnvelope;
  scenario?: string;
  transitionChecksum?: string;
  fromState?: string;
  toState?: string;
}): PatchResultEvidence | undefined {
  const output = input.output;
  if (!output || output.agentRole !== "BACKEND" || output.status !== "completed") {
    return undefined;
  }

  const metrics = output.metrics;
  if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) {
    return undefined;
  }

  const record = metrics as Record<string, unknown>;
  const patchApplyResult =
    record.patchApplyResult && typeof record.patchApplyResult === "object" && !Array.isArray(record.patchApplyResult)
      ? (record.patchApplyResult as Record<string, unknown>)
      : undefined;

  if (!patchApplyResult) {
    return undefined;
  }

  const applyMode = parseApplyMode(undefined, patchApplyResult.applyMode, patchApplyResult.dryRun);
  const applied =
    typeof patchApplyResult.applied === "boolean"
      ? patchApplyResult.applied
      : applyMode === "apply";
  const changedFiles = toStringArray(patchApplyResult.changedFiles);
  const appliedOperations = toAppliedOperations(patchApplyResult.appliedOperations);
  const createdFiles = appliedOperations
    .filter((operation) => operation.operation === "create")
    .map((operation) => operation.filePath);
  const updatedFiles = appliedOperations
    .filter((operation) => operation.operation === "update")
    .map((operation) => operation.filePath);
  const postApplyValidationPassed =
    typeof patchApplyResult.postApplyValidationPassed === "boolean"
      ? patchApplyResult.postApplyValidationPassed
      : false;
  const failureCategory =
    typeof patchApplyResult.failureCategory === "string" && patchApplyResult.failureCategory.trim().length > 0
      ? (patchApplyResult.failureCategory.trim() as BackendPatchFailureCategory)
      : null;
  const failureReason =
    typeof patchApplyResult.failureReason === "string" && patchApplyResult.failureReason.trim().length > 0
      ? patchApplyResult.failureReason.trim()
      : null;

  return {
    taskId: output.taskId,
    scenario: input.scenario,
    transitionChecksum: input.transitionChecksum,
    fromState: input.fromState,
    toState: input.toState,
    applyMode,
    applied,
    changedFiles,
    createdFiles,
    updatedFiles,
    postApplyValidationPassed,
    failureCategory,
    failureReason
  };
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const normalized = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
  return Array.from(new Set(normalized));
}

function toAppliedOperations(value: unknown): AppliedPatchOperation[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const operations: AppliedPatchOperation[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }

    const record = item as Record<string, unknown>;
    const filePath = typeof record.filePath === "string" ? record.filePath.trim() : "";
    const operation = record.operation;
    const applied = typeof record.applied === "boolean" ? record.applied : true;

    if (
      filePath.length > 0 &&
      (operation === "create" || operation === "update")
    ) {
      operations.push({
        filePath,
        operation,
        applied
      });
    }
  }

  return operations;
}

function parseLimitChecks(value: unknown): PatchLimitChecks {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      maxFilesPassed: false,
      maxSizePassed: false,
      maxPerFileSizePassed: false,
      singleRootPassed: false
    };
  }

  const record = value as Record<string, unknown>;
  return {
    maxFilesPassed: record.maxFilesPassed === true,
    maxSizePassed: record.maxSizePassed === true,
    maxPerFileSizePassed: record.maxPerFileSizePassed === true,
    singleRootPassed: record.singleRootPassed === true
  };
}

function parseApplyMode(
  patchPlanMode: unknown,
  patchResultMode: unknown,
  patchResultDryRun: unknown
): PatchApplyMode {
  if (patchPlanMode === "dry-run" || patchPlanMode === "apply") {
    return patchPlanMode;
  }
  if (patchResultMode === "dry-run" || patchResultMode === "apply") {
    return patchResultMode;
  }
  if (typeof patchResultDryRun === "boolean") {
    return patchResultDryRun ? "dry-run" : "apply";
  }
  return "dry-run";
}

function toPatchOperations(value: unknown): Array<{ filePath: string; operation: BackendDiffOperation }> | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const operations: Array<{ filePath: string; operation: BackendDiffOperation }> = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }

    const record = item as Record<string, unknown>;
    const filePath = typeof record.filePath === "string" ? record.filePath.trim() : "";
    const operation = record.operation;
    if (filePath.length > 0 && (operation === "create" || operation === "update")) {
      operations.push({ filePath, operation });
    }
  }

  return operations;
}

function inferSingleRootKey(targetFiles: string[]): string {
  const normalized = targetFiles
    .map((item) => item.trim().replace(/\\/gu, "/").replace(/^\.\/+/u, ""))
    .filter((item) => item.length > 0);
  if (normalized.length === 0) {
    return "unknown";
  }

  const first = normalized[0] ?? "unknown";
  const parts = first.split("/");
  if (parts.length >= 2) {
    return `${parts[0]}/${parts[1]}`;
  }
  return parts[0] ?? "unknown";
}
