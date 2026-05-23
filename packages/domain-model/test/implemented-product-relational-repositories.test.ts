import assert from "node:assert/strict";
import test from "node:test";

import {
  composeImplementedProductRelationalRepositories,
  InMemoryFirstDurableRelationalRepositoryAdapter,
  InMemoryResearchFeedbackDecisionRelationalRepositoryAdapter,
  InMemorySetupAggregateRelationalRepositoryAdapter,
  InMemorySignalEvaluationRelationalRepositoryAdapter,
  type EvaluationResult,
  type ProductRecordMetadata,
  type ResearchFeedbackDecision,
  type ResearchHypothesis,
  type SetupAggregateResult,
  type SetupDefinition,
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
  setupAggregateResultId: string
): ResearchFeedbackDecision => ({
  id,
  setupDefinitionId,
  researchHypothesisId,
  setupAggregateResultId,
  evidenceStatus: "supports",
  recommendedAction: "keep_active",
  rationaleSummary: "aggregate evidence supports keeping the setup active",
  decisionStatus: "proposed",
  requiresManualReview: true,
  evidenceSummary: "shared bundle feedback decision",
  createdAt: "2026-05-24T10:15:00.000Z",
  updatedAt: "2026-05-24T10:15:00.000Z"
});

test("implemented product repository composition supports the current end-to-end entity chain through feedback decisions", async () => {
  const firstDurableAdapter = new InMemoryFirstDurableRelationalRepositoryAdapter();
  const setupAggregateAdapter = new InMemorySetupAggregateRelationalRepositoryAdapter(
    firstDurableAdapter
  );
  const repositories = composeImplementedProductRelationalRepositories({
    firstDurableAdapter,
    signalEvaluationAdapter: new InMemorySignalEvaluationRelationalRepositoryAdapter(
      firstDurableAdapter
    ),
    setupAggregateAdapter,
    feedbackDecisionAdapter: new InMemoryResearchFeedbackDecisionRelationalRepositoryAdapter({
      loadSetupDefinitionRecord:
        firstDurableAdapter.loadSetupDefinitionRecord.bind(firstDurableAdapter),
      loadResearchHypothesisBundle:
        firstDurableAdapter.loadResearchHypothesisBundle.bind(firstDurableAdapter),
      loadSetupAggregateResultRecord:
        setupAggregateAdapter.loadSetupAggregateResultRecord.bind(setupAggregateAdapter)
    })
  });

  await repositories.setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-001"),
    metadata
  });
  await repositories.researchHypothesisRepository.create({
    hypothesis: buildResearchHypothesis("hypothesis-001", "setup-001"),
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

  const storedCandidate = await repositories.signalCandidateRepository.getById("candidate-001");
  const storedEvaluation = await repositories.evaluationResultRepository.getBySignalCandidateAndWindow(
    "candidate-001",
    "window-24h"
  );
  const storedAggregate =
    await repositories.setupAggregateResultRepository.getBySetupDefinitionAndScope(
      "setup-001",
      buildAggregate("aggregate-001", "setup-001", "hypothesis-001").aggregationScope
    );
  const storedFeedbackDecision =
    await repositories.researchFeedbackDecisionRepository.getById("feedback-001");

  assert.equal(storedCandidate?.setupDefinitionId, "setup-001");
  assert.equal(storedEvaluation?.id, "result-001");
  assert.equal(storedAggregate?.researchHypothesisId, "hypothesis-001");
  assert.equal(storedFeedbackDecision?.setupAggregateResultId, "aggregate-001");
});
