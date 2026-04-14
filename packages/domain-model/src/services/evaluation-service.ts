import type { EvaluationResult } from "../evaluation.js";
import type { EvaluationResultRepository } from "../repositories/evaluation-result-repository.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

export type CreateEvaluationResultRequest = {
  result: EvaluationResult;
  metadata: ProductRecordMetadata;
};

export type UpdateEvaluationResultStatusRequest = {
  resultId: string;
  status: EvaluationResult["status"];
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type EvaluationServiceDependencies = {
  evaluationResultRepository: EvaluationResultRepository;
};

export type EvaluationService = {
  createEvaluationResult(request: CreateEvaluationResultRequest): Promise<EvaluationResult>;
  updateEvaluationResultStatus(request: UpdateEvaluationResultStatusRequest): Promise<EvaluationResult | null>;
};
