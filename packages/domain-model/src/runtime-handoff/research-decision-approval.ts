import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";
import type { SetupDefinitionRepository } from "../repositories/setup-definition-repository.js";
import type { ResearchFeedbackDecisionRepository } from "../repositories/research-feedback-decision-repository.js";
import {
  ResearchHypothesisValidationError,
  type ResearchService
} from "../services/research-service.js";
import {
  RESEARCH_DECISION_APPROVAL_OUTCOMES,
  type ResearchDecisionApprovalResult,
  type ReviewResearchDecisionCommand
} from "../review/index.js";

export type ResearchDecisionApprovalHandoffDependencies = {
  researchService: Pick<ResearchService, "approveFeedbackDecision">;
  setupDefinitionRepository: Pick<SetupDefinitionRepository, "getById">;
  researchFeedbackDecisionRepository: Pick<ResearchFeedbackDecisionRepository, "getById">;
};

const assertRequired = (value: string | undefined, fieldName: string): void => {
  if (!value || !value.trim()) {
    throw new Error(`${fieldName} is required`);
  }
};

const asErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "unexpected research decision approval failure";

export const createResearchDecisionApprovalHandoff = (
  dependencies: ResearchDecisionApprovalHandoffDependencies
): {
  review(
    command: ReviewResearchDecisionCommand,
    metadata: ProductRecordMetadata
  ): Promise<ResearchDecisionApprovalResult>;
} => {
  const {
    researchService,
    setupDefinitionRepository,
    researchFeedbackDecisionRepository
  } = dependencies;

  return {
    async review(command, metadata): Promise<ResearchDecisionApprovalResult> {
      let reviewedCommand: ReviewResearchDecisionCommand | null = null;
      try {
        assertRequired(command.researchFeedbackDecisionId, "researchFeedbackDecisionId");
        assertRequired(command.setupDefinitionId, "setupDefinitionId");
        assertRequired(command.reviewedBy, "reviewedBy");
        assertRequired(command.reviewedAt, "reviewedAt");

        if (!RESEARCH_DECISION_APPROVAL_OUTCOMES.includes(command.decisionOutcome)) {
          return {
            status: "rejected_validation",
            reason: `invalid decisionOutcome: ${command.decisionOutcome}`,
            warnings: []
          };
        }

        const feedbackDecision = await researchFeedbackDecisionRepository.getById(
          command.researchFeedbackDecisionId
        );
        if (!feedbackDecision) {
          return {
            status: "rejected_validation",
            reason: `research_feedback_decision not found: ${command.researchFeedbackDecisionId}`,
            warnings: []
          };
        }

        if (feedbackDecision.setupDefinitionId !== command.setupDefinitionId) {
          return {
            status: "rejected_validation",
            researchFeedbackDecisionId: feedbackDecision.id,
            setupDefinitionId: feedbackDecision.setupDefinitionId,
            reason: "research_feedback_decision / setup_definition mismatch in approval command",
            warnings: []
          };
        }

        const setupDefinition = await setupDefinitionRepository.getById(command.setupDefinitionId);
        if (!setupDefinition) {
          return {
            status: "rejected_validation",
            researchFeedbackDecisionId: feedbackDecision.id,
            reason: `setup_definition not found: ${command.setupDefinitionId}`,
            warnings: []
          };
        }

        if (feedbackDecision.decisionStatus !== "proposed") {
          return {
            status: "rejected_lifecycle",
            researchFeedbackDecisionId: feedbackDecision.id,
            setupDefinitionId: setupDefinition.id,
            reason: `research_feedback_decision is not eligible for manual approval: ${feedbackDecision.decisionStatus}`,
            warnings: []
          };
        }

        reviewedCommand = command;

        const approval = await researchService.approveFeedbackDecision({
          researchFeedbackDecisionId: command.researchFeedbackDecisionId,
          setupDefinitionId: command.setupDefinitionId,
          reviewedBy: command.reviewedBy,
          reviewedAt: command.reviewedAt,
          decisionOutcome: command.decisionOutcome,
          reviewerNotes: command.reviewerNotes,
          originRunId: command.originRunId,
          metadata
        });

        if (!approval) {
          return {
            status: "rejected_validation",
            reason: `research_feedback_decision not found: ${command.researchFeedbackDecisionId}`,
            warnings: []
          };
        }

        return {
          status: "recorded",
          researchDecisionApprovalId: approval.approval.id,
          researchFeedbackDecisionId: approval.approval.researchFeedbackDecisionId,
          setupDefinitionId: approval.approval.setupDefinitionId,
          approvalOutcome: approval.approval.approvalOutcome,
          decisionStatus: approval.decision.decisionStatus,
          authorizedNextAction: approval.approval.authorizedNextAction,
          warnings: []
        };
      } catch (error: unknown) {
        if (!reviewedCommand) {
          return {
            status: "rejected_validation",
            reason: asErrorMessage(error),
            warnings: []
          };
        }

        if (error instanceof ResearchHypothesisValidationError) {
          return {
            status: "rejected_validation",
            researchFeedbackDecisionId: reviewedCommand.researchFeedbackDecisionId,
            setupDefinitionId: reviewedCommand.setupDefinitionId,
            reason: error.message,
            warnings: []
          };
        }

        return {
          status: "failed",
          researchFeedbackDecisionId: reviewedCommand.researchFeedbackDecisionId,
          setupDefinitionId: reviewedCommand.setupDefinitionId,
          reason: asErrorMessage(error),
          warnings: [
            "manual approval can be retried after resolving research decision approval failure"
          ]
        };
      }
    }
  };
};
