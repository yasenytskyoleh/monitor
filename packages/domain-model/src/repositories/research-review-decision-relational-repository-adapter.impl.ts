import type { ResearchHypothesisDurableRecordBundle } from "./first-durable-relational-repository-adapter.js";
import {
  createAlreadyExistsRepositoryError,
  createInvalidReferenceRepositoryError
} from "./repository-error.js";
import type {
  ResearchReviewDecisionRecordWriteRequest,
  ResearchReviewDecisionRelationalRepositoryAdapter
} from "./research-review-decision-relational-repository-adapter.js";
import type { ResearchReviewDecisionDurableRecord } from "../storage/research-review-decision-relational-slice.js";

export type ResearchReviewDecisionRelationalReferenceReader = {
  loadResearchHypothesisBundle(
    researchHypothesisId: string
  ): Promise<ResearchHypothesisDurableRecordBundle | null>;
};

const cloneResearchReviewDecisionRecord = (
  record: ResearchReviewDecisionDurableRecord
): ResearchReviewDecisionDurableRecord => structuredClone(record);

export class InMemoryResearchReviewDecisionRelationalRepositoryAdapter
  implements ResearchReviewDecisionRelationalRepositoryAdapter
{
  private readonly recordsById = new Map<string, ResearchReviewDecisionDurableRecord>();

  constructor(private readonly references: ResearchReviewDecisionRelationalReferenceReader) {}

  async loadResearchReviewDecisionRecord(
    researchReviewDecisionId: string
  ): Promise<ResearchReviewDecisionDurableRecord | null> {
    const record = this.recordsById.get(researchReviewDecisionId);
    return record ? cloneResearchReviewDecisionRecord(record) : null;
  }

  async listResearchReviewDecisionRecordsByReviewPacketId(
    researchReviewPacketId: string
  ): Promise<ResearchReviewDecisionDurableRecord[]> {
    return [...this.recordsById.values()]
      .filter((record) => record.researchReviewPacketId === researchReviewPacketId)
      .map((record) => cloneResearchReviewDecisionRecord(record));
  }

  async listResearchReviewDecisionRecordsBySetupFamilyId(
    setupFamilyId: string
  ): Promise<ResearchReviewDecisionDurableRecord[]> {
    return [...this.recordsById.values()]
      .filter((record) => record.setupFamilyId === setupFamilyId)
      .map((record) => cloneResearchReviewDecisionRecord(record));
  }

  async insertResearchReviewDecisionRecord(
    request: ResearchReviewDecisionRecordWriteRequest
  ): Promise<ResearchReviewDecisionDurableRecord> {
    const researchReviewDecisionId = request.record.identity.entityId;
    if (this.recordsById.has(researchReviewDecisionId)) {
      throw createAlreadyExistsRepositoryError({
        entityType: "research_review_decision",
        entityId: researchReviewDecisionId,
        operation: "create"
      });
    }

    await this.assertResearchHypothesisReferenceExists(request.record);

    const record = cloneResearchReviewDecisionRecord(request.record);
    this.recordsById.set(researchReviewDecisionId, record);
    return cloneResearchReviewDecisionRecord(record);
  }

  private async assertResearchHypothesisReferenceExists(
    record: ResearchReviewDecisionDurableRecord
  ): Promise<void> {
    if (!record.researchHypothesisId) {
      return;
    }

    const hypothesis = await this.references.loadResearchHypothesisBundle(record.researchHypothesisId);
    if (!hypothesis) {
      throw createInvalidReferenceRepositoryError({
        entityType: "research_review_decision",
        entityId: record.identity.entityId,
        operation: "create",
        referenceEntityType: "research_hypothesis",
        referenceEntityId: record.researchHypothesisId
      });
    }
  }
}
