import type {
  ApplyResearchReviewDecisionCommand,
  ProductRecordMetadata,
  ResearchReviewDecisionResult,
  ResearchReviewDecisionService,
} from "@monitor/domain-model";

type ReviewDecisionRuntimeOptions = {
  reviewDecisionService: Pick<ResearchReviewDecisionService, "applyDecision">;
};

export const createReviewDecisionRuntime = (options: ReviewDecisionRuntimeOptions) => ({
  async record(command: ApplyResearchReviewDecisionCommand): Promise<ResearchReviewDecisionResult> {
    if (!isValidCommand(command)) {
      return {
        status: "rejected_validation",
        reason: "review packet, setup family, reviewer, and valid review timestamp are required",
        warnings: [],
      };
    }

    try {
      return await options.reviewDecisionService.applyDecision({
        command,
        metadata: metadataFor(command),
      });
    } catch (error: unknown) {
      return {
        status: "failed",
        researchReviewPacketId: command.researchReviewPacketId,
        setupFamilyId: command.setupFamilyId,
        decisionOutcome: command.decisionOutcome,
        reason: error instanceof Error ? error.message : "unexpected review decision runtime failure",
        warnings: ["review decision can be retried after resolving runtime failure"],
      };
    }
  },
});

const isValidCommand = (command: ApplyResearchReviewDecisionCommand): boolean =>
  Boolean(
    command.researchReviewPacketId.trim() &&
      command.setupFamilyId.trim() &&
      command.reviewedBy.trim() &&
      command.reviewedAt.trim() &&
      Number.isFinite(Date.parse(command.reviewedAt)),
  );

const metadataFor = (
  command: ApplyResearchReviewDecisionCommand,
): ProductRecordMetadata => ({
  originRunId: command.originRunId ?? null,
  originTransitionId: null,
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: command.researchReviewPacketId,
  sourceObservedAtUtc: command.reviewedAt,
  notes: `research review decision: packet=${command.researchReviewPacketId}`,
});
