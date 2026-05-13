import type {
  ResearchHypothesisCreateRequest,
  ResearchHypothesisRepository,
  ResearchHypothesisStatusUpdateRequest,
  ResearchHypothesisUpdateRequest
} from "./research-hypothesis-repository.js";
import type { ResearchHypothesis } from "../research-hypothesis.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";
import {
  createAlreadyExistsRepositoryError,
  createNotFoundRepositoryError,
  createVersionMismatchRepositoryError,
  type RepositoryOperation
} from "./repository-error.js";

type PersistedResearchHypothesisRecord = {
  hypothesis: ResearchHypothesis;
  version: number;
  metadata: ProductRecordMetadata;
};

const cloneResearchHypothesis = (hypothesis: ResearchHypothesis): ResearchHypothesis =>
  structuredClone(hypothesis);

const cloneMetadata = (metadata: ProductRecordMetadata): ProductRecordMetadata => structuredClone(metadata);

const assertExpectedVersion = (
  record: PersistedResearchHypothesisRecord,
  expectedVersion: number | null,
  researchHypothesisId: string,
  operation: RepositoryOperation
): void => {
  if (expectedVersion !== null && expectedVersion !== record.version) {
    throw createVersionMismatchRepositoryError({
      entityType: "research_hypothesis",
      entityId: researchHypothesisId,
      operation,
      expectedVersion,
      actualVersion: record.version
    });
  }
};

const buildUpdatedTimestamp = (metadata: ProductRecordMetadata): string =>
  metadata.sourceObservedAtUtc ?? new Date().toISOString();

export class InMemoryResearchHypothesisRepository implements ResearchHypothesisRepository {
  private readonly recordsById = new Map<string, PersistedResearchHypothesisRecord>();

  async getById(researchHypothesisId: string): Promise<ResearchHypothesis | null> {
    const record = this.recordsById.get(researchHypothesisId);
    return record ? cloneResearchHypothesis(record.hypothesis) : null;
  }

  async listByStatus(statuses: ResearchHypothesis["status"][]): Promise<ResearchHypothesis[]> {
    const allowed = new Set(statuses);
    return [...this.recordsById.values()]
      .filter((record) => allowed.has(record.hypothesis.status))
      .map((record) => cloneResearchHypothesis(record.hypothesis));
  }

  async create(request: ResearchHypothesisCreateRequest): Promise<ResearchHypothesis> {
    const researchHypothesisId = request.hypothesis.id;
    if (this.recordsById.has(researchHypothesisId)) {
      throw createAlreadyExistsRepositoryError({
        entityType: "research_hypothesis",
        entityId: researchHypothesisId,
        operation: "create"
      });
    }

    const hypothesis = cloneResearchHypothesis(request.hypothesis);
    this.recordsById.set(researchHypothesisId, {
      hypothesis,
      version: 1,
      metadata: cloneMetadata(request.metadata)
    });
    return cloneResearchHypothesis(hypothesis);
  }

  async update(request: ResearchHypothesisUpdateRequest): Promise<ResearchHypothesis> {
    const researchHypothesisId = request.hypothesis.id;
    const currentRecord = this.recordsById.get(researchHypothesisId);
    if (!currentRecord) {
      throw createNotFoundRepositoryError({
        entityType: "research_hypothesis",
        entityId: researchHypothesisId,
        operation: "update"
      });
    }

    assertExpectedVersion(currentRecord, request.expectedVersion, researchHypothesisId, "update");

    const nextHypothesis = cloneResearchHypothesis(request.hypothesis);
    this.recordsById.set(researchHypothesisId, {
      hypothesis: nextHypothesis,
      version: currentRecord.version + 1,
      metadata: cloneMetadata(request.metadata)
    });
    return cloneResearchHypothesis(nextHypothesis);
  }

  async updateStatus(request: ResearchHypothesisStatusUpdateRequest): Promise<ResearchHypothesis | null> {
    const currentRecord = this.recordsById.get(request.researchHypothesisId);
    if (!currentRecord) {
      return null;
    }

    assertExpectedVersion(
      currentRecord,
      request.expectedVersion,
      request.researchHypothesisId,
      "update_status"
    );

    const nextHypothesis: ResearchHypothesis = {
      ...currentRecord.hypothesis,
      status: request.status,
      updatedAt: buildUpdatedTimestamp(request.metadata)
    };
    this.recordsById.set(request.researchHypothesisId, {
      hypothesis: nextHypothesis,
      version: currentRecord.version + 1,
      metadata: cloneMetadata(request.metadata)
    });
    return cloneResearchHypothesis(nextHypothesis);
  }
}
