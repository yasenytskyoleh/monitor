import type { ResearchHypothesis, ResearchHypothesisStatus } from "../research-hypothesis.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

export type ResearchHypothesisCreateRequest = {
  hypothesis: ResearchHypothesis;
  metadata: ProductRecordMetadata;
};

export type ResearchHypothesisUpdateRequest = {
  hypothesis: ResearchHypothesis;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type ResearchHypothesisStatusUpdateRequest = {
  researchHypothesisId: string;
  status: ResearchHypothesisStatus;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type ResearchHypothesisRepository = {
  getById(researchHypothesisId: string): Promise<ResearchHypothesis | null>;
  listByStatus(statuses: ResearchHypothesisStatus[]): Promise<ResearchHypothesis[]>;
  create(request: ResearchHypothesisCreateRequest): Promise<ResearchHypothesis>;
  update(request: ResearchHypothesisUpdateRequest): Promise<ResearchHypothesis>;
  updateStatus(request: ResearchHypothesisStatusUpdateRequest): Promise<ResearchHypothesis | null>;
};
