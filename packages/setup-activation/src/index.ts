import type {
  ActivateSetupDefinitionRevisionCommand,
  ProductRecordMetadata,
  SetupDefinitionRevision,
  SetupDefinitionRevisionRepository,
  SetupRevisionActivationResult
} from "@monitor/domain-model";

export type SetupRevisionActivationRequest = Pick<
  ActivateSetupDefinitionRevisionCommand,
  "targetRevisionId" | "activatedBy" | "activatedAt" | "rationale" | "previousActiveRevisionId"
>;

export type SetupRevisionActivationHandoff = {
  activate(
    command: ActivateSetupDefinitionRevisionCommand,
    metadata: ProductRecordMetadata
  ): Promise<SetupRevisionActivationResult>;
};

export const createSetupRevisionActivationRuntime = (options: {
  setupDefinitionRevisionRepository: Pick<SetupDefinitionRevisionRepository, "getById">;
  setupRevisionActivationHandoff: SetupRevisionActivationHandoff;
}) => ({
  async activate(request: SetupRevisionActivationRequest): Promise<SetupRevisionActivationResult> {
    if (!request.targetRevisionId.trim() || !request.activatedBy.trim() || !request.activatedAt.trim() || !Number.isFinite(Date.parse(request.activatedAt))) {
      return { status: "rejected", reason: "targetRevisionId, activatedBy, and valid activatedAt are required", warnings: [] };
    }
    try {
      const revision = await options.setupDefinitionRevisionRepository.getById(request.targetRevisionId);
      if (!revision) {
        return { status: "rejected", targetRevisionId: request.targetRevisionId, reason: `setup_definition_revision not found: ${request.targetRevisionId}`, warnings: [] };
      }
      return await options.setupRevisionActivationHandoff.activate(
        buildCommand(revision, request),
        buildMetadata(revision, request.activatedAt)
      );
    } catch (error: unknown) {
      return { status: "failed", targetRevisionId: request.targetRevisionId, reason: error instanceof Error ? error.message : "unexpected setup revision activation failure", warnings: ["setup revision activation can be retried after resolving runtime failure"] };
    }
  }
});

const buildCommand = (revision: SetupDefinitionRevision, request: SetupRevisionActivationRequest): ActivateSetupDefinitionRevisionCommand => ({
  ...request,
  setupDefinitionId: revision.setupDefinitionId,
  setupFamilyId: revision.versionInfo.setupFamilyId
});

const buildMetadata = (revision: SetupDefinitionRevision, activatedAt: string): ProductRecordMetadata => ({
  originRunId: null, originTransitionId: null, createdBySource: "manual_curation", lastUpdatedBySource: "manual_curation", traceId: revision.id, sourceObservedAtUtc: activatedAt, notes: `setup revision activation: targetRevision=${revision.id}`
});
