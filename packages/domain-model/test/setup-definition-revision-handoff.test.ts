import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemorySetupDefinitionRepository,
  InMemorySetupDefinitionRevisionRepository,
  InMemorySetupRefinementRequestRepository,
  createSetupDefinitionRevisionHandoff,
  createSetupDefinitionService,
  type ProductRecordMetadata,
  type SetupDefinition,
  type SetupRefinementRequest
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-setup-revision",
  originTransitionId: "transition-setup-revision",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-setup-revision",
  sourceObservedAtUtc: "2026-04-27T12:00:00.000Z"
};

const buildSetupDefinition = (
  id: string,
  status: SetupDefinition["status"] = "active"
): SetupDefinition => ({
  id,
  name: "Setup revision test",
  description: "Setup for revision handoff tests",
  status,
  measurableConditions: ["close above range high"],
  evaluationAssumptions: ["fixed 24h evaluation"],
  invalidationAssumptions: ["invalidate on immediate breakdown"],
  createdAt: "2026-04-27T10:00:00.000Z",
  updatedAt: "2026-04-27T10:00:00.000Z"
});

const buildRefinementRequest = (
  id: string,
  setupDefinitionId: string,
  requestedAt: string
): SetupRefinementRequest => ({
  id,
  setupDefinitionId,
  sourceResearchDecisionApprovalId: "approval-setup-revision-001",
  sourceResearchFeedbackDecisionId: "feedback-setup-revision-001",
  refinementRationaleSummary: "Evidence suggests measurable conditions should be tightened.",
  requestedChangesSummary: "Narrow measurable conditions and adjust invalidation assumptions.",
  status: "proposed",
  requestedBy: "research_reviewer_1",
  requestedAt,
  createdAt: requestedAt,
  updatedAt: requestedAt
});

const createFixture = () => {
  const setupDefinitionRepository = new InMemorySetupDefinitionRepository();
  const setupRefinementRequestRepository = new InMemorySetupRefinementRequestRepository();
  const setupDefinitionRevisionRepository = new InMemorySetupDefinitionRevisionRepository();

  const setupDefinitionService = createSetupDefinitionService({
    setupDefinitionRepository,
    setupRefinementRequestRepository,
    setupDefinitionRevisionRepository
  });

  const revisionHandoff = createSetupDefinitionRevisionHandoff({
    setupDefinitionService,
    setupRefinementRequestRepository,
    setupDefinitionRepository
  });

  return {
    setupDefinitionRepository,
    setupRefinementRequestRepository,
    setupDefinitionRevisionRepository,
    revisionHandoff
  };
};

test("valid revision command shape", async () => {
  const {
    setupDefinitionRepository,
    setupRefinementRequestRepository,
    setupDefinitionRevisionRepository,
    revisionHandoff
  } = createFixture();

  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-revision-001", "active"),
    metadata
  });
  await setupRefinementRequestRepository.create({
    request: buildRefinementRequest(
      "refinement-request-001",
      "setup-revision-001",
      "2026-04-27T11:55:00.000Z"
    ),
    metadata
  });

  const result = await revisionHandoff.create(
    {
      setupRefinementRequestId: "refinement-request-001",
      setupDefinitionId: "setup-revision-001",
      requestedBy: "research_reviewer_1",
      requestedAt: "2026-04-27T12:05:00.000Z",
      revisionSummary: "Tighten breakout criteria from refinement request.",
      proposedChangedFieldsSummary: "Updated measurable conditions and invalidation assumptions.",
      proposedMeasurableConditions: ["close above range high with 1h confirmation"],
      proposedInvalidationAssumptions: ["invalidate on immediate reclaim below range high"]
    },
    metadata
  );

  assert.equal(result.status, "created");
  assert.equal(result.setupRefinementRequestId, "refinement-request-001");
  assert.equal(result.previousSetupDefinitionId, "setup-revision-001");
  assert.equal(result.setupFamilyId, "setup-revision-001");
  assert.equal(result.version, 2);
  assert.equal(result.revisionStatus, "draft");

  const revisions = await setupDefinitionRevisionRepository.listBySetupFamilyId("setup-revision-001");
  assert.equal(revisions.length, 1);
  assert.equal(revisions[0]?.versionInfo.version, 2);
  assert.equal(revisions[0]?.previousSetupDefinitionId, "setup-revision-001");
});

test("missing refinement request rejected", async () => {
  const { setupDefinitionRepository, revisionHandoff } = createFixture();

  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-revision-002", "active"),
    metadata
  });

  const result = await revisionHandoff.create(
    {
      setupRefinementRequestId: "refinement-request-missing",
      setupDefinitionId: "setup-revision-002",
      requestedBy: "research_reviewer_1",
      requestedAt: "2026-04-27T12:05:00.000Z",
      revisionSummary: "Tighten breakout criteria from refinement request.",
      proposedChangedFieldsSummary: "Updated measurable conditions and invalidation assumptions."
    },
    metadata
  );

  assert.equal(result.status, "rejected_validation");
  assert.equal(result.reason?.includes("setup_refinement_request not found"), true);
});

test("missing setup definition rejected", async () => {
  const { setupRefinementRequestRepository, revisionHandoff } = createFixture();

  await setupRefinementRequestRepository.create({
    request: buildRefinementRequest(
      "refinement-request-003",
      "setup-revision-003",
      "2026-04-27T11:55:00.000Z"
    ),
    metadata
  });

  const result = await revisionHandoff.create(
    {
      setupRefinementRequestId: "refinement-request-003",
      setupDefinitionId: "setup-revision-003",
      requestedBy: "research_reviewer_1",
      requestedAt: "2026-04-27T12:05:00.000Z",
      revisionSummary: "Tighten breakout criteria from refinement request.",
      proposedChangedFieldsSummary: "Updated measurable conditions and invalidation assumptions."
    },
    metadata
  );

  assert.equal(result.status, "rejected_validation");
  assert.equal(result.reason?.includes("setup_definition not found"), true);
});

test("invalid previous revision linkage rejected", async () => {
  const {
    setupDefinitionRepository,
    setupRefinementRequestRepository,
    revisionHandoff
  } = createFixture();

  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-revision-004", "active"),
    metadata
  });
  await setupRefinementRequestRepository.create({
    request: buildRefinementRequest(
      "refinement-request-004",
      "setup-revision-004",
      "2026-04-27T11:55:00.000Z"
    ),
    metadata
  });

  const result = await revisionHandoff.create(
    {
      setupRefinementRequestId: "refinement-request-004",
      setupDefinitionId: "setup-revision-004",
      requestedBy: "research_reviewer_1",
      requestedAt: "2026-04-27T12:05:00.000Z",
      revisionSummary: "Tighten breakout criteria from refinement request.",
      proposedChangedFieldsSummary: "Updated measurable conditions and invalidation assumptions.",
      expectedPreviousRevisionId: "revision-that-does-not-exist"
    },
    metadata
  );

  assert.equal(result.status, "rejected_linkage");
  assert.equal(result.reason?.includes("expectedPreviousRevisionId"), true);
});

test("revision result shape stays explicit", async () => {
  const { revisionHandoff } = createFixture();

  const result = await revisionHandoff.create(
    {
      setupRefinementRequestId: "",
      setupDefinitionId: "setup-revision-005",
      requestedBy: "research_reviewer_1",
      requestedAt: "2026-04-27T12:05:00.000Z",
      revisionSummary: "Tighten breakout criteria from refinement request.",
      proposedChangedFieldsSummary: "Updated measurable conditions and invalidation assumptions."
    },
    metadata
  );

  assert.equal(result.status, "rejected_validation");
  assert.equal(Array.isArray(result.warnings), true);
  assert.equal(typeof result.reason, "string");
});

test("version assignment shape stays explicit", async () => {
  const {
    setupDefinitionRepository,
    setupRefinementRequestRepository,
    setupDefinitionRevisionRepository,
    revisionHandoff
  } = createFixture();

  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-revision-006", "active"),
    metadata
  });

  await setupRefinementRequestRepository.create({
    request: buildRefinementRequest(
      "refinement-request-006a",
      "setup-revision-006",
      "2026-04-27T11:55:00.000Z"
    ),
    metadata
  });

  const firstRevision = await revisionHandoff.create(
    {
      setupRefinementRequestId: "refinement-request-006a",
      setupDefinitionId: "setup-revision-006",
      requestedBy: "research_reviewer_1",
      requestedAt: "2026-04-27T12:05:00.000Z",
      revisionSummary: "First revision",
      proposedChangedFieldsSummary: "Adjust measurable conditions.",
      proposedMeasurableConditions: ["first revision condition"]
    },
    metadata
  );

  assert.equal(firstRevision.status, "created");
  assert.equal(firstRevision.version, 2);

  await setupRefinementRequestRepository.create({
    request: buildRefinementRequest(
      "refinement-request-006b",
      firstRevision.newSetupDefinitionId ?? "",
      "2026-04-27T12:10:00.000Z"
    ),
    metadata
  });

  const secondRevision = await revisionHandoff.create(
    {
      setupRefinementRequestId: "refinement-request-006b",
      setupDefinitionId: firstRevision.newSetupDefinitionId ?? "",
      requestedBy: "research_reviewer_1",
      requestedAt: "2026-04-27T12:15:00.000Z",
      revisionSummary: "Second revision",
      proposedChangedFieldsSummary: "Adjust invalidation assumptions.",
      proposedInvalidationAssumptions: ["second revision invalidation"],
      expectedPreviousRevisionId: firstRevision.setupDefinitionRevisionId
    },
    metadata
  );

  assert.equal(secondRevision.status, "created");
  assert.equal(secondRevision.version, 3);
  assert.equal(secondRevision.setupFamilyId, "setup-revision-006");

  const revisions = await setupDefinitionRevisionRepository.listBySetupFamilyId("setup-revision-006");
  assert.equal(revisions.length, 2);
  assert.equal(revisions[0]?.versionInfo.version, 2);
  assert.equal(revisions[1]?.versionInfo.version, 3);
});
