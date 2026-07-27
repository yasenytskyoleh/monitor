import assert from "node:assert/strict";
import test from "node:test";

import {
  composeImplementedProductRelationalRepositories,
  InMemoryFirstDurableRelationalRepositoryAdapter,
  InMemoryMonitoredSymbolRelationalRepositoryAdapter,
  InMemoryResearchDecisionApprovalRelationalRepositoryAdapter,
  InMemoryResearchFeedbackDecisionRelationalRepositoryAdapter,
  InMemoryResearchReviewDecisionRelationalRepositoryAdapter,
  InMemoryResearchRunRelationalRepositoryAdapter,
  InMemoryReviewDecisionRoutingResultRelationalRepositoryAdapter,
  InMemoryRoutedActionExecutionEnvelopeRelationalRepositoryAdapter,
  InMemorySetupDefinitionRevisionRelationalRepositoryAdapter,
  InMemorySetupAggregateRelationalRepositoryAdapter,
  InMemorySetupLifecycleMutationRecordRelationalRepositoryAdapter,
  InMemorySignalEvaluationRelationalRepositoryAdapter,
  InMemorySetupRefinementRequestRelationalRepositoryAdapter,
  InMemorySetupRevisionActivationRecordRelationalRepositoryAdapter,
  type EvaluationResult,
  type MonitoredSymbol,
  type ProductRecordMetadata,
  type ResearchDecisionApproval,
  type ResearchFeedbackDecision,
  type ResearchHypothesis,
  type ResearchReviewDecision,
  type ResearchRun,
  type ReviewDecisionRoutingResult,
  type RoutedActionExecutionEnvelope,
  type SetupAggregateResult,
  type SetupDefinition,
  type SetupDefinitionRevision,
  type SetupRevisionActivationRecord,
  type SetupRefinementRequest,
  type SetupLifecycleMutationRecord,
  type SignalCandidate
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-001",
  originTransitionId: "transition-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-001",
  sourceObservedAtUtc: "2026-05-23T09:00:00.000Z"
};

const buildSetupDefinition = (id: string): SetupDefinition => ({
  id,
  name: "Breakout Retest",
  description: "Retest after breakout with continuation bias.",
  status: "active",
  measurableConditions: ["4h close above range high"],
  evaluationAssumptions: ["evaluate over fixed 24h window"],
  invalidationAssumptions: ["invalidate on failed retest"],
  createdAt: "2026-05-23T08:00:00.000Z",
  updatedAt: "2026-05-23T09:00:00.000Z"
});

const buildResearchHypothesis = (id: string, setupDefinitionId: string): ResearchHypothesis => ({
  id,
  title: "Breakout retests outperform random entries",
  description: "Structured breakout retests should show positive asymmetry.",
  relatedSetupDefinitionIds: [setupDefinitionId],
  assumptions: ["median MFE exceeds median MAE over 50 samples"],
  notes: [],
  status: "active",
  createdAt: "2026-05-23T08:00:00.000Z",
  updatedAt: "2026-05-23T09:00:00.000Z"
});

const buildResearchRun = (runId: string, hypothesisId: string, setupId: string): ResearchRun => ({
  runId,
  hypothesisId,
  setupId,
  candidateIds: ["candidate-001"],
  evaluationWindowIds: ["window-24h"],
  evaluationResultIds: ["result-001"],
  status: "running",
  startedAtUtc: "2026-05-24T09:30:00.000Z",
  createdAtUtc: "2026-05-24T09:30:00.000Z",
  updatedAtUtc: "2026-05-24T09:30:00.000Z"
});

const buildSignalCandidate = (id: string, setupDefinitionId: string): SignalCandidate => ({
  id,
  setupDefinitionId,
  setupRevisionId: `${setupDefinitionId}-rev-001`,
  monitoredSymbolId: "BTC-USDT",
  status: "evaluated",
  detectedAt: "2026-05-23T09:30:00.000Z",
  evidenceSummary: "Breakout retest candidate",
  createdAt: "2026-05-23T09:30:00.000Z",
  updatedAt: "2026-05-23T09:30:00.000Z"
});

const buildMonitoredSymbol = (): MonitoredSymbol => ({
  symbolId: "BTC-USDT",
  baseAsset: "BTC",
  quoteAsset: "USDT",
  displayName: "BTC/USDT",
  marketScope: "spot",
  status: "active",
  providerHint: "unknown",
  tags: ["primary"],
  sourceBindings: [],
  createdAtUtc: "2026-05-23T09:00:00.000Z",
  updatedAtUtc: "2026-05-23T09:00:00.000Z"
});

const buildEvaluationResult = (id: string, signalCandidateId: string): EvaluationResult => ({
  id,
  signalCandidateId,
  evaluationWindowId: "window-24h",
  status: "completed",
  referencePrice: 100,
  finalPrice: 103,
  highInWindow: 104,
  lowInWindow: 99,
  absoluteMove: 3,
  percentageMove: 3,
  maxFavorableExcursion: 4,
  maxAdverseExcursion: -1,
  evaluatedAt: "2026-05-24T09:30:00.000Z",
  createdAt: "2026-05-24T09:30:00.000Z",
  updatedAt: "2026-05-24T09:30:00.000Z"
});

const buildAggregate = (
  id: string,
  setupDefinitionId: string,
  researchHypothesisId: string
): SetupAggregateResult => ({
  id,
  setupDefinitionId,
  researchHypothesisId,
  aggregationScope: {
    setupDefinitionId,
    evaluationWindowId: "window-24h",
    symbolScope: {
      kind: "single_symbol",
      symbolIds: ["BTC-USDT"]
    },
    timeRange: {
      startAtUtc: "2026-05-01T00:00:00.000Z",
      endAtUtc: "2026-05-31T23:59:59.000Z"
    },
    researchRunId: "run-aggregate-001",
    hypothesisId: researchHypothesisId
  },
  status: "completed",
  totalCandidates: 1,
  completedEvaluations: 1,
  invalidatedEvaluations: 0,
  averagePercentageMove: 3,
  averageAbsoluteMove: 3,
  averageFinalOutcome: 1,
  averageMaxFavorableExcursion: 4,
  averageMaxAdverseExcursion: -1,
  positiveOutcomeCount: 1,
  computedAt: "2026-05-24T10:00:00.000Z",
  notes: "composed bundle test",
  createdAt: "2026-05-24T10:00:00.000Z",
  updatedAt: "2026-05-24T10:00:00.000Z"
});

const buildFeedbackDecision = (
  id: string,
  setupDefinitionId: string,
  researchHypothesisId: string,
  setupAggregateResultId: string,
  recommendedAction: ResearchFeedbackDecision["recommendedAction"] = "keep_active"
): ResearchFeedbackDecision => ({
  id,
  setupDefinitionId,
  researchHypothesisId,
  setupAggregateResultId,
  evidenceStatus: "supports",
  recommendedAction,
  rationaleSummary: "aggregate evidence supports the selected follow-up action",
  decisionStatus: "proposed",
  requiresManualReview: true,
  evidenceSummary: "shared bundle feedback decision",
  createdAt: "2026-05-24T10:15:00.000Z",
  updatedAt: "2026-05-24T10:15:00.000Z"
});

const buildApproval = (
  id: string,
  researchFeedbackDecisionId: string,
  setupDefinitionId: string,
  authorizedNextAction: ResearchDecisionApproval["authorizedNextAction"] = "keep_active"
): ResearchDecisionApproval => ({
  id,
  researchFeedbackDecisionId,
  setupDefinitionId,
  reviewedBy: "reviewer-001",
  reviewedAt: "2026-05-24T10:30:00.000Z",
  approvalOutcome: "approved",
  reviewerNotes: "Approved in composed bundle test.",
  approvalStatus: "recorded",
  authorizedNextAction,
  createdAt: "2026-05-24T10:30:00.000Z",
  updatedAt: "2026-05-24T10:30:00.000Z"
});

const buildReviewDecision = (
  id: string,
  researchHypothesisId: string
): ResearchReviewDecision => ({
  id,
  researchReviewPacketId: "review-packet-001",
  setupFamilyId: "setup-family-001",
  setupRevisionId: "setup-family-001-v2",
  researchHypothesisId,
  reviewedBy: "reviewer-001",
  reviewedAt: "2026-05-24T10:45:00.000Z",
  decisionOutcome: "accepted",
  reviewerNotes: "Review confirms the current setup family revision should stay active.",
  authorizedNextAction: "prepare_lifecycle_mutation_follow_up",
  decisionStatus: "recorded",
  createdAt: "2026-05-24T10:45:00.000Z",
  updatedAt: "2026-05-24T10:45:00.000Z"
});

const buildRoutingResult = (
  routingId: string,
  researchReviewDecisionId: string
): ReviewDecisionRoutingResult => ({
  status: "routed",
  routingId,
  researchReviewDecisionId,
  setupFamilyId: "setup-family-001",
  setupRevisionId: "setup-family-001-v2",
  decisionOutcome: "accepted",
  authorizedNextAction: "prepare_lifecycle_mutation_follow_up",
  target: "apply_setup_lifecycle_mutation",
  downstreamCommandType: "ApplyApprovedSetupMutationCommand",
  routedAt: "2026-05-24T10:50:00.000Z",
  warnings: []
});

const buildEnvelope = (
  id: string,
  sourceReviewDecisionId: string
): RoutedActionExecutionEnvelope => ({
  id,
  sourceRoutingResultId: "routing-result-001",
  sourceReviewDecisionId,
  actionTarget: "apply_setup_lifecycle_mutation",
  actionCommandType: "ApplyApprovedSetupMutationCommand",
  targetEntityRefs: {
    setupFamilyId: "setup-family-001",
    setupDefinitionId: "setup-001",
    researchDecisionApprovalId: "approval-001"
  },
  routeMetadataSnapshot: {
    routeStatus: "routed",
    routedAt: "2026-05-24T10:50:00.000Z",
    decisionOutcome: "accepted",
    authorizedNextAction: "prepare_lifecycle_mutation_follow_up",
    downstreamCommandType: "ApplyApprovedSetupMutationCommand"
  },
  executionPayloadSnapshot: {
    commandType: "ApplyApprovedSetupMutationCommand",
    target: "apply_setup_lifecycle_mutation",
    commandInput: {
      setupDefinitionId: "setup-001",
      setupFamilyId: "setup-family-001",
      sourceReviewDecisionId,
      sourceRoutingResultId: "routing-result-001"
    }
  },
  executionStatus: "prepared",
  preparedBy: "review-operator-001",
  preparedAt: "2026-05-24T10:55:00.000Z",
  notes: "Prepared in shared bundle test.",
  createdAt: "2026-05-24T10:55:00.000Z",
  updatedAt: "2026-05-24T10:55:00.000Z"
});

const buildMutation = (
  id: string,
  setupDefinitionId: string,
  researchDecisionApprovalId: string,
  researchFeedbackDecisionId: string
): SetupLifecycleMutationRecord => ({
  id,
  setupDefinitionId,
  researchDecisionApprovalId,
  researchFeedbackDecisionId,
  previousStatus: "active",
  newStatus: "paused",
  approvedAction: "pause_setup",
  mutatedBy: "reviewer-001",
  mutatedAt: "2026-05-24T11:00:00.000Z",
  notes: "Paused after approved downstream review.",
  createdAt: "2026-05-24T11:00:00.000Z",
  updatedAt: "2026-05-24T11:00:00.000Z"
});

const buildSetupRefinementRequest = (
  id: string,
  setupDefinitionId: string,
  sourceResearchDecisionApprovalId: string,
  sourceResearchFeedbackDecisionId: string
): SetupRefinementRequest => ({
  id,
  setupDefinitionId,
  sourceResearchDecisionApprovalId,
  sourceResearchFeedbackDecisionId,
  refinementRationaleSummary:
    "The setup remains valid but needs tighter refinement follow-up.",
  requestedChangesSummary:
    "Tighten invalidation logic and add reclaim-volume confirmation.",
  evidenceReferences: [sourceResearchFeedbackDecisionId, "aggregate-002"],
  status: "proposed",
  requestedBy: "research-service",
  requestedAt: "2026-05-24T11:10:00.000Z",
  assignedReviewerId: "reviewer-002",
  assignedOwnerId: "owner-002",
  createdAt: "2026-05-24T11:10:00.000Z",
  updatedAt: "2026-05-24T11:10:00.000Z"
});

const buildSetupDefinitionRevision = (
  id: string,
  setupDefinitionId: string,
  previousSetupDefinitionId: string,
  sourceSetupRefinementRequestId: string,
  sourceResearchDecisionApprovalId?: string,
  sourceResearchFeedbackDecisionId?: string
): SetupDefinitionRevision => ({
  id,
  setupDefinitionId,
  previousSetupDefinitionId,
  versionInfo: {
    setupFamilyId: "setup-family-002",
    revisionId: id,
    version: 2
  },
  revisionReason: "Tighten invalidation after approved refinement follow-up.",
  revisionStatus: "draft",
  changedFieldsSummary: "Updated measurable conditions and invalidation assumptions.",
  createdBy: "research-reviewer-002",
  createdAt: "2026-05-24T11:15:00.000Z",
  notes: "Prepared in shared bundle test.",
  sourceSetupRefinementRequestId,
  ...(sourceResearchDecisionApprovalId
    ? { sourceResearchDecisionApprovalId }
    : {}),
  ...(sourceResearchFeedbackDecisionId
    ? { sourceResearchFeedbackDecisionId }
    : {}),
  updatedAt: "2026-05-24T11:15:00.000Z"
});

const buildSetupRevisionActivationRecord = (
  id: string,
  targetRevisionId: string,
  targetSetupDefinitionId: string
): SetupRevisionActivationRecord => ({
  id,
  setupFamilyId: "setup-family-002",
  targetRevisionId,
  targetSetupDefinitionId,
  activatedBy: "research-reviewer-002",
  activatedAt: "2026-05-24T11:20:00.000Z",
  activationOutcome: "activated",
  rationale: "Promote the accepted revision into the shared bundle test path.",
  createdAt: "2026-05-24T11:20:00.000Z",
  updatedAt: "2026-05-24T11:20:00.000Z"
});

test(
  "implemented product repository composition includes research runs and activation records",
  async () => {
    const firstDurableAdapter = new InMemoryFirstDurableRelationalRepositoryAdapter();
    const monitoredSymbolAdapter = new InMemoryMonitoredSymbolRelationalRepositoryAdapter();
    const setupAggregateAdapter = new InMemorySetupAggregateRelationalRepositoryAdapter(
      firstDurableAdapter
    );
    const feedbackDecisionAdapter =
      new InMemoryResearchFeedbackDecisionRelationalRepositoryAdapter({
        loadSetupDefinitionRecord:
          firstDurableAdapter.loadSetupDefinitionRecord.bind(firstDurableAdapter),
        loadResearchHypothesisBundle:
          firstDurableAdapter.loadResearchHypothesisBundle.bind(firstDurableAdapter),
        loadSetupAggregateResultRecord:
          setupAggregateAdapter.loadSetupAggregateResultRecord.bind(setupAggregateAdapter)
      });
    const reviewDecisionAdapter = new InMemoryResearchReviewDecisionRelationalRepositoryAdapter({
      loadResearchHypothesisBundle:
        firstDurableAdapter.loadResearchHypothesisBundle.bind(firstDurableAdapter)
    });
    const reviewDecisionRoutingResultAdapter =
      new InMemoryReviewDecisionRoutingResultRelationalRepositoryAdapter({
        loadResearchReviewDecisionRecord:
          reviewDecisionAdapter.loadResearchReviewDecisionRecord.bind(reviewDecisionAdapter)
      });
    const approvalAdapter = new InMemoryResearchDecisionApprovalRelationalRepositoryAdapter({
      loadResearchFeedbackDecisionRecord:
        feedbackDecisionAdapter.loadResearchFeedbackDecisionRecord.bind(feedbackDecisionAdapter),
      loadSetupDefinitionRecord:
        firstDurableAdapter.loadSetupDefinitionRecord.bind(firstDurableAdapter)
    });
    const setupRefinementRequestAdapter =
      new InMemorySetupRefinementRequestRelationalRepositoryAdapter({
        loadSetupDefinitionRecord:
          firstDurableAdapter.loadSetupDefinitionRecord.bind(firstDurableAdapter),
        loadResearchDecisionApprovalRecord:
          approvalAdapter.loadResearchDecisionApprovalRecord.bind(approvalAdapter),
        loadResearchFeedbackDecisionRecord:
          feedbackDecisionAdapter.loadResearchFeedbackDecisionRecord.bind(
            feedbackDecisionAdapter
          )
      });
    const setupDefinitionRevisionAdapter =
      new InMemorySetupDefinitionRevisionRelationalRepositoryAdapter({
        loadSetupDefinitionRecord:
          firstDurableAdapter.loadSetupDefinitionRecord.bind(firstDurableAdapter),
        loadSetupRefinementRequestRecord:
          setupRefinementRequestAdapter.loadSetupRefinementRequest.bind(
            setupRefinementRequestAdapter
          ),
        loadResearchDecisionApprovalRecord:
          approvalAdapter.loadResearchDecisionApprovalRecord.bind(approvalAdapter),
        loadResearchFeedbackDecisionRecord:
          feedbackDecisionAdapter.loadResearchFeedbackDecisionRecord.bind(
            feedbackDecisionAdapter
          )
      });
    const setupRevisionActivationRecordAdapter =
      new InMemorySetupRevisionActivationRecordRelationalRepositoryAdapter({
        loadSetupDefinitionRecord:
          firstDurableAdapter.loadSetupDefinitionRecord.bind(firstDurableAdapter),
        loadSetupDefinitionRevisionRecord:
          setupDefinitionRevisionAdapter.loadSetupDefinitionRevisionRecord.bind(
            setupDefinitionRevisionAdapter
          )
      });
    const repositories = composeImplementedProductRelationalRepositories({
      firstDurableAdapter,
      monitoredSymbolAdapter,
      signalEvaluationAdapter: new InMemorySignalEvaluationRelationalRepositoryAdapter(
        firstDurableAdapter
      ),
      setupAggregateAdapter,
      feedbackDecisionAdapter,
      researchRunAdapter: new InMemoryResearchRunRelationalRepositoryAdapter(),
      approvalAdapter,
      reviewDecisionAdapter,
      reviewDecisionRoutingResultAdapter,
      routedActionAdapter: new InMemoryRoutedActionExecutionEnvelopeRelationalRepositoryAdapter({
        loadResearchReviewDecisionRecord:
          reviewDecisionAdapter.loadResearchReviewDecisionRecord.bind(reviewDecisionAdapter)
      }),
      setupLifecycleMutationRecordAdapter:
        new InMemorySetupLifecycleMutationRecordRelationalRepositoryAdapter({
          loadSetupDefinitionRecord:
            firstDurableAdapter.loadSetupDefinitionRecord.bind(firstDurableAdapter),
          loadResearchDecisionApprovalRecord:
            approvalAdapter.loadResearchDecisionApprovalRecord.bind(approvalAdapter),
          loadResearchFeedbackDecisionRecord:
            feedbackDecisionAdapter.loadResearchFeedbackDecisionRecord.bind(
              feedbackDecisionAdapter
            )
        }),
      setupDefinitionRevisionAdapter,
      setupRefinementRequestAdapter,
      setupRevisionActivationRecordAdapter
    });

    await repositories.setupDefinitionRepository.create({
      definition: buildSetupDefinition("setup-001"),
      metadata
    });
    await repositories.researchHypothesisRepository.create({
      hypothesis: buildResearchHypothesis("hypothesis-001", "setup-001"),
      metadata
    });
    await repositories.monitoredSymbolRepository.create({
      symbol: buildMonitoredSymbol(),
      metadata
    });
    await repositories.signalCandidateRepository.create({
      candidate: buildSignalCandidate("candidate-001", "setup-001"),
      metadata
    });
    await repositories.evaluationResultRepository.create({
      result: buildEvaluationResult("result-001", "candidate-001"),
      metadata
    });
    await repositories.researchRunRepository.create({
      run: buildResearchRun("research-run-001", "hypothesis-001", "setup-001"),
      metadata
    });
    await repositories.setupAggregateResultRepository.create({
      aggregate: buildAggregate("aggregate-001", "setup-001", "hypothesis-001"),
      metadata
    });
    await repositories.researchFeedbackDecisionRepository.create({
      decision: buildFeedbackDecision(
        "feedback-001",
        "setup-001",
        "hypothesis-001",
        "aggregate-001"
      ),
      metadata
    });
    await repositories.researchDecisionApprovalRepository.create({
      approval: buildApproval("approval-001", "feedback-001", "setup-001"),
      metadata
    });
    await repositories.researchReviewDecisionRepository.create({
      decision: buildReviewDecision("review-decision-001", "hypothesis-001"),
      metadata
    });
    await repositories.reviewDecisionRoutingResultRepository.create({
      result: buildRoutingResult("routing-result-001", "review-decision-001"),
      metadata
    });
    await repositories.routedActionExecutionEnvelopeRepository.create({
      envelope: buildEnvelope("execution-envelope-001", "review-decision-001"),
      metadata
    });
    await repositories.setupLifecycleMutationRecordRepository.create({
      mutation: buildMutation("mutation-001", "setup-001", "approval-001", "feedback-001"),
      metadata
    });
    await repositories.setupDefinitionRepository.create({
      definition: buildSetupDefinition("setup-002"),
      metadata
    });
    await repositories.researchHypothesisRepository.create({
      hypothesis: buildResearchHypothesis("hypothesis-002", "setup-002"),
      metadata
    });
    await repositories.setupAggregateResultRepository.create({
      aggregate: buildAggregate("aggregate-002", "setup-002", "hypothesis-002"),
      metadata
    });
    await repositories.researchFeedbackDecisionRepository.create({
      decision: buildFeedbackDecision(
        "feedback-002",
        "setup-002",
        "hypothesis-002",
        "aggregate-002",
        "refine_definition"
      ),
      metadata
    });
    await repositories.researchDecisionApprovalRepository.create({
      approval: buildApproval(
        "approval-002",
        "feedback-002",
        "setup-002",
        "refine_definition"
      ),
      metadata
    });
    await repositories.setupRefinementRequestRepository.create({
      request: buildSetupRefinementRequest(
        "refinement-001",
        "setup-002",
        "approval-002",
        "feedback-002"
      ),
      metadata
    });
    await repositories.setupDefinitionRepository.create({
      definition: {
        ...buildSetupDefinition("setup-003"),
        status: "draft"
      },
      metadata
    });
    await repositories.setupDefinitionRevisionRepository.create({
      revision: buildSetupDefinitionRevision(
        "revision-001",
        "setup-003",
        "setup-002",
        "refinement-001",
        "approval-002",
        "feedback-002"
      ),
      metadata
    });
    await repositories.setupRevisionActivationRecordRepository.create({
      activation: buildSetupRevisionActivationRecord(
        "activation-001",
        "revision-001",
        "setup-003"
      ),
      metadata
    });

    const storedMonitoredSymbol = await repositories.monitoredSymbolRepository.getById(
      "BTC-USDT"
    );
    const storedCandidate = await repositories.signalCandidateRepository.getById("candidate-001");
    const storedEvaluation =
      await repositories.evaluationResultRepository.getBySignalCandidateAndWindow(
        "candidate-001",
        "window-24h"
      );
    const storedResearchRun = await repositories.researchRunRepository.getById(
      "research-run-001"
    );
    const storedAggregate =
      await repositories.setupAggregateResultRepository.getBySetupDefinitionAndScope(
        "setup-001",
        buildAggregate("aggregate-001", "setup-001", "hypothesis-001").aggregationScope
      );
    const storedFeedbackDecision =
      await repositories.researchFeedbackDecisionRepository.getById("feedback-001");
    const storedApproval =
      await repositories.researchDecisionApprovalRepository.getById("approval-001");
    const storedReviewDecision =
      await repositories.researchReviewDecisionRepository.getById("review-decision-001");
    const storedRoutingResult = await repositories.reviewDecisionRoutingResultRepository.getById(
      "routing-result-001"
    );
    const storedEnvelope =
      await repositories.routedActionExecutionEnvelopeRepository.getById(
        "execution-envelope-001"
      );
    const storedMutation =
      await repositories.setupLifecycleMutationRecordRepository.getById("mutation-001");
    const storedRefinementRequest =
      await repositories.setupRefinementRequestRepository.getById("refinement-001");
    const storedRevision =
      await repositories.setupDefinitionRevisionRepository.getById("revision-001");
    const storedActivation =
      await repositories.setupRevisionActivationRecordRepository.getById("activation-001");
    const refinementRequestsForApproval =
      await repositories.setupRefinementRequestRepository.listByApprovalId("approval-002");
    const latestRevision =
      await repositories.setupDefinitionRevisionRepository.getLatestBySetupFamilyId(
        "setup-family-002"
      );
    const activationsForFamily =
      await repositories.setupRevisionActivationRecordRepository.listBySetupFamilyId(
        "setup-family-002"
      );

    assert.equal(storedMonitoredSymbol?.displayName, "BTC/USDT");
    assert.equal(storedCandidate?.setupDefinitionId, "setup-001");
    assert.equal(storedEvaluation?.id, "result-001");
    assert.equal(storedResearchRun?.hypothesisId, "hypothesis-001");
    assert.equal(storedAggregate?.researchHypothesisId, "hypothesis-001");
    assert.equal(storedFeedbackDecision?.setupAggregateResultId, "aggregate-001");
    assert.equal(storedApproval?.researchFeedbackDecisionId, "feedback-001");
    assert.equal(storedApproval?.authorizedNextAction, "keep_active");
    assert.equal(storedReviewDecision?.researchHypothesisId, "hypothesis-001");
    assert.equal(
      storedReviewDecision?.authorizedNextAction,
      "prepare_lifecycle_mutation_follow_up"
    );
    assert.equal(storedRoutingResult?.researchReviewDecisionId, "review-decision-001");
    assert.equal(
      storedRoutingResult?.downstreamCommandType,
      "ApplyApprovedSetupMutationCommand"
    );
    assert.equal(storedEnvelope?.sourceReviewDecisionId, "review-decision-001");
    assert.equal(
      storedEnvelope?.actionCommandType,
      "ApplyApprovedSetupMutationCommand"
    );
    assert.equal(storedMutation?.researchDecisionApprovalId, "approval-001");
    assert.equal(storedMutation?.researchFeedbackDecisionId, "feedback-001");
    assert.equal(storedMutation?.newStatus, "paused");
    assert.equal(storedRefinementRequest?.setupDefinitionId, "setup-002");
    assert.equal(
      storedRefinementRequest?.sourceResearchDecisionApprovalId,
      "approval-002"
    );
    assert.equal(storedRefinementRequest?.assignedOwnerId, "owner-002");
    assert.equal(refinementRequestsForApproval.length, 1);
    assert.equal(
      refinementRequestsForApproval[0]?.sourceResearchFeedbackDecisionId,
      "feedback-002"
    );
    assert.equal(storedRevision?.setupDefinitionId, "setup-003");
    assert.equal(storedRevision?.previousSetupDefinitionId, "setup-002");
    assert.equal(storedRevision?.sourceSetupRefinementRequestId, "refinement-001");
    assert.equal(latestRevision?.id, "revision-001");
    assert.equal(storedActivation?.targetRevisionId, "revision-001");
    assert.equal(storedActivation?.targetSetupDefinitionId, "setup-003");
    assert.equal(activationsForFamily.length, 1);
    assert.equal(activationsForFamily[0]?.id, "activation-001");
  }
);
