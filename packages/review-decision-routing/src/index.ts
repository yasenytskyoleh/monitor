import type {
  ResearchReviewDecision,
  ResearchReviewDecisionRepository,
  ProductRecordMetadata,
  RouteAcceptedReviewDecisionCommand,
  ReviewDecisionRoutingResult,
  ReviewDecisionRoutingResultRepository,
  ReviewDecisionRoutingService,
} from "@monitor/domain-model";

export type RouteReviewDecisionRequest = {
  researchReviewDecisionId: string;
  routedAt: string;
};

export type ReviewDecisionRoutingRuntimeOptions = {
  researchReviewDecisionRepository: Pick<ResearchReviewDecisionRepository, "getById">;
  reviewDecisionRoutingResultRepository: Pick<
    ReviewDecisionRoutingResultRepository,
    "create" | "getById"
  >;
  reviewDecisionRoutingService: Pick<ReviewDecisionRoutingService, "route">;
};

export type ReviewDecisionRoutingRuntime = {
  route(request: RouteReviewDecisionRequest): Promise<ReviewDecisionRoutingResult>;
};

export const createReviewDecisionRoutingRuntime = (
  options: ReviewDecisionRoutingRuntimeOptions,
): ReviewDecisionRoutingRuntime => ({
  async route(request: RouteReviewDecisionRequest): Promise<ReviewDecisionRoutingResult> {
    if (!isValidRequest(request)) {
      return createRejectedOutcome("researchReviewDecisionId and valid routedAt are required");
    }

    try {
      const decision = await options.researchReviewDecisionRepository.getById(
        request.researchReviewDecisionId,
      );
      if (!decision) {
        return createRejectedOutcome(
          `research_review_decision not found: ${request.researchReviewDecisionId}`,
          request,
        );
      }

      const result = await options.reviewDecisionRoutingService.route(buildRouteCommand(decision, request));
      return await persistRoutableResult(options, result, request);
    } catch (error: unknown) {
      return createFailedOutcome(error, request);
    }
  },
});

const persistRoutableResult = async (
  options: ReviewDecisionRoutingRuntimeOptions,
  result: ReviewDecisionRoutingResult,
  request: RouteReviewDecisionRequest,
): Promise<ReviewDecisionRoutingResult> => {
  if ((result.status !== "routed" && result.status !== "no_action") || !result.routingId) {
    return result;
  }

  const existing = await options.reviewDecisionRoutingResultRepository.getById(result.routingId);
  if (existing) {
    return existing;
  }

  return options.reviewDecisionRoutingResultRepository.create({
    result,
    metadata: metadataFor(result.routingId, request),
  });
};

const createRejectedOutcome = (
  reason: string,
  request?: RouteReviewDecisionRequest,
): ReviewDecisionRoutingResult => ({
  status: "rejected_validation",
  ...(request ? { researchReviewDecisionId: request.researchReviewDecisionId } : {}),
  reason,
  warnings: [],
});

const createFailedOutcome = (
  error: unknown,
  request: RouteReviewDecisionRequest,
): ReviewDecisionRoutingResult => ({
  status: "failed",
  researchReviewDecisionId: request.researchReviewDecisionId,
  reason: error instanceof Error ? error.message : "unexpected review decision routing runtime failure",
  warnings: ["review decision routing can be retried after resolving runtime failure"],
});

const buildRouteCommand = (
  decision: ResearchReviewDecision,
  request: RouteReviewDecisionRequest,
): RouteAcceptedReviewDecisionCommand => ({
  researchReviewDecisionId: decision.id,
  setupFamilyId: decision.setupFamilyId,
  ...(decision.setupRevisionId ? { setupRevisionId: decision.setupRevisionId } : {}),
  decisionOutcome: decision.decisionOutcome,
  ...(decision.authorizedNextAction
    ? { authorizedNextAction: decision.authorizedNextAction }
    : {}),
  routedAt: request.routedAt,
});

const metadataFor = (
  routingId: string,
  request: RouteReviewDecisionRequest,
): ProductRecordMetadata => ({
  originRunId: null,
  originTransitionId: null,
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: routingId,
  sourceObservedAtUtc: request.routedAt,
  notes: `review decision routing: routing=${routingId}`,
});

const isValidRequest = (request: RouteReviewDecisionRequest): boolean =>
  Boolean(
    request.researchReviewDecisionId.trim() &&
      request.routedAt.trim() &&
      Number.isFinite(Date.parse(request.routedAt)),
  );
