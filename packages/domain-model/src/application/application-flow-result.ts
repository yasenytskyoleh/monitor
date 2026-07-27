import type { EvaluationStatus } from "../evaluation/evaluation-status.js";
import type { SetupAggregateResult } from "../research/setup-aggregate-result.js";
import type { ResearchRunStatus } from "../research-run.js";

export const FLOW_STEP_NAMES = [
  "setup_definition_create",
  "research_hypothesis_create",
  "research_hypothesis_link",
  "monitored_symbol_register",
  "signal_candidate_create",
  "research_run_create",
  "research_run_start",
  "evaluation_result_create",
  "evaluation_result_start",
  "evaluation_result_finalize",
  "evaluation_result_expire",
  "evaluation_result_invalidate",
  "research_run_record_evidence",
  "research_run_complete",
  "setup_aggregate_result_create",
  "setup_aggregate_result_recompute"
] as const;
export type FlowStepName = (typeof FLOW_STEP_NAMES)[number];

export const FLOW_STATUSES = ["completed", "partial", "failed"] as const;
export type FlowStatus = (typeof FLOW_STATUSES)[number];

export type SetupToAggregateFlowResult = {
  status: FlowStatus;
  ids: {
    setupDefinitionId?: string;
    researchHypothesisId?: string;
    monitoredSymbolId?: string;
    signalCandidateId?: string;
    researchRunId?: string;
    evaluationResultId?: string;
    setupAggregateResultId?: string;
  };
  outcomes?: {
    evaluationResultStatus?: EvaluationStatus;
    researchRunStatus?: ResearchRunStatus;
    setupAggregateResultStatus?: SetupAggregateResult["status"];
  };
  completedSteps: FlowStepName[];
  failedStep?: FlowStepName;
  warnings: string[];
  error?: string;
};
