import assert from "node:assert/strict";
import test from "node:test";

import { Prisma } from "../src/generated/prisma/client.js";

import {
  PrismaSetupRevisionActivationRecordRelationalRepositoryAdapter,
  RepositoryError,
  type ProductRecordMetadata,
  type SetupRevisionActivationRecordDurableRecord,
  type SetupRevisionActivationRecordRelationalPrismaClient
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-setup-activation-prisma-001",
  originTransitionId: "transition-setup-activation-prisma-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-setup-activation-prisma-001",
  sourceObservedAtUtc: "2026-07-14T10:45:00.000Z"
};

const buildActivationRecord = ({
  entityId = "activation-001",
  targetRevisionId = "revision-002",
  targetSetupDefinitionId = "setup-family-001-v2",
  previousRevisionId = "revision-001",
  previousSetupDefinitionId = "setup-family-001-v1",
  activationOutcome = "superseded_previous",
  activatedAtUtc = "2026-07-14T10:45:00.000Z"
}: {
  activatedAtUtc?: string;
  activationOutcome?: SetupRevisionActivationRecordDurableRecord["activationOutcome"];
  entityId?: string;
  previousRevisionId?: string | null;
  previousSetupDefinitionId?: string | null;
  targetRevisionId?: string;
  targetSetupDefinitionId?: string;
} = {}): SetupRevisionActivationRecordDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "setup_revision_activation_record",
    entityId,
    version: 1,
    relatedEntityIds: [
      "setup-family-001",
      targetRevisionId,
      targetSetupDefinitionId,
      ...(previousRevisionId ? [previousRevisionId] : []),
      ...(previousSetupDefinitionId ? [previousSetupDefinitionId] : [])
    ]
  },
  lifecycleStatus: "active",
  createdAtUtc: activatedAtUtc,
  updatedAtUtc: activatedAtUtc,
  archivedAtUtc: null,
  metadata,
  setupFamilyId: "setup-family-001",
  targetRevisionId,
  targetSetupDefinitionId,
  previousRevisionId,
  previousSetupDefinitionId,
  activatedBy: "research_reviewer_1",
  activatedAtUtc,
  activationOutcome,
  rationale: "Promote the accepted revision after final review."
});

type PrismaSetupRevisionActivationRow =
  Prisma.SetupRevisionActivationRecordRecordGetPayload<object>;

const toDateOrNull = (value: Date | string | null | undefined): Date | null => {
  if (value === null || value === undefined) {
    return null;
  }

  return value instanceof Date ? value : new Date(value);
};

const toRequiredDate = (value: Date | string): Date =>
  value instanceof Date ? value : new Date(value);

const toPrismaActivationRow = (
  record: SetupRevisionActivationRecordDurableRecord
): PrismaSetupRevisionActivationRow => ({
  setupRevisionActivationRecordId: record.identity.entityId,
  version: record.identity.version,
  lifecycleStatus: record.lifecycleStatus,
  setupFamilyId: record.setupFamilyId,
  targetRevisionId: record.targetRevisionId,
  targetSetupDefinitionId: record.targetSetupDefinitionId,
  previousRevisionId: record.previousRevisionId,
  previousSetupDefinitionId: record.previousSetupDefinitionId,
  activatedBy: record.activatedBy,
  activatedAtUtc: new Date(record.activatedAtUtc),
  activationOutcome: record.activationOutcome,
  rationale: record.rationale,
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

const createFakePrismaClient = (): SetupRevisionActivationRecordRelationalPrismaClient => {
  const rows = new Map<string, PrismaSetupRevisionActivationRow>();
  const state = {
    setupIds: new Set([
      "setup-family-001-v1",
      "setup-family-001-v2",
      "setup-family-001-v3",
      "setup-family-999-v1"
    ]),
    revisionById: new Map([
      [
        "revision-001",
        {
          setupDefinitionRevisionId: "revision-001",
          setupDefinitionId: "setup-family-001-v1",
          setupFamilyId: "setup-family-001"
        }
      ],
      [
        "revision-002",
        {
          setupDefinitionRevisionId: "revision-002",
          setupDefinitionId: "setup-family-001-v2",
          setupFamilyId: "setup-family-001"
        }
      ],
      [
        "revision-003",
        {
          setupDefinitionRevisionId: "revision-003",
          setupDefinitionId: "setup-family-001-v3",
          setupFamilyId: "setup-family-001"
        }
      ],
      [
        "revision-999",
        {
          setupDefinitionRevisionId: "revision-999",
          setupDefinitionId: "setup-family-999-v1",
          setupFamilyId: "setup-family-999"
        }
      ]
    ])
  };

  return {
    setupRevisionActivationRecordRecord: {
      async create(args: {
        data: Prisma.SetupRevisionActivationRecordRecordUncheckedCreateInput;
      }) {
        if (rows.has(args.data.setupRevisionActivationRecordId)) {
          throw { code: "P2002" };
        }

        const row: PrismaSetupRevisionActivationRow = {
          setupRevisionActivationRecordId: args.data.setupRevisionActivationRecordId,
          version: args.data.version,
          lifecycleStatus: args.data.lifecycleStatus,
          setupFamilyId: args.data.setupFamilyId,
          targetRevisionId: args.data.targetRevisionId,
          targetSetupDefinitionId: args.data.targetSetupDefinitionId,
          previousRevisionId: args.data.previousRevisionId ?? null,
          previousSetupDefinitionId: args.data.previousSetupDefinitionId ?? null,
          activatedBy: args.data.activatedBy,
          activatedAtUtc: toRequiredDate(args.data.activatedAtUtc),
          activationOutcome: args.data.activationOutcome,
          rationale: args.data.rationale ?? null,
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
        rows.set(row.setupRevisionActivationRecordId, row);
        return row;
      },
      async findMany(args: {
        where:
          | {
              setupFamilyId: string;
            }
          | {
              targetRevisionId: string;
            };
        orderBy: {
          activatedAtUtc: "asc" | "desc";
        };
      }) {
        const matches = [...rows.values()].filter((row) =>
          "setupFamilyId" in args.where
            ? row.setupFamilyId === args.where.setupFamilyId
            : row.targetRevisionId === args.where.targetRevisionId
        );

        return matches.sort((left, right) =>
          args.orderBy.activatedAtUtc === "asc"
            ? left.activatedAtUtc.getTime() - right.activatedAtUtc.getTime()
            : right.activatedAtUtc.getTime() - left.activatedAtUtc.getTime()
        );
      },
      async findUnique(args: {
        where: {
          setupRevisionActivationRecordId: string;
        };
      }) {
        return rows.get(args.where.setupRevisionActivationRecordId) ?? null;
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
    setupDefinitionRevisionRecord: {
      async findUnique(args: {
        where: {
          setupDefinitionRevisionId: string;
        };
      }) {
        return state.revisionById.get(args.where.setupDefinitionRevisionId) ?? null;
      }
    }
  };
};

test("prisma setup-revision activation adapter persists, loads, and lists records", async () => {
  const adapter = new PrismaSetupRevisionActivationRecordRelationalRepositoryAdapter(
    createFakePrismaClient()
  );

  const created = await adapter.insertSetupRevisionActivationRecord({
    record: buildActivationRecord()
  });
  await adapter.insertSetupRevisionActivationRecord({
    record: buildActivationRecord({
      entityId: "activation-002",
      targetRevisionId: "revision-003",
      targetSetupDefinitionId: "setup-family-001-v3",
      previousRevisionId: "revision-002",
      previousSetupDefinitionId: "setup-family-001-v2",
      activationOutcome: "activated",
      activatedAtUtc: "2026-07-14T10:50:00.000Z"
    })
  });

  const byId = await adapter.loadSetupRevisionActivationRecord("activation-001");
  const byFamily =
    await adapter.listSetupRevisionActivationRecordsBySetupFamilyId(
      "setup-family-001"
    );
  const byTarget =
    await adapter.listSetupRevisionActivationRecordsByTargetRevisionId(
      "revision-003"
    );

  assert.equal(created.activationOutcome, "superseded_previous");
  assert.equal(byId?.targetRevisionId, "revision-002");
  assert.deepEqual(byFamily.map((record) => record.identity.entityId), [
    "activation-001",
    "activation-002"
  ]);
  assert.equal(byTarget.length, 1);
  assert.equal(byTarget[0]?.targetSetupDefinitionId, "setup-family-001-v3");
});

test("prisma setup-revision activation adapter maps duplicate ids to already_exists", async () => {
  const adapter = new PrismaSetupRevisionActivationRecordRelationalRepositoryAdapter(
    createFakePrismaClient()
  );

  await adapter.insertSetupRevisionActivationRecord({
    record: buildActivationRecord()
  });

  await assert.rejects(
    async () =>
      adapter.insertSetupRevisionActivationRecord({
        record: buildActivationRecord()
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "already_exists" &&
      error.entityType === "setup_revision_activation_record" &&
      error.operation === "create"
  );
});

test("prisma setup-revision activation adapter resolves invalid target setup references deterministically", async () => {
  const adapter = new PrismaSetupRevisionActivationRecordRelationalRepositoryAdapter(
    createFakePrismaClient()
  );

  await assert.rejects(
    async () =>
      adapter.insertSetupRevisionActivationRecord({
        record: buildActivationRecord({
          entityId: "activation-003",
          targetSetupDefinitionId: "setup-missing"
        })
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "setup_revision_activation_record" &&
      error.referenceEntityType === "setup_definition" &&
      error.referenceEntityId === "setup-missing"
  );
});

test("prisma setup-revision activation adapter rejects cross-family target revision mismatches", async () => {
  const adapter = new PrismaSetupRevisionActivationRecordRelationalRepositoryAdapter(
    createFakePrismaClient()
  );

  await assert.rejects(
    async () =>
      adapter.insertSetupRevisionActivationRecord({
        record: {
          ...buildActivationRecord({
            entityId: "activation-004",
            targetRevisionId: "revision-999",
            targetSetupDefinitionId: "setup-family-999-v1",
            previousRevisionId: null,
            previousSetupDefinitionId: null
          }),
          setupFamilyId: "setup-family-001"
        }
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "setup_revision_activation_record" &&
      error.referenceEntityType === "setup_definition_revision" &&
      error.referenceEntityId === "revision-999"
  );
});
