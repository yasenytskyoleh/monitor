import type {
  ActivateSetupDefinitionRevisionCommand,
  DownstreamActionExecutor,
  DownstreamActionExecutorOutcome,
  ProductRecordMetadata,
  RoutedActionExecutionEnvelope,
  SetupDefinitionRevisionRepository,
  SetupRevisionActivationResult,
} from "@monitor/domain-model";

export type SetupRevisionActivationHandoff = {
  activate(
    command: ActivateSetupDefinitionRevisionCommand,
    metadata: ProductRecordMetadata,
  ): Promise<SetupRevisionActivationResult>;
};

export type ActivationEnvelopeExecutorOptions = {
  setupDefinitionRevisionRepository: Pick<SetupDefinitionRevisionRepository, "getById">;
  setupRevisionActivationHandoff: SetupRevisionActivationHandoff;
  activatedBy: string;
  now: () => string;
};

export const createActivationEnvelopeExecutor = (
  options: ActivationEnvelopeExecutorOptions,
): DownstreamActionExecutor => ({
  async execute(envelope: RoutedActionExecutionEnvelope): Promise<DownstreamActionExecutorOutcome> {
    const payload = activationPayload(envelope);
    if (!payload || !options.activatedBy.trim()) {
      return { status: "rejected", outcomeCode: "invalid_activation_envelope" };
    }

    const revision = await options.setupDefinitionRevisionRepository.getById(payload.setupRevisionId);
    if (!revision) {
      return { status: "rejected", outcomeCode: "setup_revision_not_found" };
    }
    if (revision.versionInfo.setupFamilyId !== payload.setupFamilyId) {
      return { status: "rejected", outcomeCode: "setup_revision_family_mismatch" };
    }

    const activatedAt = options.now();
    const result = await options.setupRevisionActivationHandoff.activate(
      {
        setupDefinitionId: revision.setupDefinitionId,
        setupFamilyId: revision.versionInfo.setupFamilyId,
        targetRevisionId: revision.id,
        activatedBy: options.activatedBy,
        activatedAt,
        rationale: `activation from routed envelope ${envelope.id}`,
        ...(envelope.originRunId ? { originRunId: envelope.originRunId } : {}),
      },
      metadataFor(envelope, activatedAt),
    );

    if (result.status === "failed") {
      throw new Error(result.reason ?? "setup revision activation failed");
    }
    if (result.status === "rejected") {
      return { status: "rejected", outcomeCode: "setup_revision_activation_rejected" };
    }

    return { status: "executed", outcomeCode: `setup_revision_${result.status}` };
  },
});

const activationPayload = (envelope: RoutedActionExecutionEnvelope) => {
  if (
    envelope.executionStatus !== "prepared" ||
    envelope.actionTarget !== "activate_setup_revision" ||
    envelope.actionCommandType !== "ActivateSetupDefinitionRevisionCommand" ||
    envelope.executionPayloadSnapshot.target !== "activate_setup_revision"
  ) {
    return null;
  }

  return envelope.executionPayloadSnapshot.commandInput;
};

const metadataFor = (envelope: RoutedActionExecutionEnvelope, activatedAt: string): ProductRecordMetadata => ({
  originRunId: envelope.originRunId ?? null,
  originTransitionId: null,
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: envelope.id,
  sourceObservedAtUtc: activatedAt,
  notes: `activation envelope execution: envelope=${envelope.id}`,
});
