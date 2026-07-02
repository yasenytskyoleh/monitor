import assert from "node:assert/strict";
import test from "node:test";

import type { Prisma } from "../src/generated/prisma/client.js";

import {
  PrismaResearchReviewDecisionRelationalRepositoryAdapter,
  RepositoryError,
  type ProductRecordMetadata,
  type ResearchReviewDecisionDurableRecord,
  type ResearchReviewDecisionRelationalPrismaClient
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-review-decision-prisma-001",
  originTransitionId: "transition-review-decision-prisma-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-review-decision-prisma-001",
  sourceObservedAtUtc: "2026-06-30T10:00:00.000Z"
};

const buildReviewDecisionRecord = (
  researchReviewDecisionId: string,
  researchHypothesisId: string | null = "hypothesis-001"
): ResearchReviewDecisionDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "research_review_decision",
    entityId: researchReviewDecisionId,
    version: 1,
    relatedEntityIds: [
      "review-packet-001",
      "setup-family-001",
      "setup-family-001-v2",
      researchHypothesisId
    ].filter((value): value is string => value !== null)
  },
  lifecycleStatus: "active",
  createdAtUtc: "2026-06-30T10:05:00.000Z",
  updatedAtUtc: "2026-06-30T10:05:00.000Z",
  archivedAtUtc: null,
  metadata,
  decisionStatus: "recorded",
  researchReviewPacketId: "review-packet-001",
  setupFamilyId: "setup-family-001",
  setupRevisionId: "setup-family-001-v2",
  researchHypothesisId,
  reviewedBy: "reviewer-001",
  reviewedAtUtc: "2026-06-30T10:05:00.000Z",
  decisionOutcome: "accepted",
  reviewerNotes: "Current revision remains valid after review.",
  authorizedNextAction: "confirm_no_change"
});

type PrismaResearchReviewDecisionRow =
  Prisma.ResearchReviewDecisionRecordGetPayload<object>;

const toDateOrNull = (value: Date | string | null | undefined): Date | null => {
  if (value === null || value === undefined) {
    return null;
  }

  return value instanceof Date ? value : new Date(value);
};

const toRequiredDate = (value: Date | string): Date =>
  value instanceof Date ? value : new Date(value);

const toPrismaReviewDecisionRow = (
  record: ResearchReviewDecisionDurableRecord
): PrismaResearchReviewDecisionRow => ({
  researchReviewDecisionId: record.identity.entityId,
  version: record.identity.version,
  lifecycleStatus: record.lifecycleStatus,
  decisionStatus: record.decisionStatus,
  researchReviewPacketId: record.researchReviewPacketId,
  setupFamilyId: record.setupFamilyId,
  setupRevisionId: record.setupRevisionId,
  researchHypothesisId: record.researchHypothesisId,
  reviewedBy: record.reviewedBy,
  reviewedAtUtc: new Date(record.reviewedAtUtc),
  decisionOutcome: record.decisionOutcome,
  reviewerNotes: record.reviewerNotes,
  authorizedNextAction: record.authorizedNextAction,
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

const createFakePrismaClient = (): ResearchReviewDecisionRelationalPrismaClient => {
  const rows = new Map<string, PrismaResearchReviewDecisionRow>();
  const hypothesisIds = new Set(["hypothesis-001"]);

  return {
    researchReviewDecisionRecord: {
      async create(args: {
        data: Prisma.ResearchReviewDecisionRecordUncheckedCreateInput;
      }) {
        if (rows.has(args.data.researchReviewDecisionId)) {
          throw { code: "P2002" };
        }

        const row: PrismaResearchReviewDecisionRow = {
          researchReviewDecisionId: args.data.researchReviewDecisionId,
          version: args.data.version,
          lifecycleStatus: args.data.lifecycleStatus,
          decisionStatus: args.data.decisionStatus,
          researchReviewPacketId: args.data.researchReviewPacketId,
          setupFamilyId: args.data.setupFamilyId,
          setupRevisionId: args.data.setupRevisionId ?? null,
          researchHypothesisId: args.data.researchHypothesisId ?? null,
          reviewedBy: args.data.reviewedBy,
          reviewedAtUtc: toRequiredDate(args.data.reviewedAtUtc),
          decisionOutcome: args.data.decisionOutcome,
          reviewerNotes: args.data.reviewerNotes ?? null,
          authorizedNextAction: args.data.authorizedNextAction ?? null,
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
        rows.set(row.researchReviewDecisionId, row);
        return row;
      },
      async findMany(args: {
        where:
          | {
              researchReviewPacketId: string;
            }
          | {
              setupFamilyId: string;
            };
        orderBy: {
          researchReviewDecisionId: "asc" | "desc";
        };
      }) {
        const matches = [...rows.values()].filter((row) =>
          "researchReviewPacketId" in args.where
            ? row.researchReviewPacketId === args.where.researchReviewPacketId
            : row.setupFamilyId === args.where.setupFamilyId
        );
        matches.sort((left, right) =>
          args.orderBy.researchReviewDecisionId === "asc"
            ? left.researchReviewDecisionId.localeCompare(right.researchReviewDecisionId)
            : right.researchReviewDecisionId.localeCompare(left.researchReviewDecisionId)
        );
        return matches;
      },
      async findUnique(args: {
        where: {
          researchReviewDecisionId: string;
        };
      }) {
        return rows.get(args.where.researchReviewDecisionId) ?? null;
      }
    },
    researchHypothesisRecord: {
      async findUnique(args: {
        where: {
          researchHypothesisId: string;
        };
      }) {
        return hypothesisIds.has(args.where.researchHypothesisId)
          ? { researchHypothesisId: args.where.researchHypothesisId }
          : null;
      }
    }
  };
};

test("prisma review-decision adapter persists and hydrates review-decision records", async () => {
  const adapter = new PrismaResearchReviewDecisionRelationalRepositoryAdapter(
    createFakePrismaClient()
  );

  const inserted = await adapter.insertResearchReviewDecisionRecord({
    record: buildReviewDecisionRecord("review-decision-001")
  });
  const byId = await adapter.loadResearchReviewDecisionRecord("review-decision-001");
  const byPacket =
    await adapter.listResearchReviewDecisionRecordsByReviewPacketId("review-packet-001");
  const byFamily =
    await adapter.listResearchReviewDecisionRecordsBySetupFamilyId("setup-family-001");

  assert.equal(inserted.decisionOutcome, "accepted");
  assert.equal(byId?.authorizedNextAction, "confirm_no_change");
  assert.equal(byPacket.length, 1);
  assert.equal(byPacket[0]?.reviewedBy, "reviewer-001");
  assert.equal(byFamily.length, 1);
  assert.equal(byFamily[0]?.setupFamilyId, "setup-family-001");
});

test("prisma review-decision adapter allows omitted hypothesis references", async () => {
  const adapter = new PrismaResearchReviewDecisionRelationalRepositoryAdapter(
    createFakePrismaClient()
  );

  const inserted = await adapter.insertResearchReviewDecisionRecord({
    record: buildReviewDecisionRecord("review-decision-002", null)
  });

  assert.equal(inserted.researchHypothesisId, null);
});

test("prisma review-decision adapter maps unique-constraint failures to already_exists", async () => {
  const client = createFakePrismaClient();
  client.researchReviewDecisionRecord.create = async () => {
    throw { code: "P2002" };
  };
  const adapter = new PrismaResearchReviewDecisionRelationalRepositoryAdapter(client);

  await assert.rejects(
    async () =>
      adapter.insertResearchReviewDecisionRecord({
        record: buildReviewDecisionRecord("review-decision-003")
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "already_exists" &&
      error.entityType === "research_review_decision"
  );
});

test("prisma review-decision adapter rejects missing hypothesis references deterministically", async () => {
  const adapter = new PrismaResearchReviewDecisionRelationalRepositoryAdapter(
    createFakePrismaClient()
  );

  await assert.rejects(
    async () =>
      adapter.insertResearchReviewDecisionRecord({
        record: buildReviewDecisionRecord("review-decision-004", "hypothesis-missing")
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "research_review_decision" &&
      error.referenceEntityType === "research_hypothesis" &&
      error.referenceEntityId === "hypothesis-missing"
  );
});

test("prisma review-decision adapter remaps late foreign-key failures deterministically", async () => {
  const client = createFakePrismaClient();
  let hypothesisExists = true;
  client.researchHypothesisRecord.findUnique = async () =>
    hypothesisExists ? { researchHypothesisId: "hypothesis-001" } : null;
  client.researchReviewDecisionRecord.create = async () => {
    hypothesisExists = false;
    throw { code: "P2003" };
  };
  const adapter = new PrismaResearchReviewDecisionRelationalRepositoryAdapter(client);

  await assert.rejects(
    async () =>
      adapter.insertResearchReviewDecisionRecord({
        record: buildReviewDecisionRecord("review-decision-005")
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "research_review_decision" &&
      error.referenceEntityType === "research_hypothesis" &&
      error.referenceEntityId === "hypothesis-001"
  );
});

test("prisma review-decision adapter maps retryable read failures to transient_failure", async () => {
  const client = createFakePrismaClient();
  client.researchReviewDecisionRecord.findUnique = async () => {
    throw { code: "P2024" };
  };
  const adapter = new PrismaResearchReviewDecisionRelationalRepositoryAdapter(client);

  await assert.rejects(
    async () => adapter.loadResearchReviewDecisionRecord("review-decision-006"),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "transient_failure" &&
      error.entityType === "research_review_decision"
  );
});
