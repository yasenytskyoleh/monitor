import type { AgentOutputEnvelope } from "@monitor/orchestrator-core";

export type BackendPromotionMode = "none" | "promote_verified";

export type PromotionStatus = "succeeded" | "failed" | "skipped";

export type PromotionConflictEvidence = {
  filePath: string;
  expectedFingerprint: string | null;
  currentFingerprint: string | null;
};

export type PromotionResultEvidence = {
  taskId: string;
  scenario?: string;
  transitionChecksum?: string;
  fromState?: string;
  toState?: string;
  promotionMode: BackendPromotionMode;
  promotionAttempted: boolean;
  filesPlannedForPromotion: string[];
  filesPromoted: string[];
  filesBlocked: string[];
  conflictDetected: boolean;
  conflicts: PromotionConflictEvidence[];
  status: PromotionStatus;
  failureReason: string | null;
};

export type PreparedPromotion = {
  filesPlannedForPromotion: string[];
  originalFingerprints: Record<string, string | null>;
};

export type PromotionValidationResult = {
  eligible: boolean;
  filesPlannedForPromotion: string[];
  filesBlocked: string[];
  conflictDetected: boolean;
  conflicts: PromotionConflictEvidence[];
  failureReason: string | null;
};

export function extractPromotionResultEvidenceFromBackendOutput(input: {
  output?: AgentOutputEnvelope;
  scenario?: string;
  transitionChecksum?: string;
  fromState?: string;
  toState?: string;
}): PromotionResultEvidence | undefined {
  const output = input.output;
  if (!output || output.agentRole !== "BACKEND" || output.status !== "completed") {
    return undefined;
  }

  const metrics = output.metrics;
  if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) {
    return undefined;
  }

  const record = metrics as Record<string, unknown>;
  const promotionResult =
    record.promotionResult &&
    typeof record.promotionResult === "object" &&
    !Array.isArray(record.promotionResult)
      ? (record.promotionResult as Record<string, unknown>)
      : undefined;
  if (!promotionResult) {
    return undefined;
  }

  const promotionMode =
    promotionResult.promotionMode === "none" || promotionResult.promotionMode === "promote_verified"
      ? promotionResult.promotionMode
      : "none";
  const status =
    promotionResult.status === "succeeded" ||
    promotionResult.status === "failed" ||
    promotionResult.status === "skipped"
      ? promotionResult.status
      : "failed";

  return {
    taskId: output.taskId,
    scenario: input.scenario,
    transitionChecksum: input.transitionChecksum,
    fromState: input.fromState,
    toState: input.toState,
    promotionMode,
    promotionAttempted: promotionResult.promotionAttempted === true,
    filesPlannedForPromotion: toStringArray(promotionResult.filesPlannedForPromotion),
    filesPromoted: toStringArray(promotionResult.filesPromoted),
    filesBlocked: toStringArray(promotionResult.filesBlocked),
    conflictDetected: promotionResult.conflictDetected === true,
    conflicts: toPromotionConflicts(promotionResult.conflicts),
    status,
    failureReason:
      typeof promotionResult.failureReason === "string" && promotionResult.failureReason.trim().length > 0
        ? promotionResult.failureReason
        : null
  };
}

function toPromotionConflicts(value: unknown): PromotionConflictEvidence[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const conflicts: PromotionConflictEvidence[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }

    const record = item as Record<string, unknown>;
    const filePath = typeof record.filePath === "string" ? record.filePath.trim() : "";
    if (filePath.length === 0) {
      continue;
    }
    conflicts.push({
      filePath,
      expectedFingerprint:
        typeof record.expectedFingerprint === "string" ? record.expectedFingerprint : null,
      currentFingerprint:
        typeof record.currentFingerprint === "string" ? record.currentFingerprint : null
    });
  }

  return conflicts;
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
