import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemorySetupRevisionActivationRecordRelationalRepositoryAdapter,
  RepositoryError,
  SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_ADAPTER_ERROR_MAPPING,
  SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_ADAPTER_OPERATIONS,
  SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_DETERMINISTIC_ERROR_CODES,
  SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_RETRYABLE_ERROR_CODES,
  isSetupRevisionActivationRecordRelationalDeterministicErrorCode,
  type ProductRecordMetadata,
  type SetupDefinitionDurableRecord,
  type SetupDefinitionRevisionDurableRecord,
  type SetupRevisionActivationRecordDurableRecord
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-setup-activation-001",
  originTransitionId: "transition-setup-activation-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-setup-activation-001",
  sourceObservedAtUtc: "2026-07-11T10:45:00.000Z"
};

const buildSetupDefinitionRecord = (
  setupDefinitionId: string,
  definitionStatus: SetupDefinitionDurableRecord["definitionStatus"] = "draft"
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
  createdAtUtc: "2026-07-11T09:00:00.000Z",
  updatedAtUtc: "2026-07-11T10:30:00.000Z",
  archivedAtUtc: null,
  metadata,
  definitionStatus,
  name: "Breakout Continuation",
  description: "Accepted breakout continuation setup revision.",
  measurableConditions: ["4h close above breakout range"],
  evaluationAssumptions: ["evaluate continuation over 24h"],
  invalidationAssumptions: ["invalidate on failed reclaim"],
  traceMetadata: {
    originRunId: "run-setup-activation-001",
    originTransitionId: "transition-setup-activation-001",
    traceId: "trace-setup-activation-001"
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
  createdAtUtc: "2026-07-11T10:00:00.000Z",
  updatedAtUtc: "2026-07-11T10:00:00.000Z",
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

const buildActivationRecord = ({
  activationId,
  setupFamilyId = "setup-family-001",
  targetRevisionId = "revision-002",
  targetSetupDefinitionId = "setup-family-001-v2",
  previousRevisionId = null,
  previousSetupDefinitionId = null,
  activationOutcome = "activated"
}: {
  activationId: string;
  activationOutcome?: SetupRevisionActivationRecordDurableRecord["activationOutcome"];
  previousRevisionId?: string | null;
  previousSetupDefinitionId?: string | null;
  setupFamilyId?: string;
  targetRevisionId?: string;
  targetSetupDefinitionId?: string;
}): SetupRevisionActivationRecordDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "setup_revision_activation_record",
    entityId: activationId,
    version: 1,
    relatedEntityIds: [
      setupFamilyId,
      targetRevisionId,
      targetSetupDefinitionId,
      ...(previousRevisionId ? [previousRevisionId] : []),
      ...(previousSetupDefinitionId ? [previousSetupDefinitionId] : [])
    ]
  },
  lifecycleStatus: "active",
  createdAtUtc: "2026-07-11T10:45:00.000Z",
  updatedAtUtc: "2026-07-11T10:45:00.000Z",
  archivedAtUtc: null,
  metadata,
  setupFamilyId,
  targetRevisionId,
  targetSetupDefinitionId,
  previousRevisionId,
  previousSetupDefinitionId,
  activatedBy: "research_reviewer_1",
  activatedAtUtc: "2026-07-11T10:45:00.000Z",
  activationOutcome,
  rationale: "Promote the accepted revision after final review."
});

const createAdapter = ({
  setupDefinitions = [
    buildSetupDefinitionRecord("setup-family-001-v1", "active"),
    buildSetupDefinitionRecord("setup-family-001-v2", "active"),
    buildSetupDefinitionRecord("setup-family-001-v3"),
    buildSetupDefinitionRecord("setup-family-999-v1", "active")
  ],
  revisions = [
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
  ]
}: {
  revisions?: SetupDefinitionRevisionDurableRecord[];
  setupDefinitions?: SetupDefinitionDurableRecord[];
} = {}) => {
  const setupDefinitionsById = new Map(
    setupDefinitions.map((record) => [record.identity.entityId, record])
  );
  const revisionsById = new Map(revisions.map((record) => [record.identity.entityId, record]));

  return new InMemorySetupRevisionActivationRecordRelationalRepositoryAdapter({
    loadSetupDefinitionRecord: async (setupDefinitionId) =>
      setupDefinitionsById.get(setupDefinitionId) ?? null,
    loadSetupDefinitionRevisionRecord: async (setupDefinitionRevisionId) =>
      revisionsById.get(setupDefinitionRevisionId) ?? null
  });
};

test("exposes setup-revision-activation relational adapter contract constants", () => {
  assert.deepEqual(SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_DETERMINISTIC_ERROR_CODES, [
    "already_exists",
    "invalid_reference"
  ]);
  assert.deepEqual(SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_RETRYABLE_ERROR_CODES, [
    "transient_failure",
    "unknown_failure"
  ]);
  assert.deepEqual(SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_ADAPTER_ERROR_MAPPING, {
    deterministic: ["already_exists", "invalid_reference"],
    retryable: ["transient_failure", "unknown_failure"]
  });
  assert.equal(
    SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_ADAPTER_OPERATIONS.includes(
      "insert_setup_revision_activation_record"
    ),
    true
  );
  assert.equal(
    isSetupRevisionActivationRecordRelationalDeterministicErrorCode("already_exists"),
    true
  );
  assert.equal(
    isSetupRevisionActivationRecordRelationalDeterministicErrorCode("transient_failure"),
    false
  );
});

test("setup-revision-activation relational adapter rejects duplicate ids deterministically", async () => {
  const adapter = createAdapter();

  await adapter.insertSetupRevisionActivationRecord({
    record: buildActivationRecord({ activationId: "activation-001" })
  });

  await assert.rejects(
    async () =>
      adapter.insertSetupRevisionActivationRecord({
        record: buildActivationRecord({ activationId: "activation-001" })
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "already_exists" &&
      error.entityType === "setup_revision_activation_record" &&
      error.operation === "create"
  );
});

test("setup-revision-activation relational adapter stores records for load and list queries", async () => {
  const adapter = createAdapter();

  await adapter.insertSetupRevisionActivationRecord({
    record: buildActivationRecord({
      activationId: "activation-002",
      previousRevisionId: "revision-001",
      previousSetupDefinitionId: "setup-family-001-v1",
      activationOutcome: "superseded_previous"
    })
  });
  await adapter.insertSetupRevisionActivationRecord({
    record: buildActivationRecord({
      activationId: "activation-003",
      targetRevisionId: "revision-003",
      targetSetupDefinitionId: "setup-family-001-v3",
      previousRevisionId: "revision-002",
      previousSetupDefinitionId: "setup-family-001-v2",
      activationOutcome: "superseded_previous"
    })
  });

  const byId = await adapter.loadSetupRevisionActivationRecord("activation-002");
  const bySetupFamily =
    await adapter.listSetupRevisionActivationRecordsBySetupFamilyId("setup-family-001");
  const byTargetRevision =
    await adapter.listSetupRevisionActivationRecordsByTargetRevisionId("revision-003");

  assert.equal(byId?.identity.entityId, "activation-002");
  assert.equal(bySetupFamily.length, 2);
  assert.equal(byTargetRevision.length, 1);
  assert.equal(byTargetRevision[0]?.targetSetupDefinitionId, "setup-family-001-v3");
});

test("setup-revision-activation relational adapter rejects missing target revision references deterministically", async () => {
  const adapter = createAdapter({
    revisions: [buildSetupDefinitionRevisionRecord("revision-001", "setup-family-001-v1")]
  });

  await assert.rejects(
    async () =>
      adapter.insertSetupRevisionActivationRecord({
        record: buildActivationRecord({ activationId: "activation-004" })
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "setup_revision_activation_record" &&
      error.referenceEntityType === "setup_definition_revision" &&
      error.referenceEntityId === "revision-002"
  );
});

test("setup-revision-activation relational adapter rejects missing target setup references deterministically", async () => {
  const adapter = createAdapter({
    setupDefinitions: [buildSetupDefinitionRecord("setup-family-001-v1", "active")]
  });

  await assert.rejects(
    async () =>
      adapter.insertSetupRevisionActivationRecord({
        record: buildActivationRecord({ activationId: "activation-005" })
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "setup_revision_activation_record" &&
      error.referenceEntityType === "setup_definition" &&
      error.referenceEntityId === "setup-family-001-v2"
  );
});

test("setup-revision-activation relational adapter rejects target revisions linked to a different family", async () => {
  const adapter = createAdapter();

  await assert.rejects(
    async () =>
      adapter.insertSetupRevisionActivationRecord({
        record: buildActivationRecord({
          activationId: "activation-006",
          targetRevisionId: "revision-999",
          targetSetupDefinitionId: "setup-family-999-v1"
        })
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "setup_revision_activation_record" &&
      error.referenceEntityType === "setup_definition_revision" &&
      error.referenceEntityId === "revision-999"
  );
});

test("setup-revision-activation relational adapter rejects target revisions linked to a different setup definition", async () => {
  const adapter = createAdapter();

  await assert.rejects(
    async () =>
      adapter.insertSetupRevisionActivationRecord({
        record: buildActivationRecord({
          activationId: "activation-007",
          targetSetupDefinitionId: "setup-family-001-v3"
        })
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "setup_revision_activation_record" &&
      error.referenceEntityType === "setup_definition_revision" &&
      error.referenceEntityId === "revision-002"
  );
});

test("setup-revision-activation relational adapter rejects missing previous revision references deterministically", async () => {
  const adapter = createAdapter({
    revisions: [
      buildSetupDefinitionRevisionRecord(
        "revision-002",
        "setup-family-001-v2",
        "setup-family-001",
        "setup-family-001-v1",
        "revision-001",
        2
      )
    ]
  });

  await assert.rejects(
    async () =>
      adapter.insertSetupRevisionActivationRecord({
        record: buildActivationRecord({
          activationId: "activation-008",
          previousRevisionId: "revision-001",
          previousSetupDefinitionId: "setup-family-001-v1",
          activationOutcome: "already_active"
        })
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "setup_revision_activation_record" &&
      error.referenceEntityType === "setup_definition_revision" &&
      error.referenceEntityId === "revision-001"
  );
});

test("setup-revision-activation relational adapter rejects missing previous setup references deterministically", async () => {
  const adapter = createAdapter({
    setupDefinitions: [buildSetupDefinitionRecord("setup-family-001-v2", "active")]
  });

  await assert.rejects(
    async () =>
      adapter.insertSetupRevisionActivationRecord({
        record: buildActivationRecord({
          activationId: "activation-009",
          previousRevisionId: "revision-001",
          previousSetupDefinitionId: "setup-family-001-v1",
          activationOutcome: "already_active"
        })
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "setup_revision_activation_record" &&
      error.referenceEntityType === "setup_definition" &&
      error.referenceEntityId === "setup-family-001-v1"
  );
});

test("setup-revision-activation relational adapter rejects previous revisions from a different family", async () => {
  const adapter = createAdapter();

  await assert.rejects(
    async () =>
      adapter.insertSetupRevisionActivationRecord({
        record: buildActivationRecord({
          activationId: "activation-010",
          previousRevisionId: "revision-999",
          previousSetupDefinitionId: "setup-family-999-v1",
          activationOutcome: "superseded_previous"
        })
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "setup_revision_activation_record" &&
      error.referenceEntityType === "setup_definition_revision" &&
      error.referenceEntityId === "revision-999"
  );
});

test("setup-revision-activation relational adapter rejects previous revisions linked to a different setup definition", async () => {
  const adapter = createAdapter();

  await assert.rejects(
    async () =>
      adapter.insertSetupRevisionActivationRecord({
        record: buildActivationRecord({
          activationId: "activation-011",
          previousRevisionId: "revision-001",
          previousSetupDefinitionId: "setup-family-001-v3",
          activationOutcome: "already_active"
        })
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "setup_revision_activation_record" &&
      error.referenceEntityType === "setup_definition_revision" &&
      error.referenceEntityId === "revision-001"
  );
});

test("setup-revision-activation relational adapter rejects repeated previous and target lineage references", async () => {
  const adapter = createAdapter();

  await assert.rejects(
    async () =>
      adapter.insertSetupRevisionActivationRecord({
        record: buildActivationRecord({
          activationId: "activation-012",
          previousRevisionId: "revision-002",
          previousSetupDefinitionId: "setup-family-001-v2",
          activationOutcome: "already_active"
        })
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "setup_revision_activation_record" &&
      error.referenceEntityType === "setup_definition_revision" &&
      error.referenceEntityId === "revision-002"
  );
});
