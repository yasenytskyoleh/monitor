import type {
  CreateSetupRefinementRequestCommand,
  ProductRecordMetadata,
  ResearchDecisionApproval,
  SetupRefinementRequestResult
} from "@monitor/domain-model";

import type {
  ApprovedRefinementRequest,
  ApprovedRefinementRuntime,
  ApprovedRefinementRuntimeOptions
} from "./types.js";

const reject = (reason: string, request?: ApprovedRefinementRequest): SetupRefinementRequestResult => ({
  status: "rejected_validation",
  ...(request ? { researchDecisionApprovalId: request.researchDecisionApprovalId } : {}),
  reason,
  warnings: []
});

const isValidRequest = (request: ApprovedRefinementRequest): boolean =>
  request.researchDecisionApprovalId.trim().length > 0 &&
  request.requestedBy.trim().length > 0 &&
  request.requestedAt.trim().length > 0 &&
  Number.isFinite(Date.parse(request.requestedAt)) &&
  request.refinementRationaleSummary.trim().length > 0 &&
  request.requestedChangesSummary.trim().length > 0;

const buildCommand = (
  approval: ResearchDecisionApproval,
  request: ApprovedRefinementRequest
): CreateSetupRefinementRequestCommand => ({
  researchDecisionApprovalId: approval.id,
  researchFeedbackDecisionId: approval.researchFeedbackDecisionId,
  setupDefinitionId: approval.setupDefinitionId,
  approvedAction: "refine_definition",
  requestedBy: request.requestedBy,
  requestedAt: request.requestedAt,
  refinementRationaleSummary: request.refinementRationaleSummary,
  requestedChangesSummary: request.requestedChangesSummary,
  ...(request.evidenceReferences ? { evidenceReferences: request.evidenceReferences } : {})
});

const buildMetadata = (
  approval: ResearchDecisionApproval,
  requestedAt: string
): ProductRecordMetadata => ({
  originRunId: null,
  originTransitionId: null,
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: approval.id,
  sourceObservedAtUtc: requestedAt,
  notes: `approved setup refinement follow-up: researchDecisionApproval=${approval.id}`
});

export const createApprovedRefinementRuntime = (
  options: ApprovedRefinementRuntimeOptions
): ApprovedRefinementRuntime => ({
  async createFromApprovedAction(request): Promise<SetupRefinementRequestResult> {
    if (!isValidRequest(request)) {
      return reject(
        "researchDecisionApprovalId, requestedBy, valid requestedAt, refinementRationaleSummary, and requestedChangesSummary are required"
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
          approvedAction: "refine_definition",
          reason: `approval outcome does not authorize setup refinement follow-up: ${approval.approvalOutcome}`,
          warnings: []
        };
      }
      if (approval.authorizedNextAction !== "refine_definition") {
        return {
          status: "rejected_lifecycle",
          researchDecisionApprovalId: approval.id,
          researchFeedbackDecisionId: approval.researchFeedbackDecisionId,
          setupDefinitionId: approval.setupDefinitionId,
          approvedAction: "refine_definition",
          reason: `research_decision_approval does not authorize refine_definition action: ${approval.authorizedNextAction ?? "none"}`,
          warnings: []
        };
      }

      return await options.approvedRefinementHandoff.create(
        buildCommand(approval, request),
        buildMetadata(approval, request.requestedAt)
      );
    } catch (error: unknown) {
      return {
        status: "failed",
        researchDecisionApprovalId: request.researchDecisionApprovalId,
        reason: error instanceof Error ? error.message : "unexpected approved refinement failure",
        warnings: ["approved refinement follow-up can be retried after resolving runtime failure"]
      };
    }
  }
});
