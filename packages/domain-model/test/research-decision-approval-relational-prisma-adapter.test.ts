import assert from "node:assert/strict";
import test from "node:test";

import type { Prisma } from "../src/generated/prisma/client.js";

import {
  PrismaResearchDecisionApprovalRelationalRepositoryAdapter,
  RepositoryError,
  type ProductRecordMetadata,
  type ResearchDecisionApprovalDurableRecord,
  type ResearchDecisionApprovalRelationalPrismaClient
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-approval-001",
  originTransitionId: "transition-approval-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-approval-001",
  sourceObservedAtUtc: "2026-05-27T12:00:00.000Z"
};

const buildApprovalRecord = (
  researchDecisionApprovalId: string,
  researchFeedbackDecisionId = "feedback-001",
  setupDefinitionId = "setup-001"
): ResearchDecisionApprovalDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "research_decision_approval",
    entityId: researchDecisionApprovalId,
    version: 1,
    relatedEntityIds: [researchFeedbackDecisionId, setupDefinitionId]
  },
  lifecycleStatus: "active",
  createdAtUtc: "2026-05-27T12:05:00.000Z",
  updatedAtUtc: "2026-05-27T12:05:00.000Z",
  archivedAtUtc: null,
  metadata,
  approvalStatus: "recorded",
  researchFeedbackDecisionId,
  setupDefinitionId,
  reviewedBy: "reviewer-001",
  reviewedAtUtc: "2026-05-27T12:05:00.000Z",
  approvalOutcome: "approved",
  reviewerNotes: "Approved after manual review.",
  authorizedNextAction: "keep_active"
});

type PrismaResearchDecisionApprovalRow =
  Prisma.ResearchDecisionApprovalRecordGetPayload<object>;

const toDateOrNull = (value: Date | string | null | undefined): Date | null => {
  if (value === null || value === undefined) {
    return null;
  }

  return value instanceof Date ? value : new Date(value);
};

const toRequiredDate = (value: Date | string): Date => (value instanceof Date ? value : new Date(value));

const toPrismaApprovalRow = (
  record: ResearchDecisionApprovalDurableRecord
): PrismaResearchDecisionApprovalRow => ({
  researchDecisionApprovalId: record.identity.entityId,
  version: record.identity.version,
  lifecycleStatus: record.lifecycleStatus,
  approvalStatus: record.approvalStatus,
  researchFeedbackDecisionId: record.researchFeedbackDecisionId,
  setupDefinitionId: record.setupDefinitionId,
  reviewedBy: record.reviewedBy,
  reviewedAtUtc: new Date(record.reviewedAtUtc),
  approvalOutcome: record.approvalOutcome,
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

const createFakePrismaClient = (): ResearchDecisionApprovalRelationalPrismaClient => {
  const rows = new Map<string, PrismaResearchDecisionApprovalRow>();
  const state = {
    feedbackById: new Map([
      [
        "feedback-001",
        {
          researchFeedbackDecisionId: "feedback-001",
          setupDefinitionId: "setup-001"
        }
      ]
    ]),
    setupIds: new Set(["setup-001"])
  };

  return {
    researchDecisionApprovalRecord: {
      async create(args: {
        data: Prisma.ResearchDecisionApprovalRecordUncheckedCreateInput;
      }) {
        if (rows.has(args.data.researchDecisionApprovalId)) {
          throw { code: "P2002" };
        }

        const row: PrismaResearchDecisionApprovalRow = {
          researchDecisionApprovalId: args.data.researchDecisionApprovalId,
          version: args.data.version,
          lifecycleStatus: args.data.lifecycleStatus,
          approvalStatus: args.data.approvalStatus,
          researchFeedbackDecisionId: args.data.researchFeedbackDecisionId,
          setupDefinitionId: args.data.setupDefinitionId,
          reviewedBy: args.data.reviewedBy,
          reviewedAtUtc: toRequiredDate(args.data.reviewedAtUtc),
          approvalOutcome: args.data.approvalOutcome,
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
        rows.set(row.researchDecisionApprovalId, row);
        return row;
      },
      async findMany(args: {
        where: {
          researchFeedbackDecisionId: string;
        };
        orderBy: {
          researchDecisionApprovalId: "asc" | "desc";
        };
      }) {
        const matches = [...rows.values()].filter(
          (row) => row.researchFeedbackDecisionId === args.where.researchFeedbackDecisionId
        );
        matches.sort((left, right) =>
          args.orderBy.researchDecisionApprovalId === "asc"
            ? left.researchDecisionApprovalId.localeCompare(right.researchDecisionApprovalId)
            : right.researchDecisionApprovalId.localeCompare(left.researchDecisionApprovalId)
        );
        return matches;
      },
      async findUnique(args: {
        where: {
          researchDecisionApprovalId: string;
        };
      }) {
        return rows.get(args.where.researchDecisionApprovalId) ?? null;
      }
    },
    researchFeedbackDecisionRecord: {
      async findUnique(args: {
        where: {
          researchFeedbackDecisionId: string;
        };
      }) {
        return state.feedbackById.get(args.where.researchFeedbackDecisionId) ?? null;
      }
    },
    setupDefinitionRecord: {
      async findUnique(args: {
        where: {
          setupDefinitionId: string;
        };
      }) {
        return state.setupIds.has(args.where.setupDefinitionId)
          ? { setupDefinitionId: args.where.setupDefinitionId }
          : null;
      }
    }
  };
};

test("prisma approval adapter persists and hydrates approval records", async () => {
  const adapter = new PrismaResearchDecisionApprovalRelationalRepositoryAdapter(
    createFakePrismaClient()
  );

  const inserted = await adapter.insertResearchDecisionApprovalRecord({
    record: buildApprovalRecord("approval-001")
  });
  const byId = await adapter.loadResearchDecisionApprovalRecord("approval-001");
  const byFeedbackDecision =
    await adapter.listResearchDecisionApprovalRecordsByResearchFeedbackDecisionId("feedback-001");

  assert.equal(inserted.approvalOutcome, "approved");
  assert.equal(byId?.authorizedNextAction, "keep_active");
  assert.equal(byFeedbackDecision.length, 1);
  assert.equal(byFeedbackDecision[0]?.reviewedBy, "reviewer-001");
});

test("prisma approval adapter maps unique-constraint failures to already_exists", async () => {
  const client = createFakePrismaClient();
  client.researchDecisionApprovalRecord.create = async () => {
    throw { code: "P2002" };
  };
  const adapter = new PrismaResearchDecisionApprovalRelationalRepositoryAdapter(client);

  await assert.rejects(
    async () =>
      adapter.insertResearchDecisionApprovalRecord({
        record: buildApprovalRecord("approval-002")
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "already_exists" &&
      error.entityType === "research_decision_approval"
  );
});

test("prisma approval adapter rejects feedback decisions linked to a different setup", async () => {
  const createCalls: string[] = [];
  const client = createFakePrismaClient();
  client.setupDefinitionRecord.findUnique = async () => ({ setupDefinitionId: "setup-002" });
  client.researchDecisionApprovalRecord.create = async () => {
    createCalls.push("create");
    return toPrismaApprovalRow(buildApprovalRecord("approval-003", "feedback-001", "setup-002"));
  };
  const adapter = new PrismaResearchDecisionApprovalRelationalRepositoryAdapter(client);

  await assert.rejects(
    async () =>
      adapter.insertResearchDecisionApprovalRecord({
        record: buildApprovalRecord("approval-003", "feedback-001", "setup-002")
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "research_decision_approval" &&
      error.referenceEntityType === "research_feedback_decision" &&
      error.referenceEntityId === "feedback-001"
  );

  assert.equal(createCalls.length, 0);
});

test("prisma approval adapter remaps late foreign-key failures deterministically", async () => {
  const client = createFakePrismaClient();
  let setupDefinitionExists = true;
  client.setupDefinitionRecord.findUnique = async () =>
    setupDefinitionExists ? { setupDefinitionId: "setup-001" } : null;
  client.researchDecisionApprovalRecord.create = async () => {
    setupDefinitionExists = false;
    throw { code: "P2003" };
  };
  const adapter = new PrismaResearchDecisionApprovalRelationalRepositoryAdapter(client);

  await assert.rejects(
    async () =>
      adapter.insertResearchDecisionApprovalRecord({
        record: buildApprovalRecord("approval-004")
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "research_decision_approval" &&
      error.referenceEntityType === "setup_definition" &&
      error.referenceEntityId === "setup-001"
  );
});

test("prisma approval adapter maps retryable read failures to transient_failure", async () => {
  const client = createFakePrismaClient();
  client.researchDecisionApprovalRecord.findUnique = async () => {
    throw { code: "P2024" };
  };
  const adapter = new PrismaResearchDecisionApprovalRelationalRepositoryAdapter(client);

  await assert.rejects(
    async () => adapter.loadResearchDecisionApprovalRecord("approval-005"),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "transient_failure" &&
      error.entityType === "research_decision_approval"
  );
});
