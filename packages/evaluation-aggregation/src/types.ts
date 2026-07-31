import type {
  AggregationRefreshResult,
  EvaluationResultRepository,
  EvaluationAggregationRefreshTrigger,
  ProductRecordMetadata,
  SignalCandidateRepository
} from "@monitor/domain-model";

export type CompletedEvaluationAggregationRequest = {
  evaluationResultId: string;
  triggeredAt: string;
};

export type EvaluationAggregationHandoff = {
  refresh(
    trigger: EvaluationAggregationRefreshTrigger,
    metadata: ProductRecordMetadata
  ): Promise<AggregationRefreshResult>;
};

export type CompletedEvaluationAggregationRuntimeOptions = {
  evaluationResultRepository: Pick<EvaluationResultRepository, "getById">;
  signalCandidateRepository: Pick<SignalCandidateRepository, "getById">;
  aggregationHandoff: EvaluationAggregationHandoff;
};

export type CompletedEvaluationAggregationRuntime = {
  refreshCompletedEvaluation(
    request: CompletedEvaluationAggregationRequest
  ): Promise<AggregationRefreshResult>;
};
