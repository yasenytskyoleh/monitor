import assert from "node:assert/strict";
import test from "node:test";

import type { Prisma } from "../src/generated/prisma/client.js";

import {
  PrismaFirstDurableRelationalRepositoryAdapter,
  RepositoryError,
  type FirstDurableRelationalPrismaClient,
  type ProductRecordMetadata,
  type ResearchHypothesisDurableRecordBundle,
  type SetupDefinitionDurableRecord
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-001",
  originTransitionId: "transition-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-001",
  sourceObservedAtUtc: "2026-05-13T08:00:00.000Z"
};

const buildSetupDefinitionRecord = (version: number): SetupDefinitionDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "setup_definition",
    entityId: "setup-001",
    version,
    relatedEntityIds: []
  },
  lifecycleStatus: "active",
  createdAtUtc: "2026-05-13T07:00:00.000Z",
  updatedAtUtc: "2026-05-13T08:00:00.000Z",
  archivedAtUtc: null,
  metadata,
  definitionStatus: "draft",
  name: "Breakout Retest",
  description: "Retest after breakout with continuation bias.",
  measurableConditions: ["4h close above range high"],
  evaluationAssumptions: ["evaluate over fixed 24h window"],
  invalidationAssumptions: ["invalidate on failed retest"],
  traceMetadata: {
    originRunId: "run-001",
    originTransitionId: "transition-001",
    traceId: "trace-001"
  }
});

const buildResearchHypothesisBundle = (
  version: number
): ResearchHypothesisDurableRecordBundle => ({
  hypothesisRecord: {
    storageSchemaVersion: "product_domain.relational.v1",
    identity: {
      boundary: "product_domain",
      entityType: "research_hypothesis",
      entityId: "hypothesis-001",
      version,
      relatedEntityIds: ["setup-001"]
    },
    lifecycleStatus: "active",
    createdAtUtc: "2026-05-13T07:00:00.000Z",
    updatedAtUtc: "2026-05-13T08:00:00.000Z",
    archivedAtUtc: null,
    metadata,
    hypothesisStatus: "draft",
    title: "Breakout retests outperform random entries",
    description: "Structured breakout retests should show positive asymmetry.",
    assumptions: ["median MFE exceeds median MAE over 50 samples"],
    notes: [],
    evidenceStatus: null,
    evidenceSummary: null,
    lastEvidenceAggregateResultId: null,
    lastEvidenceAssessedAt: null
  },
  setupDefinitionLinkRecords: [
    {
      storageSchemaVersion: "product_domain.relational.v1",
      researchHypothesisId: "hypothesis-001",
      setupDefinitionId: "setup-001",
      linkedAtUtc: "2026-05-13T08:00:00.000Z"
    }
  ]
});

const toPrismaSetupDefinitionRow = (record: SetupDefinitionDurableRecord) => ({
  setupDefinitionId: record.identity.entityId,
  version: record.identity.version,
  lifecycleStatus: record.lifecycleStatus,
  definitionStatus: record.definitionStatus,
  name: record.name,
  description: record.description,
  measurableConditions: [...record.measurableConditions],
  evaluationAssumptions: [...record.evaluationAssumptions],
  invalidationAssumptions: [...record.invalidationAssumptions],
  originRunId: record.metadata.originRunId,
  originTransitionId: record.metadata.originTransitionId,
  createdBySource: record.metadata.createdBySource,
  lastUpdatedBySource: record.metadata.lastUpdatedBySource,
  traceId: record.metadata.traceId,
  sourceObservedAtUtc: record.metadata.sourceObservedAtUtc
    ? new Date(record.metadata.sourceObservedAtUtc)
    : null,
  metadataNotes: record.metadata.notes ?? null,
  traceOriginRunId: record.traceMetadata?.originRunId ?? null,
  traceOriginTransitionId: record.traceMetadata?.originTransitionId ?? null,
  traceMetadataTraceId: record.traceMetadata?.traceId ?? null,
  createdAtUtc: new Date(record.createdAtUtc),
  updatedAtUtc: new Date(record.updatedAtUtc),
  archivedAtUtc: record.archivedAtUtc ? new Date(record.archivedAtUtc) : null
});

const toPrismaResearchHypothesisRow = (bundle: ResearchHypothesisDurableRecordBundle) => ({
  researchHypothesisId: bundle.hypothesisRecord.identity.entityId,
  version: bundle.hypothesisRecord.identity.version,
  lifecycleStatus: bundle.hypothesisRecord.lifecycleStatus,
  hypothesisStatus: bundle.hypothesisRecord.hypothesisStatus,
  title: bundle.hypothesisRecord.title,
  description: bundle.hypothesisRecord.description,
  assumptions: [...bundle.hypothesisRecord.assumptions],
  notes: [...bundle.hypothesisRecord.notes],
  evidenceStatus: bundle.hypothesisRecord.evidenceStatus,
  evidenceSummary: bundle.hypothesisRecord.evidenceSummary,
  lastEvidenceAggregateResultId: bundle.hypothesisRecord.lastEvidenceAggregateResultId,
  lastEvidenceAssessedAt: bundle.hypothesisRecord.lastEvidenceAssessedAt
    ? new Date(bundle.hypothesisRecord.lastEvidenceAssessedAt)
    : null,
  originRunId: bundle.hypothesisRecord.metadata.originRunId,
  originTransitionId: bundle.hypothesisRecord.metadata.originTransitionId,
  createdBySource: bundle.hypothesisRecord.metadata.createdBySource,
  lastUpdatedBySource: bundle.hypothesisRecord.metadata.lastUpdatedBySource,
  traceId: bundle.hypothesisRecord.metadata.traceId,
  sourceObservedAtUtc: bundle.hypothesisRecord.metadata.sourceObservedAtUtc
    ? new Date(bundle.hypothesisRecord.metadata.sourceObservedAtUtc)
    : null,
  metadataNotes: bundle.hypothesisRecord.metadata.notes ?? null,
  createdAtUtc: new Date(bundle.hypothesisRecord.createdAtUtc),
  updatedAtUtc: new Date(bundle.hypothesisRecord.updatedAtUtc),
  archivedAtUtc: bundle.hypothesisRecord.archivedAtUtc
    ? new Date(bundle.hypothesisRecord.archivedAtUtc)
    : null,
  setupDefinitionLinks: bundle.setupDefinitionLinkRecords.map((linkRecord) => ({
    researchHypothesisId: linkRecord.researchHypothesisId,
    setupDefinitionId: linkRecord.setupDefinitionId,
    linkedAtUtc: new Date(linkRecord.linkedAtUtc)
  }))
});

const toDateOrNull = (value: Date | string | null | undefined): Date | null => {
  if (value === null || value === undefined) {
    return null;
  }

  return value instanceof Date ? value : new Date(value);
};

const toRequiredDate = (value: Date | string): Date => (value instanceof Date ? value : new Date(value));
const toStringList = (value: string[] | { set: string[] } | undefined, fallback: string[]): string[] => {
  if (value === undefined) {
    return [...fallback];
  }

  return Array.isArray(value) ? [...value] : [...value.set];
};

const createFakePrismaClient = (): FirstDurableRelationalPrismaClient => {
  const state = {
    setupDefinitionRow: toPrismaSetupDefinitionRow(buildSetupDefinitionRecord(1)),
    researchHypothesisBundle: toPrismaResearchHypothesisRow(buildResearchHypothesisBundle(1))
  };

  const transaction = {
    setupDefinitionRecord: {
      async create(args: { data: Prisma.SetupDefinitionRecordUncheckedCreateInput }) {
        state.setupDefinitionRow = {
          setupDefinitionId: args.data.setupDefinitionId,
          version: args.data.version,
          lifecycleStatus: args.data.lifecycleStatus,
          definitionStatus: args.data.definitionStatus,
          name: args.data.name,
          description: args.data.description,
          measurableConditions: toStringList(
            args.data.measurableConditions,
            state.setupDefinitionRow.measurableConditions
          ),
          evaluationAssumptions: toStringList(
            args.data.evaluationAssumptions,
            state.setupDefinitionRow.evaluationAssumptions
          ),
          invalidationAssumptions: toStringList(
            args.data.invalidationAssumptions,
            state.setupDefinitionRow.invalidationAssumptions
          ),
          originRunId: args.data.originRunId ?? null,
          originTransitionId: args.data.originTransitionId ?? null,
          createdBySource: args.data.createdBySource,
          lastUpdatedBySource: args.data.lastUpdatedBySource,
          traceId: args.data.traceId ?? null,
          sourceObservedAtUtc: toDateOrNull(args.data.sourceObservedAtUtc),
          metadataNotes: args.data.metadataNotes ?? null,
          traceOriginRunId: args.data.traceOriginRunId ?? null,
          traceOriginTransitionId: args.data.traceOriginTransitionId ?? null,
          traceMetadataTraceId: args.data.traceMetadataTraceId ?? null,
          createdAtUtc: toRequiredDate(args.data.createdAtUtc),
          updatedAtUtc: toRequiredDate(args.data.updatedAtUtc),
          archivedAtUtc: toDateOrNull(args.data.archivedAtUtc)
        };
        return state.setupDefinitionRow;
      },
      async findMany() {
        return [state.setupDefinitionRow];
      },
      async findUnique() {
        return state.setupDefinitionRow;
      },
      async updateMany() {
        return { count: 1 };
      }
    },
    researchHypothesisRecord: {
      async create() {
        return state.researchHypothesisBundle;
      },
      async findMany() {
        return [state.researchHypothesisBundle];
      },
      async findUnique() {
        return state.researchHypothesisBundle;
      },
      async updateMany() {
        return { count: 1 };
      }
    },
    researchHypothesisSetupDefinitionLinkRecord: {
      async createMany() {
        return { count: state.researchHypothesisBundle.setupDefinitionLinks.length };
      },
      async deleteMany() {
        return { count: state.researchHypothesisBundle.setupDefinitionLinks.length };
      }
    }
  };

  return {
    ...transaction,
    async $transaction<T>(
      callback: (tx: typeof transaction) => Promise<T>
    ): Promise<T> {
      return callback(transaction);
    }
  };
};

test("prisma adapter hydrates setup-definition reads", async () => {
  const adapter = new PrismaFirstDurableRelationalRepositoryAdapter(createFakePrismaClient());

  const record = await adapter.loadSetupDefinitionRecord("setup-001");

  assert.equal(record?.identity.entityId, "setup-001");
  assert.equal(record?.traceMetadata?.traceId, "trace-001");
});

test("prisma adapter hydrates research-hypothesis bundle reads", async () => {
  const adapter = new PrismaFirstDurableRelationalRepositoryAdapter(createFakePrismaClient());

  const bundle = await adapter.loadResearchHypothesisBundle("hypothesis-001");

  assert.equal(bundle?.hypothesisRecord.identity.entityId, "hypothesis-001");
  assert.deepEqual(
    bundle?.setupDefinitionLinkRecords.map((linkRecord) => linkRecord.setupDefinitionId),
    ["setup-001"]
  );
});

test("prisma adapter maps unique-constraint failures to already_exists", async () => {
  const client = createFakePrismaClient();
  client.setupDefinitionRecord.create = async () => {
    throw { code: "P2002" };
  };
  const adapter = new PrismaFirstDurableRelationalRepositoryAdapter(client);

  await assert.rejects(
    async () =>
      adapter.insertSetupDefinitionRecord({
        record: buildSetupDefinitionRecord(1),
        expectedVersion: null
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "already_exists" &&
      error.entityType === "setup_definition"
  );
});

test("prisma adapter maps foreign-key failures to invalid_reference", async () => {
  const client = createFakePrismaClient();
  client.$transaction = async () => {
    throw { code: "P2003" };
  };
  const adapter = new PrismaFirstDurableRelationalRepositoryAdapter(client);

  await assert.rejects(
    async () =>
      adapter.insertResearchHypothesisBundle({
        bundle: buildResearchHypothesisBundle(1),
        expectedVersion: null
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "research_hypothesis" &&
      error.referenceEntityId === "setup-001"
  );
});

test("prisma adapter maps transaction conflicts to transient_failure", async () => {
  const client = createFakePrismaClient();
  client.setupDefinitionRecord.findUnique = async () => {
    throw { code: "P2034" };
  };
  const adapter = new PrismaFirstDurableRelationalRepositoryAdapter(client);

  await assert.rejects(
    async () => adapter.loadSetupDefinitionRecord("setup-001"),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "transient_failure" &&
      error.retryDisposition === "retryable"
  );
});
