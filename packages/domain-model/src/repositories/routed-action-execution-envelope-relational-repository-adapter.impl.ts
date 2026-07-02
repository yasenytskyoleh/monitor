import {
  createAlreadyExistsRepositoryError,
  createInvalidReferenceRepositoryError
} from "./repository-error.js";
import type {
  RoutedActionExecutionEnvelopeRecordWriteRequest,
  RoutedActionExecutionEnvelopeRelationalRepositoryAdapter
} from "./routed-action-execution-envelope-relational-repository-adapter.js";
import type { ResearchReviewDecisionDurableRecord } from "../storage/research-review-decision-relational-slice.js";
import type { RoutedActionExecutionEnvelopeDurableRecord } from "../storage/routed-action-execution-envelope-relational-slice.js";

export type RoutedActionExecutionEnvelopeRelationalReferenceReader = {
  loadResearchReviewDecisionRecord(
    researchReviewDecisionId: string
  ): Promise<ResearchReviewDecisionDurableRecord | null>;
};

const cloneRoutedActionExecutionEnvelopeRecord = (
  record: RoutedActionExecutionEnvelopeDurableRecord
): RoutedActionExecutionEnvelopeDurableRecord => structuredClone(record);

export class InMemoryRoutedActionExecutionEnvelopeRelationalRepositoryAdapter
  implements RoutedActionExecutionEnvelopeRelationalRepositoryAdapter
{
  private readonly recordsById = new Map<string, RoutedActionExecutionEnvelopeDurableRecord>();

  constructor(
    private readonly references: RoutedActionExecutionEnvelopeRelationalReferenceReader
  ) {}

  async loadRoutedActionExecutionEnvelopeRecord(
    routedActionExecutionEnvelopeId: string
  ): Promise<RoutedActionExecutionEnvelopeDurableRecord | null> {
    const record = this.recordsById.get(routedActionExecutionEnvelopeId);
    return record ? cloneRoutedActionExecutionEnvelopeRecord(record) : null;
  }

  async listRoutedActionExecutionEnvelopeRecordsBySourceReviewDecisionId(
    sourceReviewDecisionId: string
  ): Promise<RoutedActionExecutionEnvelopeDurableRecord[]> {
    return [...this.recordsById.values()]
      .filter((record) => record.sourceReviewDecisionId === sourceReviewDecisionId)
      .map((record) => cloneRoutedActionExecutionEnvelopeRecord(record));
  }

  async insertRoutedActionExecutionEnvelopeRecord(
    request: RoutedActionExecutionEnvelopeRecordWriteRequest
  ): Promise<RoutedActionExecutionEnvelopeDurableRecord> {
    const routedActionExecutionEnvelopeId = request.record.identity.entityId;
    if (this.recordsById.has(routedActionExecutionEnvelopeId)) {
      throw createAlreadyExistsRepositoryError({
        entityType: "routed_action_execution_envelope",
        entityId: routedActionExecutionEnvelopeId,
        operation: "create"
      });
    }

    await this.assertResearchReviewDecisionReferenceExists(request.record);

    const record = cloneRoutedActionExecutionEnvelopeRecord(request.record);
    this.recordsById.set(routedActionExecutionEnvelopeId, record);
    return cloneRoutedActionExecutionEnvelopeRecord(record);
  }

  private async assertResearchReviewDecisionReferenceExists(
    record: RoutedActionExecutionEnvelopeDurableRecord
  ): Promise<void> {
    const reviewDecision = await this.references.loadResearchReviewDecisionRecord(
      record.sourceReviewDecisionId
    );
    if (!reviewDecision) {
      throw createInvalidReferenceRepositoryError({
        entityType: "routed_action_execution_envelope",
        entityId: record.identity.entityId,
        operation: "create",
        referenceEntityType: "research_review_decision",
        referenceEntityId: record.sourceReviewDecisionId
      });
    }
  }
}
