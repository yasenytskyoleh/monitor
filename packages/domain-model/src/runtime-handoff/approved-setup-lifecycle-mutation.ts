import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";
import type { ResearchDecisionApprovalRepository } from "../repositories/research-decision-approval-repository.js";
import type { SetupDefinitionRepository } from "../repositories/setup-definition-repository.js";
import {
  SetupDefinitionValidationError,
  type ApplyApprovedMutationRequest,
  type SetupDefinitionService
} from "../services/setup-definition-service.js";
import {
  APPROVED_SETUP_LIFECYCLE_ACTIONS,
  type ApplyApprovedSetupMutationCommand,
  type SetupLifecycleMutationResult
} from "../review/index.js";

export type ApprovedSetupLifecycleMutationDependencies = {
  setupDefinitionService: Pick<SetupDefinitionService, "applyApprovedMutation">;
  researchDecisionApprovalRepository: Pick<ResearchDecisionApprovalRepository, "getById">;
  setupDefinitionRepository: Pick<SetupDefinitionRepository, "getById">;
};

const assertRequired = (value: string | undefined, fieldName: string): void => {
  if (!value || !value.trim()) {
    throw new Error(`${fieldName} is required`);
  }
};

const asErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "unexpected approved setup lifecycle mutation failure";

export const createApprovedSetupLifecycleMutationHandoff = (
  dependencies: ApprovedSetupLifecycleMutationDependencies
): {
  apply(
    command: ApplyApprovedSetupMutationCommand,
    metadata: ProductRecordMetadata
  ): Promise<SetupLifecycleMutationResult>;
} => {
  const {
    setupDefinitionService,
    researchDecisionApprovalRepository,
    setupDefinitionRepository
  } = dependencies;

  return {
    async apply(command, metadata): Promise<SetupLifecycleMutationResult> {
      let validatedCommand: ApplyApprovedMutationRequest | null = null;
      try {
        assertRequired(command.researchDecisionApprovalId, "researchDecisionApprovalId");
        assertRequired(command.researchFeedbackDecisionId, "researchFeedbackDecisionId");
        assertRequired(command.setupDefinitionId, "setupDefinitionId");
        assertRequired(command.mutatedBy, "mutatedBy");
        assertRequired(command.mutatedAt, "mutatedAt");

        if (!APPROVED_SETUP_LIFECYCLE_ACTIONS.includes(command.approvedAction)) {
          return {
            status: "rejected_validation",
            reason: `invalid approvedAction: ${command.approvedAction}`,
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
            reason: `approval outcome does not authorize setup lifecycle mutation: ${approval.approvalOutcome}`,
            warnings: []
          };
        }

        if (approval.researchFeedbackDecisionId !== command.researchFeedbackDecisionId) {
          return {
            status: "rejected_validation",
            researchDecisionApprovalId: approval.id,
            setupDefinitionId: approval.setupDefinitionId,
            researchFeedbackDecisionId: approval.researchFeedbackDecisionId,
            reason: "research_decision_approval / research_feedback_decision mismatch in mutation command",
            warnings: []
          };
        }

        if (approval.setupDefinitionId !== command.setupDefinitionId) {
          return {
            status: "rejected_validation",
            researchDecisionApprovalId: approval.id,
            setupDefinitionId: approval.setupDefinitionId,
            researchFeedbackDecisionId: approval.researchFeedbackDecisionId,
            reason: "research_decision_approval / setup_definition mismatch in mutation command",
            warnings: []
          };
        }

        const setupDefinition = await setupDefinitionRepository.getById(command.setupDefinitionId);
        if (!setupDefinition) {
          return {
            status: "rejected_validation",
            researchDecisionApprovalId: approval.id,
            researchFeedbackDecisionId: approval.researchFeedbackDecisionId,
            reason: `setup_definition not found: ${command.setupDefinitionId}`,
            warnings: []
          };
        }

        validatedCommand = {
          researchDecisionApprovalId: command.researchDecisionApprovalId,
          researchFeedbackDecisionId: command.researchFeedbackDecisionId,
          setupDefinitionId: command.setupDefinitionId,
          approvedAction: command.approvedAction,
          mutatedBy: command.mutatedBy,
          mutatedAt: command.mutatedAt,
          notes: command.notes,
          originRunId: command.originRunId,
          metadata,
          expectedVersion: null
        };

        const applied = await setupDefinitionService.applyApprovedMutation(validatedCommand);
        if (!applied) {
          return {
            status: "rejected_validation",
            researchDecisionApprovalId: command.researchDecisionApprovalId,
            researchFeedbackDecisionId: command.researchFeedbackDecisionId,
            setupDefinitionId: command.setupDefinitionId,
            reason: `mutation target not found for setup_definition: ${command.setupDefinitionId}`,
            warnings: []
          };
        }

        return {
          status: "applied",
          setupLifecycleMutationRecordId: applied.mutationRecord.id,
          setupDefinitionId: applied.updatedSetupDefinition.id,
          researchDecisionApprovalId: applied.mutationRecord.researchDecisionApprovalId,
          researchFeedbackDecisionId: applied.mutationRecord.researchFeedbackDecisionId,
          approvedAction: applied.mutationRecord.approvedAction,
          previousStatus: applied.previousStatus,
          newStatus: applied.newStatus,
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

        if (error instanceof SetupDefinitionValidationError) {
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
            "approved setup lifecycle mutation can be retried after resolving mutation path failure"
          ]
        };
      }
    }
  };
};
