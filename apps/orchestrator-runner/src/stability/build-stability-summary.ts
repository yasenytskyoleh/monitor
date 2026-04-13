import type {
  StabilityScenarioSummary,
  StabilityStatus,
  StabilitySummary,
  StabilitySummaryBuildInput
} from "./types.js";

export function buildStabilitySummary(input: StabilitySummaryBuildInput): StabilitySummary {
  const applyStatus = deriveApplyStatus(input.patchResults);
  const verificationStatus = deriveVerificationStatus(input.verificationResults);
  const rollbackStatus = deriveRollbackStatus(input.rollbackResults);
  const failureCategories = deriveFailureCategories(input);

  const scenarios: StabilityScenarioSummary[] =
    input.scenarios && input.scenarios.length > 0
      ? input.scenarios.map((scenario) =>
          buildScenarioSummary(input, scenario.scenario, scenario.finalState)
        )
      : [
          buildScenarioSummary(input, "default", input.finalState)
        ];

  return {
    runId: input.runId,
    mode: input.mode,
    finalState: input.finalState,
    outcome: input.outcome,
    overallStatus:
      applyStatus === "failed" || verificationStatus === "failed" || rollbackStatus === "failed"
        ? "failed"
        : "passed",
    applyStatus,
    verificationStatus,
    rollbackStatus,
    failureCategories,
    determinism: {
      status: "not_evaluated",
      note: "Determinism is evaluated by repeated-run stability matrix tests."
    },
    scenarios
  };
}

function buildScenarioSummary(
  input: StabilitySummaryBuildInput,
  scenario: string,
  finalState: string
): StabilityScenarioSummary {
  const patchResults = input.patchResults.filter((item) => item.scenario === scenario);
  const verificationResults = input.verificationResults.filter((item) => item.scenario === scenario);
  const rollbackResults = input.rollbackResults.filter((item) => item.scenario === scenario);
  const hasScenarioEvidence =
    patchResults.length > 0 || verificationResults.length > 0 || rollbackResults.length > 0;

  return {
    scenario,
    finalState,
    applyStatus: hasScenarioEvidence ? deriveApplyStatus(patchResults) : "skipped",
    verificationStatus: hasScenarioEvidence ? deriveVerificationStatus(verificationResults) : "skipped",
    rollbackStatus: hasScenarioEvidence ? deriveRollbackStatus(rollbackResults) : "skipped",
    failureCategories: hasScenarioEvidence
      ? deriveFailureCategories({
          ...input,
          patchResults,
          verificationResults,
          rollbackResults
        })
      : []
  };
}

function deriveApplyStatus(input: StabilitySummaryBuildInput["patchResults"]): StabilityStatus {
  if (input.length === 0) {
    return "skipped";
  }
  if (input.some((item) => item.failureCategory !== null)) {
    return "failed";
  }
  return "passed";
}

function deriveVerificationStatus(
  input: StabilitySummaryBuildInput["verificationResults"]
): StabilityStatus {
  if (input.length === 0) {
    return "skipped";
  }
  if (input.some((item) => item.overallStatus === "failed")) {
    return "failed";
  }
  if (input.some((item) => item.overallStatus === "passed")) {
    return "passed";
  }
  return "skipped";
}

function deriveRollbackStatus(input: StabilitySummaryBuildInput["rollbackResults"]): StabilityStatus {
  if (input.length === 0) {
    return "skipped";
  }
  if (input.some((item) => item.status === "failed")) {
    return "failed";
  }
  if (input.some((item) => item.status === "succeeded")) {
    return "passed";
  }
  return "skipped";
}

function deriveFailureCategories(input: {
  patchResults: StabilitySummaryBuildInput["patchResults"];
  verificationResults: StabilitySummaryBuildInput["verificationResults"];
  rollbackResults: StabilitySummaryBuildInput["rollbackResults"];
}): string[] {
  const categories = new Set<string>();

  for (const patchResult of input.patchResults) {
    if (patchResult.failureCategory) {
      categories.add(patchResult.failureCategory);
    }
  }

  if (
    input.verificationResults.some(
      (item) => item.overallStatus === "failed" && item.hooksExecuted.length > 0
    ) &&
    !Array.from(categories).some((category) => category.endsWith("_failed") || category === "verification_timeout")
  ) {
    categories.add("verification_failed");
  }

  if (input.rollbackResults.some((item) => item.status === "failed")) {
    categories.add("rollback_failed");
  }

  return Array.from(categories);
}
