import type {
  CreateSetupDefinitionRevisionCommand,
  ProductRecordMetadata,
  SetupDefinitionRevisionResult,
  SetupRefinementRequest,
  SetupRefinementRequestRepository
} from "@monitor/domain-model";

export type SetupRevisionProposal = Omit<
  CreateSetupDefinitionRevisionCommand,
  "setupDefinitionId"
>;

export type SetupDefinitionRevisionHandoff = {
  create(
    command: CreateSetupDefinitionRevisionCommand,
    metadata: ProductRecordMetadata
  ): Promise<SetupDefinitionRevisionResult>;
};

export type SetupRevisionRuntime = {
  proposeFromRefinement(
    proposal: SetupRevisionProposal
  ): Promise<SetupDefinitionRevisionResult>;
};

export const createSetupRevisionRuntime = (options: {
  setupRefinementRequestRepository: Pick<SetupRefinementRequestRepository, "getById">;
  setupDefinitionRevisionHandoff: SetupDefinitionRevisionHandoff;
}): SetupRevisionRuntime => ({
  async proposeFromRefinement(proposal): Promise<SetupDefinitionRevisionResult> {
    if (
      !proposal.setupRefinementRequestId.trim() ||
      !proposal.requestedBy.trim() ||
      !proposal.requestedAt.trim() ||
      !Number.isFinite(Date.parse(proposal.requestedAt)) ||
      !proposal.revisionSummary.trim() ||
      !proposal.proposedChangedFieldsSummary.trim()
    ) {
      return { status: "rejected_validation", reason: "refinement ID, requester, valid timestamp, revision summary, and changed-fields summary are required", warnings: [] };
    }

    try {
      const refinement = await options.setupRefinementRequestRepository.getById(
        proposal.setupRefinementRequestId
      );
      if (!refinement) {
        return { status: "rejected_validation", setupRefinementRequestId: proposal.setupRefinementRequestId, reason: `setup_refinement_request not found: ${proposal.setupRefinementRequestId}`, warnings: [] };
      }

      return await options.setupDefinitionRevisionHandoff.create(
        { ...proposal, setupDefinitionId: refinement.setupDefinitionId },
        buildMetadata(refinement, proposal.requestedAt)
      );
    } catch (error: unknown) {
      return {
        status: "failed",
        setupRefinementRequestId: proposal.setupRefinementRequestId,
        reason: error instanceof Error ? error.message : "unexpected setup revision proposal failure",
        warnings: ["setup revision proposal can be retried after resolving runtime failure"]
      };
    }
  }
});

const buildMetadata = (
  refinement: SetupRefinementRequest,
  requestedAt: string
): ProductRecordMetadata => ({
  originRunId: null,
  originTransitionId: null,
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: refinement.id,
  sourceObservedAtUtc: requestedAt,
  notes: `setup revision proposal: setupRefinementRequest=${refinement.id}`
});
