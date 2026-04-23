import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryReviewDecisionRoutingResultRepository,
  InMemoryRoutedActionExecutionEnvelopeRepository,
  createDownstreamActionExecutionPreparationService,
  type ProductRecordMetadata,
  type ReviewDecisionRoutingResult
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-routed-action-execution-envelope",
  originTransitionId: "transition-routed-action-execution-envelope",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-routed-action-execution-envelope",
  sourceObservedAtUtc: "2026-06-14T12:00:00.000Z"
};

const buildRoutingResult = (
  routingId: string,
  target: NonNullable<ReviewDecisionRoutingResult["target"]>,
  downstreamCommandType: NonNullable<ReviewDecisionRoutingResult["downstreamCommandType"]>
): ReviewDecisionRoutingResult => ({
  status: "routed",
  routingId,
  researchReviewDecisionId: "review-decision-family-900-v2",
  setupFamilyId: "setup-family-900",
  setupRevisionId: "revision-family-900-v2",
  decisionOutcome: "accepted",
  authorizedNextAction:
    target === "apply_setup_lifecycle_mutation"
      ? "prepare_lifecycle_mutation_follow_up"
      : target === "create_setup_refinement_request"
      ? "prepare_refinement_follow_up"
      : "prepare_activation_follow_up",
  target,
  downstreamCommandType,
  routedAt: "2026-06-14T11:00:00.000Z",
  warnings: []
});

const createFixture = async (
  routingResult: ReviewDecisionRoutingResult
) => {
  const reviewDecisionRoutingResultRepository = new InMemoryReviewDecisionRoutingResultRepository();
  const routedActionExecutionEnvelopeRepository = new InMemoryRoutedActionExecutionEnvelopeRepository();

  await reviewDecisionRoutingResultRepository.create({
    result: routingResult,
    metadata
  });

  const service = createDownstreamActionExecutionPreparationService({
    reviewDecisionRoutingResultRepository,
    routedActionExecutionEnvelopeRepository
  });

  return {
    service,
    routedActionExecutionEnvelopeRepository
  };
};

test("valid lifecycle-mutation route builds envelope", async () => {
  const routingResult = buildRoutingResult(
    "route-family-900-lifecycle",
    "apply_setup_lifecycle_mutation",
    "ApplyApprovedSetupMutationCommand"
  );
  const { service } = await createFixture(routingResult);

  const result = await service.prepare({
    command: {
      reviewDecisionRoutingResultId: "route-family-900-lifecycle",
      researchReviewDecisionId: "review-decision-family-900-v2",
      downstreamActionTarget: "apply_setup_lifecycle_mutation",
      targetEntityRefs: {
        setupFamilyId: "setup-family-900",
        setupDefinitionId: "setup-family-900-v2"
      },
      preparedBy: "execution-preparer-1",
      preparedAt: "2026-06-14T12:00:00.000Z"
    },
    metadata
  });

  assert.equal(result.status, "prepared");
  assert.equal(result.envelope?.actionTarget, "apply_setup_lifecycle_mutation");
  assert.equal(result.envelope?.actionCommandType, "ApplyApprovedSetupMutationCommand");
});

test("valid refinement route builds envelope", async () => {
  const routingResult = buildRoutingResult(
    "route-family-900-refine",
    "create_setup_refinement_request",
    "CreateSetupRefinementRequestCommand"
  );
  const { service } = await createFixture(routingResult);

  const result = await service.prepare({
    command: {
      reviewDecisionRoutingResultId: "route-family-900-refine",
      researchReviewDecisionId: "review-decision-family-900-v2",
      downstreamActionTarget: "create_setup_refinement_request",
      targetEntityRefs: {
        setupFamilyId: "setup-family-900",
        setupDefinitionId: "setup-family-900-v2"
      },
      preparedBy: "execution-preparer-1",
      preparedAt: "2026-06-14T12:00:00.000Z"
    },
    metadata
  });

  assert.equal(result.status, "prepared");
  assert.equal(result.envelope?.actionTarget, "create_setup_refinement_request");
  assert.equal(result.envelope?.actionCommandType, "CreateSetupRefinementRequestCommand");
});

test("valid revision-activation route builds envelope", async () => {
  const routingResult = buildRoutingResult(
    "route-family-900-activate",
    "activate_setup_revision",
    "ActivateSetupDefinitionRevisionCommand"
  );
  const { service } = await createFixture(routingResult);

  const result = await service.prepare({
    command: {
      reviewDecisionRoutingResultId: "route-family-900-activate",
      researchReviewDecisionId: "review-decision-family-900-v2",
      downstreamActionTarget: "activate_setup_revision",
      targetEntityRefs: {
        setupFamilyId: "setup-family-900",
        setupRevisionId: "revision-family-900-v2"
      },
      preparedBy: "execution-preparer-1",
      preparedAt: "2026-06-14T12:00:00.000Z"
    },
    metadata
  });

  assert.equal(result.status, "prepared");
  assert.equal(result.envelope?.actionTarget, "activate_setup_revision");
  assert.equal(result.envelope?.actionCommandType, "ActivateSetupDefinitionRevisionCommand");
});

test("no_op_confirmed produces explicit no-envelope outcome", async () => {
  const routingResult: ReviewDecisionRoutingResult = {
    status: "no_action",
    routingId: "route-family-900-noop",
    researchReviewDecisionId: "review-decision-family-900-v2",
    setupFamilyId: "setup-family-900",
    decisionOutcome: "accepted",
    authorizedNextAction: "confirm_no_change",
    target: "no_op_confirmed",
    downstreamCommandType: "NoOpConfirmed",
    routedAt: "2026-06-14T11:00:00.000Z",
    warnings: []
  };
  const { service } = await createFixture(routingResult);

  const result = await service.prepare({
    command: {
      reviewDecisionRoutingResultId: "route-family-900-noop",
      researchReviewDecisionId: "review-decision-family-900-v2",
      downstreamActionTarget: "no_op_confirmed",
      targetEntityRefs: {
        setupFamilyId: "setup-family-900"
      },
      preparedBy: "execution-preparer-1",
      preparedAt: "2026-06-14T12:00:00.000Z"
    },
    metadata
  });

  assert.equal(result.status, "no_envelope");
  assert.equal(result.envelope, undefined);
});

test("missing routing result rejected", async () => {
  const reviewDecisionRoutingResultRepository = new InMemoryReviewDecisionRoutingResultRepository();
  const routedActionExecutionEnvelopeRepository = new InMemoryRoutedActionExecutionEnvelopeRepository();
  const service = createDownstreamActionExecutionPreparationService({
    reviewDecisionRoutingResultRepository,
    routedActionExecutionEnvelopeRepository
  });

  const result = await service.prepare({
    command: {
      reviewDecisionRoutingResultId: "route-missing",
      researchReviewDecisionId: "review-decision-family-900-v2",
      downstreamActionTarget: "apply_setup_lifecycle_mutation",
      targetEntityRefs: {
        setupFamilyId: "setup-family-900",
        setupDefinitionId: "setup-family-900-v2"
      },
      preparedBy: "execution-preparer-1",
      preparedAt: "2026-06-14T12:00:00.000Z"
    },
    metadata
  });

  assert.equal(result.status, "rejected_validation");
  assert.equal(result.reason?.includes("review_decision_routing_result not found"), true);
});

test("missing target references rejected", async () => {
  const routingResult = buildRoutingResult(
    "route-family-900-refs",
    "apply_setup_lifecycle_mutation",
    "ApplyApprovedSetupMutationCommand"
  );
  const { service } = await createFixture(routingResult);

  const result = await service.prepare({
    command: {
      reviewDecisionRoutingResultId: "route-family-900-refs",
      researchReviewDecisionId: "review-decision-family-900-v2",
      downstreamActionTarget: "apply_setup_lifecycle_mutation",
      targetEntityRefs: {
        setupFamilyId: "setup-family-900"
      },
      preparedBy: "execution-preparer-1",
      preparedAt: "2026-06-14T12:00:00.000Z"
    },
    metadata
  });

  assert.equal(result.status, "rejected_validation");
  assert.equal(result.reason?.includes("setupDefinitionId is required"), true);
});

test("envelope result keeps explicit route source and command type", async () => {
  const routingResult = buildRoutingResult(
    "route-family-900-source-shape",
    "create_setup_refinement_request",
    "CreateSetupRefinementRequestCommand"
  );
  const { service } = await createFixture(routingResult);

  const result = await service.prepare({
    command: {
      reviewDecisionRoutingResultId: "route-family-900-source-shape",
      researchReviewDecisionId: "review-decision-family-900-v2",
      downstreamActionTarget: "create_setup_refinement_request",
      targetEntityRefs: {
        setupFamilyId: "setup-family-900",
        setupDefinitionId: "setup-family-900-v2",
        researchHypothesisId: "hypothesis-family-900"
      },
      preparedBy: "execution-preparer-1",
      preparedAt: "2026-06-14T12:00:00.000Z"
    },
    metadata
  });

  assert.equal(result.status, "prepared");
  assert.equal(result.reviewDecisionRoutingResultId, "route-family-900-source-shape");
  assert.equal(result.researchReviewDecisionId, "review-decision-family-900-v2");
  assert.equal(result.downstreamCommandType, "CreateSetupRefinementRequestCommand");
});
