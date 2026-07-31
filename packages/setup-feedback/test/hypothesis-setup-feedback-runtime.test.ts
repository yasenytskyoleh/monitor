import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryResearchFeedbackDecisionRepository,
  InMemoryResearchHypothesisRepository,
  InMemorySetupAggregateResultRepository,
  InMemorySetupDefinitionRepository,
  createHypothesisEvidenceToSetupFeedbackHandoff,
  createResearchService,
  type FeedbackDecisionResult,
  type HypothesisFeedbackDecisionTrigger,
  type ProductRecordMetadata,
  type ResearchHypothesis,
  type SetupAggregateResult,
  type SetupDefinition
} from "@monitor/domain-model";

import { createHypothesisSetupFeedbackRuntime } from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: null,
  originTransitionId: null,
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: null,
  sourceObservedAtUtc: "2026-08-01T00:00:00.000Z"
};

const setupDefinition: SetupDefinition = {
  id: "setup-feedback-runtime-001",
  name: "Setup feedback runtime setup",
  description: "Fixture for hypothesis-derived feedback decisions.",
  status: "active",
  measurableConditions: ["close above range high"],
  evaluationAssumptions: ["evaluate fixed 24h"],
  invalidationAssumptions: ["none"],
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z"
};

const buildHypothesis = (
  id: string,
  evidenceStatus: ResearchHypothesis["evidenceStatus"],
  overrides: Partial<ResearchHypothesis> = {}
): ResearchHypothesis => ({
  id,
  title: "Hypothesis-derived feedback",
  description: "Persisted hypothesis evidence should produce a reviewable feedback decision.",
  relatedSetupDefinitionIds: [setupDefinition.id],
  assumptions: ["evidence drives recommendations only"],
  notes: [],
  evidenceStatus,
  evidenceSummary: `evidence summary for ${id}`,
  status: "active",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  ...overrides
});

const buildAggregate = (id: string, researchHypothesisId: string): SetupAggregateResult => ({
  id,
  setupDefinitionId: setupDefinition.id,
  researchHypothesisId,
  aggregationScope: {
    setupDefinitionId: setupDefinition.id,
    evaluationWindowId: "window-24h",
    symbolScope: { kind: "single_symbol", symbolIds: ["BTC-USDT"] },
    timeRange: {
      startAtUtc: "1970-01-01T00:00:00.000Z",
      endAtUtc: "9999-12-31T23:59:59.999Z"
    }
  },
  status: "completed",
  totalCandidates: 1,
  completedEvaluations: 1,
  invalidatedEvaluations: 0,
  averagePercentageMove: 1,
  averageAbsoluteMove: 1,
  averageFinalOutcome: 1,
  averageMaxFavorableExcursion: 1,
  averageMaxAdverseExcursion: -1,
  positiveOutcomeCount: 1,
  computedAt: "2026-08-01T01:00:00.000Z",
  createdAt: "2026-08-01T01:00:00.000Z",
  updatedAt: "2026-08-01T01:00:00.000Z"
});

const createFixture = async () => {
  const researchHypothesisRepository = new InMemoryResearchHypothesisRepository();
  const setupDefinitionRepository = new InMemorySetupDefinitionRepository();
  const setupAggregateResultRepository = new InMemorySetupAggregateResultRepository();
  const researchFeedbackDecisionRepository = new InMemoryResearchFeedbackDecisionRepository();
  await setupDefinitionRepository.create({ definition: setupDefinition, metadata });

  const hypothesisSetupFeedbackHandoff = createHypothesisEvidenceToSetupFeedbackHandoff({
    researchService: createResearchService({
      researchHypothesisRepository,
      setupDefinitionRepository,
      setupAggregateResultRepository,
      researchFeedbackDecisionRepository
    }),
    setupDefinitionRepository,
    researchHypothesisRepository,
    setupAggregateResultRepository
  });

  return {
    researchHypothesisRepository,
    setupAggregateResultRepository,
    runtime: createHypothesisSetupFeedbackRuntime({
      researchHypothesisRepository,
      hypothesisSetupFeedbackHandoff
    })
  };
};

test("records feedback decisions from supporting, weakening, and inconclusive hypothesis evidence", async () => {
  const cases = [
    { id: "supports", evidenceStatus: "supports", recommendedAction: "keep_active" },
    { id: "weakens", evidenceStatus: "weakens", recommendedAction: "pause_setup" },
    { id: "inconclusive", evidenceStatus: "inconclusive", recommendedAction: "manual_review_required" }
  ] as const;

  for (const item of cases) {
    const fixture = await createFixture();
    const hypothesisId = `hypothesis-${item.id}`;
    const aggregateId = `aggregate-${item.id}`;
    await fixture.researchHypothesisRepository.create({
      hypothesis: buildHypothesis(hypothesisId, item.evidenceStatus, {
        lastEvidenceAggregateResultId: aggregateId
      }),
      metadata
    });
    await fixture.setupAggregateResultRepository.create({
      aggregate: buildAggregate(aggregateId, hypothesisId),
      metadata
    });

    const result = await fixture.runtime.reviewFromHypothesis({
      researchHypothesisId: hypothesisId,
      setupDefinitionId: setupDefinition.id,
      triggeredAt: "2026-08-01T01:05:00.000Z"
    });

    assert.equal(result.status, "recorded");
    assert.equal(result.evidenceStatus, item.evidenceStatus);
    assert.equal(result.recommendedAction, item.recommendedAction);
    assert.equal(result.decisionStatus, "proposed");
    assert.equal(result.setupAggregateResultId, aggregateId);
  }
});

test("rejects malformed, missing, and unevidenced hypotheses before invoking the handoff", async () => {
  const fixture = await createFixture();
  const malformed = await fixture.runtime.reviewFromHypothesis({
    researchHypothesisId: "",
    setupDefinitionId: setupDefinition.id,
    triggeredAt: "not-a-timestamp"
  });
  const missing = await fixture.runtime.reviewFromHypothesis({
    researchHypothesisId: "hypothesis-missing",
    setupDefinitionId: setupDefinition.id,
    triggeredAt: "2026-08-01T01:05:00.000Z"
  });
  await fixture.researchHypothesisRepository.create({
    hypothesis: buildHypothesis("hypothesis-unevidenced", undefined),
    metadata
  });
  const unevidenced = await fixture.runtime.reviewFromHypothesis({
    researchHypothesisId: "hypothesis-unevidenced",
    setupDefinitionId: setupDefinition.id,
    triggeredAt: "2026-08-01T01:05:00.000Z"
  });

  assert.equal(malformed.status, "rejected_validation");
  assert.equal(missing.status, "rejected_validation");
  assert.match(missing.reason ?? "", /research_hypothesis not found/);
  assert.equal(unevidenced.status, "rejected_validation");
  assert.match(unevidenced.reason ?? "", /has no evidence status/);
});

test("preserves domain linkage rejections", async () => {
  const fixture = await createFixture();
  await fixture.researchHypothesisRepository.create({
    hypothesis: buildHypothesis("hypothesis-invalid-link", "supports", {
      relatedSetupDefinitionIds: ["setup-unrelated"]
    }),
    metadata
  });

  const result = await fixture.runtime.reviewFromHypothesis({
    researchHypothesisId: "hypothesis-invalid-link",
    setupDefinitionId: setupDefinition.id,
    triggeredAt: "2026-08-01T01:05:00.000Z"
  });

  assert.equal(result.status, "rejected_linkage");
  assert.match(result.reason ?? "", /not linked to setup_definition/);
});

test("forwards persisted evidence and trace metadata while preserving retryable failures", async () => {
  const hypothesis = buildHypothesis("hypothesis-scope", "supports", {
    evidenceSummary: "completed aggregate supports the hypothesis",
    lastEvidenceAggregateResultId: "aggregate-scope"
  });
  let receivedTrigger: HypothesisFeedbackDecisionTrigger | undefined;
  let receivedMetadata: ProductRecordMetadata | undefined;
  const recordingRuntime = createHypothesisSetupFeedbackRuntime({
    researchHypothesisRepository: { async getById(): Promise<ResearchHypothesis> { return hypothesis; } },
    hypothesisSetupFeedbackHandoff: {
      async review(trigger, handoffMetadata): Promise<FeedbackDecisionResult> {
        receivedTrigger = trigger;
        receivedMetadata = handoffMetadata;
        return { status: "rejected_linkage", reason: "linkage unavailable", warnings: [] };
      }
    }
  });
  const failingRuntime = createHypothesisSetupFeedbackRuntime({
    researchHypothesisRepository: { async getById(): Promise<ResearchHypothesis> { return hypothesis; } },
    hypothesisSetupFeedbackHandoff: {
      async review(): Promise<never> {
        throw new Error("temporary handoff failure");
      }
    }
  });
  const request = {
    researchHypothesisId: hypothesis.id,
    setupDefinitionId: setupDefinition.id,
    triggeredAt: "2026-08-01T01:05:00.000Z"
  };

  const rejected = await recordingRuntime.reviewFromHypothesis(request);
  const failed = await failingRuntime.reviewFromHypothesis(request);

  assert.equal(rejected.status, "rejected_linkage");
  assert.deepEqual(receivedTrigger, {
    researchHypothesisId: hypothesis.id,
    setupDefinitionId: setupDefinition.id,
    latestEvidenceStatus: "supports",
    setupAggregateResultId: "aggregate-scope",
    triggeredAt: request.triggeredAt,
    evidenceSummary: "completed aggregate supports the hypothesis"
  });
  assert.equal(receivedMetadata?.traceId, "aggregate-scope");
  assert.equal(receivedMetadata?.createdBySource, "research_aggregation_pipeline");
  assert.equal(failed.status, "failed");
  assert.match(failed.reason ?? "", /temporary handoff failure/);
  assert.equal(failed.warnings.length, 1);
});
