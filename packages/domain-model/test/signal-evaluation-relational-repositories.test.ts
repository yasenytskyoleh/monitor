import assert from "node:assert/strict";
import test from "node:test";

import {
  composeSignalEvaluationRelationalRepositories,
  InMemoryFirstDurableRelationalRepositoryAdapter,
  InMemorySignalEvaluationRelationalRepositoryAdapter,
  RelationalSetupDefinitionRepository,
  RepositoryError,
  type EvaluationResult,
  type ProductRecordMetadata,
  type SetupDefinition,
  type SignalCandidate
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-001",
  originTransitionId: "transition-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-001",
  sourceObservedAtUtc: "2026-05-22T09:00:00.000Z"
};

const buildSetupDefinition = (id: string): SetupDefinition => ({
  id,
  name: "Breakout Retest",
  description: "Retest after breakout with continuation bias.",
  status: "active",
  measurableConditions: ["4h close above range high"],
  evaluationAssumptions: ["evaluate over fixed 24h window"],
  invalidationAssumptions: ["invalidate on failed retest"],
  createdAt: "2026-05-22T08:00:00.000Z",
  updatedAt: "2026-05-22T09:00:00.000Z"
});

const buildSignalCandidate = (id: string, setupDefinitionId: string): SignalCandidate => ({
  id,
  setupDefinitionId,
  setupRevisionId: `${setupDefinitionId}-rev-001`,
  monitoredSymbolId: "BTC-USDT",
  status: "detected",
  detectedAt: "2026-05-22T09:10:00.000Z",
  evidenceSummary: "4h breakout retest with volume expansion",
  createdAt: "2026-05-22T09:10:00.000Z",
  updatedAt: "2026-05-22T09:10:00.000Z"
});

const buildEvaluationResult = (
  id: string,
  signalCandidateId: string,
  evaluationWindowId: string
): EvaluationResult => ({
  id,
  signalCandidateId,
  evaluationWindowId,
  status: "pending",
  referencePrice: null,
  finalPrice: null,
  highInWindow: null,
  lowInWindow: null,
  absoluteMove: null,
  percentageMove: null,
  maxFavorableExcursion: null,
  maxAdverseExcursion: null,
  evaluatedAt: null,
  createdAt: "2026-05-22T09:20:00.000Z",
  updatedAt: "2026-05-22T09:20:00.000Z"
});

test("repository composition reuses one adapter across signal/evaluation repositories", async () => {
  const firstSliceAdapter = new InMemoryFirstDurableRelationalRepositoryAdapter();
  const setupDefinitionRepository = new RelationalSetupDefinitionRepository(firstSliceAdapter);

  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-001"),
    metadata
  });

  const repositories = composeSignalEvaluationRelationalRepositories(
    new InMemorySignalEvaluationRelationalRepositoryAdapter(firstSliceAdapter)
  );

  await repositories.signalCandidateRepository.create({
    candidate: buildSignalCandidate("candidate-001", "setup-001"),
    metadata
  });
  const underReview = await repositories.signalCandidateRepository.updateStatus({
    signalCandidateId: "candidate-001",
    status: "under_review",
    metadata: {
      ...metadata,
      sourceObservedAtUtc: "2026-05-22T10:00:00.000Z"
    },
    expectedVersion: 1
  });

  await repositories.evaluationResultRepository.create({
    result: buildEvaluationResult("result-001", "candidate-001", "window-24h"),
    metadata
  });
  const inProgress = await repositories.evaluationResultRepository.updateStatus({
    evaluationResultId: "result-001",
    status: "in_progress",
    metadata: {
      ...metadata,
      sourceObservedAtUtc: "2026-05-22T10:30:00.000Z"
    },
    expectedVersion: 1
  });

  const candidateByStatus = await repositories.signalCandidateRepository.listByStatus([
    "under_review"
  ]);
  const resultByCandidate = await repositories.evaluationResultRepository.listBySignalCandidateId(
    "candidate-001"
  );

  assert.equal(underReview?.status, "under_review");
  assert.equal(inProgress?.status, "in_progress");
  assert.equal(candidateByStatus.length, 1);
  assert.equal(resultByCandidate.length, 1);
});

test("repository composition surfaces missing signal-candidate references through repository errors", async () => {
  const repositories = composeSignalEvaluationRelationalRepositories(
    new InMemorySignalEvaluationRelationalRepositoryAdapter(
      new InMemoryFirstDurableRelationalRepositoryAdapter()
    )
  );

  await assert.rejects(
    async () =>
      repositories.evaluationResultRepository.create({
        result: buildEvaluationResult("result-001", "candidate-missing", "window-24h"),
        metadata
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "evaluation_result" &&
      error.referenceEntityType === "signal_candidate" &&
      error.referenceEntityId === "candidate-missing"
  );
});
