import assert from "node:assert/strict";
import test from "node:test";

import type { Prisma } from "../src/generated/prisma/client.js";

import {
  PrismaRoutedActionExecutionEnvelopeRelationalRepositoryAdapter,
  RepositoryError,
  type ProductRecordMetadata,
  type RoutedActionExecutionEnvelopeDurableRecord,
  type RoutedActionExecutionEnvelopeRelationalPrismaClient
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-routed-action-prisma-001",
  originTransitionId: "transition-routed-action-prisma-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-routed-action-prisma-001",
  sourceObservedAtUtc: "2026-07-02T10:00:00.000Z"
};

const buildEnvelopeRecord = (
  routedActionExecutionEnvelopeId: string,
  sourceReviewDecisionId = "review-decision-001"
): RoutedActionExecutionEnvelopeDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "routed_action_execution_envelope",
    entityId: routedActionExecutionEnvelopeId,
    version: 1,
    relatedEntityIds: [
      "routing-result-001",
      sourceReviewDecisionId,
      "setup-family-001",
      "setup-definition-001",
      "approval-001"
    ]
  },
  lifecycleStatus: "active",
  createdAtUtc: "2026-07-02T10:05:00.000Z",
  updatedAtUtc: "2026-07-02T10:05:00.000Z",
  archivedAtUtc: null,
  metadata,
  executionStatus: "prepared",
  sourceRoutingResultId: "routing-result-001",
  sourceReviewDecisionId,
  actionTarget: "apply_setup_lifecycle_mutation",
  actionCommandType: "ApplyApprovedSetupMutationCommand",
  targetEntityRefs: {
    setupFamilyId: "setup-family-001",
    setupDefinitionId: "setup-definition-001",
    researchDecisionApprovalId: "approval-001"
  },
  routeMetadataSnapshot: {
    routeStatus: "routed",
    routedAt: "2026-07-02T10:00:00.000Z",
    decisionOutcome: "accepted",
    authorizedNextAction: "prepare_lifecycle_mutation_follow_up",
    downstreamCommandType: "ApplyApprovedSetupMutationCommand"
  },
  executionPayloadSnapshot: {
    commandType: "ApplyApprovedSetupMutationCommand",
    target: "apply_setup_lifecycle_mutation",
    commandInput: {
      setupDefinitionId: "setup-definition-001",
      setupFamilyId: "setup-family-001",
      sourceReviewDecisionId,
      sourceRoutingResultId: "routing-result-001"
    }
  },
  preparedBy: "review-operator-001",
  preparedAtUtc: "2026-07-02T10:05:00.000Z",
  originRunId: "envelope-run-001",
  notes: "Prepared for execution."
});

type PrismaRoutedActionExecutionEnvelopeRow =
  Prisma.RoutedActionExecutionEnvelopeRecordGetPayload<object>;

const toDateOrNull = (value: Date | string | null | undefined): Date | null => {
  if (value === null || value === undefined) {
    return null;
  }

  return value instanceof Date ? value : new Date(value);
};

const toRequiredDate = (value: Date | string): Date =>
  value instanceof Date ? value : new Date(value);

const toPrismaEnvelopeRow = (
  record: RoutedActionExecutionEnvelopeDurableRecord
): PrismaRoutedActionExecutionEnvelopeRow => ({
  routedActionExecutionEnvelopeId: record.identity.entityId,
  version: record.identity.version,
  lifecycleStatus: record.lifecycleStatus,
  executionStatus: record.executionStatus,
  sourceRoutingResultId: record.sourceRoutingResultId,
  sourceReviewDecisionId: record.sourceReviewDecisionId,
  actionTarget: record.actionTarget,
  actionCommandType: record.actionCommandType,
  targetEntityRefs: record.targetEntityRefs,
  routeMetadataSnapshot: record.routeMetadataSnapshot,
  executionPayloadSnapshot: record.executionPayloadSnapshot,
  preparedBy: record.preparedBy,
  preparedAtUtc: new Date(record.preparedAtUtc),
  envelopeOriginRunId: record.originRunId,
  notes: record.notes,
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

const createFakePrismaClient = (): RoutedActionExecutionEnvelopeRelationalPrismaClient => {
  const rows = new Map<string, PrismaRoutedActionExecutionEnvelopeRow>();
  const reviewDecisionIds = new Set(["review-decision-001"]);

  return {
    routedActionExecutionEnvelopeRecord: {
      async create(args: {
        data: Prisma.RoutedActionExecutionEnvelopeRecordUncheckedCreateInput;
      }) {
        if (rows.has(args.data.routedActionExecutionEnvelopeId)) {
          throw { code: "P2002" };
        }

        const row: PrismaRoutedActionExecutionEnvelopeRow = {
          routedActionExecutionEnvelopeId: args.data.routedActionExecutionEnvelopeId,
          version: args.data.version,
          lifecycleStatus: args.data.lifecycleStatus,
          executionStatus: args.data.executionStatus,
          sourceRoutingResultId: args.data.sourceRoutingResultId,
          sourceReviewDecisionId: args.data.sourceReviewDecisionId,
          actionTarget: args.data.actionTarget,
          actionCommandType: args.data.actionCommandType,
          targetEntityRefs: args.data.targetEntityRefs as Prisma.JsonObject,
          routeMetadataSnapshot: args.data.routeMetadataSnapshot as Prisma.JsonObject,
          executionPayloadSnapshot: args.data.executionPayloadSnapshot as Prisma.JsonObject,
          preparedBy: args.data.preparedBy,
          preparedAtUtc: toRequiredDate(args.data.preparedAtUtc),
          envelopeOriginRunId: args.data.envelopeOriginRunId ?? null,
          notes: args.data.notes ?? null,
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
        rows.set(row.routedActionExecutionEnvelopeId, row);
        return row;
      },
      async findMany(args: {
        where: {
          sourceReviewDecisionId: string;
        };
        orderBy: {
          routedActionExecutionEnvelopeId: "asc" | "desc";
        };
      }) {
        const matches = [...rows.values()].filter(
          (row) => row.sourceReviewDecisionId === args.where.sourceReviewDecisionId
        );
        matches.sort((left, right) =>
          args.orderBy.routedActionExecutionEnvelopeId === "asc"
            ? left.routedActionExecutionEnvelopeId.localeCompare(
                right.routedActionExecutionEnvelopeId
              )
            : right.routedActionExecutionEnvelopeId.localeCompare(
                left.routedActionExecutionEnvelopeId
              )
        );
        return matches;
      },
      async findUnique(args: {
        where: {
          routedActionExecutionEnvelopeId: string;
        };
      }) {
        return rows.get(args.where.routedActionExecutionEnvelopeId) ?? null;
      }
    },
    researchReviewDecisionRecord: {
      async findUnique(args: {
        where: {
          researchReviewDecisionId: string;
        };
      }) {
        return reviewDecisionIds.has(args.where.researchReviewDecisionId)
          ? { researchReviewDecisionId: args.where.researchReviewDecisionId }
          : null;
      }
    }
  };
};

test("prisma routed-action adapter persists and hydrates execution-envelope records", async () => {
  const adapter = new PrismaRoutedActionExecutionEnvelopeRelationalRepositoryAdapter(
    createFakePrismaClient()
  );

  const inserted = await adapter.insertRoutedActionExecutionEnvelopeRecord({
    record: buildEnvelopeRecord("execution-envelope-001")
  });
  const byId =
    await adapter.loadRoutedActionExecutionEnvelopeRecord("execution-envelope-001");
  const byReviewDecision =
    await adapter.listRoutedActionExecutionEnvelopeRecordsBySourceReviewDecisionId(
      "review-decision-001"
    );

  assert.equal(inserted.actionCommandType, "ApplyApprovedSetupMutationCommand");
  assert.equal(byId?.notes, "Prepared for execution.");
  assert.equal(byReviewDecision.length, 1);
  assert.equal(byReviewDecision[0]?.preparedBy, "review-operator-001");
});

test("prisma routed-action adapter maps unique-constraint failures to already_exists", async () => {
  const client = createFakePrismaClient();
  client.routedActionExecutionEnvelopeRecord.create = async () => {
    throw { code: "P2002" };
  };
  const adapter = new PrismaRoutedActionExecutionEnvelopeRelationalRepositoryAdapter(client);

  await assert.rejects(
    async () =>
      adapter.insertRoutedActionExecutionEnvelopeRecord({
        record: buildEnvelopeRecord("execution-envelope-002")
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "already_exists" &&
      error.entityType === "routed_action_execution_envelope"
  );
});

test("prisma routed-action adapter rejects missing review-decision references deterministically", async () => {
  const adapter = new PrismaRoutedActionExecutionEnvelopeRelationalRepositoryAdapter(
    createFakePrismaClient()
  );

  await assert.rejects(
    async () =>
      adapter.insertRoutedActionExecutionEnvelopeRecord({
        record: buildEnvelopeRecord("execution-envelope-003", "review-decision-missing")
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "routed_action_execution_envelope" &&
      error.referenceEntityType === "research_review_decision" &&
      error.referenceEntityId === "review-decision-missing"
  );
});

test("prisma routed-action adapter remaps late foreign-key failures deterministically", async () => {
  const client = createFakePrismaClient();
  let reviewDecisionExists = true;
  client.researchReviewDecisionRecord.findUnique = async () =>
    reviewDecisionExists ? { researchReviewDecisionId: "review-decision-001" } : null;
  client.routedActionExecutionEnvelopeRecord.create = async () => {
    reviewDecisionExists = false;
    throw { code: "P2003" };
  };
  const adapter = new PrismaRoutedActionExecutionEnvelopeRelationalRepositoryAdapter(client);

  await assert.rejects(
    async () =>
      adapter.insertRoutedActionExecutionEnvelopeRecord({
        record: buildEnvelopeRecord("execution-envelope-004")
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "routed_action_execution_envelope" &&
      error.referenceEntityType === "research_review_decision" &&
      error.referenceEntityId === "review-decision-001"
  );
});

test("prisma routed-action adapter maps retryable read failures to transient_failure", async () => {
  const client = createFakePrismaClient();
  client.routedActionExecutionEnvelopeRecord.findUnique = async () => {
    throw { code: "P2024" };
  };
  const adapter = new PrismaRoutedActionExecutionEnvelopeRelationalRepositoryAdapter(client);

  await assert.rejects(
    async () => adapter.loadRoutedActionExecutionEnvelopeRecord("execution-envelope-005"),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "transient_failure" &&
      error.entityType === "routed_action_execution_envelope"
  );
});
