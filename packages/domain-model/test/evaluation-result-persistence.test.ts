import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryEvaluationResultRepository,
  InMemorySignalCandidateRepository,
  type EvaluationResult,
  EvaluationResultValidationError,
  type ProductRecordMetadata,
  type SignalCandidate,
  createEvaluationService
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: null,
  originTransitionId: null,
  createdBySource: "evaluation_pipeline",
  lastUpdatedBySource: "evaluation_pipeline",
  traceId: "trace-evaluation-result-tests",
  sourceObservedAtUtc: "2026-04-16T12:00:00.000Z"
};

const buildSignalCandidate = (
  id: string,
  setupDefinitionId = "setup-020",
  monitoredSymbolId = "BTC-USDT"
): SignalCandidate => ({
  id,
  setupDefinitionId,
  setupRevisionId: `${setupDefinitionId}-revision`,
  monitoredSymbolId,
  status: "under_review",
  detectedAt: "2026-04-16T10:00:00.000Z",
  evidenceSummary: "Breakout retest with strong volume support",
  createdAt: "2026-04-16T10:00:00.000Z",
  updatedAt: "2026-04-16T10:00:00.000Z"
});

const buildPendingEvaluationResult = (
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
  createdAt: "2026-04-16T10:30:00.000Z",
  updatedAt: "2026-04-16T10:30:00.000Z"
});

const createService = () => {
  const signalCandidateRepository = new InMemorySignalCandidateRepository();
  const evaluationResultRepository = new InMemoryEvaluationResultRepository();
  const service = createEvaluationService({
    evaluationResultRepository,
    signalCandidateRepository
  });

  return {
    service,
    signalCandidateRepository,
    evaluationResultRepository
  };
};

test("create pending evaluation result", async () => {
  const { service, signalCandidateRepository } = createService();
  await signalCandidateRepository.create({
    candidate: buildSignalCandidate("candidate-020"),
    metadata
  });

  const created = await service.createPendingEvaluationResult({
    result: buildPendingEvaluationResult("result-020", "candidate-020", "window-24h"),
    metadata
  });

  assert.equal(created.status, "pending");
  assert.equal(created.signalCandidateId, "candidate-020");
});

test("finalize completed evaluation result", async () => {
  const { service, signalCandidateRepository } = createService();
  await signalCandidateRepository.create({
    candidate: buildSignalCandidate("candidate-021"),
    metadata
  });

  await service.createPendingEvaluationResult({
    result: buildPendingEvaluationResult("result-021", "candidate-021", "window-24h"),
    metadata
  });
  await service.startEvaluationResult({
    evaluationResultId: "result-021",
    metadata,
    expectedVersion: null
  });

  const completed = await service.finalizeEvaluationResult({
    evaluationResultId: "result-021",
    referencePrice: 65000,
    finalPrice: 65800,
    highInWindow: 66400,
    lowInWindow: 64100,
    maxFavorableExcursion: 2.15,
    maxAdverseExcursion: -1.38,
    evaluatedAt: "2026-04-17T10:30:00.000Z",
    metadata,
    expectedVersion: null
  });

  assert.equal(completed?.status, "completed");
  assert.equal(completed?.absoluteMove, 800);
});

test("reject creation with missing signal candidate", async () => {
  const { service } = createService();

  await assert.rejects(
    async () =>
      service.createPendingEvaluationResult({
        result: buildPendingEvaluationResult("result-022", "candidate-missing", "window-24h"),
        metadata
      }),
    (error: unknown) =>
      error instanceof EvaluationResultValidationError &&
      error.message.includes("signal_candidate not found")
  );
});

test("reject duplicate result for same candidate/window", async () => {
  const { service, signalCandidateRepository } = createService();
  await signalCandidateRepository.create({
    candidate: buildSignalCandidate("candidate-023"),
    metadata
  });

  await service.createPendingEvaluationResult({
    result: buildPendingEvaluationResult("result-023a", "candidate-023", "window-24h"),
    metadata
  });

  await assert.rejects(
    async () =>
      service.createPendingEvaluationResult({
        result: buildPendingEvaluationResult("result-023b", "candidate-023", "window-24h"),
        metadata
      }),
    (error: unknown) =>
      error instanceof EvaluationResultValidationError &&
      error.message.includes("duplicate evaluation_result")
  );
});

test("allowed lifecycle transitions succeed", async () => {
  const { service, signalCandidateRepository } = createService();
  await signalCandidateRepository.create({
    candidate: buildSignalCandidate("candidate-024"),
    metadata
  });

  await service.createPendingEvaluationResult({
    result: buildPendingEvaluationResult("result-024", "candidate-024", "window-24h"),
    metadata
  });

  const inProgress = await service.startEvaluationResult({
    evaluationResultId: "result-024",
    metadata,
    expectedVersion: null
  });
  const expired = await service.expireEvaluationResult({
    evaluationResultId: "result-024",
    metadata,
    expectedVersion: null
  });

  assert.equal(inProgress?.status, "in_progress");
  assert.equal(expired?.status, "expired");
});

test("invalid lifecycle transitions fail", async () => {
  const { service, signalCandidateRepository } = createService();
  await signalCandidateRepository.create({
    candidate: buildSignalCandidate("candidate-025"),
    metadata
  });

  await service.createPendingEvaluationResult({
    result: buildPendingEvaluationResult("result-025", "candidate-025", "window-24h"),
    metadata
  });

  await assert.rejects(
    async () =>
      service.finalizeEvaluationResult({
        evaluationResultId: "result-025",
        referencePrice: 65000,
        finalPrice: 65800,
        highInWindow: 66400,
        lowInWindow: 64100,
        maxFavorableExcursion: 2.15,
        maxAdverseExcursion: -1.38,
        evaluatedAt: "2026-04-17T10:30:00.000Z",
        metadata,
        expectedVersion: null
      }),
    (error: unknown) =>
      error instanceof EvaluationResultValidationError &&
      error.message.includes("invalid evaluation_result status transition")
  );
});

test("invalid metrics consistency fails", async () => {
  const { service, signalCandidateRepository } = createService();
  await signalCandidateRepository.create({
    candidate: buildSignalCandidate("candidate-026"),
    metadata
  });

  await service.createPendingEvaluationResult({
    result: buildPendingEvaluationResult("result-026", "candidate-026", "window-24h"),
    metadata
  });
  await service.startEvaluationResult({
    evaluationResultId: "result-026",
    metadata,
    expectedVersion: null
  });

  await assert.rejects(
    async () =>
      service.finalizeEvaluationResult({
        evaluationResultId: "result-026",
        referencePrice: 65000,
        finalPrice: 65800,
        highInWindow: 64000,
        lowInWindow: 64100,
        maxFavorableExcursion: 2.15,
        maxAdverseExcursion: -1.38,
        evaluatedAt: "2026-04-17T10:30:00.000Z",
        metadata,
        expectedVersion: null
      }),
    (error: unknown) =>
      error instanceof EvaluationResultValidationError &&
      error.message.includes("highInWindow must be greater than or equal to lowInWindow")
  );
});

test("repository retrieves by id and by signal candidate id", async () => {
  const { evaluationResultRepository } = createService();
  await evaluationResultRepository.create({
    result: buildPendingEvaluationResult("result-027", "candidate-027", "window-24h"),
    metadata
  });

  const byId = await evaluationResultRepository.getById("result-027");
  const byCandidateId = await evaluationResultRepository.listBySignalCandidateId("candidate-027");

  assert.equal(byId?.id, "result-027");
  assert.equal(byCandidateId.length, 1);
  assert.equal(byCandidateId[0]?.id, "result-027");
});
