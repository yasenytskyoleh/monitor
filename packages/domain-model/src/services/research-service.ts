import type { SetupAggregateResult } from "../research/setup-aggregate-result.js";
import type { ResearchHypothesis } from "../research-hypothesis.js";
import type {
  ResearchHypothesisRepository
} from "../repositories/research-hypothesis-repository.js";
import type { SetupAggregateResultRepository } from "../repositories/setup-aggregate-result-repository.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

export type CreateResearchHypothesisRequest = {
  hypothesis: ResearchHypothesis;
  metadata: ProductRecordMetadata;
};

export type UpdateResearchHypothesisRequest = {
  hypothesis: ResearchHypothesis;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type StoreSetupAggregateResultRequest = {
  aggregate: SetupAggregateResult;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type ResearchServiceDependencies = {
  researchHypothesisRepository: ResearchHypothesisRepository;
  setupAggregateResultRepository: SetupAggregateResultRepository;
};

export type ResearchService = {
  createResearchHypothesis(request: CreateResearchHypothesisRequest): Promise<ResearchHypothesis>;
  updateResearchHypothesis(request: UpdateResearchHypothesisRequest): Promise<ResearchHypothesis>;
  storeSetupAggregateResult(request: StoreSetupAggregateResultRequest): Promise<SetupAggregateResult>;
};
