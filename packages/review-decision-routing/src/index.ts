import type {
  ResearchReviewDecision,
  ResearchReviewDecisionRepository,
  RouteAcceptedReviewDecisionCommand,
  ReviewDecisionRoutingResult,
  ReviewDecisionRoutingService,
} from "@monitor/domain-model";

export type RouteReviewDecisionRequest = {
  researchReviewDecisionId: string;
  routedAt: string;
};

export type ReviewDecisionRoutingRuntimeOptions = {
  researchReviewDecisionRepository: Pick<ResearchReviewDecisionRepository, "getById">;
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

      return await options.reviewDecisionRoutingService.route(buildRouteCommand(decision, request));
    } catch (error: unknown) {
      return createFailedOutcome(error, request);
    }
  },
});

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

const isValidRequest = (request: RouteReviewDecisionRequest): boolean =>
  Boolean(
    request.researchReviewDecisionId.trim() &&
      request.routedAt.trim() &&
      Number.isFinite(Date.parse(request.routedAt)),
  );
