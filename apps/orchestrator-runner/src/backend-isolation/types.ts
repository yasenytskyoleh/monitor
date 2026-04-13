import type { AgentOutputEnvelope } from "@monitor/orchestrator-core";

import type { BackendPatchPlan } from "../backend-patch/types.js";
import type { BackendVerificationMode } from "../backend-verification/types.js";

export type BackendIsolationMode = "enabled" | "disabled";

export type PrepareIsolatedWorkspaceInput = {
  rootDir: string;
  patchPlan: BackendPatchPlan;
  verificationMode: BackendVerificationMode;
};

export type PreparedIsolatedWorkspace = {
  workspaceId: string;
  workspaceRoot: string;
  copiedEntries: string[];
  copiedFilesCount: number;
  executionPatchPlan: BackendPatchPlan;
};

export type IsolatedWorkspaceCleanupResult = {
  status: "succeeded" | "failed" | "skipped";
  failureReason: string | null;
};

export type WorkspaceSummaryEvidence = {
  taskId: string;
  scenario?: string;
  transitionChecksum?: string;
  fromState?: string;
  toState?: string;
  isolationEnabled: boolean;
  workspaceId: string | null;
  workspacePath: string | null;
  copiedFilesCount: number;
  patchedFiles: string[];
  verificationRanInWorkspace: boolean;
  cleanupStatus: IsolatedWorkspaceCleanupResult["status"];
  cleanupFailureReason: string | null;
};

export function extractWorkspaceSummaryEvidenceFromBackendOutput(input: {
  output?: AgentOutputEnvelope;
  scenario?: string;
  transitionChecksum?: string;
  fromState?: string;
  toState?: string;
}): WorkspaceSummaryEvidence | undefined {
  const output = input.output;
  if (!output || output.agentRole !== "BACKEND" || output.status !== "completed") {
    return undefined;
  }

  const metrics = output.metrics;
  if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) {
    return undefined;
  }

  const record = metrics as Record<string, unknown>;
  const workspaceSummary =
    record.workspaceSummary &&
    typeof record.workspaceSummary === "object" &&
    !Array.isArray(record.workspaceSummary)
      ? (record.workspaceSummary as Record<string, unknown>)
      : undefined;
  if (!workspaceSummary) {
    return undefined;
  }

  const cleanupStatus =
    workspaceSummary.cleanupStatus === "succeeded" ||
    workspaceSummary.cleanupStatus === "failed" ||
    workspaceSummary.cleanupStatus === "skipped"
      ? workspaceSummary.cleanupStatus
      : "failed";

  return {
    taskId: output.taskId,
    scenario: input.scenario,
    transitionChecksum: input.transitionChecksum,
    fromState: input.fromState,
    toState: input.toState,
    isolationEnabled: workspaceSummary.isolationEnabled === true,
    workspaceId: toOptionalString(workspaceSummary.workspaceId),
    workspacePath: toOptionalString(workspaceSummary.workspacePath),
    copiedFilesCount:
      typeof workspaceSummary.copiedFilesCount === "number" &&
      Number.isFinite(workspaceSummary.copiedFilesCount) &&
      workspaceSummary.copiedFilesCount >= 0
        ? workspaceSummary.copiedFilesCount
        : 0,
    patchedFiles: toStringArray(workspaceSummary.patchedFiles),
    verificationRanInWorkspace: workspaceSummary.verificationRanInWorkspace === true,
    cleanupStatus,
    cleanupFailureReason: toOptionalString(workspaceSummary.cleanupFailureReason)
  };
}

function toOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => item.length > 0)
    )
  );
}
