import assert from "node:assert/strict";
import test from "node:test";

import {
  composeFirstDurableRelationalRepositories,
  InMemoryFirstDurableRelationalRepositoryAdapter,
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
  sourceObservedAtUtc: "2026-05-14T09:00:00.000Z"
};

const buildSetupDefinition = (id: string): SetupDefinition => ({
  id,
  name: "Breakout Retest",
  description: "Retest after breakout with continuation bias.",
  status: "draft",
  measurableConditions: ["4h close above range high"],
  evaluationAssumptions: ["evaluate over fixed 24h window"],
  invalidationAssumptions: ["invalidate on failed retest"],
  createdAt: "2026-05-14T08:00:00.000Z",
  updatedAt: "2026-05-14T09:00:00.000Z"
});

const buildResearchHypothesis = (id: string): ResearchHypothesis => ({
  id,
  title: "Breakout retests outperform random entries",
  description: "Structured breakout retests should show positive asymmetry.",
  relatedSetupDefinitionIds: ["setup-001"],
  assumptions: ["median MFE exceeds median MAE over 50 samples"],
  notes: [],
  status: "draft",
  createdAt: "2026-05-14T08:00:00.000Z",
  updatedAt: "2026-05-14T09:00:00.000Z"
});

test("repository composition reuses one adapter across first durable slice repositories", async () => {
  const repositories = composeFirstDurableRelationalRepositories(
    new InMemoryFirstDurableRelationalRepositoryAdapter()
  );

  await repositories.setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-001"),
    metadata
  });
  await repositories.researchHypothesisRepository.create({
    hypothesis: buildResearchHypothesis("hypothesis-001"),
    metadata
  });

  const storedHypothesis = await repositories.researchHypothesisRepository.getById("hypothesis-001");

  assert.deepEqual(storedHypothesis?.relatedSetupDefinitionIds, ["setup-001"]);
});
