import assert from "node:assert/strict";
import test from "node:test";

import type {
  BuildRoutedActionExecutionEnvelopeCommand,
  ProductRecordMetadata,
  ReviewDecisionRoutingResult,
  RoutedActionExecutionResult,
} from "@monitor/domain-model";

import { createRoutedActionPreparationRuntime } from "../src/index.js";

const routingResult: ReviewDecisionRoutingResult = {
  status: "routed",
  routingId: "route-001",
  researchReviewDecisionId: "review-decision-001",
  setupFamilyId: "family-001",
  decisionOutcome: "revise",
  authorizedNextAction: "prepare_refinement_follow_up",
  target: "create_setup_refinement_request",
  downstreamCommandType: "CreateSetupRefinementRequestCommand",
  routedAt: "2026-08-01T01:00:00.000Z",
  warnings: [],
};

const request = {
  reviewDecisionRoutingResultId: "route-001",
  targetEntityRefs: { setupDefinitionId: "setup-001" },
  preparedBy: "reviewer",
  preparedAt: "2026-08-01T01:05:00.000Z",
};

test("derives an envelope command and audit metadata from a persisted route", async () => {
  let receivedCommand: BuildRoutedActionExecutionEnvelopeCommand | undefined;
  let receivedMetadata: ProductRecordMetadata | undefined;
  const runtime = createRoutedActionPreparationRuntime({
    reviewDecisionRoutingResultRepository: {
      async getById(): Promise<ReviewDecisionRoutingResult> {
        return routingResult;
      },
    },
    preparationService: {
      async prepare(input): Promise<RoutedActionExecutionResult> {
        receivedCommand = input.command;
        receivedMetadata = input.metadata;
        return { status: "prepared", envelopeId: "envelope-001", warnings: [] };
      },
    },
  });

  const result = await runtime.prepare(request);

  assert.equal(result.status, "prepared");
  assert.deepEqual(receivedCommand, {
    reviewDecisionRoutingResultId: request.reviewDecisionRoutingResultId,
    researchReviewDecisionId: routingResult.researchReviewDecisionId,
    downstreamActionTarget: routingResult.target,
    targetEntityRefs: { setupFamilyId: routingResult.setupFamilyId, ...request.targetEntityRefs },
    preparedBy: request.preparedBy,
    preparedAt: request.preparedAt,
    routeMetadataSnapshot: {
      routeStatus: routingResult.status,
      routedAt: routingResult.routedAt,
      decisionOutcome: routingResult.decisionOutcome,
      authorizedNextAction: routingResult.authorizedNextAction,
      downstreamCommandType: routingResult.downstreamCommandType,
    },
  });
  assert.equal(receivedMetadata?.traceId, routingResult.routingId);
  assert.equal(receivedMetadata?.createdBySource, "manual_curation");
});

test("rejects malformed, missing, and incomplete routes before preparation", async () => {
  let preparationCalls = 0;
  const runtime = createRoutedActionPreparationRuntime({
    reviewDecisionRoutingResultRepository: {
      async getById(): Promise<null> {
        return null;
      },
    },
    preparationService: {
      async prepare(): Promise<never> {
        preparationCalls += 1;
        throw new Error("preparation should not be called");
      },
    },
  });
  const incompleteRoute = createRoutedActionPreparationRuntime({
    reviewDecisionRoutingResultRepository: {
      async getById(): Promise<ReviewDecisionRoutingResult> {
        return { ...routingResult, target: undefined };
      },
    },
    preparationService: {
      async prepare(): Promise<never> {
        preparationCalls += 1;
        throw new Error("preparation should not be called");
      },
    },
  });

  assert.equal(
    (await runtime.prepare({ ...request, reviewDecisionRoutingResultId: "", preparedBy: "" })).status,
    "rejected_validation",
  );
  assert.equal((await runtime.prepare(request)).status, "rejected_validation");
  assert.equal((await incompleteRoute.prepare(request)).status, "rejected_validation");
  assert.equal(preparationCalls, 0);
});

test("preserves preparation outcomes and maps runtime failures", async () => {
  const noEnvelope = createRoutedActionPreparationRuntime({
    reviewDecisionRoutingResultRepository: {
      async getById(): Promise<ReviewDecisionRoutingResult> {
        return routingResult;
      },
    },
    preparationService: {
      async prepare(): Promise<RoutedActionExecutionResult> {
        return { status: "no_envelope", warnings: [] };
      },
    },
  });
  const failedLookup = createRoutedActionPreparationRuntime({
    reviewDecisionRoutingResultRepository: {
      async getById(): Promise<never> {
        throw new Error("temporary lookup failure");
      },
    },
    preparationService: {
      async prepare(): Promise<never> {
        throw new Error("preparation should not be called");
      },
    },
  });

  assert.equal((await noEnvelope.prepare(request)).status, "no_envelope");

  const failed = await failedLookup.prepare(request);

  assert.equal(failed.status, "failed");
  assert.match(failed.reason ?? "", /temporary lookup failure/);
});
