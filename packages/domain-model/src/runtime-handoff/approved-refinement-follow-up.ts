import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";
import type { ResearchDecisionApprovalRepository } from "../repositories/research-decision-approval-repository.js";
import type { SetupDefinitionRepository } from "../repositories/setup-definition-repository.js";
import {
  ResearchHypothesisValidationError,
  type CreateRefinementRequest,
  type ResearchService
} from "../services/research-service.js";
import type {
  CreateSetupRefinementRequestCommand,
  SetupRefinementRequestResult
} from "../review/index.js";

export type ApprovedRefinementFollowUpDependencies = {
  researchService: Pick<ResearchService, "createRefinementRequest">;
  researchDecisionApprovalRepository: Pick<ResearchDecisionApprovalRepository, "getById">;
  setupDefinitionRepository: Pick<SetupDefinitionRepository, "getById">;
};

const assertRequired = (value: string | undefined, fieldName: string): void => {
  if (!value || !value.trim()) {
    throw new Error(`${fieldName} is required`);
  }
};

const asErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "unexpected setup refinement follow-up failure";

export const createApprovedRefinementFollowUpHandoff = (
  dependencies: ApprovedRefinementFollowUpDependencies
): {
  create(
    command: CreateSetupRefinementRequestCommand,
    metadata: ProductRecordMetadata
  ): Promise<SetupRefinementRequestResult>;
} => {
  const {
    researchService,
    researchDecisionApprovalRepository,
    setupDefinitionRepository
  } = dependencies;

  return {
    async create(command, metadata): Promise<SetupRefinementRequestResult> {
      let validatedCommand: CreateRefinementRequest | null = null;
      try {
        assertRequired(command.researchDecisionApprovalId, "researchDecisionApprovalId");
        assertRequired(command.researchFeedbackDecisionId, "researchFeedbackDecisionId");
        assertRequired(command.setupDefinitionId, "setupDefinitionId");
        assertRequired(command.approvedAction, "approvedAction");
        assertRequired(command.requestedBy, "requestedBy");
        assertRequired(command.requestedAt, "requestedAt");
        assertRequired(command.refinementRationaleSummary, "refinementRationaleSummary");
        assertRequired(command.requestedChangesSummary, "requestedChangesSummary");

        if (command.approvedAction !== "refine_definition") {
          return {
            status: "rejected_validation",
            reason: `approvedAction does not authorize refinement follow-up: ${command.approvedAction}`,
            warnings: []
          };
        }

        const approval = await researchDecisionApprovalRepository.getById(
          command.researchDecisionApprovalId
        );
        if (!approval) {
          return {
            status: "rejected_validation",
            reason: `research_decision_approval not found: ${command.researchDecisionApprovalId}`,
            warnings: []
          };
        }

        if (approval.approvalOutcome !== "approved") {
          return {
            status: "rejected_lifecycle",
            researchDecisionApprovalId: approval.id,
            setupDefinitionId: approval.setupDefinitionId,
            researchFeedbackDecisionId: approval.researchFeedbackDecisionId,
            approvedAction: command.approvedAction,
            reason: `approval outcome does not authorize setup refinement follow-up: ${approval.approvalOutcome}`,
            warnings: []
          };
        }

        if (approval.authorizedNextAction !== "refine_definition") {
          return {
            status: "rejected_lifecycle",
            researchDecisionApprovalId: approval.id,
            setupDefinitionId: approval.setupDefinitionId,
            researchFeedbackDecisionId: approval.researchFeedbackDecisionId,
            approvedAction: command.approvedAction,
            reason: `research_decision_approval does not authorize refine_definition action: ${approval.authorizedNextAction ?? "none"}`,
            warnings: []
          };
        }

        if (approval.researchFeedbackDecisionId !== command.researchFeedbackDecisionId) {
          return {
            status: "rejected_validation",
            researchDecisionApprovalId: approval.id,
            setupDefinitionId: approval.setupDefinitionId,
            researchFeedbackDecisionId: approval.researchFeedbackDecisionId,
            approvedAction: command.approvedAction,
            reason: "research_decision_approval / research_feedback_decision mismatch in refinement command",
            warnings: []
          };
        }

        if (approval.setupDefinitionId !== command.setupDefinitionId) {
          return {
            status: "rejected_validation",
            researchDecisionApprovalId: approval.id,
            setupDefinitionId: approval.setupDefinitionId,
            researchFeedbackDecisionId: approval.researchFeedbackDecisionId,
            approvedAction: command.approvedAction,
            reason: "research_decision_approval / setup_definition mismatch in refinement command",
            warnings: []
          };
        }

        const setupDefinition = await setupDefinitionRepository.getById(command.setupDefinitionId);
        if (!setupDefinition) {
          return {
            status: "rejected_validation",
            researchDecisionApprovalId: approval.id,
            researchFeedbackDecisionId: approval.researchFeedbackDecisionId,
            approvedAction: command.approvedAction,
            reason: `setup_definition not found: ${command.setupDefinitionId}`,
            warnings: []
          };
        }

        validatedCommand = {
          researchDecisionApprovalId: command.researchDecisionApprovalId,
          researchFeedbackDecisionId: command.researchFeedbackDecisionId,
          setupDefinitionId: command.setupDefinitionId,
          approvedAction: command.approvedAction,
          requestedBy: command.requestedBy,
          requestedAt: command.requestedAt,
          refinementRationaleSummary: command.refinementRationaleSummary,
          requestedChangesSummary: command.requestedChangesSummary,
          evidenceReferences: command.evidenceReferences,
          originRunId: command.originRunId,
          sourceMetadata: command.sourceMetadata,
          metadata,
          expectedVersion: null
        };

        const created = await researchService.createRefinementRequest(validatedCommand);
        if (!created) {
          return {
            status: "rejected_validation",
            researchDecisionApprovalId: command.researchDecisionApprovalId,
            researchFeedbackDecisionId: command.researchFeedbackDecisionId,
            setupDefinitionId: command.setupDefinitionId,
            approvedAction: command.approvedAction,
            reason: `refinement request target not found for setup_definition: ${command.setupDefinitionId}`,
            warnings: []
          };
        }

        return {
          status: "created",
          setupRefinementRequestId: created.request.id,
          setupDefinitionId: created.request.setupDefinitionId,
          researchDecisionApprovalId: created.request.sourceResearchDecisionApprovalId,
          researchFeedbackDecisionId: created.request.sourceResearchFeedbackDecisionId,
          approvedAction: command.approvedAction,
          refinementStatus: created.request.status,
          warnings: []
        };
      } catch (error: unknown) {
        if (!validatedCommand) {
          return {
            status: "rejected_validation",
            reason: asErrorMessage(error),
            warnings: []
          };
        }

        if (error instanceof ResearchHypothesisValidationError) {
          return {
            status: "rejected_validation",
            researchDecisionApprovalId: validatedCommand.researchDecisionApprovalId,
            researchFeedbackDecisionId: validatedCommand.researchFeedbackDecisionId,
            setupDefinitionId: validatedCommand.setupDefinitionId,
            approvedAction: validatedCommand.approvedAction,
            reason: error.message,
            warnings: []
          };
        }

        return {
          status: "failed",
          researchDecisionApprovalId: validatedCommand.researchDecisionApprovalId,
          researchFeedbackDecisionId: validatedCommand.researchFeedbackDecisionId,
          setupDefinitionId: validatedCommand.setupDefinitionId,
          approvedAction: validatedCommand.approvedAction,
          reason: asErrorMessage(error),
          warnings: [
            "setup refinement follow-up can be retried after resolving refinement request creation failure"
          ]
        };
      }
    }
  };
};
