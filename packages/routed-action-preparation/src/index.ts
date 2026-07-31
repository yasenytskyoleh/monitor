import type {
  DownstreamActionExecutionPreparationService,
  ProductRecordMetadata,
  ReviewDecisionRoutingResult,
  ReviewDecisionRoutingResultRepository,
  RoutedActionExecutionResult,
  RoutedActionTargetEntityRefs,
} from "@monitor/domain-model";

export type PrepareRoutedActionRequest = {
  reviewDecisionRoutingResultId: string;
  targetEntityRefs: Omit<RoutedActionTargetEntityRefs, "setupFamilyId">;
  preparedBy: string;
  preparedAt: string;
  originRunId?: string;
};

export type RoutedActionPreparationRuntimeOptions = {
  reviewDecisionRoutingResultRepository: Pick<ReviewDecisionRoutingResultRepository, "getById">;
  preparationService: Pick<DownstreamActionExecutionPreparationService, "prepare">;
};

export type RoutedActionPreparationRuntime = {
  prepare(request: PrepareRoutedActionRequest): Promise<RoutedActionExecutionResult>;
};

export const createRoutedActionPreparationRuntime = (
  options: RoutedActionPreparationRuntimeOptions,
): RoutedActionPreparationRuntime => ({
  async prepare(request: PrepareRoutedActionRequest): Promise<RoutedActionExecutionResult> {
    if (!isValidRequest(request)) {
      return createRejectedOutcome("routing result, target references, preparer, and valid timestamp are required");
    }

    try {
      const routingResult = await options.reviewDecisionRoutingResultRepository.getById(
        request.reviewDecisionRoutingResultId,
      );
      if (!routingResult) {
        return createRejectedOutcome(
          `review_decision_routing_result not found: ${request.reviewDecisionRoutingResultId}`,
          request,
        );
      }

      const command = buildCommand(routingResult, request);
      if (!command) {
        return createRejectedOutcome("routing result is missing executable route context", request);
      }

      return await options.preparationService.prepare({
        command,
        metadata: buildMetadata(routingResult, request),
      });
    } catch (error: unknown) {
      return createFailedOutcome(error, request);
    }
  },
});

const createRejectedOutcome = (
  reason: string,
  request?: PrepareRoutedActionRequest,
): RoutedActionExecutionResult => ({
  status: "rejected_validation",
  ...(request ? { reviewDecisionRoutingResultId: request.reviewDecisionRoutingResultId } : {}),
  reason,
  warnings: [],
});

const createFailedOutcome = (
  error: unknown,
  request: PrepareRoutedActionRequest,
): RoutedActionExecutionResult => ({
  status: "failed",
  reviewDecisionRoutingResultId: request.reviewDecisionRoutingResultId,
  reason: error instanceof Error ? error.message : "unexpected routed action preparation runtime failure",
  warnings: ["routed action preparation can be retried after resolving runtime failure"],
});

const buildCommand = (
  routingResult: ReviewDecisionRoutingResult,
  request: PrepareRoutedActionRequest,
) => {
  if (!routingResult.researchReviewDecisionId || !routingResult.setupFamilyId || !routingResult.target) {
    return null;
  }

  return {
    reviewDecisionRoutingResultId: request.reviewDecisionRoutingResultId,
    researchReviewDecisionId: routingResult.researchReviewDecisionId,
    downstreamActionTarget: routingResult.target,
    targetEntityRefs: {
      setupFamilyId: routingResult.setupFamilyId,
      ...request.targetEntityRefs,
    },
    preparedBy: request.preparedBy,
    preparedAt: request.preparedAt,
    ...(request.originRunId ? { originRunId: request.originRunId } : {}),
    routeMetadataSnapshot: {
      routeStatus: routingResult.status,
      ...(routingResult.routedAt ? { routedAt: routingResult.routedAt } : {}),
      ...(routingResult.decisionOutcome
        ? { decisionOutcome: routingResult.decisionOutcome }
        : {}),
      ...(routingResult.authorizedNextAction
        ? { authorizedNextAction: routingResult.authorizedNextAction }
        : {}),
      ...(routingResult.downstreamCommandType
        ? { downstreamCommandType: routingResult.downstreamCommandType }
        : {}),
    },
  };
};

const buildMetadata = (
  routingResult: ReviewDecisionRoutingResult,
  request: PrepareRoutedActionRequest,
): ProductRecordMetadata => ({
  originRunId: request.originRunId ?? null,
  originTransitionId: null,
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: routingResult.routingId ?? request.reviewDecisionRoutingResultId,
  sourceObservedAtUtc: request.preparedAt,
  notes: `routed action preparation: routing=${request.reviewDecisionRoutingResultId}`,
});

const isValidRequest = (request: PrepareRoutedActionRequest): boolean =>
  Boolean(
    request.reviewDecisionRoutingResultId.trim() &&
      request.preparedBy.trim() &&
      request.preparedAt.trim() &&
      Number.isFinite(Date.parse(request.preparedAt)) &&
      Object.values(request.targetEntityRefs).every(
        (value) => value === undefined || value.trim().length > 0,
      ),
  );
