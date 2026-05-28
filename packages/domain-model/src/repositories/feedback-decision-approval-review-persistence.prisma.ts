import type {
  FeedbackDecisionApprovalReviewPersistence,
  FeedbackDecisionApprovalReviewPersistenceResult,
  RecordFeedbackDecisionApprovalRequest
} from "./feedback-decision-approval-review-persistence.js";
import type {
  ResearchDecisionApprovalRelationalPrismaClient
} from "./research-decision-approval-relational-prisma-adapter.js";
import {
  PrismaResearchDecisionApprovalRelationalRepositoryAdapter
} from "./research-decision-approval-relational-prisma-adapter.js";
import {
  dehydrateResearchDecisionApprovalToDurableRecord,
  hydrateResearchDecisionApprovalFromDurableRecord
} from "./research-decision-approval-relational-repository-mappers.js";
import type {
  ResearchFeedbackDecisionRelationalPrismaClient
} from "./research-feedback-decision-relational-prisma-adapter.js";
import {
  PrismaResearchFeedbackDecisionRelationalRepositoryAdapter
} from "./research-feedback-decision-relational-prisma-adapter.js";
import {
  dehydrateResearchFeedbackDecisionToDurableRecord,
  hydrateResearchFeedbackDecisionFromDurableRecord
} from "./research-feedback-decision-relational-repository-mappers.js";
import { RepositoryError } from "./repository-error.js";

type FeedbackDecisionApprovalReviewPrismaTransactionClient =
  ResearchFeedbackDecisionRelationalPrismaClient &
  ResearchDecisionApprovalRelationalPrismaClient;

export type FeedbackDecisionApprovalReviewPrismaClient =
  FeedbackDecisionApprovalReviewPrismaTransactionClient & {
    $transaction<T>(
      callback: (
        transaction: FeedbackDecisionApprovalReviewPrismaTransactionClient
      ) => Promise<T>
    ): Promise<T>;
  };

const clone = <T>(value: T): T => structuredClone(value);

const buildUpdatedTimestamp = (metadata: RecordFeedbackDecisionApprovalRequest["metadata"]): string =>
  metadata.sourceObservedAtUtc ?? new Date().toISOString();

const buildConflictResult = async (
  feedbackAdapter: PrismaResearchFeedbackDecisionRelationalRepositoryAdapter,
  researchFeedbackDecisionId: string
): Promise<FeedbackDecisionApprovalReviewPersistenceResult> => {
  const currentRecord = await feedbackAdapter.loadResearchFeedbackDecisionRecord(
    researchFeedbackDecisionId
  );
  if (!currentRecord) {
    return { status: "not_found" };
  }

  return {
    status: "conflict",
    currentDecision: hydrateResearchFeedbackDecisionFromDurableRecord(currentRecord)
  };
};

export class PrismaFeedbackDecisionApprovalReviewPersistence
  implements FeedbackDecisionApprovalReviewPersistence
{
  constructor(private readonly prisma: FeedbackDecisionApprovalReviewPrismaClient) {}

  async recordFeedbackDecisionApproval(
    request: RecordFeedbackDecisionApprovalRequest
  ): Promise<FeedbackDecisionApprovalReviewPersistenceResult> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const feedbackAdapter = new PrismaResearchFeedbackDecisionRelationalRepositoryAdapter(
          transaction
        );
        const approvalAdapter = new PrismaResearchDecisionApprovalRelationalRepositoryAdapter(
          transaction
        );

        const currentRecord = await feedbackAdapter.loadResearchFeedbackDecisionRecord(
          request.researchFeedbackDecisionId
        );
        if (!currentRecord) {
          return { status: "not_found" };
        }

        const currentDecision = hydrateResearchFeedbackDecisionFromDurableRecord(currentRecord);
        if (currentDecision.decisionStatus !== "proposed") {
          return {
            status: "conflict",
            currentDecision
          };
        }

        const updatedDecision = {
          ...currentDecision,
          decisionStatus: request.nextDecisionStatus,
          reviewerMetadata: clone(request.reviewerMetadata),
          updatedAt: buildUpdatedTimestamp(request.metadata)
        };

        const updatedRecord = await feedbackAdapter.updateResearchFeedbackDecisionRecord({
          record: dehydrateResearchFeedbackDecisionToDurableRecord(
            updatedDecision,
            request.metadata,
            currentRecord.identity.version + 1
          ),
          expectedVersion: currentRecord.identity.version
        });
        const approvalRecord = await approvalAdapter.insertResearchDecisionApprovalRecord({
          record: dehydrateResearchDecisionApprovalToDurableRecord(
            request.approval,
            request.metadata,
            1
          )
        });

        return {
          status: "recorded",
          decision: hydrateResearchFeedbackDecisionFromDurableRecord(updatedRecord),
          approval: hydrateResearchDecisionApprovalFromDurableRecord(approvalRecord)
        };
      });
    } catch (error) {
      if (
        error instanceof RepositoryError &&
        (error.code === "version_mismatch" || error.code === "already_exists")
      ) {
        return buildConflictResult(
          new PrismaResearchFeedbackDecisionRelationalRepositoryAdapter(this.prisma),
          request.researchFeedbackDecisionId
        );
      }

      throw error;
    }
  }
}

export const createPrismaFeedbackDecisionApprovalReviewPersistence = (
  prisma: FeedbackDecisionApprovalReviewPrismaClient
): PrismaFeedbackDecisionApprovalReviewPersistence =>
  new PrismaFeedbackDecisionApprovalReviewPersistence(prisma);
