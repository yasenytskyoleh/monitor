import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryResearchReviewDecisionRepository,
  createReviewDecisionRoutingService,
  type ProductRecordMetadata,
  type ResearchReviewDecision
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-review-decision-routing",
  originTransitionId: "transition-review-decision-routing",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-review-decision-routing",
  sourceObservedAtUtc: "2026-06-13T12:00:00.000Z"
};

const buildDecision = (
  id: string,
  overrides?: Partial<ResearchReviewDecision>
): ResearchReviewDecision => ({
  id,
  researchReviewPacketId: "review-packet-family-800-v2",
  setupFamilyId: "setup-family-800",
  setupRevisionId: "revision-family-800-v2",
  researchHypothesisId: "hypothesis-family-800",
  reviewedBy: "reviewer-1",
  reviewedAt: "2026-06-13T12:00:00.000Z",
  decisionOutcome: "accepted",
  authorizedNextAction: "prepare_lifecycle_mutation_follow_up",
  decisionStatus: "recorded",
  createdAt: "2026-06-13T12:00:00.000Z",
  updatedAt: "2026-06-13T12:00:00.000Z",
  ...overrides
});

const createFixture = async (decision: ResearchReviewDecision) => {
  const researchReviewDecisionRepository = new InMemoryResearchReviewDecisionRepository();
  await researchReviewDecisionRepository.create({
    decision,
    metadata
  });

  const routingService = createReviewDecisionRoutingService({
    researchReviewDecisionRepository
  });

  return {
    routingService,
    decision
  };
};

test("valid accepted decision routes to lifecycle mutation", async () => {
  const decision = buildDecision("review-decision-route-lifecycle");
  const { routingService } = await createFixture(decision);

  const result = await routingService.route({
    researchReviewDecisionId: decision.id,
    setupFamilyId: decision.setupFamilyId,
    setupRevisionId: decision.setupRevisionId,
    decisionOutcome: "accepted",
    authorizedNextAction: "prepare_lifecycle_mutation_follow_up",
    routedAt: "2026-06-13T12:10:00.000Z"
  });

  assert.equal(result.status, "routed");
  assert.equal(result.target, "apply_setup_lifecycle_mutation");
  assert.equal(result.downstreamCommandType, "ApplyApprovedSetupMutationCommand");
});

test("valid accepted decision routes to refinement request", async () => {
  const decision = buildDecision("review-decision-route-refinement", {
    authorizedNextAction: "prepare_refinement_follow_up"
  });
  const { routingService } = await createFixture(decision);

  const result = await routingService.route({
    researchReviewDecisionId: decision.id,
    setupFamilyId: decision.setupFamilyId,
    decisionOutcome: "accepted",
    authorizedNextAction: "prepare_refinement_follow_up",
    routedAt: "2026-06-13T12:11:00.000Z"
  });

  assert.equal(result.status, "routed");
  assert.equal(result.target, "create_setup_refinement_request");
  assert.equal(result.downstreamCommandType, "CreateSetupRefinementRequestCommand");
});

test("valid accepted decision routes to revision activation", async () => {
  const decision = buildDecision("review-decision-route-activation", {
    authorizedNextAction: "prepare_activation_follow_up"
  });
  const { routingService } = await createFixture(decision);

  const result = await routingService.route({
    researchReviewDecisionId: decision.id,
    setupFamilyId: decision.setupFamilyId,
    setupRevisionId: decision.setupRevisionId,
    decisionOutcome: "accepted",
    authorizedNextAction: "prepare_activation_follow_up",
    routedAt: "2026-06-13T12:12:00.000Z"
  });

  assert.equal(result.status, "routed");
  assert.equal(result.target, "activate_setup_revision");
  assert.equal(result.downstreamCommandType, "ActivateSetupDefinitionRevisionCommand");
});

test("rejected decision returns no_action", async () => {
  const decision = buildDecision("review-decision-route-rejected", {
    decisionOutcome: "rejected",
    authorizedNextAction: undefined
  });
  const { routingService } = await createFixture(decision);

  const result = await routingService.route({
    researchReviewDecisionId: decision.id,
    setupFamilyId: decision.setupFamilyId,
    decisionOutcome: "rejected",
    routedAt: "2026-06-13T12:13:00.000Z"
  });

  assert.equal(result.status, "no_action");
  assert.equal(result.downstreamCommandType, "None");
});

test("revise cannot route to lifecycle mutation", async () => {
  const decision = buildDecision("review-decision-route-revise-conflict", {
    decisionOutcome: "revise",
    authorizedNextAction: "prepare_lifecycle_mutation_follow_up"
  });
  const { routingService } = await createFixture(decision);

  const result = await routingService.route({
    researchReviewDecisionId: decision.id,
    setupFamilyId: decision.setupFamilyId,
    decisionOutcome: "revise",
    authorizedNextAction: "prepare_lifecycle_mutation_follow_up",
    routedAt: "2026-06-13T12:14:00.000Z"
  });

  assert.equal(result.status, "rejected_lifecycle");
  assert.equal(result.reason?.includes("revise decisions may only route"), true);
});

test("missing authorized action rejected when required", async () => {
  const decision = buildDecision("review-decision-route-missing-action", {
    authorizedNextAction: undefined
  });
  const { routingService } = await createFixture(decision);

  const result = await routingService.route({
    researchReviewDecisionId: decision.id,
    setupFamilyId: decision.setupFamilyId,
    decisionOutcome: "accepted",
    routedAt: "2026-06-13T12:15:00.000Z"
  });

  assert.equal(result.status, "rejected_validation");
  assert.equal(result.reason?.includes("authorizedNextAction is required"), true);
});

test("routing result keeps explicit target and status", async () => {
  const decision = buildDecision("review-decision-route-noop", {
    authorizedNextAction: "confirm_no_change"
  });
  const { routingService } = await createFixture(decision);

  const result = await routingService.route({
    researchReviewDecisionId: decision.id,
    setupFamilyId: decision.setupFamilyId,
    decisionOutcome: "accepted",
    authorizedNextAction: "confirm_no_change",
    routedAt: "2026-06-13T12:16:00.000Z"
  });

  assert.equal(result.status, "no_action");
  assert.equal(result.target, "no_op_confirmed");
  assert.equal(result.downstreamCommandType, "NoOpConfirmed");
  assert.equal(result.researchReviewDecisionId, decision.id);
});
