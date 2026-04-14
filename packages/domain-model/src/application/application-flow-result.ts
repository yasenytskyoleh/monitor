export const FLOW_STEP_NAMES = [
  "setup_definition_create",
  "research_hypothesis_create",
  "research_hypothesis_link",
  "signal_candidate_create",
  "evaluation_result_create",
  "evaluation_result_start",
  "evaluation_result_finalize",
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
    signalCandidateId?: string;
    evaluationResultId?: string;
    setupAggregateResultId?: string;
  };
  completedSteps: FlowStepName[];
  failedStep?: FlowStepName;
  warnings: string[];
  error?: string;
};
