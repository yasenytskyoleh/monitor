import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryEvaluationResultRepository,
  InMemoryResearchHypothesisRepository,
  InMemoryResearchRunRepository,
  InMemorySetupDefinitionRepository,
  InMemorySignalCandidateRepository,
  RepositoryError,
  ResearchRunServiceValidationError,
  type EvaluationResult,
  type ProductRecordMetadata,
  type ResearchHypothesis,
  type ResearchRun,
  type SetupDefinition,
  type SignalCandidate,
  createResearchRunService
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-service-001",
  originTransitionId: "transition-service-001",
  createdBySource: "research_aggregation_pipeline",
  lastUpdatedBySource: "research_aggregation_pipeline",
  traceId: "trace-run-service-001",
  sourceObservedAtUtc: "2026-07-27T10:00:00.000Z"
};

const buildSetup = (id: string): SetupDefinition => ({
  id,
  name: "Breakout Retest",
  description: "Breakout retest service fixture.",
  status: "active",
  measurableConditions: ["4h close above range high"],
  evaluationAssumptions: ["evaluate over 24h"],
  invalidationAssumptions: ["failed retest"],
  createdAt: "2026-07-27T09:00:00.000Z",
  updatedAt: "2026-07-27T09:00:00.000Z"
});

const buildHypothesis = (id: string, setupId: string): ResearchHypothesis => ({
  id,
  title: "Breakout retests sustain directional movement",
  description: "Research-run service fixture.",
  relatedSetupDefinitionIds: [setupId],
  assumptions: ["directional move after retest"],
  notes: [],
  status: "active",
  createdAt: "2026-07-27T09:00:00.000Z",
  updatedAt: "2026-07-27T09:00:00.000Z"
});

const buildCandidate = (id: string, setupId: string): SignalCandidate => ({
  id,
  setupDefinitionId: setupId,
  setupRevisionId: `${setupId}-revision-001`,
  monitoredSymbolId: "BTC-USDT",
  status: "evaluated",
  detectedAt: "2026-07-27T10:00:00.000Z",
  evidenceSummary: "Breakout retest candidate.",
  createdAt: "2026-07-27T10:00:00.000Z",
  updatedAt: "2026-07-27T10:00:00.000Z"
});

const buildResult = (id: string, candidateId: string): EvaluationResult => ({
  id,
  signalCandidateId: candidateId,
  evaluationWindowId: "window-24h",
  status: "completed",
  referencePrice: 100,
  finalPrice: 102,
  highInWindow: 103,
  lowInWindow: 99,
  absoluteMove: 2,
  percentageMove: 2,
  maxFavorableExcursion: 3,
  maxAdverseExcursion: -1,
  evaluatedAt: "2026-07-28T10:00:00.000Z",
  createdAt: "2026-07-28T10:00:00.000Z",
  updatedAt: "2026-07-28T10:00:00.000Z"
});

const buildRun = (runId: string, hypothesisId: string, setupId: string): ResearchRun => ({
  runId,
  hypothesisId,
  setupId,
  candidateIds: [],
  evaluationWindowIds: [],
  evaluationResultIds: [],
  status: "planned",
  startedAtUtc: "2026-07-27T10:00:00.000Z",
  createdAtUtc: "2026-07-27T10:00:00.000Z",
  updatedAtUtc: "2026-07-27T10:00:00.000Z"
});

const createFixture = () => {
  const researchRunRepository = new InMemoryResearchRunRepository();
  const researchHypothesisRepository = new InMemoryResearchHypothesisRepository();
  const setupDefinitionRepository = new InMemorySetupDefinitionRepository();
  const signalCandidateRepository = new InMemorySignalCandidateRepository();
  const evaluationResultRepository = new InMemoryEvaluationResultRepository();
  const service = createResearchRunService({
    researchRunRepository,
    researchHypothesisRepository,
    setupDefinitionRepository,
    signalCandidateRepository,
    evaluationResultRepository
  });

  return {
    service,
    researchRunRepository,
    researchHypothesisRepository,
    setupDefinitionRepository,
    signalCandidateRepository,
    evaluationResultRepository
  };
};

const seedRunContext = async (fixture: ReturnType<typeof createFixture>) => {
  await fixture.setupDefinitionRepository.create({
    definition: buildSetup("setup-001"),
    metadata
  });
  await fixture.researchHypothesisRepository.create({
    hypothesis: buildHypothesis("hypothesis-001", "setup-001"),
    metadata
  });
};

test("creates a planned research run with validated references", async () => {
  const fixture = createFixture();
  await seedRunContext(fixture);

  const created = await fixture.service.createPlannedResearchRun({
    run: buildRun("research-run-001", "hypothesis-001", "setup-001"),
    metadata
  });

  assert.equal(created.status, "planned");
  assert.equal(created.hypothesisId, "hypothesis-001");
});

test("rejects planned research runs with invalid reference context", async () => {
  const fixture = createFixture();
  await fixture.setupDefinitionRepository.create({
    definition: buildSetup("setup-001"),
    metadata
  });

  await assert.rejects(
    async () =>
      fixture.service.createPlannedResearchRun({
        run: buildRun("research-run-002", "hypothesis-missing", "setup-001"),
        metadata
      }),
    (error: unknown) =>
      error instanceof ResearchRunServiceValidationError &&
      error.message.includes("research_hypothesis not found")
  );
});

test("validates research-run candidate and evaluation context", async () => {
  const fixture = createFixture();
  await seedRunContext(fixture);
  await fixture.signalCandidateRepository.create({
    candidate: buildCandidate("candidate-001", "setup-001"),
    metadata
  });
  await fixture.evaluationResultRepository.create({
    result: buildResult("result-001", "candidate-001"),
    metadata
  });

  const created = await fixture.service.createPlannedResearchRun({
    run: {
      ...buildRun("research-run-003", "hypothesis-001", "setup-001"),
      candidateIds: ["candidate-001"],
      evaluationWindowIds: ["window-24h"],
      evaluationResultIds: ["result-001"]
    },
    metadata
  });

  assert.deepEqual(created.evaluationResultIds, ["result-001"]);
});

test("records finalized evaluation context for an active research run", async () => {
  const fixture = createFixture();
  await seedRunContext(fixture);
  await fixture.signalCandidateRepository.create({
    candidate: buildCandidate("candidate-002", "setup-001"),
    metadata
  });
  await fixture.evaluationResultRepository.create({
    result: buildResult("result-002", "candidate-002"),
    metadata
  });
  await fixture.service.createPlannedResearchRun({
    run: buildRun("research-run-003b", "hypothesis-001", "setup-001"),
    metadata
  });
  await fixture.service.startResearchRun({
    runId: "research-run-003b",
    metadata,
    expectedVersion: null
  });

  const updated = await fixture.service.recordResearchRunEvaluationResults({
    runId: "research-run-003b",
    evaluationResultIds: ["result-002"],
    metadata,
    expectedVersion: null
  });

  assert.deepEqual(updated?.candidateIds, ["candidate-002"]);
  assert.deepEqual(updated?.evaluationWindowIds, ["window-24h"]);
  assert.deepEqual(updated?.evaluationResultIds, ["result-002"]);
});

test("starts and completes a research run through valid lifecycle transitions", async () => {
  const fixture = createFixture();
  await seedRunContext(fixture);
  await fixture.service.createPlannedResearchRun({
    run: buildRun("research-run-004", "hypothesis-001", "setup-001"),
    metadata
  });

  const started = await fixture.service.startResearchRun({
    runId: "research-run-004",
    metadata: { ...metadata, sourceObservedAtUtc: "2026-07-27T10:30:00.000Z" },
    expectedVersion: null
  });
  const completed = await fixture.service.completeResearchRun({
    runId: "research-run-004",
    completedAtUtc: "2026-07-27T11:00:00.000Z",
    summary: "All configured evaluations completed.",
    metadata: { ...metadata, sourceObservedAtUtc: "2026-07-27T11:00:00.000Z" },
    expectedVersion: null
  });

  assert.equal(started?.status, "running");
  assert.equal(started?.startedAtUtc, "2026-07-27T10:30:00.000Z");
  assert.equal(completed?.status, "completed");
  assert.equal(completed?.completedAtUtc, "2026-07-27T11:00:00.000Z");
});

test("rejects invalid terminal transitions and preserves optimistic writes", async () => {
  const fixture = createFixture();
  await seedRunContext(fixture);
  await fixture.service.createPlannedResearchRun({
    run: buildRun("research-run-005", "hypothesis-001", "setup-001"),
    metadata
  });

  await assert.rejects(
    async () =>
      fixture.service.completeResearchRun({
        runId: "research-run-005",
        completedAtUtc: "2026-07-27T11:00:00.000Z",
        metadata,
        expectedVersion: null
      }),
    (error: unknown) => error instanceof ResearchRunServiceValidationError
  );

  await assert.rejects(
    async () =>
      fixture.service.startResearchRun({
        runId: "research-run-005",
        metadata,
        expectedVersion: 0
      }),
    (error: unknown) =>
      error instanceof RepositoryError && error.code === "version_mismatch"
  );

  const cancelled = await fixture.service.cancelResearchRun({
    runId: "research-run-005",
    summary: "No longer needed.",
    metadata,
    expectedVersion: null
  });
  assert.equal(cancelled?.status, "cancelled");

  await assert.rejects(
    async () =>
      fixture.service.failResearchRun({
        runId: "research-run-005",
        metadata,
        expectedVersion: null
      }),
    (error: unknown) => error instanceof ResearchRunServiceValidationError
  );
});
