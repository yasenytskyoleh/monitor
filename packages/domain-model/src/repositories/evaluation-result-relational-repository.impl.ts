import type { EvaluationResult } from "../evaluation.js";
import type { EvaluationResultDurableRecord } from "../storage/signal-evaluation-relational-slice.js";
import type {
  EvaluationResultCreateRequest,
  EvaluationResultRepository,
  EvaluationResultStatusUpdateRequest,
  EvaluationResultUpdateRequest
} from "./evaluation-result-repository.js";
import {
  dehydrateEvaluationResultToDurableRecord,
  hydrateEvaluationResultFromDurableRecord
} from "./signal-evaluation-relational-repository-mappers.js";
import type { SignalEvaluationRelationalRepositoryAdapter } from "./signal-evaluation-relational-repository-adapter.js";
import { createNotFoundRepositoryError } from "./repository-error.js";

const buildUpdatedTimestamp = (sourceObservedAtUtc: string | null): string =>
  sourceObservedAtUtc ?? new Date().toISOString();

const buildNextEvaluationResultRecord = (
  result: EvaluationResult,
  metadata: EvaluationResultStatusUpdateRequest["metadata"] | EvaluationResultUpdateRequest["metadata"],
  currentRecord: EvaluationResultDurableRecord
): EvaluationResultDurableRecord =>
  dehydrateEvaluationResultToDurableRecord(result, metadata, currentRecord.identity.version + 1);

export class RelationalEvaluationResultRepository implements EvaluationResultRepository {
  constructor(private readonly adapter: SignalEvaluationRelationalRepositoryAdapter) {}

  async getById(evaluationResultId: string): Promise<EvaluationResult | null> {
    const record = await this.adapter.loadEvaluationResultRecord(evaluationResultId);
    return record ? hydrateEvaluationResultFromDurableRecord(record) : null;
  }

  async getBySignalCandidateAndWindow(
    signalCandidateId: string,
    evaluationWindowId: string
  ): Promise<EvaluationResult | null> {
    const record = await this.adapter.loadEvaluationResultRecordBySignalCandidateAndWindow(
      signalCandidateId,
      evaluationWindowId
    );
    return record ? hydrateEvaluationResultFromDurableRecord(record) : null;
  }

  async listBySignalCandidateId(signalCandidateId: string): Promise<EvaluationResult[]> {
    const records = await this.adapter.listEvaluationResultRecordsBySignalCandidateId(signalCandidateId);
    return records.map((record) => hydrateEvaluationResultFromDurableRecord(record));
  }

  async listByEvaluationWindowId(evaluationWindowId: string): Promise<EvaluationResult[]> {
    const records = await this.adapter.listEvaluationResultRecordsByEvaluationWindowId(
      evaluationWindowId
    );
    return records.map((record) => hydrateEvaluationResultFromDurableRecord(record));
  }

  async listByStatus(statuses: EvaluationResult["status"][]): Promise<EvaluationResult[]> {
    const records = await this.adapter.listEvaluationResultRecordsByStatus(statuses);
    return records.map((record) => hydrateEvaluationResultFromDurableRecord(record));
  }

  async create(request: EvaluationResultCreateRequest): Promise<EvaluationResult> {
    const createdRecord = await this.adapter.insertEvaluationResultRecord({
      record: dehydrateEvaluationResultToDurableRecord(request.result, request.metadata, 1),
      expectedVersion: null
    });

    return hydrateEvaluationResultFromDurableRecord(createdRecord);
  }

  async update(request: EvaluationResultUpdateRequest): Promise<EvaluationResult> {
    const currentRecord = await this.adapter.loadEvaluationResultRecord(request.result.id);
    if (!currentRecord) {
      throw createNotFoundRepositoryError({
        entityType: "evaluation_result",
        entityId: request.result.id,
        operation: "update"
      });
    }

    const updatedRecord = await this.adapter.updateEvaluationResultRecord({
      record: buildNextEvaluationResultRecord(request.result, request.metadata, currentRecord),
      expectedVersion: request.expectedVersion
    });

    return hydrateEvaluationResultFromDurableRecord(updatedRecord);
  }

  async updateStatus(
    request: EvaluationResultStatusUpdateRequest
  ): Promise<EvaluationResult | null> {
    const currentRecord = await this.adapter.loadEvaluationResultRecord(request.evaluationResultId);
    if (!currentRecord) {
      return null;
    }

    const currentResult = hydrateEvaluationResultFromDurableRecord(currentRecord);
    const updatedRecord = await this.adapter.updateEvaluationResultRecord({
      record: buildNextEvaluationResultRecord(
        {
          ...currentResult,
          status: request.status,
          updatedAt: buildUpdatedTimestamp(request.metadata.sourceObservedAtUtc)
        },
        request.metadata,
        currentRecord
      ),
      expectedVersion: request.expectedVersion
    });

    return hydrateEvaluationResultFromDurableRecord(updatedRecord);
  }
}
