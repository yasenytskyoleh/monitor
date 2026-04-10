import type { AgentOutputEnvelope } from "@monitor/orchestrator-core";

import type { BackendChangeType, BackendDiffOperation } from "../adapters/live/validators/backend-safety-rules.js";

export type BackendPatchDiff = {
  filePath: string;
  absolutePath: string;
  operation: BackendDiffOperation;
  content: string;
};

export type BackendPatchPlan = {
  taskId: string;
  changeType: BackendChangeType;
  targetFiles: string[];
  testsPlan: string[];
  knownLimitations: string[];
  proposedDiffs: BackendPatchDiff[];
};

export type AppliedPatchOperation = {
  filePath: string;
  operation: BackendDiffOperation;
  applied: true;
};

export type ApplyPatchPlanResult = {
  appliedOperations: AppliedPatchOperation[];
  dryRun: boolean;
};

export type PatchPlanEvidence = {
  taskId: string;
  scenario?: string;
  transitionChecksum?: string;
  fromState?: string;
  toState?: string;
  changeType: BackendChangeType;
  targetFiles: string[];
  proposedDiffCount: number;
  testsPlan: string[];
  knownLimitations: string[];
  appliedOperations: AppliedPatchOperation[];
  dryRun: boolean;
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
    changeType !== "docs_only"
  ) {
    return undefined;
  }

  const targetFiles = toStringArray(record.targetFiles);
  const testsPlan = toStringArray(record.testsPlan);
  const knownLimitations = toStringArray(record.knownLimitations);
  const proposedDiffCount = Array.isArray(record.proposedDiffs) ? record.proposedDiffs.length : 0;

  const patchApplyResult =
    record.patchApplyResult && typeof record.patchApplyResult === "object" && !Array.isArray(record.patchApplyResult)
      ? (record.patchApplyResult as Record<string, unknown>)
      : undefined;

  const appliedOperations = toAppliedOperations(patchApplyResult?.appliedOperations);
  const dryRun =
    patchApplyResult && typeof patchApplyResult.dryRun === "boolean" ? patchApplyResult.dryRun : false;

  return {
    taskId: output.taskId,
    scenario: input.scenario,
    transitionChecksum: input.transitionChecksum,
    fromState: input.fromState,
    toState: input.toState,
    changeType,
    targetFiles,
    proposedDiffCount,
    testsPlan,
    knownLimitations,
    appliedOperations,
    dryRun
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

    if (
      filePath.length > 0 &&
      (operation === "create" || operation === "update")
    ) {
      operations.push({
        filePath,
        operation,
        applied: true
      });
    }
  }

  return operations;
}
