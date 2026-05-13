import assert from "node:assert/strict";
import test from "node:test";

import {
  FIRST_DURABLE_RELATIONAL_ADAPTER_ERROR_MAPPING,
  FIRST_DURABLE_RELATIONAL_ADAPTER_OPERATIONS,
  FIRST_DURABLE_RELATIONAL_DETERMINISTIC_ERROR_CODES,
  FIRST_DURABLE_RELATIONAL_RETRYABLE_ERROR_CODES,
  InMemoryResearchHypothesisRepository,
  InMemorySetupDefinitionRepository,
  type ProductRecordMetadata,
  RepositoryError,
  type ResearchHypothesis,
  type SetupDefinition,
  isFirstDurableRelationalDeterministicErrorCode
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-001",
  originTransitionId: "transition-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-001",
  sourceObservedAtUtc: "2026-05-12T09:00:00.000Z"
};

const buildSetupDefinition = (id: string): SetupDefinition => ({
  id,
  name: "Breakout Retest",
  description: "Retest after breakout with continuation bias.",
  status: "draft",
  measurableConditions: ["4h close above range high"],
  evaluationAssumptions: ["evaluate over fixed 24h window"],
  invalidationAssumptions: ["invalidate on failed retest"],
  createdAt: "2026-05-12T09:00:00.000Z",
  updatedAt: "2026-05-12T09:00:00.000Z"
});

const buildResearchHypothesis = (id: string): ResearchHypothesis => ({
  id,
  title: "Breakout retests outperform random entries",
  description: "Structured breakout retests should show positive asymmetry.",
  relatedSetupDefinitionIds: ["setup-001"],
  assumptions: ["median MFE exceeds median MAE over 50 samples"],
  notes: [],
  status: "draft",
  createdAt: "2026-05-12T09:00:00.000Z",
  updatedAt: "2026-05-12T09:00:00.000Z"
});

test("exposes first durable relational adapter contract constants", () => {
  assert.deepEqual(FIRST_DURABLE_RELATIONAL_DETERMINISTIC_ERROR_CODES, [
    "already_exists",
    "not_found",
    "version_mismatch",
    "invalid_reference"
  ]);
  assert.deepEqual(FIRST_DURABLE_RELATIONAL_RETRYABLE_ERROR_CODES, [
    "transient_failure",
    "unknown_failure"
  ]);
  assert.deepEqual(FIRST_DURABLE_RELATIONAL_ADAPTER_ERROR_MAPPING, {
    deterministic: ["already_exists", "not_found", "version_mismatch", "invalid_reference"],
    retryable: ["transient_failure", "unknown_failure"]
  });
  assert.equal(FIRST_DURABLE_RELATIONAL_ADAPTER_OPERATIONS.includes("update_research_hypothesis_bundle"), true);
  assert.equal(isFirstDurableRelationalDeterministicErrorCode("already_exists"), true);
  assert.equal(isFirstDurableRelationalDeterministicErrorCode("transient_failure"), false);
});

test("in-memory setup-definition repository throws deterministic duplicate-create error", async () => {
  const repository = new InMemorySetupDefinitionRepository();
  await repository.create({
    definition: buildSetupDefinition("setup-001"),
    metadata
  });

  await assert.rejects(
    async () =>
      repository.create({
        definition: buildSetupDefinition("setup-001"),
        metadata
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "already_exists" &&
      error.entityType === "setup_definition" &&
      error.operation === "create" &&
      error.retryDisposition === "do_not_retry"
  );
});

test("in-memory research-hypothesis repository throws deterministic version-mismatch error", async () => {
  const repository = new InMemoryResearchHypothesisRepository();
  await repository.create({
    hypothesis: buildResearchHypothesis("hypothesis-001"),
    metadata
  });

  await assert.rejects(
    async () =>
      repository.update({
        hypothesis: {
          ...buildResearchHypothesis("hypothesis-001"),
          notes: ["updated note"]
        },
        metadata,
        expectedVersion: 99
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "version_mismatch" &&
      error.entityType === "research_hypothesis" &&
      error.operation === "update" &&
      error.expectedVersion === 99 &&
      error.actualVersion === 1
  );
});

test("in-memory setup-definition repository throws deterministic not-found error", async () => {
  const repository = new InMemorySetupDefinitionRepository();

  await assert.rejects(
    async () =>
      repository.update({
        definition: buildSetupDefinition("setup-missing"),
        metadata,
        expectedVersion: null
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "not_found" &&
      error.entityType === "setup_definition" &&
      error.operation === "update"
  );
});
