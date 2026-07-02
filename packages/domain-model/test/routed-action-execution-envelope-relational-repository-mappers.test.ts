import assert from "node:assert/strict";
import test from "node:test";

import {
  dehydrateRoutedActionExecutionEnvelopeToDurableRecord,
  hydrateRoutedActionExecutionEnvelopeFromDurableRecord,
  type ProductRecordMetadata,
  type RoutedActionExecutionEnvelope
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-routed-action-mapper-001",
  originTransitionId: "transition-routed-action-mapper-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-routed-action-mapper-001",
  sourceObservedAtUtc: "2026-07-02T10:00:00.000Z"
};

test("routed-action-execution-envelope mapper round-trips target refs and payload snapshots", () => {
  const envelope: RoutedActionExecutionEnvelope = {
    id: "execution-envelope-001",
    sourceRoutingResultId: "routing-result-001",
    sourceReviewDecisionId: "review-decision-001",
    actionTarget: "create_setup_refinement_request",
    actionCommandType: "CreateSetupRefinementRequestCommand",
    targetEntityRefs: {
      setupFamilyId: "setup-family-001",
      setupDefinitionId: "setup-definition-001",
      researchHypothesisId: "hypothesis-001",
      researchDecisionApprovalId: "approval-001"
    },
    routeMetadataSnapshot: {
      routeStatus: "routed",
      routedAt: "2026-07-02T09:58:00.000Z",
      decisionOutcome: "accepted",
      authorizedNextAction: "prepare_refinement_follow_up",
      downstreamCommandType: "CreateSetupRefinementRequestCommand"
    },
    executionPayloadSnapshot: {
      commandType: "CreateSetupRefinementRequestCommand",
      target: "create_setup_refinement_request",
      commandInput: {
        setupDefinitionId: "setup-definition-001",
        setupFamilyId: "setup-family-001",
        sourceReviewDecisionId: "review-decision-001",
        sourceRoutingResultId: "routing-result-001"
      }
    },
    executionStatus: "prepared",
    preparedBy: "review-operator-001",
    preparedAt: "2026-07-02T10:05:00.000Z",
    originRunId: "orchestration-run-001",
    notes: "Prepared for refinement follow-up.",
    createdAt: "2026-07-02T10:05:00.000Z",
    updatedAt: "2026-07-02T10:05:00.000Z"
  };

  const record = dehydrateRoutedActionExecutionEnvelopeToDurableRecord(envelope, metadata, 1);
  const hydrated = hydrateRoutedActionExecutionEnvelopeFromDurableRecord(record);

  assert.equal(record.identity.version, 1);
  assert.deepEqual(record.identity.relatedEntityIds, [
    "routing-result-001",
    "review-decision-001",
    "setup-family-001",
    "setup-definition-001",
    "hypothesis-001",
    "approval-001"
  ]);
  assert.equal(record.originRunId, "orchestration-run-001");
  assert.equal(record.notes, "Prepared for refinement follow-up.");
  assert.deepEqual(hydrated, envelope);
});
