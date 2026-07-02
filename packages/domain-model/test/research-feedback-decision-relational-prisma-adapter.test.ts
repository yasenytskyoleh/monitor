import assert from "node:assert/strict";
import test from "node:test";

import { Prisma } from "../src/generated/prisma/client.js";

import {
  PrismaResearchFeedbackDecisionRelationalRepositoryAdapter,
  RepositoryError,
  type ProductRecordMetadata,
  type ResearchFeedbackDecisionDurableRecord,
  type ResearchFeedbackDecisionRelationalPrismaClient
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-feedback-001",
  originTransitionId: "transition-feedback-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-feedback-001",
  sourceObservedAtUtc: "2026-05-23T10:00:00.000Z"
};

const buildFeedbackDecisionRecord = (version: number): ResearchFeedbackDecisionDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "research_feedback_decision",
    entityId: "feedback-001",
    version,
    relatedEntityIds: ["setup-001", "hypothesis-001", "aggregate-001"]
  },
  lifecycleStatus: "active",
  createdAtUtc: "2026-05-23T10:30:00.000Z",
  updatedAtUtc: "2026-05-23T11:00:00.000Z",
  archivedAtUtc: null,
  metadata,
  decisionStatus: "accepted",
  setupDefinitionId: "setup-001",
  researchHypothesisId: "hypothesis-001",
  setupAggregateResultId: "aggregate-001",
  evidenceStatus: "supports",
  recommendedAction: "keep_active",
  rationaleSummary: "aggregate evidence supports keeping the setup active",
  requiresManualReview: true,
  evidenceSummary: "10 completed evaluations with positive asymmetry",
  reviewerMetadata: {
    reviewedBy: "reviewer-001",
    reviewedAt: "2026-05-23T11:00:00.000Z",
    approvalOutcome: "approved"
  }
});

const toDateOrNull = (value: Date | string | null | undefined): Date | null => {
  if (value === null || value === undefined) {
    return null;
  }

  return value instanceof Date ? value : new Date(value);
};

const toRequiredDate = (value: Date | string): Date => (value instanceof Date ? value : new Date(value));

const toJsonValueOrNull = (
  value:
    | Prisma.InputJsonValue
    | Prisma.NullableJsonNullValueInput
    | Prisma.JsonObject
    | null
    | undefined,
  fallback: Prisma.JsonObject | null
): Prisma.JsonObject | null => {
  if (value === undefined) {
    return fallback;
  }

  if (value === null || value === Prisma.JsonNull) {
    return null;
  }

  return structuredClone(value as Prisma.JsonObject);
};

const toJsonObjectOrNull = (value: Prisma.JsonValue | null): Prisma.JsonObject | null => {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return null;
  }

  return structuredClone(value as Prisma.JsonObject);
};

const toPrismaFeedbackDecisionRow = (record: ResearchFeedbackDecisionDurableRecord) => ({
  researchFeedbackDecisionId: record.identity.entityId,
  version: record.identity.version,
  lifecycleStatus: record.lifecycleStatus,
  decisionStatus: record.decisionStatus,
  setupDefinitionId: record.setupDefinitionId,
  researchHypothesisId: record.researchHypothesisId,
  setupAggregateResultId: record.setupAggregateResultId,
  evidenceStatus: record.evidenceStatus,
  recommendedAction: record.recommendedAction,
  rationaleSummary: record.rationaleSummary,
  requiresManualReview: record.requiresManualReview,
  evidenceSummary: record.evidenceSummary,
  reviewerMetadata: record.reviewerMetadata
    ? (structuredClone(record.reviewerMetadata) as Prisma.JsonObject)
    : null,
  originRunId: record.metadata.originRunId,
  originTransitionId: record.metadata.originTransitionId,
  createdBySource: record.metadata.createdBySource,
  lastUpdatedBySource: record.metadata.lastUpdatedBySource,
  traceId: record.metadata.traceId,
  sourceObservedAtUtc: record.metadata.sourceObservedAtUtc
    ? new Date(record.metadata.sourceObservedAtUtc)
    : null,
  metadataNotes: record.metadata.notes ?? null,
  createdAtUtc: new Date(record.createdAtUtc),
  updatedAtUtc: new Date(record.updatedAtUtc),
  archivedAtUtc: record.archivedAtUtc ? new Date(record.archivedAtUtc) : null
});

const createFakePrismaClient = (): ResearchFeedbackDecisionRelationalPrismaClient => {
  const state: {
    feedbackRow: Prisma.ResearchFeedbackDecisionRecordGetPayload<object>;
    setupExists: boolean;
    researchHypothesisExists: boolean;
    aggregateExists: boolean;
  } = {
    feedbackRow: toPrismaFeedbackDecisionRow(buildFeedbackDecisionRecord(1)),
    setupExists: true,
    researchHypothesisExists: true,
    aggregateExists: true
  };

  return {
    researchFeedbackDecisionRecord: {
      async create(args: { data: Prisma.ResearchFeedbackDecisionRecordUncheckedCreateInput }) {
        state.feedbackRow = {
          researchFeedbackDecisionId: args.data.researchFeedbackDecisionId,
          version: args.data.version,
          lifecycleStatus: args.data.lifecycleStatus,
          decisionStatus: args.data.decisionStatus,
          setupDefinitionId: args.data.setupDefinitionId,
          researchHypothesisId: args.data.researchHypothesisId,
          setupAggregateResultId: args.data.setupAggregateResultId ?? null,
          evidenceStatus: args.data.evidenceStatus,
          recommendedAction: args.data.recommendedAction,
          rationaleSummary: args.data.rationaleSummary,
          requiresManualReview: args.data.requiresManualReview,
          evidenceSummary: args.data.evidenceSummary ?? null,
          reviewerMetadata: toJsonValueOrNull(
            args.data.reviewerMetadata,
            toJsonObjectOrNull(state.feedbackRow.reviewerMetadata)
          ),
          originRunId: args.data.originRunId ?? null,
          originTransitionId: args.data.originTransitionId ?? null,
          createdBySource: args.data.createdBySource,
          lastUpdatedBySource: args.data.lastUpdatedBySource,
          traceId: args.data.traceId ?? null,
          sourceObservedAtUtc: toDateOrNull(args.data.sourceObservedAtUtc),
          metadataNotes: args.data.metadataNotes ?? null,
          createdAtUtc: toRequiredDate(args.data.createdAtUtc),
          updatedAtUtc: toRequiredDate(args.data.updatedAtUtc),
          archivedAtUtc: toDateOrNull(args.data.archivedAtUtc)
        };
        return state.feedbackRow;
      },
      async findMany() {
        return [state.feedbackRow];
      },
      async findUnique() {
        return state.feedbackRow;
      },
      async updateMany() {
        return { count: 1 };
      }
    },
    setupDefinitionRecord: {
      async findUnique() {
        return state.setupExists ? { setupDefinitionId: "setup-001" } : null;
      }
    },
    researchHypothesisRecord: {
      async findUnique() {
        return state.researchHypothesisExists
          ? { researchHypothesisId: "hypothesis-001" }
          : null;
      }
    },
    setupAggregateResultRecord: {
      async findUnique() {
        return state.aggregateExists ? { setupAggregateResultId: "aggregate-001" } : null;
      }
    }
  };
};

test("prisma feedback-decision adapter hydrates durable reads", async () => {
  const adapter = new PrismaResearchFeedbackDecisionRelationalRepositoryAdapter(
    createFakePrismaClient()
  );

  const record = await adapter.loadResearchFeedbackDecisionRecord("feedback-001");

  assert.equal(record?.identity.entityId, "feedback-001");
  assert.equal(record?.decisionStatus, "accepted");
  assert.equal(record?.reviewerMetadata?.reviewedBy, "reviewer-001");
});

test("prisma feedback-decision adapter maps unique-constraint failures to already_exists", async () => {
  const client = createFakePrismaClient();
  client.researchFeedbackDecisionRecord.create = async () => {
    throw { code: "P2002" };
  };
  const adapter = new PrismaResearchFeedbackDecisionRelationalRepositoryAdapter(client);

  await assert.rejects(
    async () =>
      adapter.insertResearchFeedbackDecisionRecord({
        record: buildFeedbackDecisionRecord(1),
        expectedVersion: null
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "already_exists" &&
      error.entityType === "research_feedback_decision"
  );
});

test("prisma feedback-decision adapter resolves missing aggregate references", async () => {
  const client = createFakePrismaClient();
  client.researchFeedbackDecisionRecord.create = async () => {
    throw { code: "P2003" };
  };
  client.setupAggregateResultRecord.findUnique = async () => null;
  const adapter = new PrismaResearchFeedbackDecisionRelationalRepositoryAdapter(client);

  await assert.rejects(
    async () =>
      adapter.insertResearchFeedbackDecisionRecord({
        record: buildFeedbackDecisionRecord(1),
        expectedVersion: null
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "research_feedback_decision" &&
      error.referenceEntityType === "setup_aggregate_result" &&
      error.referenceEntityId === "aggregate-001"
  );
});

test("prisma feedback-decision adapter reports version mismatches on update", async () => {
  const client = createFakePrismaClient();
  client.researchFeedbackDecisionRecord.updateMany = async () => ({ count: 0 });
  client.researchFeedbackDecisionRecord.findUnique = async () =>
    toPrismaFeedbackDecisionRow(buildFeedbackDecisionRecord(1));
  const adapter = new PrismaResearchFeedbackDecisionRelationalRepositoryAdapter(client);

  await assert.rejects(
    async () =>
      adapter.updateResearchFeedbackDecisionRecord({
        record: buildFeedbackDecisionRecord(2),
        expectedVersion: 4
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "version_mismatch" &&
      error.entityType === "research_feedback_decision" &&
      error.expectedVersion === 4 &&
      error.actualVersion === 1
  );
});
