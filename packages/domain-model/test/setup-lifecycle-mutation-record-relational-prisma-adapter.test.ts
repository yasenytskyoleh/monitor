import assert from "node:assert/strict";
import test from "node:test";

import type { Prisma } from "../src/generated/prisma/client.js";

import {
  PrismaSetupLifecycleMutationRecordRelationalRepositoryAdapter,
  RepositoryError,
  type ProductRecordMetadata,
  type SetupLifecycleMutationRecordDurableRecord,
  type SetupLifecycleMutationRecordRelationalPrismaClient
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-setup-mutation-prisma-001",
  originTransitionId: "transition-setup-mutation-prisma-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-setup-mutation-prisma-001",
  sourceObservedAtUtc: "2026-07-06T11:30:00.000Z"
};

const buildMutationRecord = (
  setupLifecycleMutationRecordId: string,
  setupDefinitionId = "setup-001",
  researchDecisionApprovalId = "approval-001",
  researchFeedbackDecisionId = "feedback-001"
): SetupLifecycleMutationRecordDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "setup_lifecycle_mutation_record",
    entityId: setupLifecycleMutationRecordId,
    version: 1,
    relatedEntityIds: [
      setupDefinitionId,
      researchDecisionApprovalId,
      researchFeedbackDecisionId
    ]
  },
  lifecycleStatus: "active",
  createdAtUtc: "2026-07-06T11:30:00.000Z",
  updatedAtUtc: "2026-07-06T11:30:00.000Z",
  archivedAtUtc: null,
  metadata,
  setupDefinitionId,
  researchDecisionApprovalId,
  researchFeedbackDecisionId,
  previousStatus: "active",
  newStatus: "paused",
  approvedAction: "pause_setup",
  mutatedBy: "setup-operator-001",
  mutatedAtUtc: "2026-07-06T11:30:00.000Z",
  notes: "Paused after approved feedback review."
});

type PrismaSetupLifecycleMutationRow =
  Prisma.SetupLifecycleMutationRecordRecordGetPayload<object>;

const toDateOrNull = (value: Date | string | null | undefined): Date | null => {
  if (value === null || value === undefined) {
    return null;
  }

  return value instanceof Date ? value : new Date(value);
};

const toRequiredDate = (value: Date | string): Date =>
  value instanceof Date ? value : new Date(value);

const createFakePrismaClient = (): SetupLifecycleMutationRecordRelationalPrismaClient => {
  const rows = new Map<string, PrismaSetupLifecycleMutationRow>();
  const state = {
    setupIds: new Set(["setup-001"]),
    approvalById: new Map([
      [
        "approval-001",
        {
          researchDecisionApprovalId: "approval-001",
          setupDefinitionId: "setup-001",
          researchFeedbackDecisionId: "feedback-001"
        }
      ]
    ]),
    feedbackById: new Map([
      [
        "feedback-001",
        {
          researchFeedbackDecisionId: "feedback-001",
          setupDefinitionId: "setup-001"
        }
      ]
    ])
  };

  return {
    setupLifecycleMutationRecordRecord: {
      async create(args: {
        data: Prisma.SetupLifecycleMutationRecordRecordUncheckedCreateInput;
      }) {
        if (rows.has(args.data.setupLifecycleMutationRecordId)) {
          throw { code: "P2002" };
        }

        const row: PrismaSetupLifecycleMutationRow = {
          setupLifecycleMutationRecordId: args.data.setupLifecycleMutationRecordId,
          version: args.data.version,
          lifecycleStatus: args.data.lifecycleStatus,
          setupDefinitionId: args.data.setupDefinitionId,
          researchDecisionApprovalId: args.data.researchDecisionApprovalId,
          researchFeedbackDecisionId: args.data.researchFeedbackDecisionId,
          previousStatus: args.data.previousStatus,
          newStatus: args.data.newStatus,
          approvedAction: args.data.approvedAction,
          mutatedBy: args.data.mutatedBy,
          mutatedAtUtc: toRequiredDate(args.data.mutatedAtUtc),
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
        rows.set(row.setupLifecycleMutationRecordId, row);
        return row;
      },
      async findMany(args: {
        where:
          | {
              setupDefinitionId: string;
            }
          | {
              researchDecisionApprovalId: string;
            };
        orderBy: {
          setupLifecycleMutationRecordId: "asc" | "desc";
        };
      }) {
        const matches = [...rows.values()].filter((row) =>
          "setupDefinitionId" in args.where
            ? row.setupDefinitionId === args.where.setupDefinitionId
            : row.researchDecisionApprovalId === args.where.researchDecisionApprovalId
        );
        matches.sort((left, right) =>
          args.orderBy.setupLifecycleMutationRecordId === "asc"
            ? left.setupLifecycleMutationRecordId.localeCompare(
                right.setupLifecycleMutationRecordId
              )
            : right.setupLifecycleMutationRecordId.localeCompare(
                left.setupLifecycleMutationRecordId
              )
        );
        return matches;
      },
      async findUnique(args: {
        where: {
          setupLifecycleMutationRecordId: string;
        };
      }) {
        return rows.get(args.where.setupLifecycleMutationRecordId) ?? null;
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
    },
    researchDecisionApprovalRecord: {
      async findUnique(args: {
        where: {
          researchDecisionApprovalId: string;
        };
      }) {
        return state.approvalById.get(args.where.researchDecisionApprovalId) ?? null;
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
    }
  };
};

test("prisma setup-lifecycle mutation adapter persists and hydrates records", async () => {
  const adapter = new PrismaSetupLifecycleMutationRecordRelationalRepositoryAdapter(
    createFakePrismaClient()
  );

  const inserted = await adapter.insertSetupLifecycleMutationRecord({
    record: buildMutationRecord("mutation-001")
  });
  const byId = await adapter.loadSetupLifecycleMutationRecord("mutation-001");
  const bySetup =
    await adapter.listSetupLifecycleMutationRecordsBySetupDefinitionId("setup-001");
  const byApproval =
    await adapter.listSetupLifecycleMutationRecordsByResearchDecisionApprovalId(
      "approval-001"
    );

  assert.equal(inserted.approvedAction, "pause_setup");
  assert.equal(byId?.notes, "Paused after approved feedback review.");
  assert.equal(bySetup.length, 1);
  assert.equal(bySetup[0]?.setupDefinitionId, "setup-001");
  assert.equal(byApproval.length, 1);
  assert.equal(byApproval[0]?.researchDecisionApprovalId, "approval-001");
});

test("prisma setup-lifecycle mutation adapter maps unique-constraint failures to already_exists", async () => {
  const client = createFakePrismaClient();
  client.setupLifecycleMutationRecordRecord.create = async () => {
    throw { code: "P2002" };
  };
  const adapter = new PrismaSetupLifecycleMutationRecordRelationalRepositoryAdapter(
    client
  );

  await assert.rejects(
    async () =>
      adapter.insertSetupLifecycleMutationRecord({
        record: buildMutationRecord("mutation-002")
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "already_exists" &&
      error.entityType === "setup_lifecycle_mutation_record"
  );
});

test("prisma setup-lifecycle mutation adapter rejects approvals linked to a different setup", async () => {
  const createCalls: string[] = [];
  const client = createFakePrismaClient();
  client.researchDecisionApprovalRecord.findUnique = async () => ({
    researchDecisionApprovalId: "approval-001",
    setupDefinitionId: "setup-other",
    researchFeedbackDecisionId: "feedback-001"
  });
  client.setupLifecycleMutationRecordRecord.create = async () => {
    createCalls.push("create");
    return {
      ...buildMutationRecord("mutation-003"),
      setupLifecycleMutationRecordId: "mutation-003"
    } as unknown as PrismaSetupLifecycleMutationRow;
  };
  const adapter = new PrismaSetupLifecycleMutationRecordRelationalRepositoryAdapter(
    client
  );

  await assert.rejects(
    async () =>
      adapter.insertSetupLifecycleMutationRecord({
        record: buildMutationRecord("mutation-003")
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "setup_lifecycle_mutation_record" &&
      error.referenceEntityType === "research_decision_approval" &&
      error.referenceEntityId === "approval-001"
  );

  assert.equal(createCalls.length, 0);
});

test("prisma setup-lifecycle mutation adapter remaps late foreign-key failures deterministically", async () => {
  const client = createFakePrismaClient();
  let feedbackDecisionExists = true;
  client.researchFeedbackDecisionRecord.findUnique = async () =>
    feedbackDecisionExists
      ? {
          researchFeedbackDecisionId: "feedback-001",
          setupDefinitionId: "setup-001"
        }
      : null;
  client.setupLifecycleMutationRecordRecord.create = async () => {
    feedbackDecisionExists = false;
    throw { code: "P2003" };
  };
  const adapter = new PrismaSetupLifecycleMutationRecordRelationalRepositoryAdapter(
    client
  );

  await assert.rejects(
    async () =>
      adapter.insertSetupLifecycleMutationRecord({
        record: buildMutationRecord("mutation-004")
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "setup_lifecycle_mutation_record" &&
      error.referenceEntityType === "research_feedback_decision" &&
      error.referenceEntityId === "feedback-001"
  );
});

test("prisma setup-lifecycle mutation adapter maps retryable read failures to transient_failure", async () => {
  const client = createFakePrismaClient();
  client.setupLifecycleMutationRecordRecord.findUnique = async () => {
    throw { code: "P2024" };
  };
  const adapter = new PrismaSetupLifecycleMutationRecordRelationalRepositoryAdapter(
    client
  );

  await assert.rejects(
    async () => adapter.loadSetupLifecycleMutationRecord("mutation-005"),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "transient_failure" &&
      error.entityType === "setup_lifecycle_mutation_record"
  );
});
