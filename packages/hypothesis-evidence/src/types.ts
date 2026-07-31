import type {
  AggregateHypothesisEvidenceTrigger,
  HypothesisEvidenceUpdateResult,
  ProductRecordMetadata,
  SetupAggregateResultRepository
} from "@monitor/domain-model";

export type CompletedAggregateHypothesisEvidenceRequest = {
  setupAggregateResultId: string;
  triggeredAt: string;
};

export type AggregateHypothesisEvidenceHandoff = {
  update(
    trigger: AggregateHypothesisEvidenceTrigger,
    metadata: ProductRecordMetadata
  ): Promise<HypothesisEvidenceUpdateResult>;
};

export type CompletedAggregateHypothesisEvidenceRuntimeOptions = {
  setupAggregateResultRepository: Pick<SetupAggregateResultRepository, "getById">;
  hypothesisEvidenceHandoff: AggregateHypothesisEvidenceHandoff;
};

export type CompletedAggregateHypothesisEvidenceRuntime = {
  updateFromCompletedAggregate(
    request: CompletedAggregateHypothesisEvidenceRequest
  ): Promise<HypothesisEvidenceUpdateResult>;
};
