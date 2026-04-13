import type { PatchResultEvidence } from "../backend-patch/types.js";
import type { RollbackResultEvidence } from "../backend-rollback/types.js";
import type { VerificationResultEvidence } from "../backend-verification/types.js";
import type { RunOutcome } from "../persistence/types.js";

export type StabilityStatus = "passed" | "failed" | "skipped";

export type StabilityScenarioSummary = {
  scenario: string;
  finalState: string;
  applyStatus: StabilityStatus;
  verificationStatus: StabilityStatus;
  rollbackStatus: StabilityStatus;
  failureCategories: string[];
};

export type StabilitySummary = {
  runId: string;
  mode: "mock" | "live";
  finalState: string;
  outcome: RunOutcome;
  overallStatus: "passed" | "failed";
  applyStatus: StabilityStatus;
  verificationStatus: StabilityStatus;
  rollbackStatus: StabilityStatus;
  failureCategories: string[];
  determinism: {
    status: "not_evaluated";
    note: string;
  };
  scenarios: StabilityScenarioSummary[];
};

export type StabilitySummaryBuildInput = {
  runId: string;
  mode: "mock" | "live";
  finalState: string;
  outcome: RunOutcome;
  scenarios?: Array<{
    scenario: string;
    finalState: string;
  }>;
  patchResults: PatchResultEvidence[];
  verificationResults: VerificationResultEvidence[];
  rollbackResults: RollbackResultEvidence[];
};
