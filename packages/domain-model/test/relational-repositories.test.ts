import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryFirstDurableRelationalRepositoryAdapter,
  RelationalResearchHypothesisRepository,
  RelationalSetupDefinitionRepository,
  RepositoryError,
  type ProductRecordMetadata,
  type ResearchHypothesis,
  type SetupDefinition
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-001",
  originTransitionId: "transition-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-001",
  sourceObservedAtUtc: "2026-05-13T08:00:00.000Z"
};

const buildSetupDefinition = (id: string): SetupDefinition => ({
  id,
  name: "Breakout Retest",
  description: "Retest after breakout with continuation bias.",
  status: "draft",
  measurableConditions: ["4h close above range high"],
  evaluationAssumptions: ["evaluate over fixed 24h window"],
  invalidationAssumptions: ["invalidate on failed retest"],
  createdAt: "2026-05-13T07:00:00.000Z",
  updatedAt: "2026-05-13T08:00:00.000Z"
});

const buildResearchHypothesis = (id: string): ResearchHypothesis => ({
  id,
  title: "Breakout retests outperform random entries",
  description: "Structured breakout retests should show positive asymmetry.",
  relatedSetupDefinitionIds: ["setup-001"],
  assumptions: ["median MFE exceeds median MAE over 50 samples"],
  notes: [],
  status: "draft",
  createdAt: "2026-05-13T07:00:00.000Z",
  updatedAt: "2026-05-13T08:00:00.000Z"
});

test("relational setup-definition repository persists and archives through the adapter boundary", async () => {
  const adapter = new InMemoryFirstDurableRelationalRepositoryAdapter();
  const repository = new RelationalSetupDefinitionRepository(adapter);

  const created = await repository.create({
    definition: buildSetupDefinition("setup-001"),
    metadata
  });
  const archived = await repository.updateStatus({
    setupDefinitionId: "setup-001",
    status: "archived",
    metadata: {
      ...metadata,
      sourceObservedAtUtc: "2026-05-13T10:00:00.000Z"
    },
    expectedVersion: 1
  });
  const stored = await repository.getById("setup-001");

  assert.equal(created.status, "draft");
  assert.equal(archived?.status, "archived");
  assert.equal(stored?.updatedAt, "2026-05-13T10:00:00.000Z");
});

test("relational research-hypothesis repository persists bundle updates and list-by-status", async () => {
  const adapter = new InMemoryFirstDurableRelationalRepositoryAdapter();
  const setupRepository = new RelationalSetupDefinitionRepository(adapter);
  const hypothesisRepository = new RelationalResearchHypothesisRepository(adapter);

  await setupRepository.create({
    definition: buildSetupDefinition("setup-001"),
    metadata
  });
  await setupRepository.create({
    definition: buildSetupDefinition("setup-002"),
    metadata
  });

  await hypothesisRepository.create({
    hypothesis: buildResearchHypothesis("hypothesis-001"),
    metadata
  });

  const updated = await hypothesisRepository.update({
    hypothesis: {
      ...buildResearchHypothesis("hypothesis-001"),
      relatedSetupDefinitionIds: ["setup-001", "setup-002"],
      notes: ["expanded evidence scope"],
      status: "active",
      updatedAt: "2026-05-13T09:00:00.000Z"
    },
    metadata: {
      ...metadata,
      sourceObservedAtUtc: "2026-05-13T09:00:00.000Z"
    },
    expectedVersion: 1
  });
  const activeHypotheses = await hypothesisRepository.listByStatus(["active"]);

  assert.deepEqual(updated.relatedSetupDefinitionIds, ["setup-001", "setup-002"]);
  assert.equal(updated.notes[0], "expanded evidence scope");
  assert.equal(activeHypotheses.length, 1);
});

test("relational research-hypothesis repository surfaces invalid setup links through repository errors", async () => {
  const adapter = new InMemoryFirstDurableRelationalRepositoryAdapter();
  const hypothesisRepository = new RelationalResearchHypothesisRepository(adapter);

  await assert.rejects(
    async () =>
      hypothesisRepository.create({
        hypothesis: buildResearchHypothesis("hypothesis-001"),
        metadata
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "research_hypothesis" &&
      error.referenceEntityType === "setup_definition" &&
      error.referenceEntityId === "setup-001"
  );
});
