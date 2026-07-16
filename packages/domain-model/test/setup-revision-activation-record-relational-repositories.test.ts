import assert from "node:assert/strict";
import test from "node:test";

import {
  composeSetupRevisionActivationRecordRelationalRepositories,
  InMemorySetupRevisionActivationRecordRelationalRepositoryAdapter,
  RelationalSetupRevisionActivationRecordRepository,
  RepositoryError,
  type ProductRecordMetadata,
  type SetupDefinitionDurableRecord,
  type SetupDefinitionRevisionDurableRecord,
  type SetupRevisionActivationRecord
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-setup-activation-repository-001",
  originTransitionId: "transition-setup-activation-repository-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-setup-activation-repository-001",
  sourceObservedAtUtc: "2026-07-14T10:45:00.000Z"
};

const buildSetupDefinitionRecord = (
  setupDefinitionId: string,
  definitionStatus: SetupDefinitionDurableRecord["definitionStatus"] = "active"
): SetupDefinitionDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "setup_definition",
    entityId: setupDefinitionId,
    version: 2,
    relatedEntityIds: []
  },
  lifecycleStatus: "active",
  createdAtUtc: "2026-07-14T09:00:00.000Z",
  updatedAtUtc: "2026-07-14T10:30:00.000Z",
  archivedAtUtc: null,
  metadata,
  definitionStatus,
  name: "Breakout Continuation",
  description: "Accepted breakout continuation setup revision.",
  measurableConditions: ["4h close above breakout range"],
  evaluationAssumptions: ["evaluate continuation over 24h"],
  invalidationAssumptions: ["invalidate on failed reclaim"],
  traceMetadata: {
    originRunId: "run-setup-activation-repository-001",
    originTransitionId: "transition-setup-activation-repository-001",
    traceId: "trace-setup-activation-repository-001"
  }
});

const buildSetupDefinitionRevisionRecord = (
  setupDefinitionRevisionId: string,
  setupDefinitionId: string,
  setupFamilyId = "setup-family-001",
  previousSetupDefinitionId: string | null = null,
  previousRevisionId: string | null = null,
  setupVersionNumber = 2
): SetupDefinitionRevisionDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "setup_definition_revision",
    entityId: setupDefinitionRevisionId,
    version: 1,
    relatedEntityIds: [
      setupDefinitionId,
      ...(previousSetupDefinitionId ? [previousSetupDefinitionId] : []),
      "refinement-001",
      "approval-001",
      "feedback-001"
    ]
  },
  lifecycleStatus: "active",
  createdAtUtc: "2026-07-14T10:00:00.000Z",
  updatedAtUtc: "2026-07-14T10:00:00.000Z",
  archivedAtUtc: null,
  metadata,
  setupDefinitionId,
  previousSetupDefinitionId,
  setupFamilyId,
  setupVersionNumber,
  previousRevisionId,
  revisionReason: "Promote the accepted revision into the operational setup chain.",
  revisionStatus: "accepted",
  changedFieldsSummary: "Tightened timing and invalidation criteria.",
  createdBy: "research_reviewer_1",
  notes: "Ready for explicit activation.",
  sourceSetupRefinementRequestId: "refinement-001",
  sourceResearchDecisionApprovalId: "approval-001",
  sourceResearchFeedbackDecisionId: "feedback-001"
});

const buildActivation = ({
  activationId,
  setupFamilyId = "setup-family-001",
  targetRevisionId = "revision-002",
  targetSetupDefinitionId = "setup-family-001-v2",
  previousRevisionId = "revision-001",
  previousSetupDefinitionId = "setup-family-001-v1",
  activationOutcome = "superseded_previous",
  activatedAt = "2026-07-14T10:45:00.000Z"
}: {
  activationId: string;
  activatedAt?: string;
  activationOutcome?: SetupRevisionActivationRecord["activationOutcome"];
  previousRevisionId?: string | undefined;
  previousSetupDefinitionId?: string | undefined;
  setupFamilyId?: string;
  targetRevisionId?: string;
  targetSetupDefinitionId?: string;
}): SetupRevisionActivationRecord => ({
  id: activationId,
  setupFamilyId,
  targetRevisionId,
  targetSetupDefinitionId,
  ...(previousRevisionId ? { previousRevisionId } : {}),
  ...(previousSetupDefinitionId ? { previousSetupDefinitionId } : {}),
  activatedBy: "research_reviewer_1",
  activatedAt,
  activationOutcome,
  rationale: "Promote the accepted revision after final review.",
  createdAt: activatedAt,
  updatedAt: activatedAt
});

const createRepositoryFixture = () => {
  const setupDefinitionsById = new Map(
    [
      buildSetupDefinitionRecord("setup-family-001-v1"),
      buildSetupDefinitionRecord("setup-family-001-v2"),
      buildSetupDefinitionRecord("setup-family-001-v3"),
      buildSetupDefinitionRecord("setup-family-999-v1")
    ].map((record) => [record.identity.entityId, record])
  );
  const revisionsById = new Map(
    [
      buildSetupDefinitionRevisionRecord(
        "revision-001",
        "setup-family-001-v1",
        "setup-family-001",
        null,
        null,
        1
      ),
      buildSetupDefinitionRevisionRecord(
        "revision-002",
        "setup-family-001-v2",
        "setup-family-001",
        "setup-family-001-v1",
        "revision-001",
        2
      ),
      buildSetupDefinitionRevisionRecord(
        "revision-003",
        "setup-family-001-v3",
        "setup-family-001",
        "setup-family-001-v2",
        "revision-002",
        3
      ),
      buildSetupDefinitionRevisionRecord(
        "revision-999",
        "setup-family-999-v1",
        "setup-family-999",
        null,
        null,
        1
      )
    ].map((record) => [record.identity.entityId, record])
  );

  const adapter = new InMemorySetupRevisionActivationRecordRelationalRepositoryAdapter({
    loadSetupDefinitionRecord: async (setupDefinitionId) =>
      setupDefinitionsById.get(setupDefinitionId) ?? null,
    loadSetupDefinitionRevisionRecord: async (setupDefinitionRevisionId) =>
      revisionsById.get(setupDefinitionRevisionId) ?? null
  });

  return {
    setupRevisionActivationRecordRepository:
      new RelationalSetupRevisionActivationRecordRepository(adapter),
    composedRepositories:
      composeSetupRevisionActivationRecordRelationalRepositories(adapter)
  };
};

test("relational setup-revision activation repository persists and lists records through the adapter boundary", async () => {
  const { setupRevisionActivationRecordRepository } = createRepositoryFixture();

  await setupRevisionActivationRecordRepository.create({
    activation: buildActivation({ activationId: "activation-001" }),
    metadata
  });
  await setupRevisionActivationRecordRepository.create({
    activation: buildActivation({
      activationId: "activation-002",
      targetRevisionId: "revision-003",
      targetSetupDefinitionId: "setup-family-001-v3",
      previousRevisionId: "revision-002",
      previousSetupDefinitionId: "setup-family-001-v2",
      activationOutcome: "activated",
      activatedAt: "2026-07-14T10:50:00.000Z"
    }),
    metadata
  });

  const byId =
    await setupRevisionActivationRecordRepository.getById("activation-001");
  const byFamily =
    await setupRevisionActivationRecordRepository.listBySetupFamilyId(
      "setup-family-001"
    );
  const byTarget =
    await setupRevisionActivationRecordRepository.listByTargetRevisionId(
      "revision-003"
    );

  assert.equal(byId?.activationOutcome, "superseded_previous");
  assert.equal(byFamily.length, 2);
  assert.equal(byFamily[0]?.id, "activation-001");
  assert.equal(byFamily[1]?.id, "activation-002");
  assert.equal(byTarget.length, 1);
  assert.equal(byTarget[0]?.targetSetupDefinitionId, "setup-family-001-v3");
});

test("setup-revision activation repository composition reuses one adapter boundary", async () => {
  const { composedRepositories } = createRepositoryFixture();

  await composedRepositories.setupRevisionActivationRecordRepository.create({
    activation: buildActivation({ activationId: "activation-003" }),
    metadata
  });

  const stored =
    await composedRepositories.setupRevisionActivationRecordRepository.getById(
      "activation-003"
    );

  assert.equal(stored?.activatedBy, "research_reviewer_1");
  assert.equal(
    stored?.rationale,
    "Promote the accepted revision after final review."
  );
});

test("relational setup-revision activation repository rejects invalid target revision lineage", async () => {
  const { setupRevisionActivationRecordRepository } = createRepositoryFixture();

  await assert.rejects(
    async () =>
      setupRevisionActivationRecordRepository.create({
        activation: buildActivation({
          activationId: "activation-004",
          setupFamilyId: "setup-family-001",
          targetRevisionId: "revision-999",
          targetSetupDefinitionId: "setup-family-999-v1",
          previousRevisionId: undefined,
          previousSetupDefinitionId: undefined
        }),
        metadata
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "setup_revision_activation_record" &&
      error.referenceEntityType === "setup_definition_revision" &&
      error.referenceEntityId === "revision-999"
  );
});
