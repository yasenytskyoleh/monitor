import {
  APPROVED_SETUP_LIFECYCLE_ACTIONS,
  type ApplyApprovedSetupMutationCommand,
  type DownstreamActionExecutor,
  type DownstreamActionExecutorOutcome,
  type ProductRecordMetadata,
  type ResearchDecisionApproval,
  type ResearchDecisionApprovalRepository,
  type RoutedActionExecutionEnvelope,
  type SetupLifecycleMutationResult
} from "@monitor/domain-model";

export type SetupLifecycleMutationHandoff = {
  apply(
    command: ApplyApprovedSetupMutationCommand,
    metadata: ProductRecordMetadata
  ): Promise<SetupLifecycleMutationResult>;
};

export type LifecycleEnvelopeExecutorOptions = {
  researchDecisionApprovalRepository: Pick<ResearchDecisionApprovalRepository, "getById">;
  setupLifecycleMutationHandoff: SetupLifecycleMutationHandoff;
  mutatedBy: string;
  now: () => string;
};

const isApprovedLifecycleAction = (
  action: ResearchDecisionApproval["authorizedNextAction"]
): action is ApplyApprovedSetupMutationCommand["approvedAction"] =>
  action !== undefined && APPROVED_SETUP_LIFECYCLE_ACTIONS.some((allowedAction) => allowedAction === action);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const lifecyclePayload = (envelope: RoutedActionExecutionEnvelope) => {
  if (
    envelope.executionStatus !== "prepared" ||
    envelope.actionTarget !== "apply_setup_lifecycle_mutation" ||
    envelope.actionCommandType !== "ApplyApprovedSetupMutationCommand" ||
    envelope.executionPayloadSnapshot.commandType !== "ApplyApprovedSetupMutationCommand" ||
    envelope.executionPayloadSnapshot.target !== "apply_setup_lifecycle_mutation"
  ) {
    return null;
  }

  const payload = envelope.executionPayloadSnapshot.commandInput as unknown;
  if (
    !isRecord(payload) ||
    !isNonEmptyString(payload.setupDefinitionId) ||
    !isNonEmptyString(payload.setupFamilyId) ||
    !isNonEmptyString(payload.sourceReviewDecisionId) ||
    !isNonEmptyString(payload.sourceRoutingResultId)
  ) {
    return null;
  }

  if (
    payload.setupDefinitionId !== envelope.targetEntityRefs.setupDefinitionId ||
    payload.setupFamilyId !== envelope.targetEntityRefs.setupFamilyId ||
    payload.sourceReviewDecisionId !== envelope.sourceReviewDecisionId ||
    payload.sourceRoutingResultId !== envelope.sourceRoutingResultId
  ) {
    return null;
  }

  return {
    setupDefinitionId: payload.setupDefinitionId,
    setupFamilyId: payload.setupFamilyId,
    sourceReviewDecisionId: payload.sourceReviewDecisionId,
    sourceRoutingResultId: payload.sourceRoutingResultId
  };
};

const metadataFor = (
  envelope: RoutedActionExecutionEnvelope,
  mutatedAt: string
): ProductRecordMetadata => ({
  originRunId: envelope.originRunId ?? null,
  originTransitionId: null,
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: envelope.id,
  sourceObservedAtUtc: mutatedAt,
  notes: `lifecycle mutation envelope execution: envelope=${envelope.id}`
});

export const createLifecycleEnvelopeExecutor = (
  options: LifecycleEnvelopeExecutorOptions
): DownstreamActionExecutor => ({
  async execute(envelope: RoutedActionExecutionEnvelope): Promise<DownstreamActionExecutorOutcome> {
    const payload = lifecyclePayload(envelope);
    const approvalId = envelope.targetEntityRefs.researchDecisionApprovalId;
    if (!payload || !approvalId?.trim() || !options.mutatedBy.trim()) {
      return { status: "rejected", outcomeCode: "invalid_lifecycle_envelope" };
    }

    const approval = await options.researchDecisionApprovalRepository.getById(approvalId);
    if (!approval) {
      return { status: "rejected", outcomeCode: "setup_lifecycle_approval_not_found" };
    }
    if (
      approval.setupDefinitionId !== payload.setupDefinitionId ||
      (envelope.targetEntityRefs.researchFeedbackDecisionId !== undefined &&
        approval.researchFeedbackDecisionId !== envelope.targetEntityRefs.researchFeedbackDecisionId)
    ) {
      return { status: "rejected", outcomeCode: "setup_lifecycle_approval_mismatch" };
    }
    if (approval.approvalOutcome !== "approved" || !isApprovedLifecycleAction(approval.authorizedNextAction)) {
      return { status: "rejected", outcomeCode: "setup_lifecycle_action_not_authorized" };
    }

    const mutatedAt = options.now();
    const result = await options.setupLifecycleMutationHandoff.apply(
      {
        researchDecisionApprovalId: approval.id,
        researchFeedbackDecisionId: approval.researchFeedbackDecisionId,
        setupDefinitionId: approval.setupDefinitionId,
        approvedAction: approval.authorizedNextAction,
        mutatedBy: options.mutatedBy,
        mutatedAt,
        notes: `lifecycle mutation from routed envelope ${envelope.id}`,
        ...(envelope.originRunId ? { originRunId: envelope.originRunId } : {})
      },
      metadataFor(envelope, mutatedAt)
    );

    if (result.status === "failed") {
      throw new Error(result.reason ?? "setup lifecycle mutation failed");
    }
    if (result.status !== "applied") {
      return { status: "rejected", outcomeCode: "setup_lifecycle_mutation_rejected" };
    }

    return { status: "executed", outcomeCode: "setup_lifecycle_applied" };
  }
});
