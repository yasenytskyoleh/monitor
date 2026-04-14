import type {
  StabilityReassessment,
  StabilityReassessmentBuildInput
} from "./types.js";

export function buildStabilityReassessment(
  input: StabilityReassessmentBuildInput
): StabilityReassessment {
  const isolatedExecutionPassed =
    input.workspaceSummaries.length > 0 &&
    input.workspaceSummaries.every(
      (summary) => summary.isolationEnabled === true && summary.cleanupStatus === "succeeded"
    );
  const verificationPassed = input.verificationResults.every(
    (result) => result.overallStatus !== "failed"
  );
  const rollbackPassed = input.rollbackResults.every((result) => result.status !== "failed");
  const promotionPassed = input.promotionResults.every((result) => result.status !== "failed");
  const determinismPassed = deriveDeterminismStatus(input);
  const workspaceCleanlinessPassed = deriveWorkspaceCleanlinessStatus(input);

  const overallStatus =
    isolatedExecutionPassed &&
    verificationPassed &&
    rollbackPassed &&
    promotionPassed &&
    determinismPassed &&
    workspaceCleanlinessPassed
      ? "passed"
      : "failed";

  return {
    runId: input.runId,
    scenario: input.scenario,
    isolatedExecutionPassed,
    verificationPassed,
    rollbackPassed,
    promotionPassed,
    determinismPassed,
    workspaceCleanlinessPassed,
    overallStatus
  };
}

function deriveDeterminismStatus(input: StabilityReassessmentBuildInput): boolean {
  if (input.finalState !== "DONE" && input.finalState !== "REJECTED") {
    return false;
  }
  if (input.outcome === "runtime_failure") {
    return false;
  }

  return (
    input.patchResults.every((result) => result.failureCategory === null) &&
    input.verificationResults.every((result) => result.overallStatus !== "failed") &&
    input.rollbackResults.every((result) => result.status !== "failed") &&
    input.promotionResults.every((result) => result.status !== "failed")
  );
}

function deriveWorkspaceCleanlinessStatus(
  input: StabilityReassessmentBuildInput
): boolean {
  const noDryRunMutations = input.patchResults
    .filter((result) => result.applyMode === "dry-run")
    .every((result) => result.applied === false && result.changedFiles.length === 0);
  const cleanupSucceeded = input.workspaceSummaries.every(
    (summary) => summary.cleanupStatus === "succeeded" || summary.cleanupStatus === "skipped"
  );
  const noFailedPromotion = input.promotionResults.every((result) => result.status !== "failed");

  return noDryRunMutations && cleanupSucceeded && noFailedPromotion;
}
