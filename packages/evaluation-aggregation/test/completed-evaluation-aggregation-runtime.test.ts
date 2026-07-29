import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryEvaluationResultRepository,
  InMemoryResearchHypothesisRepository,
  InMemoryResearchRunRepository,
  InMemorySetupAggregateResultRepository,
  InMemorySetupDefinitionRepository,
  InMemorySignalCandidateRepository,
  createEvaluationToAggregationRefreshHandoff,
  createResearchAggregationService,
  type EvaluationResult,
  type ProductRecordMetadata,
  type SetupDefinition,
  type SignalCandidate
} from "@monitor/domain-model";

import { createCompletedEvaluationAggregationRuntime } from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: null,
  originTransitionId: null,
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: null,
  sourceObservedAtUtc: "2026-07-29T00:00:00.000Z"
};

const setupDefinition: SetupDefinition = {
  id: "setup-evaluation-aggregation-001",
  name: "Evaluation aggregation setup",
  description: "Fixture for completed evaluation aggregation",
  status: "active",
  measurableConditions: ["close above range high"],
  evaluationAssumptions: ["evaluate fixed 24h"],
  invalidationAssumptions: ["none"],
  createdAt: "2026-07-29T00:00:00.000Z",
  updatedAt: "2026-07-29T00:00:00.000Z"
};

const buildCandidate = (id: string): SignalCandidate => ({
  id,
  setupDefinitionId: setupDefinition.id,
  setupRevisionId: "revision-evaluation-aggregation-001",
  monitoredSymbolId: "BTC-USDT",
  status: "evaluated",
  detectedAt: "2026-07-29T00:00:00.000Z",
  evidenceSummary: "completed evaluation aggregation fixture",
  createdAt: "2026-07-29T00:00:00.000Z",
  updatedAt: "2026-07-29T00:00:00.000Z"
});

const buildEvaluation = (
  id: string,
  signalCandidateId: string,
  options: Partial<Pick<EvaluationResult, "absoluteMove" | "finalPrice" | "percentageMove" | "status">> = {}
): EvaluationResult => ({
  id,
  signalCandidateId,
  evaluationWindowId: "window-24h",
  status: options.status ?? "completed",
  referencePrice: 100,
  finalPrice: options.finalPrice ?? 105,
  highInWindow: 110,
  lowInWindow: 95,
  absoluteMove: options.absoluteMove ?? 5,
  percentageMove: options.percentageMove ?? 5,
  maxFavorableExcursion: 10,
  maxAdverseExcursion: -5,
  evaluatedAt: "2026-07-30T00:00:00.000Z",
  createdAt: "2026-07-30T00:00:00.000Z",
  updatedAt: "2026-07-30T00:00:00.000Z"
});

const createFixture = async () => {
  const evaluationResultRepository = new InMemoryEvaluationResultRepository();
  const signalCandidateRepository = new InMemorySignalCandidateRepository();
  const setupAggregateResultRepository = new InMemorySetupAggregateResultRepository();
  const setupDefinitionRepository = new InMemorySetupDefinitionRepository();
  const researchAggregationService = createResearchAggregationService({
    setupAggregateResultRepository,
    setupDefinitionRepository,
    researchHypothesisRepository: new InMemoryResearchHypothesisRepository(),
    researchRunRepository: new InMemoryResearchRunRepository(),
    evaluationResultRepository,
    signalCandidateRepository
  });
  const aggregationHandoff = createEvaluationToAggregationRefreshHandoff({
    researchAggregationService,
    evaluationResultRepository,
    signalCandidateRepository,
    setupAggregateResultRepository
  });
  await setupDefinitionRepository.create({ definition: setupDefinition, metadata });
  return {
    aggregationHandoff,
    evaluationResultRepository,
    runtime: createCompletedEvaluationAggregationRuntime({
      evaluationResultRepository,
      signalCandidateRepository,
      aggregationHandoff
    }),
    setupAggregateResultRepository,
    signalCandidateRepository
  };
};

const persistCompletedEvaluation = async (
  fixture: Awaited<ReturnType<typeof createFixture>>,
  candidateId: string,
  evaluationId: string,
  options?: Partial<Pick<EvaluationResult, "absoluteMove" | "finalPrice" | "percentageMove" | "status">>
): Promise<void> => {
  await fixture.signalCandidateRepository.create({
    candidate: buildCandidate(candidateId),
    metadata
  });
  await fixture.evaluationResultRepository.create({
    result: buildEvaluation(evaluationId, candidateId, options),
    metadata
  });
};

test("creates a completed aggregate with exact evaluation metrics", async () => {
  const fixture = await createFixture();
  await persistCompletedEvaluation(fixture, "candidate-aggregation-001", "evaluation-aggregation-001");

  const outcome = await fixture.runtime.refreshCompletedEvaluation({
    evaluationResultId: "evaluation-aggregation-001",
    triggeredAt: "2026-07-30T00:05:00.000Z"
  });
  const aggregate = await fixture.setupAggregateResultRepository.getById(
    outcome.setupAggregateResultId ?? ""
  );

  assert.equal(outcome.status, "created_and_refreshed");
  assert.equal(aggregate?.status, "completed");
  assert.equal(aggregate?.totalCandidates, 1);
  assert.equal(aggregate?.completedEvaluations, 1);
  assert.equal(aggregate?.averagePercentageMove, 5);
  assert.equal(aggregate?.averageAbsoluteMove, 5);
  assert.equal(aggregate?.averageFinalOutcome, 1);
  assert.equal(aggregate?.averageMaxFavorableExcursion, 10);
  assert.equal(aggregate?.averageMaxAdverseExcursion, -5);
  assert.equal(aggregate?.aggregationScope.evaluationWindowId, "window-24h");
  assert.deepEqual(aggregate?.aggregationScope.symbolScope, {
    kind: "single_symbol",
    symbolIds: ["BTC-USDT"]
  });
});

test("recomputes the existing aggregate when another completed evaluation arrives", async () => {
  const fixture = await createFixture();
  await persistCompletedEvaluation(fixture, "candidate-aggregation-002", "evaluation-aggregation-002");
  await persistCompletedEvaluation(fixture, "candidate-aggregation-003", "evaluation-aggregation-003", {
    absoluteMove: 3,
    finalPrice: 103,
    percentageMove: 3
  });

  const first = await fixture.runtime.refreshCompletedEvaluation({
    evaluationResultId: "evaluation-aggregation-002",
    triggeredAt: "2026-07-30T00:05:00.000Z"
  });
  const second = await fixture.runtime.refreshCompletedEvaluation({
    evaluationResultId: "evaluation-aggregation-003",
    triggeredAt: "2026-07-30T00:10:00.000Z"
  });
  const aggregate = await fixture.setupAggregateResultRepository.getById(
    second.setupAggregateResultId ?? ""
  );

  assert.equal(first.status, "created_and_refreshed");
  assert.equal(second.status, "refreshed_existing");
  assert.equal(second.setupAggregateResultId, first.setupAggregateResultId);
  assert.equal(aggregate?.totalCandidates, 2);
  assert.equal(aggregate?.completedEvaluations, 2);
  assert.equal(aggregate?.averagePercentageMove, 4);
  assert.equal(aggregate?.averageAbsoluteMove, 4);
  assert.equal(aggregate?.averageFinalOutcome, 1);
});

test("rejects missing, incomplete, and mismatched evaluation candidates", async () => {
  const fixture = await createFixture();
  const missing = await fixture.runtime.refreshCompletedEvaluation({
    evaluationResultId: "evaluation-missing",
    triggeredAt: "2026-07-30T00:05:00.000Z"
  });
  await persistCompletedEvaluation(fixture, "candidate-aggregation-004", "evaluation-aggregation-004", {
    status: "in_progress"
  });
  const incomplete = await fixture.runtime.refreshCompletedEvaluation({
    evaluationResultId: "evaluation-aggregation-004",
    triggeredAt: "2026-07-30T00:05:00.000Z"
  });
  const mismatchRuntime = createCompletedEvaluationAggregationRuntime({
    evaluationResultRepository: {
      async getById(): Promise<EvaluationResult> {
        return buildEvaluation("evaluation-aggregation-005", "candidate-expected");
      }
    },
    signalCandidateRepository: {
      async getById(): Promise<SignalCandidate> {
        return buildCandidate("candidate-returned");
      }
    },
    aggregationHandoff: fixture.aggregationHandoff
  });
  const mismatch = await mismatchRuntime.refreshCompletedEvaluation({
    evaluationResultId: "evaluation-aggregation-005",
    triggeredAt: "2026-07-30T00:05:00.000Z"
  });

  assert.equal(missing.status, "rejected_validation");
  assert.equal(incomplete.status, "rejected_lifecycle");
  assert.equal(mismatch.status, "rejected_validation");
  assert.match(mismatch.reason ?? "", /mismatch/);
});

test("preserves handoff rejection and converts unexpected failures into retryable failures", async () => {
  const evaluation = buildEvaluation("evaluation-aggregation-006", "candidate-aggregation-006");
  const candidate = buildCandidate("candidate-aggregation-006");
  const rejectedRuntime = createCompletedEvaluationAggregationRuntime({
    evaluationResultRepository: { async getById(): Promise<EvaluationResult> { return evaluation; } },
    signalCandidateRepository: { async getById(): Promise<SignalCandidate> { return candidate; } },
    aggregationHandoff: {
      async refresh() {
        return { status: "rejected_validation", reason: "scope rejected", warnings: [] };
      }
    }
  });
  const failingRuntime = createCompletedEvaluationAggregationRuntime({
    evaluationResultRepository: { async getById(): Promise<EvaluationResult> { return evaluation; } },
    signalCandidateRepository: { async getById(): Promise<SignalCandidate> { return candidate; } },
    aggregationHandoff: {
      async refresh(): Promise<never> {
        throw new Error("temporary handoff failure");
      }
    }
  });

  const rejected = await rejectedRuntime.refreshCompletedEvaluation({
    evaluationResultId: evaluation.id,
    triggeredAt: "2026-07-30T00:05:00.000Z"
  });
  const failed = await failingRuntime.refreshCompletedEvaluation({
    evaluationResultId: evaluation.id,
    triggeredAt: "2026-07-30T00:05:00.000Z"
  });

  assert.equal(rejected.status, "rejected_validation");
  assert.equal(rejected.reason, "scope rejected");
  assert.equal(failed.status, "failed");
  assert.match(failed.reason ?? "", /temporary handoff failure/);
  assert.equal(failed.warnings.length, 1);
});
