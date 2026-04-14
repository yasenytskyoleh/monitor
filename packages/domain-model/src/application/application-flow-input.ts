import type { EvaluationResult } from "../evaluation/evaluation-result.js";
import type { FinalizeEvaluationResultRequest } from "../services/evaluation-service.js";
import type { ResearchHypothesis } from "../research-hypothesis.js";
import type { SetupAggregateResult } from "../research/setup-aggregate-result.js";
import type { SetupDefinition } from "../setup-definition.js";
import type { SignalCandidate } from "../signal-candidate.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

export type SetupToAggregateFlowInput = {
  setupDefinition: SetupDefinition;
  researchHypothesis: ResearchHypothesis;
  signalCandidate: SignalCandidate;
  evaluation: {
    pendingResult: EvaluationResult;
    finalization: Omit<
      FinalizeEvaluationResultRequest,
      "evaluationResultId" | "metadata" | "expectedVersion"
    >;
  };
  aggregation: {
    pendingAggregate: SetupAggregateResult;
    recomputeEvaluationResultIds: string[];
  };
  metadata: ProductRecordMetadata;
};
