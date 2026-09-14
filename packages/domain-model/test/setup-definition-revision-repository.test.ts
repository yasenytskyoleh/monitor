import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemorySetupDefinitionRevisionRepository,
  type ProductRecordMetadata,
  type SetupDefinitionRevision
} from "../src/index.js";

const TIMESTAMP = "2026-09-14T12:00:00.000Z";
const metadata: ProductRecordMetadata = {
  originRunId: null,
  originTransitionId: null,
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: null,
  sourceObservedAtUtc: TIMESTAMP
};

const buildRevision = (version: number): SetupDefinitionRevision => ({
  id: `revision-${version}`,
  setupDefinitionId: `setup-${version}`,
  versionInfo: {
    setupFamilyId: "setup-family",
    revisionId: `revision-${version}`,
    version
  },
  revisionReason: `Revision ${version}`,
  revisionStatus: "accepted",
  changedFieldsSummary: `Created revision ${version}`,
  createdBy: "test",
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
});

test("in-memory revision repository permits missing lineage only for an initial revision", async () => {
  const repository = new InMemorySetupDefinitionRevisionRepository();

  await assert.doesNotReject(() => repository.create({
    revision: buildRevision(1),
    metadata
  }));
  await assert.rejects(
    () => repository.create({ revision: buildRevision(2), metadata }),
    /may omit refinement lineage only for an initial revision/
  );
});
