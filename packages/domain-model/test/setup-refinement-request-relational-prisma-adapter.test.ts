import assert from "node:assert/strict";
import test from "node:test";

import type { Prisma } from "../src/generated/prisma/client.js";

import {
  PrismaSetupRefinementRequestRelationalRepositoryAdapter,
  RepositoryError,
  type ProductRecordMetadata,
  type SetupRefinementRequestDurableRecord,
  type SetupRefinementRequestRelationalPrismaClient
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-setup-refinement-prisma-001",
  originTransitionId: "transition-setup-refinement-prisma-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-setup-refinement-prisma-001",
  sourceObservedAtUtc: "2026-07-06T12:00:00.000Z"
};

const buildSetupRefinementRequestRecord = (
  setupRefinementRequestId: string,
  setupDefinitionId = "setup-001",
  researchDecisionApprovalId = "approval-001",
  researchFeedbackDecisionId = "feedback-001"
): SetupRefinementRequestDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "setup_refinement_request",
    entityId: setupRefinementRequestId,
    version: 1,
    relatedEntityIds: [
      setupDefinitionId,
      researchDecisionApprovalId,
      researchFeedbackDecisionId
    ]
  },
  lifecycleStatus: "active",
  createdAtUtc: "2026-07-06T12:00:00.000Z",
  updatedAtUtc: "2026-07-06T12:00:00.000Z",
  archivedAtUtc: null,
  metadata,
  setupDefinitionId,
  sourceResearchDecisionApprovalId: researchDecisionApprovalId,
  sourceResearchFeedbackDecisionId: researchFeedbackDecisionId,
  refinementStatus: "proposed",
  refinementRationaleSummary: "The setup remains valid but needs a narrower reclaim rule.",
  requestedChangesSummary: "Tighten invalidation logic and add rejection-volume confirmation.",
  evidenceReferences: ["aggregate-001", "feedback-001"],
  requestedBy: "research-service",
  requestedAtUtc: "2026-07-06T12:00:00.000Z",
  assignedReviewerId: "reviewer-001",
  assignedOwnerId: null
});

type PrismaSetupRefinementRequestRow =
  Prisma.SetupRefinementRequestRecordGetPayload<object>;

const toEvidenceReferences = (
  value:
    | Prisma.SetupRefinementRequestRecordUncheckedCreateInput["evidenceReferences"]
    | undefined
): string[] => {
  if (Array.isArray(value)) {
    return [...value];
  }

  if (
    value &&
    typeof value === "object" &&
    "set" in value &&
    Array.isArray(value.set)
  ) {
    return [...value.set];
  }

  return [];
};

const toDateOrNull = (value: Date | string | null | undefined): Date | null => {
  if (value === null || value === undefined) {
    return null;
  }

  return value instanceof Date ? value : new Date(value);
};

const toRequiredDate = (value: Date | string): Date =>
  value instanceof Date ? value : new Date(value);

const createFakePrismaClient = (): SetupRefinementRequestRelationalPrismaClient => {
  const rows = new Map<string, PrismaSetupRefinementRequestRow>();
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
    setupRefinementRequestRecord: {
      async create(args: {
        data: Prisma.SetupRefinementRequestRecordUncheckedCreateInput;
      }) {
        if (rows.has(args.data.setupRefinementRequestId)) {
          throw { code: "P2002" };
        }

        const row: PrismaSetupRefinementRequestRow = {
          setupRefinementRequestId: args.data.setupRefinementRequestId,
          version: args.data.version,
          lifecycleStatus: args.data.lifecycleStatus,
          setupDefinitionId: args.data.setupDefinitionId,
          sourceResearchDecisionApprovalId: args.data.sourceResearchDecisionApprovalId,
          sourceResearchFeedbackDecisionId: args.data.sourceResearchFeedbackDecisionId,
          refinementStatus: args.data.refinementStatus,
          refinementRationaleSummary: args.data.refinementRationaleSummary,
          requestedChangesSummary: args.data.requestedChangesSummary,
          evidenceReferences: toEvidenceReferences(args.data.evidenceReferences),
          requestedBy: args.data.requestedBy,
          requestedAtUtc: toRequiredDate(args.data.requestedAtUtc),
          assignedReviewerId: args.data.assignedReviewerId ?? null,
          assignedOwnerId: args.data.assignedOwnerId ?? null,
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
        rows.set(row.setupRefinementRequestId, row);
        return row;
      },
      async findMany(args: {
        where:
          | {
              setupDefinitionId: string;
            }
          | {
              sourceResearchDecisionApprovalId: string;
            };
        orderBy: {
          setupRefinementRequestId: "asc" | "desc";
        };
      }) {
        const matches = [...rows.values()].filter((row) =>
          "setupDefinitionId" in args.where
            ? row.setupDefinitionId === args.where.setupDefinitionId
            : row.sourceResearchDecisionApprovalId ===
              args.where.sourceResearchDecisionApprovalId
        );
        matches.sort((left, right) =>
          args.orderBy.setupRefinementRequestId === "asc"
            ? left.setupRefinementRequestId.localeCompare(
                right.setupRefinementRequestId
              )
            : right.setupRefinementRequestId.localeCompare(
                left.setupRefinementRequestId
              )
        );
        return matches;
      },
      async findUnique(args: {
        where: {
          setupRefinementRequestId: string;
        };
      }) {
        return rows.get(args.where.setupRefinementRequestId) ?? null;
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

test("prisma setup-refinement-request adapter persists and hydrates records", async () => {
  const adapter = new PrismaSetupRefinementRequestRelationalRepositoryAdapter(
    createFakePrismaClient()
  );

  const inserted = await adapter.insertSetupRefinementRequest({
    record: buildSetupRefinementRequestRecord("refinement-001")
  });
  const byId = await adapter.loadSetupRefinementRequest("refinement-001");
  const bySetup =
    await adapter.listSetupRefinementRequestsBySetupDefinitionId("setup-001");
  const byApproval =
    await adapter.listSetupRefinementRequestsByResearchDecisionApprovalId(
      "approval-001"
    );

  assert.equal(inserted.refinementStatus, "proposed");
  assert.equal(byId?.assignedReviewerId, "reviewer-001");
  assert.equal(bySetup.length, 1);
  assert.equal(bySetup[0]?.setupDefinitionId, "setup-001");
  assert.equal(byApproval.length, 1);
  assert.equal(byApproval[0]?.sourceResearchDecisionApprovalId, "approval-001");
});

test("prisma setup-refinement-request adapter maps unique-constraint failures to already_exists", async () => {
  const client = createFakePrismaClient();
  client.setupRefinementRequestRecord.create = async () => {
    throw { code: "P2002" };
  };
  const adapter = new PrismaSetupRefinementRequestRelationalRepositoryAdapter(client);

  await assert.rejects(
    async () =>
      adapter.insertSetupRefinementRequest({
        record: buildSetupRefinementRequestRecord("refinement-002")
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "already_exists" &&
      error.entityType === "setup_refinement_request"
  );
});

test("prisma setup-refinement-request adapter rejects approvals linked to a different setup", async () => {
  const createCalls: string[] = [];
  const client = createFakePrismaClient();
  client.researchDecisionApprovalRecord.findUnique = async () => ({
    researchDecisionApprovalId: "approval-001",
    setupDefinitionId: "setup-other",
    researchFeedbackDecisionId: "feedback-001"
  });
  client.setupRefinementRequestRecord.create = async () => {
    createCalls.push("create");
    return {
      ...buildSetupRefinementRequestRecord("refinement-003"),
      setupRefinementRequestId: "refinement-003"
    } as unknown as PrismaSetupRefinementRequestRow;
  };
  const adapter = new PrismaSetupRefinementRequestRelationalRepositoryAdapter(client);

  await assert.rejects(
    async () =>
      adapter.insertSetupRefinementRequest({
        record: buildSetupRefinementRequestRecord("refinement-003")
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "setup_refinement_request" &&
      error.referenceEntityType === "research_decision_approval" &&
      error.referenceEntityId === "approval-001"
  );

  assert.equal(createCalls.length, 0);
});

test("prisma setup-refinement-request adapter remaps late foreign-key failures deterministically", async () => {
  const client = createFakePrismaClient();
  let feedbackDecisionExists = true;
  client.researchFeedbackDecisionRecord.findUnique = async () =>
    feedbackDecisionExists
      ? {
          researchFeedbackDecisionId: "feedback-001",
          setupDefinitionId: "setup-001"
        }
      : null;
  client.setupRefinementRequestRecord.create = async () => {
    feedbackDecisionExists = false;
    throw { code: "P2003" };
  };
  const adapter = new PrismaSetupRefinementRequestRelationalRepositoryAdapter(client);

  await assert.rejects(
    async () =>
      adapter.insertSetupRefinementRequest({
        record: buildSetupRefinementRequestRecord("refinement-004")
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "setup_refinement_request" &&
      error.referenceEntityType === "research_feedback_decision" &&
      error.referenceEntityId === "feedback-001"
  );
});

test("prisma setup-refinement-request adapter maps retryable read failures to transient_failure", async () => {
  const client = createFakePrismaClient();
  client.setupRefinementRequestRecord.findUnique = async () => {
    throw { code: "P2024" };
  };
  const adapter = new PrismaSetupRefinementRequestRelationalRepositoryAdapter(client);

  await assert.rejects(
    async () => adapter.loadSetupRefinementRequest("refinement-005"),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "transient_failure" &&
      error.entityType === "setup_refinement_request"
  );
});
