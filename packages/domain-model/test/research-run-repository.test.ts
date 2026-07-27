import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryResearchRunRelationalRepositoryAdapter,
  InMemoryResearchRunRepository,
  RelationalResearchRunRepository,
  RepositoryError,
  type ProductRecordMetadata,
  type ResearchRun,
  type ResearchRunRepository,
  ResearchRunValidationError
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-research-001",
  originTransitionId: "transition-research-001",
  createdBySource: "research_aggregation_pipeline",
  lastUpdatedBySource: "research_aggregation_pipeline",
  traceId: "trace-research-001",
  sourceObservedAtUtc: "2026-07-27T10:00:00.000Z"
};

const buildRun = (status: ResearchRun["status"] = "planned"): ResearchRun => ({
  runId: "research-run-001",
  hypothesisId: "hypothesis-001",
  setupId: "setup-001",
  candidateIds: [],
  evaluationWindowIds: ["window-24h"],
  evaluationResultIds: [],
  status,
  startedAtUtc: "2026-07-27T10:00:00.000Z",
  createdAtUtc: "2026-07-27T10:00:00.000Z",
  updatedAtUtc: "2026-07-27T10:00:00.000Z"
});

test("research-run repository stores and lists runs", async () => {
  const repository = new InMemoryResearchRunRepository();
  const run = buildRun("running");
  await repository.create({ run, metadata });

  assert.deepEqual(await repository.getById(run.runId), run);
  assert.equal((await repository.listByHypothesisId(run.hypothesisId)).length, 1);
  assert.equal((await repository.listByStatus(["running"])).length, 1);
});

test("research-run repository enforces duplicate and optimistic updates", async () => {
  const repository = new InMemoryResearchRunRepository();
  const run = buildRun();
  await repository.create({ run, metadata });

  await assert.rejects(
    async () => repository.create({ run, metadata }),
    (error: unknown) => error instanceof RepositoryError && error.code === "already_exists"
  );

  const completedRun: ResearchRun = {
    ...run,
    status: "completed",
    completedAtUtc: "2026-07-27T11:00:00.000Z",
    updatedAtUtc: "2026-07-27T11:00:00.000Z"
  };
  await assert.rejects(
    async () => repository.update({ run: completedRun, metadata, expectedVersion: 2 }),
    (error: unknown) => error instanceof RepositoryError && error.code === "version_mismatch"
  );

  const updated = await repository.update({ run: completedRun, metadata, expectedVersion: 1 });
  assert.equal(updated.status, "completed");
});

const createRepositories = (): ResearchRunRepository[] => [
  new InMemoryResearchRunRepository(),
  new RelationalResearchRunRepository(new InMemoryResearchRunRelationalRepositoryAdapter())
];

test("research-run repositories reject invalid completion state", async () => {
  for (const repository of createRepositories()) {
    await assert.rejects(
      () =>
        repository.create({
          run: { ...buildRun("completed") },
          metadata
        }),
      (error: unknown) => error instanceof ResearchRunValidationError
    );

    await assert.rejects(
      () =>
        repository.create({
          run: {
            ...buildRun("running"),
            completedAtUtc: "2026-07-27T11:00:00.000Z"
          },
          metadata
        }),
      (error: unknown) => error instanceof ResearchRunValidationError
    );

    await assert.rejects(
      () =>
        repository.create({
          run: {
            ...buildRun("completed"),
            completedAtUtc: "2026-07-27T09:00:00.000Z"
          },
          metadata
        }),
      (error: unknown) => error instanceof ResearchRunValidationError
    );
  }
});

test("research-run repositories preserve immutable research context", async () => {
  for (const repository of createRepositories()) {
    const run = buildRun();
    await repository.create({ run, metadata });

    await assert.rejects(
      () =>
        repository.update({
          run: { ...run, hypothesisId: "hypothesis-002" },
          metadata,
          expectedVersion: 1
        }),
      (error: unknown) => error instanceof ResearchRunValidationError
    );
  }
});
