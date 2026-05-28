import type {
  ResearchFeedbackDecisionCreateRequest,
  ResearchFeedbackDecisionRepository,
  ResearchFeedbackDecisionStatusUpdateRequest
} from "./research-feedback-decision-repository.js";
import type { ResearchFeedbackDecision } from "../research/research-feedback-decision.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

type PersistedResearchFeedbackDecisionRecord = {
  decision: ResearchFeedbackDecision;
  version: number;
  metadata: ProductRecordMetadata;
};
export type PersistedResearchFeedbackDecisionRecordSnapshot = PersistedResearchFeedbackDecisionRecord;

const cloneResearchFeedbackDecision = (
  decision: ResearchFeedbackDecision
): ResearchFeedbackDecision => structuredClone(decision);

const cloneMetadata = (metadata: ProductRecordMetadata): ProductRecordMetadata => structuredClone(metadata);

const assertExpectedVersion = (
  record: PersistedResearchFeedbackDecisionRecord,
  expectedVersion: number | null
): void => {
  if (expectedVersion !== null && expectedVersion !== record.version) {
    throw new Error(
      `research_feedback_decision version mismatch: expected ${expectedVersion}, got ${record.version}`
    );
  }
};

const buildUpdateTimestamp = (metadata: ProductRecordMetadata): string =>
  metadata.sourceObservedAtUtc ?? new Date().toISOString();

export class InMemoryResearchFeedbackDecisionRepository
implements ResearchFeedbackDecisionRepository {
  private readonly recordsById = new Map<string, PersistedResearchFeedbackDecisionRecord>();

  getPersistedRecordSnapshot(
    researchFeedbackDecisionId: string
  ): PersistedResearchFeedbackDecisionRecordSnapshot | null {
    const record = this.recordsById.get(researchFeedbackDecisionId);
    if (!record) {
      return null;
    }

    return {
      decision: cloneResearchFeedbackDecision(record.decision),
      version: record.version,
      metadata: cloneMetadata(record.metadata)
    };
  }

  restorePersistedRecordSnapshot(
    researchFeedbackDecisionId: string,
    snapshot: PersistedResearchFeedbackDecisionRecordSnapshot
  ): void {
    this.recordsById.set(researchFeedbackDecisionId, {
      decision: cloneResearchFeedbackDecision(snapshot.decision),
      version: snapshot.version,
      metadata: cloneMetadata(snapshot.metadata)
    });
  }

  async getById(researchFeedbackDecisionId: string): Promise<ResearchFeedbackDecision | null> {
    const record = this.recordsById.get(researchFeedbackDecisionId);
    return record ? cloneResearchFeedbackDecision(record.decision) : null;
  }

  async listBySetupDefinitionId(setupDefinitionId: string): Promise<ResearchFeedbackDecision[]> {
    return [...this.recordsById.values()]
      .filter((record) => record.decision.setupDefinitionId === setupDefinitionId)
      .map((record) => cloneResearchFeedbackDecision(record.decision));
  }

  async listByResearchHypothesisId(
    researchHypothesisId: string
  ): Promise<ResearchFeedbackDecision[]> {
    return [...this.recordsById.values()]
      .filter((record) => record.decision.researchHypothesisId === researchHypothesisId)
      .map((record) => cloneResearchFeedbackDecision(record.decision));
  }

  async create(request: ResearchFeedbackDecisionCreateRequest): Promise<ResearchFeedbackDecision> {
    const researchFeedbackDecisionId = request.decision.id;
    if (this.recordsById.has(researchFeedbackDecisionId)) {
      throw new Error(`research_feedback_decision already exists: ${researchFeedbackDecisionId}`);
    }

    const decision = cloneResearchFeedbackDecision(request.decision);
    this.recordsById.set(researchFeedbackDecisionId, {
      decision,
      version: 1,
      metadata: cloneMetadata(request.metadata)
    });

    return cloneResearchFeedbackDecision(decision);
  }

  async updateStatus(
    request: ResearchFeedbackDecisionStatusUpdateRequest
  ): Promise<ResearchFeedbackDecision | null> {
    const currentRecord = this.recordsById.get(request.researchFeedbackDecisionId);
    if (!currentRecord) {
      return null;
    }

    assertExpectedVersion(currentRecord, request.expectedVersion);

    const decision: ResearchFeedbackDecision = {
      ...currentRecord.decision,
      decisionStatus: request.status,
      reviewerMetadata: request.reviewerMetadata ?? currentRecord.decision.reviewerMetadata,
      updatedAt: buildUpdateTimestamp(request.metadata)
    };

    this.recordsById.set(request.researchFeedbackDecisionId, {
      decision,
      version: currentRecord.version + 1,
      metadata: cloneMetadata(request.metadata)
    });

    return cloneResearchFeedbackDecision(decision);
  }
}
