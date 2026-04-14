import type { EvaluationResult, EvaluationStatus } from "../evaluation.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

export type EvaluationResultCreateRequest = {
  result: EvaluationResult;
  metadata: ProductRecordMetadata;
};

export type EvaluationResultUpdateRequest = {
  result: EvaluationResult;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type EvaluationResultStatusUpdateRequest = {
  resultId: string;
  status: EvaluationStatus;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type EvaluationResultRepository = {
  getById(resultId: string): Promise<EvaluationResult | null>;
  listBySignalCandidateId(signalCandidateId: string): Promise<EvaluationResult[]>;
  listByEvaluationWindowId(evaluationWindowId: string): Promise<EvaluationResult[]>;
  create(request: EvaluationResultCreateRequest): Promise<EvaluationResult>;
  update(request: EvaluationResultUpdateRequest): Promise<EvaluationResult>;
  updateStatus(request: EvaluationResultStatusUpdateRequest): Promise<EvaluationResult | null>;
};
