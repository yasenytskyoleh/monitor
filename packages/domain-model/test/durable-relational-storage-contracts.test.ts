import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSetupAggregateScopeKey,
  DURABLE_RELATIONAL_STORAGE_SCHEMA_VERSIONS,
  type EvaluationResultDurableRecord,
  FIRST_DURABLE_RELATIONAL_ENTITY_TYPES,
  type ProductRecordMetadata,
  RESEARCH_DECISION_APPROVAL_RELATIONAL_ENTITY_TYPES,
  type ResearchDecisionApprovalDurableRecord,
  RESEARCH_REVIEW_DECISION_RELATIONAL_ENTITY_TYPES,
  type ResearchReviewDecisionDurableRecord,
  RESEARCH_FEEDBACK_DECISION_RELATIONAL_ENTITY_TYPES,
  ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_ENTITY_TYPES,
  type RoutedActionExecutionEnvelopeDurableRecord,
  type ResearchFeedbackDecisionDurableRecord,
  type ResearchHypothesisDurableRecord,
  type ResearchHypothesisSetupDefinitionLinkRecord,
  SIGNAL_EVALUATION_RELATIONAL_ENTITY_TYPES,
  SETUP_AGGREGATE_RELATIONAL_ENTITY_TYPES,
  type SetupAggregateResultDurableRecord,
  type SignalCandidateDurableRecord,
  type SetupDefinitionDurableRecord
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-001",
  originTransitionId: "transition-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-001",
  sourceObservedAtUtc: "2026-05-12T09:00:00.000Z"
};

test("exposes first durable relational storage planning constants", () => {
  assert.deepEqual(DURABLE_RELATIONAL_STORAGE_SCHEMA_VERSIONS, ["product_domain.relational.v1"]);
  assert.deepEqual(FIRST_DURABLE_RELATIONAL_ENTITY_TYPES, [
    "setup_definition",
    "research_hypothesis"
  ]);
});

test("supports typed setup-definition and research-hypothesis durable records", () => {
  const setupRecord: SetupDefinitionDurableRecord = {
    storageSchemaVersion: "product_domain.relational.v1",
    identity: {
      boundary: "product_domain",
      entityType: "setup_definition",
      entityId: "setup-001",
      version: 2,
      relatedEntityIds: []
    },
    lifecycleStatus: "active",
    createdAtUtc: "2026-05-12T09:00:00.000Z",
    updatedAtUtc: "2026-05-12T10:00:00.000Z",
    archivedAtUtc: null,
    metadata,
    definitionStatus: "active",
    name: "Breakout Retest",
    description: "Retest after breakout with continuation bias.",
    measurableConditions: ["4h close above range high"],
    evaluationAssumptions: ["evaluate over fixed 24h window"],
    invalidationAssumptions: ["invalidate on failed retest"],
    traceMetadata: {
      originRunId: "run-001",
      originTransitionId: "transition-001",
      traceId: "trace-001"
    }
  };

  const hypothesisRecord: ResearchHypothesisDurableRecord = {
    storageSchemaVersion: "product_domain.relational.v1",
    identity: {
      boundary: "product_domain",
      entityType: "research_hypothesis",
      entityId: "hypothesis-001",
      version: 3,
      relatedEntityIds: ["setup-001"]
    },
    lifecycleStatus: "active",
    createdAtUtc: "2026-05-12T09:00:00.000Z",
    updatedAtUtc: "2026-05-12T11:00:00.000Z",
    archivedAtUtc: null,
    metadata,
    hypothesisStatus: "active",
    title: "Breakout retests outperform random entries",
    description: "Structured breakout retests should show positive asymmetry.",
    assumptions: ["median MFE exceeds median MAE over 50 samples"],
    notes: ["track only spot pairs"],
    evidenceStatus: "supports",
    evidenceSummary: "aggregate evidence supports continuation behavior",
    lastEvidenceAggregateResultId: "aggregate-001",
    lastEvidenceAssessedAt: "2026-05-12T11:00:00.000Z"
  };

  const linkRecord: ResearchHypothesisSetupDefinitionLinkRecord = {
    storageSchemaVersion: "product_domain.relational.v1",
    researchHypothesisId: "hypothesis-001",
    setupDefinitionId: "setup-001",
    linkedAtUtc: "2026-05-12T09:05:00.000Z"
  };

  assert.equal(setupRecord.identity.version, 2);
  assert.equal(hypothesisRecord.identity.version, 3);
  assert.equal(linkRecord.setupDefinitionId, "setup-001");
});

test("exposes signal/evaluation durable relational storage planning constants", () => {
  assert.deepEqual(SIGNAL_EVALUATION_RELATIONAL_ENTITY_TYPES, [
    "signal_candidate",
    "evaluation_result"
  ]);
});

test("supports typed signal-candidate and evaluation-result durable records", () => {
  const signalCandidateRecord: SignalCandidateDurableRecord = {
    storageSchemaVersion: "product_domain.relational.v1",
    identity: {
      boundary: "product_domain",
      entityType: "signal_candidate",
      entityId: "candidate-001",
      version: 2,
      relatedEntityIds: ["setup-001", "setup-001-rev-001", "BTC-USDT", "hit-001"]
    },
    lifecycleStatus: "active",
    createdAtUtc: "2026-05-22T08:00:00.000Z",
    updatedAtUtc: "2026-05-22T09:00:00.000Z",
    archivedAtUtc: null,
    metadata,
    candidateStatus: "under_review",
    setupDefinitionId: "setup-001",
    setupRevisionId: "setup-001-rev-001",
    monitoredSymbolId: "BTC-USDT",
    detectionHitId: "hit-001",
    detectedAtUtc: "2026-05-22T08:00:00.000Z",
    evidenceSummary: "4h breakout retest with volume expansion",
    candidateOriginRunId: "run-detection-001"
  };

  const evaluationResultRecord: EvaluationResultDurableRecord = {
    storageSchemaVersion: "product_domain.relational.v1",
    identity: {
      boundary: "product_domain",
      entityType: "evaluation_result",
      entityId: "result-001",
      version: 4,
      relatedEntityIds: ["candidate-001", "window-24h"]
    },
    lifecycleStatus: "active",
    createdAtUtc: "2026-05-22T08:30:00.000Z",
    updatedAtUtc: "2026-05-22T10:00:00.000Z",
    archivedAtUtc: null,
    metadata,
    evaluationStatus: "completed",
    signalCandidateId: "candidate-001",
    evaluationWindowId: "window-24h",
    referencePrice: 65000,
    finalPrice: 65800,
    highInWindow: 66400,
    lowInWindow: 64100,
    absoluteMove: 800,
    percentageMove: 1.230769,
    maxFavorableExcursion: 2.15,
    maxAdverseExcursion: -1.38,
    evaluatedAtUtc: "2026-05-23T08:30:00.000Z",
    notes: "completed through integration-like contract test"
  };

  assert.equal(signalCandidateRecord.identity.version, 2);
  assert.equal(signalCandidateRecord.candidateOriginRunId, "run-detection-001");
  assert.equal(evaluationResultRecord.identity.version, 4);
  assert.equal(evaluationResultRecord.evaluationStatus, "completed");
});

test("exposes setup-aggregate durable relational storage planning constants", () => {
  assert.deepEqual(SETUP_AGGREGATE_RELATIONAL_ENTITY_TYPES, ["setup_aggregate_result"]);
});

test("supports typed setup-aggregate durable records and deterministic scope keys", () => {
  const scope = {
    setupDefinitionId: "setup-001",
    evaluationWindowId: "window-24h",
    symbolScope: {
      kind: "symbol_set" as const,
      symbolIds: ["BTC-USDT", "ETH-USDT"]
    },
    timeRange: {
      startAtUtc: "2026-05-01T00:00:00.000Z",
      endAtUtc: "2026-05-31T23:59:59.000Z"
    },
    researchRunId: "run-aggregate-001",
    hypothesisId: "hypothesis-001"
  };

  const aggregateRecord: SetupAggregateResultDurableRecord = {
    storageSchemaVersion: "product_domain.relational.v1",
    identity: {
      boundary: "product_domain",
      entityType: "setup_aggregate_result",
      entityId: "aggregate-001",
      version: 2,
      relatedEntityIds: [
        "setup-001",
        "hypothesis-001",
        "window-24h",
        "BTC-USDT",
        "ETH-USDT",
        "run-aggregate-001"
      ]
    },
    lifecycleStatus: "active",
    createdAtUtc: "2026-05-22T08:00:00.000Z",
    updatedAtUtc: "2026-05-23T09:00:00.000Z",
    archivedAtUtc: null,
    metadata,
    aggregateStatus: "completed",
    setupDefinitionId: "setup-001",
    researchHypothesisId: "hypothesis-001",
    aggregationScope: scope,
    scopeKey: buildSetupAggregateScopeKey(scope),
    totalCandidates: 12,
    completedEvaluations: 10,
    invalidatedEvaluations: 2,
    averagePercentageMove: 1.84,
    averageAbsoluteMove: 142.5,
    averageFinalOutcome: 0.4,
    averageMaxFavorableExcursion: 2.15,
    averageMaxAdverseExcursion: -1.12,
    positiveOutcomeCount: 6,
    computedAtUtc: "2026-05-23T09:00:00.000Z",
    notes: "aggregate contract test"
  };

  assert.equal(aggregateRecord.identity.version, 2);
  assert.equal(
    aggregateRecord.scopeKey,
    'setup-001:{"setupDefinitionId":"setup-001","evaluationWindowId":"window-24h","symbolScope":{"kind":"symbol_set","symbolIds":["BTC-USDT","ETH-USDT"]},"timeRange":{"startAtUtc":"2026-05-01T00:00:00.000Z","endAtUtc":"2026-05-31T23:59:59.000Z"},"researchRunId":"run-aggregate-001","hypothesisId":"hypothesis-001"}'
  );
  assert.equal(aggregateRecord.aggregateStatus, "completed");
});

test("exposes research-feedback-decision durable relational storage planning constants", () => {
  assert.deepEqual(RESEARCH_FEEDBACK_DECISION_RELATIONAL_ENTITY_TYPES, [
    "research_feedback_decision"
  ]);
});

test("supports typed research-feedback-decision durable records", () => {
  const feedbackDecisionRecord: ResearchFeedbackDecisionDurableRecord = {
    storageSchemaVersion: "product_domain.relational.v1",
    identity: {
      boundary: "product_domain",
      entityType: "research_feedback_decision",
      entityId: "feedback-001",
      version: 2,
      relatedEntityIds: ["setup-001", "hypothesis-001", "aggregate-001"]
    },
    lifecycleStatus: "active",
    createdAtUtc: "2026-05-23T10:00:00.000Z",
    updatedAtUtc: "2026-05-23T11:00:00.000Z",
    archivedAtUtc: null,
    metadata,
    decisionStatus: "accepted",
    setupDefinitionId: "setup-001",
    researchHypothesisId: "hypothesis-001",
    setupAggregateResultId: "aggregate-001",
    evidenceStatus: "supports",
    recommendedAction: "keep_active",
    rationaleSummary: "latest aggregate evidence continues to support the active setup",
    requiresManualReview: true,
    evidenceSummary: "10 completed evaluations with positive asymmetry",
    reviewerMetadata: {
      reviewedBy: "reviewer-001",
      reviewedAt: "2026-05-23T11:00:00.000Z",
      approvalOutcome: "approved"
    }
  };

  assert.equal(feedbackDecisionRecord.identity.version, 2);
  assert.equal(feedbackDecisionRecord.decisionStatus, "accepted");
  assert.equal(feedbackDecisionRecord.reviewerMetadata?.reviewedBy, "reviewer-001");
});

test("exposes research-decision-approval durable relational storage planning constants", () => {
  assert.deepEqual(RESEARCH_DECISION_APPROVAL_RELATIONAL_ENTITY_TYPES, [
    "research_decision_approval"
  ]);
});

test("supports typed research-decision-approval durable records", () => {
  const approvalRecord: ResearchDecisionApprovalDurableRecord = {
    storageSchemaVersion: "product_domain.relational.v1",
    identity: {
      boundary: "product_domain",
      entityType: "research_decision_approval",
      entityId: "approval-001",
      version: 1,
      relatedEntityIds: ["feedback-001", "setup-001"]
    },
    lifecycleStatus: "active",
    createdAtUtc: "2026-05-24T09:00:00.000Z",
    updatedAtUtc: "2026-05-24T09:00:00.000Z",
    archivedAtUtc: null,
    metadata,
    approvalStatus: "recorded",
    researchFeedbackDecisionId: "feedback-001",
    setupDefinitionId: "setup-001",
    reviewedBy: "reviewer-001",
    reviewedAtUtc: "2026-05-24T09:00:00.000Z",
    approvalOutcome: "approved",
    reviewerNotes: "Approved after manual review.",
    authorizedNextAction: "keep_active"
  };

  assert.equal(approvalRecord.identity.version, 1);
  assert.equal(approvalRecord.approvalOutcome, "approved");
  assert.equal(approvalRecord.authorizedNextAction, "keep_active");
});

test("exposes research-review-decision durable relational storage planning constants", () => {
  assert.deepEqual(RESEARCH_REVIEW_DECISION_RELATIONAL_ENTITY_TYPES, [
    "research_review_decision"
  ]);
});

test("supports typed research-review-decision durable records", () => {
  const reviewDecisionRecord: ResearchReviewDecisionDurableRecord = {
    storageSchemaVersion: "product_domain.relational.v1",
    identity: {
      boundary: "product_domain",
      entityType: "research_review_decision",
      entityId: "review-decision:packet-001:2026-05-28T09:30:00.000Z:reviewer-001",
      version: 1,
      relatedEntityIds: ["packet-001", "setup-family-001", "setup-rev-002", "hypothesis-001"]
    },
    lifecycleStatus: "active",
    createdAtUtc: "2026-05-28T09:30:00.000Z",
    updatedAtUtc: "2026-05-28T09:31:00.000Z",
    archivedAtUtc: null,
    metadata,
    decisionStatus: "recorded",
    researchReviewPacketId: "packet-001",
    setupFamilyId: "setup-family-001",
    setupRevisionId: "setup-rev-002",
    researchHypothesisId: "hypothesis-001",
    reviewedBy: "reviewer-001",
    reviewedAtUtc: "2026-05-28T09:30:00.000Z",
    decisionOutcome: "accepted",
    reviewerNotes: "Evidence is sufficient for no-change confirmation.",
    authorizedNextAction: "confirm_no_change"
  };

  assert.equal(reviewDecisionRecord.identity.version, 1);
  assert.equal(reviewDecisionRecord.decisionOutcome, "accepted");
  assert.equal(reviewDecisionRecord.authorizedNextAction, "confirm_no_change");
});

test("exposes routed-action-execution-envelope durable relational storage planning constants", () => {
  assert.deepEqual(ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_ENTITY_TYPES, [
    "routed_action_execution_envelope"
  ]);
});

test("supports typed routed-action-execution-envelope durable records", () => {
  const routedActionExecutionEnvelopeRecord: RoutedActionExecutionEnvelopeDurableRecord = {
    storageSchemaVersion: "product_domain.relational.v1",
    identity: {
      boundary: "product_domain",
      entityType: "routed_action_execution_envelope",
      entityId: "route-envelope-001",
      version: 1,
      relatedEntityIds: [
        "route-001",
        "review-decision-001",
        "setup-family-001",
        "setup-definition-001",
        "hypothesis-001"
      ]
    },
    lifecycleStatus: "active",
    createdAtUtc: "2026-06-14T12:00:00.000Z",
    updatedAtUtc: "2026-06-14T12:00:00.000Z",
    archivedAtUtc: null,
    metadata,
    executionStatus: "prepared",
    sourceRoutingResultId: "route-001",
    sourceReviewDecisionId: "review-decision-001",
    actionTarget: "create_setup_refinement_request",
    actionCommandType: "CreateSetupRefinementRequestCommand",
    targetEntityRefs: {
      setupFamilyId: "setup-family-001",
      setupDefinitionId: "setup-definition-001",
      researchHypothesisId: "hypothesis-001",
      researchFeedbackDecisionId: "feedback-001",
      researchDecisionApprovalId: "approval-001"
    },
    routeMetadataSnapshot: {
      routeStatus: "routed",
      routedAt: "2026-06-14T11:55:00.000Z",
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
        sourceRoutingResultId: "route-001"
      }
    },
    preparedBy: "execution-preparer-001",
    preparedAtUtc: "2026-06-14T12:00:00.000Z",
    originRunId: "run-route-001",
    notes: "Prepared for downstream refinement follow-up."
  };

  assert.equal(routedActionExecutionEnvelopeRecord.identity.version, 1);
  assert.equal(
    routedActionExecutionEnvelopeRecord.actionCommandType,
    "CreateSetupRefinementRequestCommand"
  );
  assert.equal(
    routedActionExecutionEnvelopeRecord.targetEntityRefs.setupDefinitionId,
    "setup-definition-001"
  );
});
