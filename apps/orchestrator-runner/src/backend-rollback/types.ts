import type { AgentOutputEnvelope } from "@monitor/orchestrator-core";

export type BackendRollbackMode = "none" | "restore_written_files" | "full_run_cleanup";

export type RollbackTriggerReason =
  | "apply_failed"
  | "post_apply_validation_failed"
  | "verification_failed"
  | "unexpected_write_detected";

export type BackendRollbackPlanEntry = {
  filePath: string;
  absolutePath: string;
  existedBefore: boolean;
  previousContent: string | null;
};

export type BackendRollbackPlan = {
  taskId: string;
  applyMode: "apply";
  entries: BackendRollbackPlanEntry[];
};

export type BackendRollbackResult = {
  rollbackAttempted: boolean;
  triggerReason: RollbackTriggerReason | null;
  restoredFiles: string[];
  deletedCreatedFiles: string[];
  status: "succeeded" | "failed" | "skipped";
  failureReason: string | null;
};

export type RollbackPlanEvidence = {
  taskId: string;
  scenario?: string;
  transitionChecksum?: string;
  fromState?: string;
  toState?: string;
  applyMode: "apply";
  entries: Array<{
    filePath: string;
    existedBefore: boolean;
    previousContent: string | null;
  }>;
};

export type RollbackResultEvidence = BackendRollbackResult & {
  taskId: string;
  scenario?: string;
  transitionChecksum?: string;
  fromState?: string;
  toState?: string;
};

export function extractRollbackPlanEvidenceFromBackendOutput(input: {
  output?: AgentOutputEnvelope;
  scenario?: string;
  transitionChecksum?: string;
  fromState?: string;
  toState?: string;
}): RollbackPlanEvidence | undefined {
  const output = input.output;
  if (!output || output.agentRole !== "BACKEND" || output.status !== "completed") {
    return undefined;
  }

  const metrics = output.metrics;
  if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) {
    return undefined;
  }

  const record = metrics as Record<string, unknown>;
  const rollbackPlan =
    record.rollbackPlan && typeof record.rollbackPlan === "object" && !Array.isArray(record.rollbackPlan)
      ? (record.rollbackPlan as Record<string, unknown>)
      : undefined;
  if (!rollbackPlan || rollbackPlan.applyMode !== "apply") {
    return undefined;
  }

  const entriesValue = rollbackPlan.entries;
  if (!Array.isArray(entriesValue)) {
    return undefined;
  }

  const entries: RollbackPlanEvidence["entries"] = [];
  for (const item of entriesValue) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }
    const entry = item as Record<string, unknown>;
    const filePath = typeof entry.filePath === "string" ? entry.filePath.trim() : "";
    if (filePath.length === 0) {
      continue;
    }
    entries.push({
      filePath,
      existedBefore: entry.existedBefore === true,
      previousContent: typeof entry.previousContent === "string" ? entry.previousContent : null
    });
  }

  return {
    taskId: output.taskId,
    scenario: input.scenario,
    transitionChecksum: input.transitionChecksum,
    fromState: input.fromState,
    toState: input.toState,
    applyMode: "apply",
    entries
  };
}

export function extractRollbackResultEvidenceFromBackendOutput(input: {
  output?: AgentOutputEnvelope;
  scenario?: string;
  transitionChecksum?: string;
  fromState?: string;
  toState?: string;
}): RollbackResultEvidence | undefined {
  const output = input.output;
  if (!output || output.agentRole !== "BACKEND" || output.status !== "completed") {
    return undefined;
  }

  const metrics = output.metrics;
  if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) {
    return undefined;
  }

  const record = metrics as Record<string, unknown>;
  const rollbackResult =
    record.rollbackResult && typeof record.rollbackResult === "object" && !Array.isArray(record.rollbackResult)
      ? (record.rollbackResult as Record<string, unknown>)
      : undefined;
  if (!rollbackResult) {
    return undefined;
  }

  const triggerReason =
    rollbackResult.triggerReason === "apply_failed" ||
    rollbackResult.triggerReason === "post_apply_validation_failed" ||
    rollbackResult.triggerReason === "verification_failed" ||
    rollbackResult.triggerReason === "unexpected_write_detected"
      ? rollbackResult.triggerReason
      : null;
  const status =
    rollbackResult.status === "succeeded" ||
    rollbackResult.status === "failed" ||
    rollbackResult.status === "skipped"
      ? rollbackResult.status
      : "failed";

  return {
    taskId: output.taskId,
    scenario: input.scenario,
    transitionChecksum: input.transitionChecksum,
    fromState: input.fromState,
    toState: input.toState,
    rollbackAttempted: rollbackResult.rollbackAttempted === true,
    triggerReason,
    restoredFiles: toStringArray(rollbackResult.restoredFiles),
    deletedCreatedFiles: toStringArray(rollbackResult.deletedCreatedFiles),
    status,
    failureReason:
      typeof rollbackResult.failureReason === "string" && rollbackResult.failureReason.trim().length > 0
        ? rollbackResult.failureReason
        : null
  };
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
