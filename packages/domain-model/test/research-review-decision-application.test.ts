import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryResearchReviewDecisionRepository,
  createResearchReviewDecisionService,
  type ProductRecordMetadata,
  type ResearchReviewPacket
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-review-decision-application",
  originTransitionId: "transition-review-decision-application",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-review-decision-application",
  sourceObservedAtUtc: "2026-06-12T10:00:00.000Z"
};

class InMemoryReviewPacketLookup {
  private readonly packets = new Map<string, ResearchReviewPacket>();

  async getById(researchReviewPacketId: string): Promise<ResearchReviewPacket | null> {
    return this.packets.get(researchReviewPacketId) ?? null;
  }

  seed(packet: ResearchReviewPacket): void {
    this.packets.set(packet.id, packet);
  }
}

const buildPacket = (overrides?: Partial<ResearchReviewPacket>): ResearchReviewPacket => ({
  id: "review-packet:setup-family-700:revision-family-700-v2:2026-06-12T09:00:00.000Z",
  setupFamilyId: "setup-family-700",
  setupRevisionId: "revision-family-700-v2",
  hypothesisId: "hypothesis-family-700",
  includedArtifactRefs: {
    setupRevisionId: "revision-family-700-v2",
    setupDefinitionId: "setup-family-700-v2",
    researchHypothesisId: "hypothesis-family-700",
    researchFeedbackDecisionId: "feedback-family-700-v2",
    researchDecisionApprovalId: "approval-family-700-v2",
    impactSummaryId: "impact-summary-family-700-v2"
  },
  status: "complete",
  warnings: [],
  createdAt: "2026-06-12T09:00:00.000Z",
  ...overrides
});

const createFixture = () => {
  const packetLookup = new InMemoryReviewPacketLookup();
  const researchReviewDecisionRepository = new InMemoryResearchReviewDecisionRepository();
  const service = createResearchReviewDecisionService({
    reviewPacketLookup: packetLookup,
    researchReviewDecisionRepository
  });

  return { packetLookup, researchReviewDecisionRepository, service };
};

test("valid review-decision command shape", async () => {
  const { packetLookup, service } = createFixture();
  packetLookup.seed(buildPacket());

  const result = await service.applyDecision({
    command: {
      researchReviewPacketId: "review-packet:setup-family-700:revision-family-700-v2:2026-06-12T09:00:00.000Z",
      setupFamilyId: "setup-family-700",
      setupRevisionId: "revision-family-700-v2",
      researchHypothesisId: "hypothesis-family-700",
      reviewedBy: "reviewer-1",
      reviewedAt: "2026-06-12T10:00:00.000Z",
      decisionOutcome: "accepted",
      authorizedNextAction: "prepare_activation_follow_up"
    },
    metadata
  });

  assert.equal(result.status, "recorded");
  assert.equal(result.decisionOutcome, "accepted");
  assert.equal(result.authorizedNextAction, "prepare_activation_follow_up");
});

test("missing packet rejected", async () => {
  const { service } = createFixture();

  const result = await service.applyDecision({
    command: {
      researchReviewPacketId: "missing-review-packet",
      setupFamilyId: "setup-family-700",
      reviewedBy: "reviewer-1",
      reviewedAt: "2026-06-12T10:00:00.000Z",
      decisionOutcome: "accepted"
    },
    metadata
  });

  assert.equal(result.status, "rejected_linkage");
  assert.equal(result.reason?.includes("research_review_packet not found"), true);
});

test("missing reviewer rejected", async () => {
  const { packetLookup, service } = createFixture();
  packetLookup.seed(buildPacket());

  const result = await service.applyDecision({
    command: {
      researchReviewPacketId: "review-packet:setup-family-700:revision-family-700-v2:2026-06-12T09:00:00.000Z",
      setupFamilyId: "setup-family-700",
      reviewedBy: " ",
      reviewedAt: "2026-06-12T10:00:00.000Z",
      decisionOutcome: "accepted"
    },
    metadata
  });

  assert.equal(result.status, "rejected_validation");
  assert.equal(result.reason?.includes("reviewedBy is required"), true);
});

test("invalid decision outcome rejected", async () => {
  const { packetLookup, service } = createFixture();
  packetLookup.seed(buildPacket());

  const result = await service.applyDecision({
    command: {
      researchReviewPacketId: "review-packet:setup-family-700:revision-family-700-v2:2026-06-12T09:00:00.000Z",
      setupFamilyId: "setup-family-700",
      reviewedBy: "reviewer-1",
      reviewedAt: "2026-06-12T10:00:00.000Z",
      decisionOutcome: "defer" as unknown as "accepted"
    },
    metadata
  });

  assert.equal(result.status, "rejected_validation");
  assert.equal(result.reason?.includes("invalid decisionOutcome"), true);
});

test("accepted keeps explicit authorized-next-action semantics", async () => {
  const { packetLookup, service } = createFixture();
  packetLookup.seed(buildPacket());

  const explicitAction = await service.applyDecision({
    command: {
      researchReviewPacketId: "review-packet:setup-family-700:revision-family-700-v2:2026-06-12T09:00:00.000Z",
      setupFamilyId: "setup-family-700",
      reviewedBy: "reviewer-1",
      reviewedAt: "2026-06-12T10:00:00.000Z",
      decisionOutcome: "accepted",
      authorizedNextAction: "prepare_lifecycle_mutation_follow_up"
    },
    metadata
  });

  assert.equal(explicitAction.status, "recorded");
  assert.equal(explicitAction.authorizedNextAction, "prepare_lifecycle_mutation_follow_up");

  const defaultAction = await service.applyDecision({
    command: {
      researchReviewPacketId: "review-packet:setup-family-700:revision-family-700-v2:2026-06-12T09:00:00.000Z",
      setupFamilyId: "setup-family-700",
      reviewedBy: "reviewer-2",
      reviewedAt: "2026-06-12T10:05:00.000Z",
      decisionOutcome: "accepted"
    },
    metadata
  });

  assert.equal(defaultAction.status, "recorded");
  assert.equal(defaultAction.authorizedNextAction, "confirm_no_change");
});

test("revise does not imply automatic lifecycle mutation", async () => {
  const { packetLookup, service } = createFixture();
  packetLookup.seed(buildPacket());

  const result = await service.applyDecision({
    command: {
      researchReviewPacketId: "review-packet:setup-family-700:revision-family-700-v2:2026-06-12T09:00:00.000Z",
      setupFamilyId: "setup-family-700",
      reviewedBy: "reviewer-1",
      reviewedAt: "2026-06-12T10:00:00.000Z",
      decisionOutcome: "revise"
    },
    metadata
  });

  assert.equal(result.status, "recorded");
  assert.equal(result.decisionOutcome, "revise");
  assert.equal(result.authorizedNextAction, "prepare_refinement_follow_up");
});

test("result shape keeps explicit packet reference and decision outcome", async () => {
  const { packetLookup, service } = createFixture();
  packetLookup.seed(buildPacket());

  const result = await service.applyDecision({
    command: {
      researchReviewPacketId: "review-packet:setup-family-700:revision-family-700-v2:2026-06-12T09:00:00.000Z",
      setupFamilyId: "setup-family-700",
      setupRevisionId: "revision-family-700-v2",
      researchHypothesisId: "hypothesis-family-700",
      reviewedBy: "reviewer-1",
      reviewedAt: "2026-06-12T10:00:00.000Z",
      decisionOutcome: "rejected"
    },
    metadata
  });

  assert.equal(result.status, "recorded");
  assert.equal(result.researchReviewPacketId, "review-packet:setup-family-700:revision-family-700-v2:2026-06-12T09:00:00.000Z");
  assert.equal(result.setupFamilyId, "setup-family-700");
  assert.equal(result.setupRevisionId, "revision-family-700-v2");
  assert.equal(result.researchHypothesisId, "hypothesis-family-700");
  assert.equal(result.decisionOutcome, "rejected");
});
