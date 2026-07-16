import assert from "node:assert/strict";
import test from "node:test";

import { Prisma } from "../src/generated/prisma/client.js";

import {
  PrismaSetupDefinitionRevisionRelationalRepositoryAdapter,
  RepositoryError,
  type ProductRecordMetadata,
  type SetupDefinitionRevisionDurableRecord,
  type SetupDefinitionRevisionRelationalPrismaClient
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-setup-definition-revision-prisma-001",
  originTransitionId: "transition-setup-definition-revision-prisma-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-setup-definition-revision-prisma-001",
  sourceObservedAtUtc: "2026-07-09T10:00:00.000Z"
};

const buildSetupDefinitionRevisionRecord = ({
  entityId = "revision-001",
  identityVersion = 1,
  setupDefinitionId = "setup-family-001-v2",
  previousSetupDefinitionId = "setup-family-001-v1",
  setupVersionNumber = 2,
  previousRevisionId = null,
  sourceSetupRefinementRequestId = "refinement-001",
  sourceResearchDecisionApprovalId = "approval-001",
  sourceResearchFeedbackDecisionId = "feedback-001",
  revisionStatus = "draft",
  updatedAtUtc = "2026-07-09T10:00:00.000Z"
}: {
  entityId?: string;
  identityVersion?: number;
  previousRevisionId?: string | null;
  previousSetupDefinitionId?: string | null;
  revisionStatus?: SetupDefinitionRevisionDurableRecord["revisionStatus"];
  setupDefinitionId?: string;
  setupVersionNumber?: number;
  sourceResearchDecisionApprovalId?: string | null;
  sourceResearchFeedbackDecisionId?: string | null;
  sourceSetupRefinementRequestId?: string;
  updatedAtUtc?: string;
} = {}): SetupDefinitionRevisionDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "setup_definition_revision",
    entityId,
    version: identityVersion,
    relatedEntityIds: [
      setupDefinitionId,
      ...(previousSetupDefinitionId ? [previousSetupDefinitionId] : []),
      sourceSetupRefinementRequestId,
      ...(sourceResearchDecisionApprovalId
        ? [sourceResearchDecisionApprovalId]
        : []),
      ...(sourceResearchFeedbackDecisionId
        ? [sourceResearchFeedbackDecisionId]
        : []),
      ...(previousRevisionId ? [previousRevisionId] : [])
    ]
  },
  lifecycleStatus: "active",
  createdAtUtc: "2026-07-09T10:00:00.000Z",
  updatedAtUtc,
  archivedAtUtc: null,
  metadata,
  setupDefinitionId,
  previousSetupDefinitionId,
  setupFamilyId: "setup-family-001",
  setupVersionNumber,
  previousRevisionId,
  revisionReason: "Tighten breakout criteria from approved refinement follow-up.",
  revisionStatus,
  changedFieldsSummary: "Updated measurable conditions and invalidation assumptions.",
  createdBy: "research_reviewer_1",
  notes: "Hold as draft until activation review.",
  sourceSetupRefinementRequestId,
  sourceResearchDecisionApprovalId,
  sourceResearchFeedbackDecisionId
});

type PrismaSetupDefinitionRevisionRow =
  Prisma.SetupDefinitionRevisionRecordGetPayload<object>;

const toDateOrNull = (value: Date | string | null | undefined): Date | null => {
  if (value === null || value === undefined) {
    return null;
  }

  return value instanceof Date ? value : new Date(value);
};

const toRequiredDate = (value: Date | string): Date =>
  value instanceof Date ? value : new Date(value);

const isSetOperation = (value: unknown): value is { set: unknown } =>
  typeof value === "object" && value !== null && "set" in value;

const pickString = (value: unknown, fallback: string): string => {
  if (typeof value === "string") {
    return value;
  }

  if (isSetOperation(value) && typeof value.set === "string") {
    return value.set;
  }

  return fallback;
};

const pickNullableString = (
  value: unknown,
  fallback: string | null
): string | null => {
  if (value === null) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (isSetOperation(value)) {
    if (value.set === null) {
      return null;
    }

    if (typeof value.set === "string") {
      return value.set;
    }
  }

  return fallback;
};

const pickNumber = (value: unknown, fallback: number): number => {
  if (typeof value === "number") {
    return value;
  }

  if (isSetOperation(value) && typeof value.set === "number") {
    return value.set;
  }

  return fallback;
};

const pickDateOrNull = (value: unknown, fallback: Date | null): Date | null => {
  if (value === undefined) {
    return fallback;
  }

  if (
    value === null ||
    value instanceof Date ||
    typeof value === "string"
  ) {
    return toDateOrNull(value);
  }

  if (isSetOperation(value)) {
    return toDateOrNull(value.set as Date | string | null | undefined);
  }

  return fallback;
};

const toPrismaRevisionRow = (
  record: SetupDefinitionRevisionDurableRecord
): PrismaSetupDefinitionRevisionRow => ({
  setupDefinitionRevisionId: record.identity.entityId,
  version: record.identity.version,
  lifecycleStatus: record.lifecycleStatus,
  setupDefinitionId: record.setupDefinitionId,
  previousSetupDefinitionId: record.previousSetupDefinitionId,
  setupFamilyId: record.setupFamilyId,
  setupVersionNumber: record.setupVersionNumber,
  previousRevisionId: record.previousRevisionId,
  revisionReason: record.revisionReason,
  revisionStatus: record.revisionStatus,
  changedFieldsSummary: record.changedFieldsSummary,
  createdBy: record.createdBy,
  notes: record.notes,
  sourceSetupRefinementRequestId: record.sourceSetupRefinementRequestId,
  sourceResearchDecisionApprovalId: record.sourceResearchDecisionApprovalId,
  sourceResearchFeedbackDecisionId: record.sourceResearchFeedbackDecisionId,
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

const createFakePrismaClient = (): SetupDefinitionRevisionRelationalPrismaClient => {
  const rows = new Map<string, PrismaSetupDefinitionRevisionRow>();
  const state = {
    setupIds: new Set([
      "setup-family-001-v1",
      "setup-family-001-v2",
      "setup-family-001-v3"
    ]),
    requestById: new Map([
      [
        "refinement-001",
        {
          setupRefinementRequestId: "refinement-001",
          setupDefinitionId: "setup-family-001-v1",
          sourceResearchDecisionApprovalId: "approval-001",
          sourceResearchFeedbackDecisionId: "feedback-001"
        }
      ],
      [
        "refinement-002",
        {
          setupRefinementRequestId: "refinement-002",
          setupDefinitionId: "setup-family-001-v2",
          sourceResearchDecisionApprovalId: "approval-002",
          sourceResearchFeedbackDecisionId: "feedback-002"
        }
      ]
    ]),
    approvalById: new Map([
      [
        "approval-001",
        {
          researchDecisionApprovalId: "approval-001",
          setupDefinitionId: "setup-family-001-v1",
          researchFeedbackDecisionId: "feedback-001"
        }
      ],
      [
        "approval-002",
        {
          researchDecisionApprovalId: "approval-002",
          setupDefinitionId: "setup-family-001-v2",
          researchFeedbackDecisionId: "feedback-002"
        }
      ]
    ]),
    feedbackById: new Map([
      [
        "feedback-001",
        {
          researchFeedbackDecisionId: "feedback-001",
          setupDefinitionId: "setup-family-001-v1"
        }
      ],
      [
        "feedback-002",
        {
          researchFeedbackDecisionId: "feedback-002",
          setupDefinitionId: "setup-family-001-v2"
        }
      ]
    ])
  };

  return {
    setupDefinitionRevisionRecord: {
      async create(args: {
        data: Prisma.SetupDefinitionRevisionRecordUncheckedCreateInput;
      }) {
        if (
          rows.has(args.data.setupDefinitionRevisionId) ||
          [...rows.values()].some(
            (row) =>
              row.setupDefinitionId === args.data.setupDefinitionId ||
              (row.setupFamilyId === args.data.setupFamilyId &&
                row.setupVersionNumber === args.data.setupVersionNumber)
          )
        ) {
          throw { code: "P2002" };
        }

        const row: PrismaSetupDefinitionRevisionRow = {
          setupDefinitionRevisionId: args.data.setupDefinitionRevisionId,
          version: args.data.version,
          lifecycleStatus: args.data.lifecycleStatus,
          setupDefinitionId: args.data.setupDefinitionId,
          previousSetupDefinitionId: args.data.previousSetupDefinitionId ?? null,
          setupFamilyId: args.data.setupFamilyId,
          setupVersionNumber: args.data.setupVersionNumber,
          previousRevisionId: args.data.previousRevisionId ?? null,
          revisionReason: args.data.revisionReason,
          revisionStatus: args.data.revisionStatus,
          changedFieldsSummary: args.data.changedFieldsSummary,
          createdBy: args.data.createdBy,
          notes: args.data.notes ?? null,
          sourceSetupRefinementRequestId: args.data.sourceSetupRefinementRequestId,
          sourceResearchDecisionApprovalId:
            args.data.sourceResearchDecisionApprovalId ?? null,
          sourceResearchFeedbackDecisionId:
            args.data.sourceResearchFeedbackDecisionId ?? null,
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
        rows.set(row.setupDefinitionRevisionId, row);
        return row;
      },
      async findFirst(args: {
        where: {
          setupFamilyId: string;
        };
        orderBy: {
          setupVersionNumber: "asc" | "desc";
        };
      }) {
        const matches = [...rows.values()]
          .filter((row) => row.setupFamilyId === args.where.setupFamilyId)
          .sort((left, right) =>
            args.orderBy.setupVersionNumber === "asc"
              ? left.setupVersionNumber - right.setupVersionNumber
              : right.setupVersionNumber - left.setupVersionNumber
          );

        return matches[0] ?? null;
      },
      async findMany(args: {
        where: {
          setupFamilyId: string;
        };
        orderBy: {
          setupVersionNumber: "asc" | "desc";
        };
      }) {
        return [...rows.values()]
          .filter((row) => row.setupFamilyId === args.where.setupFamilyId)
          .sort((left, right) =>
            args.orderBy.setupVersionNumber === "asc"
              ? left.setupVersionNumber - right.setupVersionNumber
              : right.setupVersionNumber - left.setupVersionNumber
          );
      },
      async findUnique(args: {
        where:
          | {
              setupDefinitionRevisionId: string;
            }
          | {
              setupDefinitionId: string;
            };
      }) {
        if ("setupDefinitionRevisionId" in args.where) {
          return rows.get(args.where.setupDefinitionRevisionId) ?? null;
        }

        const { setupDefinitionId } = args.where;
        return (
          [...rows.values()].find((row) => row.setupDefinitionId === setupDefinitionId) ??
          null
        );
      },
      async updateMany(args: {
        where: {
          setupDefinitionRevisionId: string;
          version?: number;
        };
        data: Prisma.SetupDefinitionRevisionRecordUncheckedUpdateManyInput;
      }) {
        const current = rows.get(args.where.setupDefinitionRevisionId);
        if (!current) {
          return { count: 0 };
        }

        if (
          args.where.version !== undefined &&
          current.version !== args.where.version
        ) {
          return { count: 0 };
        }

        const data = args.data as Record<string, unknown>;
        const updated: PrismaSetupDefinitionRevisionRow = {
          setupDefinitionRevisionId: pickString(
            data.setupDefinitionRevisionId,
            current.setupDefinitionRevisionId
          ),
          version: pickNumber(data.version, current.version),
          lifecycleStatus:
            (pickString(data.lifecycleStatus, current.lifecycleStatus) as
              PrismaSetupDefinitionRevisionRow["lifecycleStatus"]),
          setupDefinitionId: pickString(
            data.setupDefinitionId,
            current.setupDefinitionId
          ),
          previousSetupDefinitionId:
            pickNullableString(
              data.previousSetupDefinitionId,
              current.previousSetupDefinitionId
            ),
          setupFamilyId: pickString(data.setupFamilyId, current.setupFamilyId),
          setupVersionNumber: pickNumber(
            data.setupVersionNumber,
            current.setupVersionNumber
          ),
          previousRevisionId: pickNullableString(
            data.previousRevisionId,
            current.previousRevisionId
          ),
          revisionReason: pickString(data.revisionReason, current.revisionReason),
          revisionStatus:
            (pickString(data.revisionStatus, current.revisionStatus) as
              PrismaSetupDefinitionRevisionRow["revisionStatus"]),
          changedFieldsSummary:
            pickString(data.changedFieldsSummary, current.changedFieldsSummary),
          createdBy: pickString(data.createdBy, current.createdBy),
          notes: pickNullableString(data.notes, current.notes),
          sourceSetupRefinementRequestId:
            pickString(
              data.sourceSetupRefinementRequestId,
              current.sourceSetupRefinementRequestId
            ),
          sourceResearchDecisionApprovalId:
            pickNullableString(
              data.sourceResearchDecisionApprovalId,
              current.sourceResearchDecisionApprovalId
            ),
          sourceResearchFeedbackDecisionId:
            pickNullableString(
              data.sourceResearchFeedbackDecisionId,
              current.sourceResearchFeedbackDecisionId
            ),
          originRunId: pickNullableString(data.originRunId, current.originRunId),
          originTransitionId:
            pickNullableString(
              data.originTransitionId,
              current.originTransitionId
            ),
          createdBySource:
            (pickString(data.createdBySource, current.createdBySource) as
              PrismaSetupDefinitionRevisionRow["createdBySource"]),
          lastUpdatedBySource:
            (pickString(data.lastUpdatedBySource, current.lastUpdatedBySource) as
              PrismaSetupDefinitionRevisionRow["lastUpdatedBySource"]),
          traceId: pickNullableString(data.traceId, current.traceId),
          sourceObservedAtUtc:
            pickDateOrNull(data.sourceObservedAtUtc, current.sourceObservedAtUtc),
          metadataNotes: pickNullableString(
            data.metadataNotes,
            current.metadataNotes
          ),
          createdAtUtc:
            pickDateOrNull(data.createdAtUtc, current.createdAtUtc) ??
            current.createdAtUtc,
          updatedAtUtc:
            pickDateOrNull(data.updatedAtUtc, current.updatedAtUtc) ??
            current.updatedAtUtc,
          archivedAtUtc:
            pickDateOrNull(data.archivedAtUtc, current.archivedAtUtc)
        };

        rows.set(args.where.setupDefinitionRevisionId, updated);
        return { count: 1 };
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
    setupRefinementRequestRecord: {
      async findUnique(args: {
        where: {
          setupRefinementRequestId: string;
        };
      }) {
        return state.requestById.get(args.where.setupRefinementRequestId) ?? null;
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

test("prisma setup-definition-revision adapter persists, lists, and updates records", async () => {
  const adapter = new PrismaSetupDefinitionRevisionRelationalRepositoryAdapter(
    createFakePrismaClient()
  );

  await adapter.insertSetupDefinitionRevisionRecord({
    record: buildSetupDefinitionRevisionRecord(),
    expectedVersion: null
  });
  await adapter.insertSetupDefinitionRevisionRecord({
    record: buildSetupDefinitionRevisionRecord({
      entityId: "revision-002",
      setupDefinitionId: "setup-family-001-v3",
      previousSetupDefinitionId: "setup-family-001-v2",
      setupVersionNumber: 3,
      previousRevisionId: "revision-001",
      sourceSetupRefinementRequestId: "refinement-002",
      sourceResearchDecisionApprovalId: "approval-002",
      sourceResearchFeedbackDecisionId: "feedback-002"
    }),
    expectedVersion: null
  });

  const byId = await adapter.loadSetupDefinitionRevisionRecord("revision-001");
  const bySetupDefinition =
    await adapter.loadSetupDefinitionRevisionRecordBySetupDefinitionId(
      "setup-family-001-v2"
    );
  const latest =
    await adapter.loadLatestSetupDefinitionRevisionRecordBySetupFamilyId(
      "setup-family-001"
    );
  const familyRevisions =
    await adapter.listSetupDefinitionRevisionRecordsBySetupFamilyId(
      "setup-family-001"
    );

  const updated = await adapter.updateSetupDefinitionRevisionRecord({
    record: buildSetupDefinitionRevisionRecord({
      identityVersion: 2,
      revisionStatus: "accepted",
      updatedAtUtc: "2026-07-09T11:00:00.000Z"
    }),
    expectedVersion: 1
  });

  assert.equal(byId?.identity.entityId, "revision-001");
  assert.equal(bySetupDefinition?.setupVersionNumber, 2);
  assert.equal(latest?.identity.entityId, "revision-002");
  assert.deepEqual(
    familyRevisions.map((record) => record.setupVersionNumber),
    [2, 3]
  );
  assert.equal(updated.revisionStatus, "accepted");
  assert.equal(updated.identity.version, 2);
});

test("prisma setup-definition-revision adapter maps unique-constraint failures to already_exists", async () => {
  const client = createFakePrismaClient();
  client.setupDefinitionRevisionRecord.create = async () => {
    throw { code: "P2002" };
  };
  const adapter = new PrismaSetupDefinitionRevisionRelationalRepositoryAdapter(client);

  await assert.rejects(
    async () =>
      adapter.insertSetupDefinitionRevisionRecord({
        record: buildSetupDefinitionRevisionRecord(),
        expectedVersion: null
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "already_exists" &&
      error.entityType === "setup_definition_revision"
  );
});

test("prisma setup-definition-revision adapter resolves missing approval references deterministically", async () => {
  const client = createFakePrismaClient();
  client.researchDecisionApprovalRecord.findUnique = async () => null;
  const adapter = new PrismaSetupDefinitionRevisionRelationalRepositoryAdapter(client);

  await assert.rejects(
    async () =>
      adapter.insertSetupDefinitionRevisionRecord({
        record: buildSetupDefinitionRevisionRecord(),
        expectedVersion: null
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "setup_definition_revision" &&
      error.referenceEntityType === "research_decision_approval" &&
      error.referenceEntityId === "approval-001"
  );
});

test("prisma setup-definition-revision adapter surfaces optimistic version mismatches on update", async () => {
  const adapter = new PrismaSetupDefinitionRevisionRelationalRepositoryAdapter(
    createFakePrismaClient()
  );

  await adapter.insertSetupDefinitionRevisionRecord({
    record: buildSetupDefinitionRevisionRecord(),
    expectedVersion: null
  });

  await assert.rejects(
    async () =>
      adapter.updateSetupDefinitionRevisionRecord({
        record: buildSetupDefinitionRevisionRecord({
          identityVersion: 2,
          revisionStatus: "accepted",
          updatedAtUtc: "2026-07-09T11:30:00.000Z"
        }),
        expectedVersion: 99
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "version_mismatch" &&
      error.entityType === "setup_definition_revision" &&
      error.expectedVersion === 99 &&
      error.actualVersion === 1
  );
});
