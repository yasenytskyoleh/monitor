import type {
  CreateSetupRefinementRequestCommand,
  DownstreamActionExecutor,
  DownstreamActionExecutorOutcome,
  ProductRecordMetadata,
  ResearchDecisionApprovalRepository,
  RoutedActionExecutionEnvelope,
  SetupRefinementRequestResult
} from "@monitor/domain-model";

export type SetupRefinementHandoff = {
  create(
    command: CreateSetupRefinementRequestCommand,
    metadata: ProductRecordMetadata
  ): Promise<SetupRefinementRequestResult>;
};

export type RefinementEnvelopeExecutorOptions = {
  researchDecisionApprovalRepository: Pick<ResearchDecisionApprovalRepository, "getById">;
  setupRefinementHandoff: SetupRefinementHandoff;
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasValidEvidenceReferences = (value: unknown): value is string[] | undefined =>
  value === undefined || (Array.isArray(value) && value.every(isNonEmptyString));

const refinementPayload = (envelope: RoutedActionExecutionEnvelope) => {
  const targetEntityRefs = envelope.targetEntityRefs as unknown;
  const executionPayloadSnapshot = envelope.executionPayloadSnapshot as unknown;
  if (
    envelope.executionStatus !== "prepared" ||
    envelope.actionTarget !== "create_setup_refinement_request" ||
    envelope.actionCommandType !== "CreateSetupRefinementRequestCommand" ||
    !isRecord(targetEntityRefs) ||
    !isRecord(executionPayloadSnapshot) ||
    executionPayloadSnapshot.commandType !== "CreateSetupRefinementRequestCommand" ||
    executionPayloadSnapshot.target !== "create_setup_refinement_request"
  ) {
    return null;
  }

  const payload = executionPayloadSnapshot.commandInput;
  if (
    !isRecord(payload) ||
    !isNonEmptyString(payload.setupDefinitionId) ||
    !isNonEmptyString(payload.setupFamilyId) ||
    !isNonEmptyString(payload.sourceReviewDecisionId) ||
    !isNonEmptyString(payload.sourceRoutingResultId) ||
    !isNonEmptyString(payload.requestedBy) ||
    !isNonEmptyString(payload.requestedAt) ||
    !Number.isFinite(Date.parse(payload.requestedAt)) ||
    !isNonEmptyString(payload.refinementRationaleSummary) ||
    !isNonEmptyString(payload.requestedChangesSummary) ||
    !hasValidEvidenceReferences(payload.evidenceReferences) ||
    !isNonEmptyString(targetEntityRefs.researchDecisionApprovalId) ||
    (targetEntityRefs.researchFeedbackDecisionId !== undefined &&
      !isNonEmptyString(targetEntityRefs.researchFeedbackDecisionId))
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
    approvalId: targetEntityRefs.researchDecisionApprovalId,
    researchFeedbackDecisionId: targetEntityRefs.researchFeedbackDecisionId,
    requestedBy: payload.requestedBy,
    requestedAt: payload.requestedAt,
    refinementRationaleSummary: payload.refinementRationaleSummary,
    requestedChangesSummary: payload.requestedChangesSummary,
    ...(payload.evidenceReferences ? { evidenceReferences: payload.evidenceReferences } : {})
  };
};

const metadataFor = (
  envelope: RoutedActionExecutionEnvelope,
  requestedAt: string
): ProductRecordMetadata => ({
  originRunId: envelope.originRunId ?? null,
  originTransitionId: null,
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: envelope.id,
  sourceObservedAtUtc: requestedAt,
  notes: `refinement envelope execution: envelope=${envelope.id}`
});

export const createRefinementEnvelopeExecutor = (
  options: RefinementEnvelopeExecutorOptions
): DownstreamActionExecutor => ({
  async execute(envelope: RoutedActionExecutionEnvelope): Promise<DownstreamActionExecutorOutcome> {
    const payload = refinementPayload(envelope);
    if (!payload) {
      return { status: "rejected", outcomeCode: "invalid_refinement_envelope" };
    }

    const approval = await options.researchDecisionApprovalRepository.getById(payload.approvalId);
    if (!approval) {
      return { status: "rejected", outcomeCode: "setup_refinement_approval_not_found" };
    }
    if (
      approval.setupDefinitionId !== payload.setupDefinitionId ||
      (payload.researchFeedbackDecisionId !== undefined &&
        approval.researchFeedbackDecisionId !== payload.researchFeedbackDecisionId)
    ) {
      return { status: "rejected", outcomeCode: "setup_refinement_approval_mismatch" };
    }
    if (approval.approvalOutcome !== "approved" || approval.authorizedNextAction !== "refine_definition") {
      return { status: "rejected", outcomeCode: "setup_refinement_action_not_authorized" };
    }

    const result = await options.setupRefinementHandoff.create(
      {
        researchDecisionApprovalId: approval.id,
        researchFeedbackDecisionId: approval.researchFeedbackDecisionId,
        setupDefinitionId: approval.setupDefinitionId,
        approvedAction: "refine_definition",
        requestedBy: payload.requestedBy,
        requestedAt: payload.requestedAt,
        refinementRationaleSummary: payload.refinementRationaleSummary,
        requestedChangesSummary: payload.requestedChangesSummary,
        ...(payload.evidenceReferences ? { evidenceReferences: payload.evidenceReferences } : {}),
        ...(envelope.originRunId ? { originRunId: envelope.originRunId } : {})
      },
      metadataFor(envelope, payload.requestedAt)
    );

    if (result.status === "failed") {
      throw new Error(result.reason ?? "setup refinement creation failed");
    }
    if (result.status !== "created") {
      return { status: "rejected", outcomeCode: "setup_refinement_rejected" };
    }

    return { status: "executed", outcomeCode: "setup_refinement_created" };
  }
});
