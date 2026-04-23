import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemorySetupDefinitionRepository,
  InMemorySetupDefinitionRevisionRepository,
  createActiveSetupRevisionResolutionHandoff,
  createSetupDefinitionService,
  type ProductRecordMetadata,
  type SetupDefinition,
  type SetupDefinitionRevision
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-revision-resolution",
  originTransitionId: "transition-revision-resolution",
  createdBySource: "detection_pipeline",
  lastUpdatedBySource: "detection_pipeline",
  traceId: "trace-revision-resolution",
  sourceObservedAtUtc: "2026-04-29T12:00:00.000Z"
};

const buildSetupDefinition = (
  id: string,
  status: SetupDefinition["status"]
): SetupDefinition => ({
  id,
  name: "Setup revision resolution",
  description: "Setup for revision resolution tests",
  status,
  measurableConditions: ["close above range high"],
  evaluationAssumptions: ["fixed 24h evaluation"],
  invalidationAssumptions: ["invalidate on immediate breakdown"],
  createdAt: "2026-04-29T10:00:00.000Z",
  updatedAt: "2026-04-29T10:00:00.000Z"
});

const buildRevision = (
  id: string,
  setupDefinitionId: string,
  setupFamilyId: string,
  version: number,
  revisionStatus: SetupDefinitionRevision["revisionStatus"]
): SetupDefinitionRevision => ({
  id,
  setupDefinitionId,
  versionInfo: {
    setupFamilyId,
    revisionId: id,
    version
  },
  revisionReason: "resolution test revision",
  revisionStatus,
  changedFieldsSummary: "baseline",
  createdBy: "research_reviewer_1",
  createdAt: "2026-04-29T11:00:00.000Z",
  sourceSetupRefinementRequestId: `refinement-${id}`,
  updatedAt: "2026-04-29T11:00:00.000Z"
});

const createFixture = () => {
  const setupDefinitionRepository = new InMemorySetupDefinitionRepository();
  const setupDefinitionRevisionRepository = new InMemorySetupDefinitionRevisionRepository();

  const setupDefinitionService = createSetupDefinitionService({
    setupDefinitionRepository,
    setupDefinitionRevisionRepository
  });

  const resolutionHandoff = createActiveSetupRevisionResolutionHandoff({
    setupDefinitionService
  });

  return {
    setupDefinitionRepository,
    setupDefinitionRevisionRepository,
    resolutionHandoff
  };
};

test("valid active-revision resolution shape", async () => {
  const {
    setupDefinitionRepository,
    setupDefinitionRevisionRepository,
    resolutionHandoff
  } = createFixture();

  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-family-100-v2", "active"),
    metadata
  });
  await setupDefinitionRevisionRepository.create({
    revision: buildRevision(
      "revision-family-100-v2",
      "setup-family-100-v2",
      "setup-family-100",
      2,
      "accepted"
    ),
    metadata
  });

  const result = await resolutionHandoff.resolve({
    setupFamilyId: "setup-family-100",
    resolvedAt: "2026-04-29T12:05:00.000Z"
  });

  assert.equal(result.status, "resolved");
  assert.equal(result.resolution?.revisionRef.setupFamilyId, "setup-family-100");
  assert.equal(result.resolution?.revisionRef.setupRevisionId, "revision-family-100-v2");
  assert.equal(result.resolution?.effectiveStatus, "active");
});

test("missing active revision rejected", async () => {
  const {
    setupDefinitionRepository,
    setupDefinitionRevisionRepository,
    resolutionHandoff
  } = createFixture();

  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-family-101-v2", "paused"),
    metadata
  });
  await setupDefinitionRevisionRepository.create({
    revision: buildRevision(
      "revision-family-101-v2",
      "setup-family-101-v2",
      "setup-family-101",
      2,
      "accepted"
    ),
    metadata
  });

  const result = await resolutionHandoff.resolve({
    setupFamilyId: "setup-family-101",
    resolvedAt: "2026-04-29T12:05:00.000Z"
  });

  assert.equal(result.status, "rejected");
  assert.equal(result.reason?.includes("has no active revision"), true);
});

test("multiple active revisions rejected", async () => {
  const {
    setupDefinitionRepository,
    setupDefinitionRevisionRepository,
    resolutionHandoff
  } = createFixture();

  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-family-102-v2", "active"),
    metadata
  });
  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-family-102-v3", "active"),
    metadata
  });

  await setupDefinitionRevisionRepository.create({
    revision: buildRevision(
      "revision-family-102-v2",
      "setup-family-102-v2",
      "setup-family-102",
      2,
      "accepted"
    ),
    metadata
  });
  await setupDefinitionRevisionRepository.create({
    revision: buildRevision(
      "revision-family-102-v3",
      "setup-family-102-v3",
      "setup-family-102",
      3,
      "accepted"
    ),
    metadata
  });

  const result = await resolutionHandoff.resolve({
    setupFamilyId: "setup-family-102",
    resolvedAt: "2026-04-29T12:05:00.000Z"
  });

  assert.equal(result.status, "rejected");
  assert.equal(result.reason?.includes("multiple active revisions"), true);
});

test("resolution result shape stays explicit", async () => {
  const { resolutionHandoff } = createFixture();

  const result = await resolutionHandoff.resolve({
    setupFamilyId: "setup-family-103",
    resolvedAt: ""
  });

  assert.equal(result.status, "rejected");
  assert.equal(Array.isArray(result.warnings), true);
  assert.equal(typeof result.reason, "string");
});
