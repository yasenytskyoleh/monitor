import type { AgentOutputEnvelope } from "@monitor/orchestrator-core";

import type { VerificationResultEvidence } from "./types.js";

export function extractVerificationResultEvidenceFromBackendOutput(input: {
  output?: AgentOutputEnvelope;
  scenario?: string;
  transitionChecksum?: string;
  fromState?: string;
  toState?: string;
}): VerificationResultEvidence | undefined {
  const output = input.output;
  if (!output || output.agentRole !== "BACKEND" || output.status !== "completed") {
    return undefined;
  }

  const metrics = output.metrics;
  if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) {
    return undefined;
  }

  const record = metrics as Record<string, unknown>;
  const verificationResult =
    record.verificationResult &&
    typeof record.verificationResult === "object" &&
    !Array.isArray(record.verificationResult)
      ? (record.verificationResult as Record<string, unknown>)
      : undefined;
  if (!verificationResult) {
    return undefined;
  }

  const hooksRequested = toHookNames(verificationResult.hooksRequested);
  const hooksExecuted = toHookExecuted(verificationResult.hooksExecuted);
  const overallStatus =
    verificationResult.overallStatus === "passed" ||
    verificationResult.overallStatus === "failed" ||
    verificationResult.overallStatus === "skipped"
      ? verificationResult.overallStatus
      : "failed";

  return {
    taskId: output.taskId,
    scenario: input.scenario,
    transitionChecksum: input.transitionChecksum,
    fromState: input.fromState,
    toState: input.toState,
    applied: verificationResult.applied === true,
    hooksRequested,
    hooksExecuted,
    overallStatus
  };
}

function toHookNames(value: unknown): Array<"lint" | "typecheck" | "test"> {
  if (!Array.isArray(value)) {
    return [];
  }

  const names = value.filter(
    (item): item is "lint" | "typecheck" | "test" =>
      item === "lint" || item === "typecheck" || item === "test"
  );
  return Array.from(new Set(names));
}

function toHookExecuted(
  value: unknown
): VerificationResultEvidence["hooksExecuted"] {
  if (!Array.isArray(value)) {
    return [];
  }

  const hooks: VerificationResultEvidence["hooksExecuted"] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }

    const record = item as Record<string, unknown>;
    const name = record.name;
    const status = record.status;
    if ((name !== "lint" && name !== "typecheck" && name !== "test") ||
      (status !== "passed" && status !== "failed" && status !== "timed_out" && status !== "skipped")) {
      continue;
    }

    const command = typeof record.command === "string" ? record.command : "";
    const exitCode = typeof record.exitCode === "number" ? record.exitCode : null;
    const durationMs = typeof record.durationMs === "number" ? record.durationMs : 0;
    const stdoutSummary = typeof record.stdoutSummary === "string" ? record.stdoutSummary : undefined;
    const stderrSummary = typeof record.stderrSummary === "string" ? record.stderrSummary : undefined;

    hooks.push({
      name,
      status,
      command,
      exitCode,
      durationMs,
      ...(stdoutSummary ? { stdoutSummary } : {}),
      ...(stderrSummary ? { stderrSummary } : {})
    });
  }

  return hooks;
}
