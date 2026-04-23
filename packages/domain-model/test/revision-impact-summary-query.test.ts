import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryEvaluationResultRepository,
  InMemorySetupAggregateResultRepository,
  InMemorySetupDefinitionRepository,
  InMemorySetupDefinitionRevisionRepository,
  InMemorySignalCandidateRepository,
  createRevisionHistoryQueryService,
  type SetupRevisionComparison
} from "../src/index.js";

const createQueryService = () =>
  createRevisionHistoryQueryService({
    setupDefinitionRevisionRepository: new InMemorySetupDefinitionRevisionRepository(),
    setupDefinitionRepository: new InMemorySetupDefinitionRepository(),
    signalCandidateRepository: new InMemorySignalCandidateRepository(),
    evaluationResultRepository: new InMemoryEvaluationResultRepository(),
    setupAggregateResultRepository: new InMemorySetupAggregateResultRepository()
  });

const buildComparison = (
  overrides?: Partial<SetupRevisionComparison>
): SetupRevisionComparison => {
  const baselineMetrics = {
    totalEvaluatedCandidates: 24,
    completedEvaluations: 20,
    invalidatedEvaluations: 2,
    averagePercentageMove: 2.1,
    averageAbsoluteMove: 2.1,
    averageFinalOutcome: 0.4,
    averageMaxFavorableExcursion: 2.8,
    averageMaxAdverseExcursion: -1.4,
    positiveOutcomeCount: 12,
    positiveOutcomeRate: 0.6
  };
  const targetMetrics = {
    totalEvaluatedCandidates: 28,
    completedEvaluations: 22,
    invalidatedEvaluations: 1,
    averagePercentageMove: 2.9,
    averageAbsoluteMove: 2.9,
    averageFinalOutcome: 0.5,
    averageMaxFavorableExcursion: 3.3,
    averageMaxAdverseExcursion: -1.1,
    positiveOutcomeCount: 15,
    positiveOutcomeRate: 0.68
  };

  const comparison: SetupRevisionComparison = {
    setupFamilyId: "setup-family-500",
    baselineRevisionId: "revision-family-500-v1",
    targetRevisionId: "revision-family-500-v2",
    baselineSetupDefinitionId: "setup-family-500-v1",
    targetSetupDefinitionId: "setup-family-500-v2",
    baselineVersion: 1,
    targetVersion: 2,
    comparisonScope: {
      evaluationWindowId: "window-24h"
    },
    baselineMetrics,
    targetMetrics,
    metricDeltas: {
      totalEvaluatedCandidates: {
        baseline: baselineMetrics.totalEvaluatedCandidates,
        target: targetMetrics.totalEvaluatedCandidates,
        delta: targetMetrics.totalEvaluatedCandidates - baselineMetrics.totalEvaluatedCandidates
      },
      completedEvaluations: {
        baseline: baselineMetrics.completedEvaluations,
        target: targetMetrics.completedEvaluations,
        delta: targetMetrics.completedEvaluations - baselineMetrics.completedEvaluations
      },
      invalidatedEvaluations: {
        baseline: baselineMetrics.invalidatedEvaluations,
        target: targetMetrics.invalidatedEvaluations,
        delta: targetMetrics.invalidatedEvaluations - baselineMetrics.invalidatedEvaluations
      },
      averagePercentageMove: {
        baseline: baselineMetrics.averagePercentageMove,
        target: targetMetrics.averagePercentageMove,
        delta: (targetMetrics.averagePercentageMove ?? 0) - (baselineMetrics.averagePercentageMove ?? 0)
      },
      averageAbsoluteMove: {
        baseline: baselineMetrics.averageAbsoluteMove,
        target: targetMetrics.averageAbsoluteMove,
        delta: (targetMetrics.averageAbsoluteMove ?? 0) - (baselineMetrics.averageAbsoluteMove ?? 0)
      },
      averageFinalOutcome: {
        baseline: baselineMetrics.averageFinalOutcome,
        target: targetMetrics.averageFinalOutcome,
        delta: (targetMetrics.averageFinalOutcome ?? 0) - (baselineMetrics.averageFinalOutcome ?? 0)
      },
      averageMaxFavorableExcursion: {
        baseline: baselineMetrics.averageMaxFavorableExcursion,
        target: targetMetrics.averageMaxFavorableExcursion,
        delta:
          (targetMetrics.averageMaxFavorableExcursion ?? 0) -
          (baselineMetrics.averageMaxFavorableExcursion ?? 0)
      },
      averageMaxAdverseExcursion: {
        baseline: baselineMetrics.averageMaxAdverseExcursion,
        target: targetMetrics.averageMaxAdverseExcursion,
        delta:
          (targetMetrics.averageMaxAdverseExcursion ?? 0) -
          (baselineMetrics.averageMaxAdverseExcursion ?? 0)
      },
      positiveOutcomeCount: {
        baseline: baselineMetrics.positiveOutcomeCount,
        target: targetMetrics.positiveOutcomeCount,
        delta: targetMetrics.positiveOutcomeCount - baselineMetrics.positiveOutcomeCount
      },
      positiveOutcomeRate: {
        baseline: baselineMetrics.positiveOutcomeRate,
        target: targetMetrics.positiveOutcomeRate,
        delta: (targetMetrics.positiveOutcomeRate ?? 0) - (baselineMetrics.positiveOutcomeRate ?? 0)
      }
    },
    baselineEvidenceCounts: {
      candidateCount: 24,
      evaluationCount: 22,
      aggregateCount: 2
    },
    targetEvidenceCounts: {
      candidateCount: 28,
      evaluationCount: 23,
      aggregateCount: 2
    },
    comparedAt: "2026-06-01T10:00:00.000Z",
    status: "compared"
  };

  return {
    ...comparison,
    ...overrides
  };
};

test("valid summary command shape", async () => {
  const queryService = createQueryService();
  const comparison = buildComparison();

  const result = await queryService.buildImpactSummary({
    setupFamilyId: comparison.setupFamilyId,
    baselineRevisionId: comparison.baselineRevisionId,
    targetRevisionId: comparison.targetRevisionId,
    comparison,
    summarizedAt: "2026-06-01T11:00:00.000Z"
  });

  assert.equal(result.status, "summarized");
  assert.equal(result.summary?.impactClassification, "improved");
  assert.equal(result.summary?.evidenceSufficiency, "sufficient");
  assert.equal(result.summary?.baselineRevisionId, comparison.baselineRevisionId);
  assert.equal(result.summary?.targetRevisionId, comparison.targetRevisionId);
});

test("missing comparison rejected", async () => {
  const queryService = createQueryService();

  const result = await queryService.buildImpactSummary({
    setupFamilyId: "setup-family-500",
    baselineRevisionId: "revision-family-500-v1",
    targetRevisionId: "revision-family-500-v2",
    summarizedAt: "2026-06-01T11:00:00.000Z"
  });

  assert.equal(result.status, "rejected");
  assert.equal(result.reason?.includes("comparison payload reference is required"), true);
});

test("insufficient evidence produces explicit insufficiency and inconclusive outcome", async () => {
  const queryService = createQueryService();
  const comparison = buildComparison({
    status: "insufficient_evidence",
    baselineMetrics: {
      ...buildComparison().baselineMetrics,
      completedEvaluations: 2
    },
    targetMetrics: {
      ...buildComparison().targetMetrics,
      completedEvaluations: 0
    },
    metricDeltas: {
      ...buildComparison().metricDeltas,
      completedEvaluations: {
        baseline: 2,
        target: 0,
        delta: -2
      }
    }
  });

  const result = await queryService.buildImpactSummary({
    setupFamilyId: comparison.setupFamilyId,
    baselineRevisionId: comparison.baselineRevisionId,
    targetRevisionId: comparison.targetRevisionId,
    comparison,
    summarizedAt: "2026-06-01T11:00:00.000Z"
  });

  assert.equal(result.status, "summarized");
  assert.equal(result.summary?.impactClassification, "inconclusive");
  assert.equal(result.summary?.evidenceSufficiency, "insufficient");
});

test("mixed metric deltas produce mixed classification", async () => {
  const queryService = createQueryService();
  const base = buildComparison();
  const comparison = buildComparison({
    metricDeltas: {
      ...base.metricDeltas,
      completedEvaluations: {
        baseline: 20,
        target: 22,
        delta: 2
      },
      positiveOutcomeRate: {
        baseline: 0.6,
        target: 0.55,
        delta: -0.05
      },
      averagePercentageMove: {
        baseline: 2.1,
        target: 3.1,
        delta: 1
      },
      averageFinalOutcome: {
        baseline: 0.4,
        target: 0.1,
        delta: -0.3
      },
      averageMaxFavorableExcursion: {
        baseline: 2.8,
        target: 3.3,
        delta: 0.5
      },
      averageMaxAdverseExcursion: {
        baseline: -1.4,
        target: -1.9,
        delta: -0.5
      }
    }
  });

  const result = await queryService.buildImpactSummary({
    setupFamilyId: comparison.setupFamilyId,
    baselineRevisionId: comparison.baselineRevisionId,
    targetRevisionId: comparison.targetRevisionId,
    comparison,
    summarizedAt: "2026-06-01T11:00:00.000Z"
  });

  assert.equal(result.status, "summarized");
  assert.equal(result.summary?.impactClassification, "mixed");
});

test("result shape keeps explicit baseline and target references with warnings", async () => {
  const queryService = createQueryService();
  const comparison = buildComparison({
    notes: ["aggregate evidence missing for one or both revisions in comparison scope"],
    baselineMetrics: {
      ...buildComparison().baselineMetrics,
      completedEvaluations: 6
    },
    targetMetrics: {
      ...buildComparison().targetMetrics,
      completedEvaluations: 7
    },
    metricDeltas: {
      ...buildComparison().metricDeltas,
      completedEvaluations: {
        baseline: 6,
        target: 7,
        delta: 1
      }
    }
  });

  const result = await queryService.buildImpactSummary({
    setupFamilyId: comparison.setupFamilyId,
    baselineRevisionId: comparison.baselineRevisionId,
    targetRevisionId: comparison.targetRevisionId,
    revisionComparisonId: "comparison-family-500-v1-v2",
    comparison,
    summarizedAt: "2026-06-01T11:00:00.000Z"
  });

  assert.equal(result.status, "summarized");
  assert.equal(result.summary?.baselineRevisionId, "revision-family-500-v1");
  assert.equal(result.summary?.targetRevisionId, "revision-family-500-v2");
  assert.equal(result.summary?.comparisonReference?.revisionComparisonId, "comparison-family-500-v1-v2");
  assert.equal(result.warnings.length > 0, true);
  assert.equal((result.summary?.warnings?.length ?? 0) > 0, true);
});
