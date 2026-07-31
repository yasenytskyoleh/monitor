import type {
  BuildResearchReviewPacketCommand,
  ResearchReviewPacketResult,
  ResearchReviewPacketService
} from "@monitor/domain-model";

export type ReviewPacketRequest = BuildResearchReviewPacketCommand;

export type ReviewPacketRuntime = {
  build(request: ReviewPacketRequest): Promise<ResearchReviewPacketResult>;
};

export const createReviewPacketRuntime = (options: {
  reviewPacketService: Pick<ResearchReviewPacketService, "buildReviewPacket">;
}): ReviewPacketRuntime => ({
  async build(request): Promise<ResearchReviewPacketResult> {
    if (!request.setupFamilyId.trim() || !request.builtAt.trim() || !Number.isFinite(Date.parse(request.builtAt))) {
      return { status: "rejected", reason: "setupFamilyId and valid builtAt are required", warnings: [] };
    }
    try {
      return await options.reviewPacketService.buildReviewPacket(request);
    } catch (error: unknown) {
      return {
        status: "failed",
        setupFamilyId: request.setupFamilyId,
        setupRevisionId: request.setupRevisionId,
        researchHypothesisId: request.researchHypothesisId,
        researchFeedbackDecisionId: request.researchFeedbackDecisionId,
        researchDecisionApprovalId: request.researchDecisionApprovalId,
        reason: error instanceof Error ? error.message : "unexpected review packet runtime failure",
        warnings: ["review packet build can be retried after resolving runtime failure"]
      };
    }
  }
});
