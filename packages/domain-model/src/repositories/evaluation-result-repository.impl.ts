import type {
  EvaluationResultCreateRequest,
  EvaluationResultRepository,
  EvaluationResultStatusUpdateRequest,
  EvaluationResultUpdateRequest
} from "./evaluation-result-repository.js";
import type { EvaluationResult } from "../evaluation/evaluation-result.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

type PersistedEvaluationResultRecord = {
  result: EvaluationResult;
  version: number;
  metadata: ProductRecordMetadata;
};

const cloneEvaluationResult = (result: EvaluationResult): EvaluationResult => structuredClone(result);

const cloneMetadata = (metadata: ProductRecordMetadata): ProductRecordMetadata => structuredClone(metadata);

const assertExpectedVersion = (
  record: PersistedEvaluationResultRecord,
  expectedVersion: number | null
): void => {
  if (expectedVersion !== null && expectedVersion !== record.version) {
    throw new Error(
      `evaluation_result version mismatch: expected ${expectedVersion}, got ${record.version}`
    );
  }
};

const buildUpdateTimestamp = (metadata: ProductRecordMetadata): string =>
  metadata.sourceObservedAtUtc ?? new Date().toISOString();

export class InMemoryEvaluationResultRepository implements EvaluationResultRepository {
  private readonly recordsById = new Map<string, PersistedEvaluationResultRecord>();

  async getById(evaluationResultId: string): Promise<EvaluationResult | null> {
    const record = this.recordsById.get(evaluationResultId);
    return record ? cloneEvaluationResult(record.result) : null;
  }

  async getBySignalCandidateAndWindow(
    signalCandidateId: string,
    evaluationWindowId: string
  ): Promise<EvaluationResult | null> {
    for (const record of this.recordsById.values()) {
      if (
        record.result.signalCandidateId === signalCandidateId &&
        record.result.evaluationWindowId === evaluationWindowId
      ) {
        return cloneEvaluationResult(record.result);
      }
    }
    return null;
  }

  async listBySignalCandidateId(signalCandidateId: string): Promise<EvaluationResult[]> {
    return [...this.recordsById.values()]
      .filter((record) => record.result.signalCandidateId === signalCandidateId)
      .map((record) => cloneEvaluationResult(record.result));
  }

  async listByEvaluationWindowId(evaluationWindowId: string): Promise<EvaluationResult[]> {
    return [...this.recordsById.values()]
      .filter((record) => record.result.evaluationWindowId === evaluationWindowId)
      .map((record) => cloneEvaluationResult(record.result));
  }

  async listByStatus(statuses: EvaluationResult["status"][]): Promise<EvaluationResult[]> {
    const allowed = new Set(statuses);
    return [...this.recordsById.values()]
      .filter((record) => allowed.has(record.result.status))
      .map((record) => cloneEvaluationResult(record.result));
  }

  async create(request: EvaluationResultCreateRequest): Promise<EvaluationResult> {
    const evaluationResultId = request.result.id;
    if (this.recordsById.has(evaluationResultId)) {
      throw new Error(`evaluation_result already exists: ${evaluationResultId}`);
    }

    const duplicateForWindow = await this.getBySignalCandidateAndWindow(
      request.result.signalCandidateId,
      request.result.evaluationWindowId
    );
    if (duplicateForWindow) {
      throw new Error(
        `evaluation_result already exists for candidate/window: ${request.result.signalCandidateId}/${request.result.evaluationWindowId}`
      );
    }

    const result = cloneEvaluationResult(request.result);
    this.recordsById.set(evaluationResultId, {
      result,
      version: 1,
      metadata: cloneMetadata(request.metadata)
    });
    return cloneEvaluationResult(result);
  }

  async update(request: EvaluationResultUpdateRequest): Promise<EvaluationResult> {
    const evaluationResultId = request.result.id;
    const currentRecord = this.recordsById.get(evaluationResultId);
    if (!currentRecord) {
      throw new Error(`evaluation_result not found: ${evaluationResultId}`);
    }

    assertExpectedVersion(currentRecord, request.expectedVersion);

    const result = cloneEvaluationResult(request.result);
    this.recordsById.set(evaluationResultId, {
      result,
      version: currentRecord.version + 1,
      metadata: cloneMetadata(request.metadata)
    });
    return cloneEvaluationResult(result);
  }

  async updateStatus(request: EvaluationResultStatusUpdateRequest): Promise<EvaluationResult | null> {
    const currentRecord = this.recordsById.get(request.evaluationResultId);
    if (!currentRecord) {
      return null;
    }

    assertExpectedVersion(currentRecord, request.expectedVersion);

    const result: EvaluationResult = {
      ...currentRecord.result,
      status: request.status,
      updatedAt: buildUpdateTimestamp(request.metadata)
    };
    this.recordsById.set(request.evaluationResultId, {
      result,
      version: currentRecord.version + 1,
      metadata: cloneMetadata(request.metadata)
    });
    return cloneEvaluationResult(result);
  }
}
