import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";
import type { ResearchReviewPacket } from "../query/research-review-packet.js";
import type { ResearchReviewDecisionRepository } from "../repositories/research-review-decision-repository.js";
import type { ApplyResearchReviewDecisionCommand } from "./apply-research-review-decision-command.js";
import type {
  ResearchReviewAuthorizedNextAction,
  ResearchReviewDecision
} from "./research-review-decision.js";
import {
  RESEARCH_REVIEW_AUTHORIZED_NEXT_ACTIONS
} from "./research-review-decision.js";
import type { ResearchReviewDecisionResult } from "./research-review-decision-result.js";
import {
  RESEARCH_REVIEW_DECISION_OUTCOMES,
  type ResearchReviewDecisionOutcome
} from "./research-review-decision-outcome.js";

export type ResearchReviewPacketLookup = {
  getById(researchReviewPacketId: string): Promise<ResearchReviewPacket | null>;
};

export type ApplyResearchReviewDecisionRequest = {
  command: ApplyResearchReviewDecisionCommand;
  metadata: ProductRecordMetadata;
};

export type ResearchReviewDecisionServiceDependencies = {
  reviewPacketLookup: ResearchReviewPacketLookup;
  researchReviewDecisionRepository: ResearchReviewDecisionRepository;
};

export type ResearchReviewDecisionService = {
  applyDecision(request: ApplyResearchReviewDecisionRequest): Promise<ResearchReviewDecisionResult>;
};

const asErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "unexpected research review decision application failure";

const isAllowedAuthorizedNextAction = (
  value: ResearchReviewAuthorizedNextAction | undefined
): boolean =>
  value === undefined || RESEARCH_REVIEW_AUTHORIZED_NEXT_ACTIONS.includes(value);

const resolveAuthorizedNextAction = (
  outcome: ResearchReviewDecisionOutcome,
  authorizedNextAction: ResearchReviewAuthorizedNextAction | undefined
): {
  resolvedAction?: ResearchReviewAuthorizedNextAction;
  validationError?: string;
} => {
  if (!isAllowedAuthorizedNextAction(authorizedNextAction)) {
    return {
      validationError: `invalid authorizedNextAction: ${String(authorizedNextAction)}`
    };
  }

  if (outcome === "accepted") {
    return {
      resolvedAction: authorizedNextAction ?? "confirm_no_change"
    };
  }

  if (outcome === "rejected") {
    if (authorizedNextAction) {
      return {
        validationError: "authorizedNextAction must be omitted when decisionOutcome is rejected"
      };
    }

    return {};
  }

  if (outcome === "revise") {
    if (authorizedNextAction && authorizedNextAction !== "prepare_refinement_follow_up") {
      return {
        validationError: "revise outcome only supports authorizedNextAction=prepare_refinement_follow_up"
      };
    }

    return {
      resolvedAction: "prepare_refinement_follow_up"
    };
  }

  return {
    validationError: `unsupported decisionOutcome: ${outcome}`
  };
};

const buildDecisionId = (command: ApplyResearchReviewDecisionCommand): string =>
  `review-decision:${command.researchReviewPacketId}:${command.reviewedAt}:${command.reviewedBy}`;

const buildUpdateTimestamp = (metadata: ProductRecordMetadata): string =>
  metadata.sourceObservedAtUtc ?? new Date().toISOString();

export const createResearchReviewDecisionService = (
  dependencies: ResearchReviewDecisionServiceDependencies
): ResearchReviewDecisionService => {
  const {
    reviewPacketLookup,
    researchReviewDecisionRepository
  } = dependencies;

  return {
    async applyDecision(request): Promise<ResearchReviewDecisionResult> {
      const { command, metadata } = request;
      try {
        if (!command.researchReviewPacketId.trim()) {
          return {
            status: "rejected_validation",
            setupFamilyId: command.setupFamilyId,
            reason: "researchReviewPacketId is required",
            warnings: []
          };
        }

        if (!command.setupFamilyId.trim()) {
          return {
            status: "rejected_validation",
            researchReviewPacketId: command.researchReviewPacketId,
            reason: "setupFamilyId is required",
            warnings: []
          };
        }

        if (!command.reviewedBy.trim()) {
          return {
            status: "rejected_validation",
            researchReviewPacketId: command.researchReviewPacketId,
            setupFamilyId: command.setupFamilyId,
            reason: "reviewedBy is required",
            warnings: []
          };
        }

        if (!command.reviewedAt.trim()) {
          return {
            status: "rejected_validation",
            researchReviewPacketId: command.researchReviewPacketId,
            setupFamilyId: command.setupFamilyId,
            reason: "reviewedAt is required",
            warnings: []
          };
        }

        if (!RESEARCH_REVIEW_DECISION_OUTCOMES.includes(command.decisionOutcome)) {
          return {
            status: "rejected_validation",
            researchReviewPacketId: command.researchReviewPacketId,
            setupFamilyId: command.setupFamilyId,
            reason: `invalid decisionOutcome: ${command.decisionOutcome}`,
            warnings: []
          };
        }

        const nextActionResolution = resolveAuthorizedNextAction(
          command.decisionOutcome,
          command.authorizedNextAction
        );
        if (nextActionResolution.validationError) {
          return {
            status: "rejected_validation",
            researchReviewPacketId: command.researchReviewPacketId,
            setupFamilyId: command.setupFamilyId,
            decisionOutcome: command.decisionOutcome,
            reason: nextActionResolution.validationError,
            warnings: []
          };
        }

        const packet = await reviewPacketLookup.getById(command.researchReviewPacketId);
        if (!packet) {
          return {
            status: "rejected_linkage",
            researchReviewPacketId: command.researchReviewPacketId,
            setupFamilyId: command.setupFamilyId,
            decisionOutcome: command.decisionOutcome,
            reason: `research_review_packet not found: ${command.researchReviewPacketId}`,
            warnings: []
          };
        }

        if (packet.setupFamilyId !== command.setupFamilyId) {
          return {
            status: "rejected_linkage",
            researchReviewPacketId: command.researchReviewPacketId,
            setupFamilyId: command.setupFamilyId,
            reason: "research_review_packet / setupFamilyId mismatch",
            warnings: []
          };
        }

        if (command.setupRevisionId && packet.setupRevisionId !== command.setupRevisionId) {
          return {
            status: "rejected_linkage",
            researchReviewPacketId: command.researchReviewPacketId,
            setupFamilyId: command.setupFamilyId,
            setupRevisionId: command.setupRevisionId,
            reason: "research_review_packet / setupRevisionId mismatch",
            warnings: []
          };
        }

        if (command.researchHypothesisId && packet.hypothesisId !== command.researchHypothesisId) {
          return {
            status: "rejected_linkage",
            researchReviewPacketId: command.researchReviewPacketId,
            setupFamilyId: command.setupFamilyId,
            researchHypothesisId: command.researchHypothesisId,
            reason: "research_review_packet / researchHypothesisId mismatch",
            warnings: []
          };
        }

        if (packet.status === "failed") {
          return {
            status: "rejected_lifecycle",
            researchReviewPacketId: packet.id,
            setupFamilyId: packet.setupFamilyId,
            setupRevisionId: packet.setupRevisionId,
            researchHypothesisId: packet.hypothesisId,
            reason: "research_review_packet in failed state is not eligible for decision application",
            warnings: []
          };
        }

        if (packet.status === "insufficient_context" && command.decisionOutcome === "accepted") {
          return {
            status: "rejected_lifecycle",
            researchReviewPacketId: packet.id,
            setupFamilyId: packet.setupFamilyId,
            setupRevisionId: packet.setupRevisionId,
            researchHypothesisId: packet.hypothesisId,
            decisionOutcome: command.decisionOutcome,
            reason: "accepted outcome is not allowed for insufficient_context review packets",
            warnings: packet.warnings
          };
        }

        const decision: ResearchReviewDecision = {
          id: buildDecisionId(command),
          researchReviewPacketId: packet.id,
          setupFamilyId: packet.setupFamilyId,
          setupRevisionId: command.setupRevisionId ?? packet.setupRevisionId,
          researchHypothesisId: command.researchHypothesisId ?? packet.hypothesisId,
          reviewedBy: command.reviewedBy,
          reviewedAt: command.reviewedAt,
          decisionOutcome: command.decisionOutcome,
          reviewerNotes: command.reviewerNotes,
          authorizedNextAction: nextActionResolution.resolvedAction,
          decisionStatus: "recorded",
          createdAt: command.reviewedAt,
          updatedAt: buildUpdateTimestamp(metadata)
        };

        const persisted = await researchReviewDecisionRepository.create({
          decision,
          metadata
        });

        return {
          status: "recorded",
          researchReviewDecisionId: persisted.id,
          researchReviewPacketId: persisted.researchReviewPacketId,
          setupFamilyId: persisted.setupFamilyId,
          setupRevisionId: persisted.setupRevisionId,
          researchHypothesisId: persisted.researchHypothesisId,
          decisionOutcome: persisted.decisionOutcome,
          authorizedNextAction: persisted.authorizedNextAction,
          warnings: packet.warnings
        };
      } catch (error: unknown) {
        return {
          status: "failed",
          researchReviewPacketId: request.command.researchReviewPacketId,
          setupFamilyId: request.command.setupFamilyId,
          setupRevisionId: request.command.setupRevisionId,
          researchHypothesisId: request.command.researchHypothesisId,
          decisionOutcome: request.command.decisionOutcome,
          reason: asErrorMessage(error),
          warnings: [
            "review decision application can be retried after resolving decision recording failure"
          ]
        };
      }
    }
  };
};
