import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryFirstDurableRelationalRepositoryAdapter,
  InMemorySignalEvaluationRelationalRepositoryAdapter,
  RelationalEvaluationResultRepository,
  RelationalSetupDefinitionRepository,
  RelationalSignalCandidateRepository,
  RepositoryError,
  SIGNAL_EVALUATION_RELATIONAL_ADAPTER_ERROR_MAPPING,
  SIGNAL_EVALUATION_RELATIONAL_ADAPTER_OPERATIONS,
  SIGNAL_EVALUATION_RELATIONAL_DETERMINISTIC_ERROR_CODES,
  SIGNAL_EVALUATION_RELATIONAL_RETRYABLE_ERROR_CODES,
  isSignalEvaluationRelationalDeterministicErrorCode,
  type EvaluationResult,
  type ProductRecordMetadata,
  type SetupDefinition,
  type SignalCandidate
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-signal-eval-001",
  originTransitionId: "transition-signal-eval-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-signal-eval-001",
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

const buildSignalCandidate = (
  id: string,
  setupDefinitionId: string,
  monitoredSymbolId = "BTC-USDT"
): SignalCandidate => ({
  id,
  setupDefinitionId,
  setupRevisionId: `${setupDefinitionId}-rev-001`,
  monitoredSymbolId,
  detectionHitId: `${id}-hit`,
  status: "detected",
  detectedAt: "2026-05-22T09:15:00.000Z",
  evidenceSummary: "4h breakout retest with volume expansion",
  originRunId: "run-detection-001",
  createdAt: "2026-05-22T09:15:00.000Z",
  updatedAt: "2026-05-22T09:15:00.000Z"
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
  createdAt: "2026-05-22T09:30:00.000Z",
  updatedAt: "2026-05-22T09:30:00.000Z"
});

const createRepositories = async () => {
  const firstSliceAdapter = new InMemoryFirstDurableRelationalRepositoryAdapter();
  const setupDefinitionRepository = new RelationalSetupDefinitionRepository(firstSliceAdapter);
  const signalEvaluationAdapter = new InMemorySignalEvaluationRelationalRepositoryAdapter(
    firstSliceAdapter
  );

  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-001"),
    metadata
  });

  return {
    signalCandidateRepository: new RelationalSignalCandidateRepository(signalEvaluationAdapter),
    evaluationResultRepository: new RelationalEvaluationResultRepository(signalEvaluationAdapter)
  };
};

test("exposes signal/evaluation relational adapter contract constants", () => {
  assert.deepEqual(SIGNAL_EVALUATION_RELATIONAL_DETERMINISTIC_ERROR_CODES, [
    "already_exists",
    "not_found",
    "version_mismatch",
    "invalid_reference"
  ]);
  assert.deepEqual(SIGNAL_EVALUATION_RELATIONAL_RETRYABLE_ERROR_CODES, [
    "transient_failure",
    "unknown_failure"
  ]);
  assert.deepEqual(SIGNAL_EVALUATION_RELATIONAL_ADAPTER_ERROR_MAPPING, {
    deterministic: ["already_exists", "not_found", "version_mismatch", "invalid_reference"],
    retryable: ["transient_failure", "unknown_failure"]
  });
  assert.equal(
    SIGNAL_EVALUATION_RELATIONAL_ADAPTER_OPERATIONS.includes("update_evaluation_result_record"),
    true
  );
  assert.equal(isSignalEvaluationRelationalDeterministicErrorCode("already_exists"), true);
  assert.equal(isSignalEvaluationRelationalDeterministicErrorCode("transient_failure"), false);
});

test("signal candidate relational adapter rejects missing setup references deterministically", async () => {
  const firstSliceAdapter = new InMemoryFirstDurableRelationalRepositoryAdapter();
  const repository = new RelationalSignalCandidateRepository(
    new InMemorySignalEvaluationRelationalRepositoryAdapter(firstSliceAdapter)
  );

  await assert.rejects(
    async () =>
      repository.create({
        candidate: buildSignalCandidate("candidate-001", "setup-missing"),
        metadata
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "signal_candidate" &&
      error.referenceEntityType === "setup_definition" &&
      error.referenceEntityId === "setup-missing"
  );
});

test("evaluation result relational adapter rejects duplicate candidate/window pairs", async () => {
  const { evaluationResultRepository, signalCandidateRepository } = await createRepositories();

  await signalCandidateRepository.create({
    candidate: buildSignalCandidate("candidate-001", "setup-001"),
    metadata
  });
  await evaluationResultRepository.create({
    result: buildEvaluationResult("result-001", "candidate-001", "window-24h"),
    metadata
  });

  await assert.rejects(
    async () =>
      evaluationResultRepository.create({
        result: buildEvaluationResult("result-002", "candidate-001", "window-24h"),
        metadata
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "already_exists" &&
      error.entityType === "evaluation_result" &&
      error.operation === "create"
  );
});

test("evaluation result relational adapter rejects stale expected versions deterministically", async () => {
  const { evaluationResultRepository, signalCandidateRepository } = await createRepositories();

  await signalCandidateRepository.create({
    candidate: buildSignalCandidate("candidate-001", "setup-001"),
    metadata
  });
  await evaluationResultRepository.create({
    result: buildEvaluationResult("result-001", "candidate-001", "window-24h"),
    metadata
  });

  await assert.rejects(
    async () =>
      evaluationResultRepository.update({
        result: {
          ...buildEvaluationResult("result-001", "candidate-001", "window-24h"),
          status: "in_progress",
          updatedAt: "2026-05-22T10:00:00.000Z"
        },
        metadata: {
          ...metadata,
          sourceObservedAtUtc: "2026-05-22T10:00:00.000Z"
        },
        expectedVersion: 99
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "version_mismatch" &&
      error.entityType === "evaluation_result" &&
      error.expectedVersion === 99 &&
      error.actualVersion === 1
  );
});
