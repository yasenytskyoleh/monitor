import {
  createAlreadyExistsRepositoryError,
  createInvalidReferenceRepositoryError
} from "./repository-error.js";
import type {
  ReviewDecisionRoutingResultRecordWriteRequest,
  ReviewDecisionRoutingResultRelationalRepositoryAdapter
} from "./review-decision-routing-result-relational-repository-adapter.js";
import type { ResearchReviewDecisionDurableRecord } from "../storage/research-review-decision-relational-slice.js";
import type { ReviewDecisionRoutingResultDurableRecord } from "../storage/review-decision-routing-result-relational-slice.js";

export type ReviewDecisionRoutingResultRelationalReferenceReader = {
  loadResearchReviewDecisionRecord(
    researchReviewDecisionId: string
  ): Promise<ResearchReviewDecisionDurableRecord | null>;
};

const cloneReviewDecisionRoutingResultRecord = (
  record: ReviewDecisionRoutingResultDurableRecord
): ReviewDecisionRoutingResultDurableRecord => structuredClone(record);

export class InMemoryReviewDecisionRoutingResultRelationalRepositoryAdapter
  implements ReviewDecisionRoutingResultRelationalRepositoryAdapter
{
  private readonly recordsById = new Map<string, ReviewDecisionRoutingResultDurableRecord>();

  constructor(
    private readonly references: ReviewDecisionRoutingResultRelationalReferenceReader
  ) {}

  async loadReviewDecisionRoutingResultRecord(
    reviewDecisionRoutingResultId: string
  ): Promise<ReviewDecisionRoutingResultDurableRecord | null> {
    const record = this.recordsById.get(reviewDecisionRoutingResultId);
    return record ? cloneReviewDecisionRoutingResultRecord(record) : null;
  }

  async listReviewDecisionRoutingResultRecordsByResearchReviewDecisionId(
    researchReviewDecisionId: string
  ): Promise<ReviewDecisionRoutingResultDurableRecord[]> {
    return [...this.recordsById.values()]
      .filter((record) => record.researchReviewDecisionId === researchReviewDecisionId)
      .map((record) => cloneReviewDecisionRoutingResultRecord(record));
  }

  async insertReviewDecisionRoutingResultRecord(
    request: ReviewDecisionRoutingResultRecordWriteRequest
  ): Promise<ReviewDecisionRoutingResultDurableRecord> {
    const reviewDecisionRoutingResultId = request.record.identity.entityId;
    if (this.recordsById.has(reviewDecisionRoutingResultId)) {
      throw createAlreadyExistsRepositoryError({
        entityType: "review_decision_routing_result",
        entityId: reviewDecisionRoutingResultId,
        operation: "create"
      });
    }

    await this.assertResearchReviewDecisionReferenceExists(request.record);

    const record = cloneReviewDecisionRoutingResultRecord(request.record);
    this.recordsById.set(reviewDecisionRoutingResultId, record);
    return cloneReviewDecisionRoutingResultRecord(record);
  }

  private async assertResearchReviewDecisionReferenceExists(
    record: ReviewDecisionRoutingResultDurableRecord
  ): Promise<void> {
    const reviewDecision = await this.references.loadResearchReviewDecisionRecord(
      record.researchReviewDecisionId
    );
    if (!reviewDecision) {
      throw createInvalidReferenceRepositoryError({
        entityType: "review_decision_routing_result",
        entityId: record.identity.entityId,
        operation: "create",
        referenceEntityType: "research_review_decision",
        referenceEntityId: record.researchReviewDecisionId
      });
    }
  }
}
