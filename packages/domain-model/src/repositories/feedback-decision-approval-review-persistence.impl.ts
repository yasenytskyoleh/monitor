import type {
  FeedbackDecisionApprovalReviewPersistence,
  FeedbackDecisionApprovalReviewPersistenceResult,
  RecordFeedbackDecisionApprovalRequest
} from "./feedback-decision-approval-review-persistence.js";
import {
  InMemoryResearchDecisionApprovalRepository
} from "./research-decision-approval-repository.impl.js";
import {
  InMemoryResearchFeedbackDecisionRepository
} from "./research-feedback-decision-repository.impl.js";

const clone = <T>(value: T): T => structuredClone(value);

const buildUpdatedTimestamp = (metadata: RecordFeedbackDecisionApprovalRequest["metadata"]): string =>
  metadata.sourceObservedAtUtc ?? new Date().toISOString();

export class InMemoryFeedbackDecisionApprovalReviewPersistence
  implements FeedbackDecisionApprovalReviewPersistence
{
  constructor(
    private readonly researchFeedbackDecisionRepository: InMemoryResearchFeedbackDecisionRepository,
    private readonly researchDecisionApprovalRepository: InMemoryResearchDecisionApprovalRepository
  ) {}

  async recordFeedbackDecisionApproval(
    request: RecordFeedbackDecisionApprovalRequest
  ): Promise<FeedbackDecisionApprovalReviewPersistenceResult> {
    const snapshot = this.researchFeedbackDecisionRepository.getPersistedRecordSnapshot(
      request.researchFeedbackDecisionId
    );
    if (!snapshot) {
      return { status: "not_found" };
    }

    if (snapshot.decision.decisionStatus !== "proposed") {
      return {
        status: "conflict",
        currentDecision: clone(snapshot.decision)
      };
    }

    const updatedDecision = {
      ...snapshot.decision,
      decisionStatus: request.nextDecisionStatus,
      reviewerMetadata: clone(request.reviewerMetadata),
      updatedAt: buildUpdatedTimestamp(request.metadata)
    };

    this.researchFeedbackDecisionRepository.restorePersistedRecordSnapshot(
      request.researchFeedbackDecisionId,
      {
        decision: updatedDecision,
        version: snapshot.version + 1,
        metadata: clone(request.metadata)
      }
    );

    try {
      const approval = await this.researchDecisionApprovalRepository.create({
        approval: request.approval,
        metadata: request.metadata
      });

      return {
        status: "recorded",
        decision: clone(updatedDecision),
        approval
      };
    } catch (error) {
      this.researchFeedbackDecisionRepository.restorePersistedRecordSnapshot(
        request.researchFeedbackDecisionId,
        snapshot
      );
      throw error;
    }
  }
}
