import assert from "node:assert/strict";
import test from "node:test";

import type {
  ProductRecordMetadata,
  ResearchReviewDecision,
  ReviewDecisionRoutingResult,
  RouteAcceptedReviewDecisionCommand,
} from "@monitor/domain-model";

import { createReviewDecisionRoutingRuntime } from "../src/index.js";

const decision: ResearchReviewDecision = {
  id: "review-decision-001",
  researchReviewPacketId: "packet-001",
  setupFamilyId: "family-001",
  setupRevisionId: "revision-001",
  reviewedBy: "reviewer",
  reviewedAt: "2026-08-01T01:00:00.000Z",
  decisionOutcome: "revise",
  authorizedNextAction: "prepare_refinement_follow_up",
  decisionStatus: "recorded",
  createdAt: "2026-08-01T01:00:00.000Z",
  updatedAt: "2026-08-01T01:00:00.000Z",
};

const request = {
  researchReviewDecisionId: decision.id,
  routedAt: "2026-08-01T01:05:00.000Z",
};

test("derives the route command from the persisted human decision", async () => {
  let received: RouteAcceptedReviewDecisionCommand | undefined;
  let metadata: ProductRecordMetadata | undefined;
  const runtime = createReviewDecisionRoutingRuntime({
    researchReviewDecisionRepository: {
      async getById(): Promise<ResearchReviewDecision> {
        return decision;
      },
    },
    reviewDecisionRoutingResultRepository: {
      async getById(): Promise<null> { return null; },
      async create(input): Promise<ReviewDecisionRoutingResult> {
        metadata = input.metadata;
        return input.result;
      },
    },
    reviewDecisionRoutingService: {
      async route(command): Promise<ReviewDecisionRoutingResult> {
        received = command;
        return {
          status: "routed",
          routingId: "route-001",
          researchReviewDecisionId: decision.id,
          setupFamilyId: decision.setupFamilyId,
          decisionOutcome: decision.decisionOutcome,
          target: "create_setup_refinement_request",
          routedAt: request.routedAt,
          warnings: [],
        };
      },
    },
  });

  const result = await runtime.route(request);

  assert.equal(result.status, "routed");
  assert.deepEqual(received, {
    researchReviewDecisionId: decision.id,
    setupFamilyId: decision.setupFamilyId,
    setupRevisionId: decision.setupRevisionId,
    decisionOutcome: decision.decisionOutcome,
    authorizedNextAction: decision.authorizedNextAction,
    routedAt: request.routedAt,
  });
  assert.equal(metadata?.traceId, "route-001");
});

test("rejects malformed and missing decisions before routing", async () => {
  let routingCalls = 0;
  const runtime = createReviewDecisionRoutingRuntime({
    researchReviewDecisionRepository: {
      async getById(): Promise<null> {
        return null;
      },
    },
    reviewDecisionRoutingResultRepository: {
      async getById(): Promise<null> { return null; },
      async create(): Promise<never> { throw new Error("should not persist"); },
    },
    reviewDecisionRoutingService: {
      async route(): Promise<never> {
        routingCalls += 1;
        throw new Error("routing should not be called");
      },
    },
  });

  assert.equal(
    (await runtime.route({ researchReviewDecisionId: "", routedAt: "not-a-timestamp" })).status,
    "rejected_validation",
  );
  assert.equal((await runtime.route(request)).status, "rejected_validation");
  assert.equal(routingCalls, 0);
});

test("preserves domain routing outcomes and maps runtime failures", async () => {
  const rejectedByDomain = createReviewDecisionRoutingRuntime({
    researchReviewDecisionRepository: {
      async getById(): Promise<ResearchReviewDecision> {
        return decision;
      },
    },
    reviewDecisionRoutingResultRepository: {
      async getById(): Promise<ReviewDecisionRoutingResult> { return { status: "no_action", routingId: "route-001", warnings: [] }; },
      async create(): Promise<never> { throw new Error("should not create duplicate"); },
    },
    reviewDecisionRoutingService: {
      async route(): Promise<ReviewDecisionRoutingResult> {
        return { status: "no_action", routingId: "route-001", warnings: [] };
      },
    },
  });
  const failedLookup = createReviewDecisionRoutingRuntime({
    researchReviewDecisionRepository: {
      async getById(): Promise<never> {
        throw new Error("temporary lookup failure");
      },
    },
    reviewDecisionRoutingResultRepository: {
      async getById(): Promise<null> { return null; },
      async create(): Promise<never> { throw new Error("should not persist"); },
    },
    reviewDecisionRoutingService: {
      async route(): Promise<never> {
        throw new Error("routing should not be called");
      },
    },
  });

  assert.equal((await rejectedByDomain.route(request)).status, "no_action");

  const failed = await failedLookup.route(request);

  assert.equal(failed.status, "failed");
  assert.match(failed.reason ?? "", /temporary lookup failure/);
});
