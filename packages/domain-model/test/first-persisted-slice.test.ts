import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryResearchHypothesisRepository,
  InMemorySetupDefinitionRepository,
  type ProductRecordMetadata,
  type ResearchHypothesis,
  ResearchHypothesisValidationError,
  SetupDefinitionValidationError,
  createResearchService,
  createSetupDefinitionService,
  type SetupDefinition
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: null,
  originTransitionId: null,
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: null,
  sourceObservedAtUtc: "2026-04-14T12:00:00.000Z"
};

const buildSetupDefinition = (id: string, status: SetupDefinition["status"] = "draft"): SetupDefinition => ({
  id,
  name: "Breakout Retest",
  description: "Retest after breakout with momentum continuation",
  status,
  measurableConditions: ["close above range high on 4h"],
  evaluationAssumptions: ["evaluate after fixed 24h"],
  invalidationAssumptions: ["invalidate if retest level breaks on high volume"],
  createdAt: "2026-04-14T12:00:00.000Z",
  updatedAt: "2026-04-14T12:00:00.000Z"
});

const buildResearchHypothesis = (
  id: string,
  relatedSetupDefinitionIds: string[],
  status: ResearchHypothesis["status"] = "draft"
): ResearchHypothesis => ({
  id,
  title: "Breakout retests outperform random entries",
  description: "Breakout retests in trend regimes should produce positive asymmetry.",
  status,
  relatedSetupDefinitionIds,
  assumptions: ["median MFE should exceed median MAE over 50 samples"],
  notes: [],
  createdAt: "2026-04-14T12:00:00.000Z",
  updatedAt: "2026-04-14T12:00:00.000Z"
});

test("create setup definition", async () => {
  const setupRepository = new InMemorySetupDefinitionRepository();
  const setupService = createSetupDefinitionService({
    setupDefinitionRepository: setupRepository
  });

  const created = await setupService.createSetupDefinition({
    definition: buildSetupDefinition("setup-001"),
    metadata
  });
  assert.equal(created.id, "setup-001");
  assert.equal(created.status, "draft");
});

test("update setup definition", async () => {
  const setupRepository = new InMemorySetupDefinitionRepository();
  const setupService = createSetupDefinitionService({
    setupDefinitionRepository: setupRepository
  });

  await setupService.createSetupDefinition({
    definition: buildSetupDefinition("setup-002"),
    metadata
  });
  const updated = await setupService.updateSetupDefinition({
    definition: {
      ...buildSetupDefinition("setup-002"),
      description: "Updated setup description for persistence test"
    },
    metadata,
    expectedVersion: null
  });
  assert.equal(updated.description, "Updated setup description for persistence test");
});

test("archive setup definition", async () => {
  const setupRepository = new InMemorySetupDefinitionRepository();
  const setupService = createSetupDefinitionService({
    setupDefinitionRepository: setupRepository
  });

  await setupService.createSetupDefinition({
    definition: buildSetupDefinition("setup-003", "active"),
    metadata
  });
  const archived = await setupService.archiveSetupDefinition({
    setupDefinitionId: "setup-003",
    metadata,
    expectedVersion: null
  });

  assert.equal(archived?.status, "archived");
});

test("create research hypothesis", async () => {
  const setupRepository = new InMemorySetupDefinitionRepository();
  const hypothesisRepository = new InMemoryResearchHypothesisRepository();
  const setupService = createSetupDefinitionService({
    setupDefinitionRepository: setupRepository
  });
  const researchService = createResearchService({
    researchHypothesisRepository: hypothesisRepository,
    setupDefinitionRepository: setupRepository
  });

  await setupService.createSetupDefinition({
    definition: buildSetupDefinition("setup-004"),
    metadata
  });
  const created = await researchService.createResearchHypothesis({
    hypothesis: buildResearchHypothesis("hypothesis-001", ["setup-004"]),
    metadata
  });
  assert.equal(created.id, "hypothesis-001");
});

test("update research hypothesis", async () => {
  const setupRepository = new InMemorySetupDefinitionRepository();
  const hypothesisRepository = new InMemoryResearchHypothesisRepository();
  const setupService = createSetupDefinitionService({
    setupDefinitionRepository: setupRepository
  });
  const researchService = createResearchService({
    researchHypothesisRepository: hypothesisRepository,
    setupDefinitionRepository: setupRepository
  });

  await setupService.createSetupDefinition({
    definition: buildSetupDefinition("setup-005"),
    metadata
  });
  await researchService.createResearchHypothesis({
    hypothesis: buildResearchHypothesis("hypothesis-002", ["setup-005"]),
    metadata
  });
  const updated = await researchService.updateResearchHypothesis({
    hypothesis: {
      ...buildResearchHypothesis("hypothesis-002", ["setup-005"]),
      notes: ["updated note"]
    },
    metadata,
    expectedVersion: null
  });
  assert.equal(updated.notes.length, 1);
});

test("link hypothesis to setup definition", async () => {
  const setupRepository = new InMemorySetupDefinitionRepository();
  const hypothesisRepository = new InMemoryResearchHypothesisRepository();
  const setupService = createSetupDefinitionService({
    setupDefinitionRepository: setupRepository
  });
  const researchService = createResearchService({
    researchHypothesisRepository: hypothesisRepository,
    setupDefinitionRepository: setupRepository
  });

  await setupService.createSetupDefinition({
    definition: buildSetupDefinition("setup-006"),
    metadata
  });
  await setupService.createSetupDefinition({
    definition: buildSetupDefinition("setup-007"),
    metadata
  });
  await researchService.createResearchHypothesis({
    hypothesis: buildResearchHypothesis("hypothesis-003", ["setup-006"]),
    metadata
  });

  const linked = await researchService.attachHypothesisToSetupDefinitions({
    researchHypothesisId: "hypothesis-003",
    setupDefinitionIds: ["setup-007"],
    metadata,
    expectedVersion: null
  });
  assert.deepEqual(linked?.relatedSetupDefinitionIds.sort(), ["setup-006", "setup-007"]);
});

test("invalid setup definition rejected", async () => {
  const setupRepository = new InMemorySetupDefinitionRepository();
  const setupService = createSetupDefinitionService({
    setupDefinitionRepository: setupRepository
  });

  await assert.rejects(
    async () =>
      setupService.createSetupDefinition({
        definition: {
          ...buildSetupDefinition("setup-008"),
          name: "   ",
          measurableConditions: []
        },
        metadata
      }),
    (error: unknown) =>
      error instanceof SetupDefinitionValidationError &&
      error.message.includes("name is required")
  );
});

test("invalid hypothesis rejected", async () => {
  const setupRepository = new InMemorySetupDefinitionRepository();
  const hypothesisRepository = new InMemoryResearchHypothesisRepository();
  const setupService = createSetupDefinitionService({
    setupDefinitionRepository: setupRepository
  });
  const researchService = createResearchService({
    researchHypothesisRepository: hypothesisRepository,
    setupDefinitionRepository: setupRepository
  });

  await setupService.createSetupDefinition({
    definition: buildSetupDefinition("setup-009"),
    metadata
  });

  await assert.rejects(
    async () =>
      researchService.createResearchHypothesis({
        hypothesis: {
          ...buildResearchHypothesis("hypothesis-004", ["setup-missing"]),
          title: ""
        },
        metadata
      }),
    (error: unknown) =>
      error instanceof ResearchHypothesisValidationError &&
      (error.message.includes("title is required") ||
        error.message.includes("invalid setup_definition linkage"))
  );
});
