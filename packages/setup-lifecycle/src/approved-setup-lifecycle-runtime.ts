import {
  APPROVED_SETUP_LIFECYCLE_ACTIONS,
  type ApplyApprovedSetupMutationCommand,
  type ProductRecordMetadata,
  type ResearchDecisionApproval,
  type SetupLifecycleMutationResult
} from "@monitor/domain-model";

import type {
  ApprovedSetupLifecycleRequest,
  ApprovedSetupLifecycleRuntime,
  ApprovedSetupLifecycleRuntimeOptions
} from "./types.js";

const isValidRequest = (request: ApprovedSetupLifecycleRequest): boolean =>
  request.researchDecisionApprovalId.trim().length > 0 &&
  request.mutatedBy.trim().length > 0 &&
  request.mutatedAt.trim().length > 0 &&
  Number.isFinite(Date.parse(request.mutatedAt)) &&
  APPROVED_SETUP_LIFECYCLE_ACTIONS.includes(request.approvedAction);

const buildCommand = (
  approval: ResearchDecisionApproval,
  request: ApprovedSetupLifecycleRequest
): ApplyApprovedSetupMutationCommand => ({
  researchDecisionApprovalId: approval.id,
  researchFeedbackDecisionId: approval.researchFeedbackDecisionId,
  setupDefinitionId: approval.setupDefinitionId,
  approvedAction: request.approvedAction,
  mutatedBy: request.mutatedBy,
  mutatedAt: request.mutatedAt,
  ...(request.notes ? { notes: request.notes } : {})
});

const buildMetadata = (
  approval: ResearchDecisionApproval,
  mutatedAt: string
): ProductRecordMetadata => ({
  originRunId: null,
  originTransitionId: null,
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: approval.id,
  sourceObservedAtUtc: mutatedAt,
  notes: `approved setup lifecycle mutation: researchDecisionApproval=${approval.id}`
});

const reject = (reason: string, request?: ApprovedSetupLifecycleRequest): SetupLifecycleMutationResult => ({
  status: "rejected_validation",
  ...(request ? { researchDecisionApprovalId: request.researchDecisionApprovalId } : {}),
  reason,
  warnings: []
});

export const createApprovedSetupLifecycleRuntime = (
  options: ApprovedSetupLifecycleRuntimeOptions
): ApprovedSetupLifecycleRuntime => ({
  async applyFromApprovedAction(request): Promise<SetupLifecycleMutationResult> {
    if (!isValidRequest(request)) {
      return reject(
        "researchDecisionApprovalId, mutatedBy, valid mutatedAt, and approvedAction are required"
      );
    }

    try {
      const approval = await options.researchDecisionApprovalRepository.getById(
        request.researchDecisionApprovalId
      );
      if (!approval) {
        return reject(
          `research_decision_approval not found: ${request.researchDecisionApprovalId}`,
          request
        );
      }
      if (approval.approvalOutcome !== "approved") {
        return {
          status: "rejected_lifecycle",
          researchDecisionApprovalId: approval.id,
          researchFeedbackDecisionId: approval.researchFeedbackDecisionId,
          setupDefinitionId: approval.setupDefinitionId,
          approvedAction: request.approvedAction,
          reason: `approval outcome does not authorize setup lifecycle mutation: ${approval.approvalOutcome}`,
          warnings: []
        };
      }
      if (approval.authorizedNextAction !== request.approvedAction) {
        return {
          status: "rejected_lifecycle",
          researchDecisionApprovalId: approval.id,
          researchFeedbackDecisionId: approval.researchFeedbackDecisionId,
          setupDefinitionId: approval.setupDefinitionId,
          approvedAction: request.approvedAction,
          reason: `research_decision_approval does not authorize lifecycle action: ${request.approvedAction}`,
          warnings: []
        };
      }

      return await options.approvedSetupLifecycleHandoff.apply(
        buildCommand(approval, request),
        buildMetadata(approval, request.mutatedAt)
      );
    } catch (error: unknown) {
      return {
        status: "failed",
        researchDecisionApprovalId: request.researchDecisionApprovalId,
        approvedAction: request.approvedAction,
        reason: error instanceof Error ? error.message : "unexpected approved lifecycle mutation failure",
        warnings: ["approved setup lifecycle mutation can be retried after resolving runtime failure"]
      };
    }
  }
});
