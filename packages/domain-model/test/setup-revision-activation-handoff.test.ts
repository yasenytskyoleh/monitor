import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemorySetupDefinitionRepository,
  InMemorySetupDefinitionRevisionRepository,
  InMemorySetupRevisionActivationRecordRepository,
  createSetupDefinitionService,
  createSetupRevisionActivationHandoff,
  type ProductRecordMetadata,
  type SetupDefinition,
  type SetupDefinitionRevision
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-revision-activation",
  originTransitionId: "transition-revision-activation",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-revision-activation",
  sourceObservedAtUtc: "2026-04-28T12:00:00.000Z"
};

const buildSetupDefinition = (
  id: string,
  status: SetupDefinition["status"]
): SetupDefinition => ({
  id,
  name: "Setup revision activation",
  description: "Setup for revision activation tests",
  status,
  measurableConditions: ["close above range high"],
  evaluationAssumptions: ["fixed 24h evaluation"],
  invalidationAssumptions: ["invalidate on immediate breakdown"],
  createdAt: "2026-04-28T10:00:00.000Z",
  updatedAt: "2026-04-28T10:00:00.000Z"
});

const buildRevision = (
  id: string,
  setupDefinitionId: string,
  setupFamilyId: string,
  version: number,
  revisionStatus: SetupDefinitionRevision["revisionStatus"],
  previousRevisionId?: string,
  previousSetupDefinitionId?: string
): SetupDefinitionRevision => ({
  id,
  setupDefinitionId,
  previousSetupDefinitionId,
  versionInfo: {
    setupFamilyId,
    revisionId: id,
    version,
    previousRevisionId
  },
  revisionReason: "revision for activation",
  revisionStatus,
  changedFieldsSummary: "updated measurable conditions",
  createdBy: "research_reviewer_1",
  createdAt: "2026-04-28T11:00:00.000Z",
  sourceSetupRefinementRequestId: `refinement-${id}`,
  updatedAt: "2026-04-28T11:00:00.000Z"
});

const createFixture = () => {
  const setupDefinitionRepository = new InMemorySetupDefinitionRepository();
  const setupDefinitionRevisionRepository = new InMemorySetupDefinitionRevisionRepository();
  const setupRevisionActivationRecordRepository = new InMemorySetupRevisionActivationRecordRepository();

  const setupDefinitionService = createSetupDefinitionService({
    setupDefinitionRepository,
    setupDefinitionRevisionRepository,
    setupRevisionActivationRecordRepository
  });

  const activationHandoff = createSetupRevisionActivationHandoff({
    setupDefinitionService,
    setupDefinitionRevisionRepository
  });

  return {
    setupDefinitionRepository,
    setupDefinitionRevisionRepository,
    setupRevisionActivationRecordRepository,
    activationHandoff
  };
};

test("valid activation command shape", async () => {
  const {
    setupDefinitionRepository,
    setupDefinitionRevisionRepository,
    setupRevisionActivationRecordRepository,
    activationHandoff
  } = createFixture();

  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-family-001-v2", "active"),
    metadata
  });
  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-family-001-v3", "draft"),
    metadata
  });

  await setupDefinitionRevisionRepository.create({
    revision: buildRevision(
      "revision-family-001-v2",
      "setup-family-001-v2",
      "setup-family-001",
      2,
      "accepted"
    ),
    metadata
  });

  await setupDefinitionRevisionRepository.create({
    revision: buildRevision(
      "revision-family-001-v3",
      "setup-family-001-v3",
      "setup-family-001",
      3,
      "accepted",
      "revision-family-001-v2",
      "setup-family-001-v2"
    ),
    metadata
  });

  const result = await activationHandoff.activate(
    {
      setupFamilyId: "setup-family-001",
      targetRevisionId: "revision-family-001-v3",
      activatedBy: "research_reviewer_1",
      activatedAt: "2026-04-28T12:05:00.000Z",
      previousActiveRevisionId: "revision-family-001-v2",
      rationale: "Promote accepted revision with refined assumptions"
    },
    metadata
  );

  assert.equal(result.status, "superseded_previous");
  assert.equal(result.targetRevisionId, "revision-family-001-v3");
  assert.equal(result.previousRevisionId, "revision-family-001-v2");

  const previousRevision = await setupDefinitionRevisionRepository.getById("revision-family-001-v2");
  assert.equal(previousRevision?.revisionStatus, "superseded");

  const targetSetup = await setupDefinitionRepository.getById("setup-family-001-v3");
  const previousSetup = await setupDefinitionRepository.getById("setup-family-001-v2");
  assert.equal(targetSetup?.status, "active");
  assert.equal(previousSetup?.status, "paused");

  const activationRecords = await setupRevisionActivationRecordRepository.listBySetupFamilyId(
    "setup-family-001"
  );
  assert.equal(activationRecords.length, 1);
  assert.equal(activationRecords[0]?.activationOutcome, "superseded_previous");
});

test("missing target revision rejected", async () => {
  const { activationHandoff } = createFixture();

  const result = await activationHandoff.activate(
    {
      setupFamilyId: "setup-family-002",
      targetRevisionId: "revision-missing",
      activatedBy: "research_reviewer_1",
      activatedAt: "2026-04-28T12:05:00.000Z"
    },
    metadata
  );

  assert.equal(result.status, "rejected");
  assert.equal(result.reason?.includes("setup_definition_revision not found"), true);
});

test("non-accepted revision rejected", async () => {
  const {
    setupDefinitionRepository,
    setupDefinitionRevisionRepository,
    activationHandoff
  } = createFixture();

  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-family-003-v3", "draft"),
    metadata
  });
  await setupDefinitionRevisionRepository.create({
    revision: buildRevision(
      "revision-family-003-v3",
      "setup-family-003-v3",
      "setup-family-003",
      3,
      "draft"
    ),
    metadata
  });

  const result = await activationHandoff.activate(
    {
      setupFamilyId: "setup-family-003",
      targetRevisionId: "revision-family-003-v3",
      activatedBy: "research_reviewer_1",
      activatedAt: "2026-04-28T12:05:00.000Z"
    },
    metadata
  );

  assert.equal(result.status, "rejected");
  assert.equal(result.reason?.includes("not eligible for activation"), true);
});

test("duplicate active revision conflict handled explicitly", async () => {
  const {
    setupDefinitionRepository,
    setupDefinitionRevisionRepository,
    activationHandoff
  } = createFixture();

  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-family-004-v2", "active"),
    metadata
  });
  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-family-004-v3", "active"),
    metadata
  });
  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-family-004-v4", "draft"),
    metadata
  });

  await setupDefinitionRevisionRepository.create({
    revision: buildRevision(
      "revision-family-004-v2",
      "setup-family-004-v2",
      "setup-family-004",
      2,
      "accepted"
    ),
    metadata
  });
  await setupDefinitionRevisionRepository.create({
    revision: buildRevision(
      "revision-family-004-v3",
      "setup-family-004-v3",
      "setup-family-004",
      3,
      "accepted",
      "revision-family-004-v2",
      "setup-family-004-v2"
    ),
    metadata
  });
  await setupDefinitionRevisionRepository.create({
    revision: buildRevision(
      "revision-family-004-v4",
      "setup-family-004-v4",
      "setup-family-004",
      4,
      "accepted",
      "revision-family-004-v3",
      "setup-family-004-v3"
    ),
    metadata
  });

  const result = await activationHandoff.activate(
    {
      setupFamilyId: "setup-family-004",
      targetRevisionId: "revision-family-004-v4",
      activatedBy: "research_reviewer_1",
      activatedAt: "2026-04-28T12:05:00.000Z"
    },
    metadata
  );

  assert.equal(result.status, "rejected");
  assert.equal(result.reason?.includes("multiple active revisions"), true);
});

test("activation result shape stays explicit", async () => {
  const { activationHandoff } = createFixture();

  const result = await activationHandoff.activate(
    {
      setupFamilyId: "setup-family-005",
      targetRevisionId: "",
      activatedBy: "research_reviewer_1",
      activatedAt: "2026-04-28T12:05:00.000Z"
    },
    metadata
  );

  assert.equal(result.status, "rejected");
  assert.equal(Array.isArray(result.warnings), true);
  assert.equal(typeof result.reason, "string");
});

test("activation audit record shape stays explicit", async () => {
  const {
    setupDefinitionRepository,
    setupDefinitionRevisionRepository,
    setupRevisionActivationRecordRepository,
    activationHandoff
  } = createFixture();

  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-family-006-v3", "draft"),
    metadata
  });
  await setupDefinitionRevisionRepository.create({
    revision: buildRevision(
      "revision-family-006-v3",
      "setup-family-006-v3",
      "setup-family-006",
      3,
      "accepted"
    ),
    metadata
  });

  const result = await activationHandoff.activate(
    {
      setupFamilyId: "setup-family-006",
      targetRevisionId: "revision-family-006-v3",
      activatedBy: "research_reviewer_2",
      activatedAt: "2026-04-28T12:06:00.000Z",
      rationale: "Activate first accepted revision in this family"
    },
    metadata
  );

  assert.equal(result.status, "activated");

  const records = await setupRevisionActivationRecordRepository.listByTargetRevisionId(
    "revision-family-006-v3"
  );
  assert.equal(records.length, 1);
  const record = records[0];
  assert.equal(record?.setupFamilyId, "setup-family-006");
  assert.equal(record?.targetSetupDefinitionId, "setup-family-006-v3");
  assert.equal(record?.activatedBy, "research_reviewer_2");
  assert.equal(record?.activationOutcome, "activated");
});
