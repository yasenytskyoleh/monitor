import assert from "node:assert/strict";
import test from "node:test";

import type { Prisma } from "../src/generated/prisma/client.js";

import {
  PrismaReviewDecisionRoutingResultRelationalRepositoryAdapter,
  RepositoryError,
  type ProductRecordMetadata,
  type ReviewDecisionRoutingResultDurableRecord,
  type ReviewDecisionRoutingResultRelationalPrismaClient
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-routing-result-prisma-001",
  originTransitionId: "transition-routing-result-prisma-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-routing-result-prisma-001",
  sourceObservedAtUtc: "2026-07-23T10:00:00.000Z"
};

const buildRecord = (
  routingResultId: string,
  researchReviewDecisionId = "review-decision-001"
): ReviewDecisionRoutingResultDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "review_decision_routing_result",
    entityId: routingResultId,
    version: 1,
    relatedEntityIds: [researchReviewDecisionId, "setup-family-001", "setup-revision-001"]
  },
  lifecycleStatus: "active",
  createdAtUtc: "2026-07-23T10:00:00.000Z",
  updatedAtUtc: "2026-07-23T10:00:00.000Z",
  archivedAtUtc: null,
  metadata,
  routingStatus: "routed",
  researchReviewDecisionId,
  setupFamilyId: "setup-family-001",
  setupRevisionId: "setup-revision-001",
  decisionOutcome: "accepted",
  authorizedNextAction: "prepare_lifecycle_mutation_follow_up",
  target: "apply_setup_lifecycle_mutation",
  downstreamCommandType: "ApplyApprovedSetupMutationCommand",
  routedAtUtc: "2026-07-23T10:00:00.000Z",
  reason: null,
  warnings: ["Routing context preserved for execution preparation."]
});

type PrismaRoutingResultRow =
  Prisma.ReviewDecisionRoutingResultRecordGetPayload<object>;

const toDate = (value: Date | string): Date => (value instanceof Date ? value : new Date(value));

const toDateOrNull = (value: Date | string | null | undefined): Date | null =>
  value === null || value === undefined ? null : toDate(value);

const toRow = (record: ReviewDecisionRoutingResultDurableRecord): PrismaRoutingResultRow => ({
  reviewDecisionRoutingResultId: record.identity.entityId,
  version: record.identity.version,
  lifecycleStatus: record.lifecycleStatus,
  routingStatus: record.routingStatus,
  researchReviewDecisionId: record.researchReviewDecisionId,
  setupFamilyId: record.setupFamilyId,
  setupRevisionId: record.setupRevisionId,
  decisionOutcome: record.decisionOutcome,
  authorizedNextAction: record.authorizedNextAction,
  downstreamTarget: record.target,
  downstreamCommandType: record.downstreamCommandType,
  routedAtUtc: toDate(record.routedAtUtc),
  reason: record.reason,
  warnings: record.warnings,
  originRunId: record.metadata.originRunId,
  originTransitionId: record.metadata.originTransitionId,
  createdBySource: record.metadata.createdBySource,
  lastUpdatedBySource: record.metadata.lastUpdatedBySource,
  traceId: record.metadata.traceId,
  sourceObservedAtUtc: toDateOrNull(record.metadata.sourceObservedAtUtc),
  metadataNotes: record.metadata.notes ?? null,
  createdAtUtc: toDate(record.createdAtUtc),
  updatedAtUtc: toDate(record.updatedAtUtc),
  archivedAtUtc: toDateOrNull(record.archivedAtUtc)
});

const createFakePrismaClient = (): ReviewDecisionRoutingResultRelationalPrismaClient => {
  const rows = new Map<string, PrismaRoutingResultRow>();
  const reviewDecisionIds = new Set(["review-decision-001"]);

  return {
    reviewDecisionRoutingResultRecord: {
      async create(args) {
        if (rows.has(args.data.reviewDecisionRoutingResultId)) {
          throw { code: "P2002" };
        }

        const row = toRow({
          ...buildRecord(
            args.data.reviewDecisionRoutingResultId,
            args.data.researchReviewDecisionId
          ),
          identity: {
            ...buildRecord(
              args.data.reviewDecisionRoutingResultId,
              args.data.researchReviewDecisionId
            ).identity,
            version: args.data.version
          },
          routingStatus: args.data.routingStatus,
          setupFamilyId: args.data.setupFamilyId,
          setupRevisionId: args.data.setupRevisionId ?? null,
          decisionOutcome: args.data.decisionOutcome,
          authorizedNextAction: args.data.authorizedNextAction ?? null,
          target: args.data.downstreamTarget ?? null,
          downstreamCommandType: args.data.downstreamCommandType,
          routedAtUtc: toDate(args.data.routedAtUtc).toISOString(),
          reason: args.data.reason ?? null,
          warnings: args.data.warnings as string[],
          metadata: {
            originRunId: args.data.originRunId ?? null,
            originTransitionId: args.data.originTransitionId ?? null,
            createdBySource: args.data.createdBySource,
            lastUpdatedBySource: args.data.lastUpdatedBySource,
            traceId: args.data.traceId ?? null,
            sourceObservedAtUtc: args.data.sourceObservedAtUtc
              ? toDate(args.data.sourceObservedAtUtc).toISOString()
              : null,
            ...(args.data.metadataNotes ? { notes: args.data.metadataNotes } : {})
          },
          createdAtUtc: toDate(args.data.createdAtUtc).toISOString(),
          updatedAtUtc: toDate(args.data.updatedAtUtc).toISOString(),
          archivedAtUtc: args.data.archivedAtUtc
            ? toDate(args.data.archivedAtUtc).toISOString()
            : null
        });
        rows.set(row.reviewDecisionRoutingResultId, row);
        return row;
      },
      async findMany(args) {
        return [...rows.values()]
          .filter((row) => row.researchReviewDecisionId === args.where.researchReviewDecisionId)
          .sort((left, right) =>
            left.reviewDecisionRoutingResultId.localeCompare(
              right.reviewDecisionRoutingResultId
            )
          );
      },
      async findUnique(args) {
        return rows.get(args.where.reviewDecisionRoutingResultId) ?? null;
      }
    },
    researchReviewDecisionRecord: {
      async findUnique(args) {
        return reviewDecisionIds.has(args.where.researchReviewDecisionId)
          ? { researchReviewDecisionId: args.where.researchReviewDecisionId }
          : null;
      }
    }
  };
};

test("prisma routing-result adapter persists, loads, and lists durable records", async () => {
  const adapter = new PrismaReviewDecisionRoutingResultRelationalRepositoryAdapter(
    createFakePrismaClient()
  );

  const inserted = await adapter.insertReviewDecisionRoutingResultRecord({
    record: buildRecord("routing-result-001")
  });
  const byId = await adapter.loadReviewDecisionRoutingResultRecord("routing-result-001");
  const byReviewDecision =
    await adapter.listReviewDecisionRoutingResultRecordsByResearchReviewDecisionId(
      "review-decision-001"
    );

  assert.equal(inserted.target, "apply_setup_lifecycle_mutation");
  assert.deepEqual(byId?.warnings, ["Routing context preserved for execution preparation."]);
  assert.equal(byReviewDecision.length, 1);
});

test("prisma routing-result adapter maps duplicate and missing-reference failures", async () => {
  const adapter = new PrismaReviewDecisionRoutingResultRelationalRepositoryAdapter(
    createFakePrismaClient()
  );
  await adapter.insertReviewDecisionRoutingResultRecord({ record: buildRecord("routing-result-002") });

  await assert.rejects(
    async () => adapter.insertReviewDecisionRoutingResultRecord({ record: buildRecord("routing-result-002") }),
    (error: unknown) => error instanceof RepositoryError && error.code === "already_exists"
  );
  await assert.rejects(
    async () =>
      adapter.insertReviewDecisionRoutingResultRecord({
        record: buildRecord("routing-result-003", "review-decision-missing")
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.referenceEntityId === "review-decision-missing"
  );
});
