import assert from "node:assert/strict";
import test from "node:test";

import type {
  ActivateSetupDefinitionRevisionCommand,
  ProductRecordMetadata,
  RoutedActionExecutionEnvelope,
  SetupDefinitionRevision,
  SetupRevisionActivationResult,
} from "@monitor/domain-model";

import { createActivationEnvelopeExecutor } from "../src/index.js";

const envelope: RoutedActionExecutionEnvelope = {
  id: "envelope-001",
  sourceRoutingResultId: "route-001",
  sourceReviewDecisionId: "decision-001",
  actionTarget: "activate_setup_revision",
  actionCommandType: "ActivateSetupDefinitionRevisionCommand",
  targetEntityRefs: { setupFamilyId: "family-001", setupRevisionId: "revision-001" },
  routeMetadataSnapshot: { routeStatus: "routed" },
  executionPayloadSnapshot: {
    commandType: "ActivateSetupDefinitionRevisionCommand",
    target: "activate_setup_revision",
    commandInput: {
      setupRevisionId: "revision-001",
      setupFamilyId: "family-001",
      sourceReviewDecisionId: "decision-001",
      sourceRoutingResultId: "route-001",
    },
  },
  executionStatus: "prepared",
  preparedBy: "reviewer",
  preparedAt: "2026-08-01T01:00:00.000Z",
  createdAt: "2026-08-01T01:00:00.000Z",
  updatedAt: "2026-08-01T01:00:00.000Z",
};

const revision: SetupDefinitionRevision = {
  id: "revision-001",
  setupDefinitionId: "setup-001",
  sourceSetupRefinementRequestId: "refinement-001",
  versionInfo: { revisionId: "revision-001", setupFamilyId: "family-001", version: 2 },
  revisionReason: "Activate this revision.",
  revisionStatus: "proposed",
  changedFieldsSummary: "Activate revision.",
  createdBy: "reviewer",
  createdAt: "2026-08-01T01:00:00.000Z",
  updatedAt: "2026-08-01T01:00:00.000Z",
};

test("activates only a prepared, matching activation envelope", async () => {
  let command: ActivateSetupDefinitionRevisionCommand | undefined;
  let metadata: ProductRecordMetadata | undefined;
  const executor = createActivationEnvelopeExecutor({
    setupDefinitionRevisionRepository: { async getById(): Promise<SetupDefinitionRevision> { return revision; } },
    setupRevisionActivationHandoff: {
      async activate(input, inputMetadata): Promise<SetupRevisionActivationResult> {
        command = input;
        metadata = inputMetadata;
        return { status: "activated", targetRevisionId: revision.id, warnings: [] };
      },
    },
    activatedBy: "activation-executor",
    now: () => "2026-08-01T01:05:00.000Z",
  });

  const outcome = await executor.execute(envelope);

  assert.deepEqual(outcome, { status: "executed", outcomeCode: "setup_revision_activated" });
  assert.equal(command?.setupDefinitionId, revision.setupDefinitionId);
  assert.equal(command?.activatedBy, "activation-executor");
  assert.equal(metadata?.traceId, envelope.id);
});

test("rejects invalid envelopes and revision mismatches without activating", async () => {
  let activations = 0;
  const executor = createActivationEnvelopeExecutor({
    setupDefinitionRevisionRepository: { async getById(): Promise<SetupDefinitionRevision> { return { ...revision, versionInfo: { ...revision.versionInfo, setupFamilyId: "other" } }; } },
    setupRevisionActivationHandoff: { async activate(): Promise<never> { activations += 1; throw new Error("should not activate"); } },
    activatedBy: "activation-executor",
    now: () => "2026-08-01T01:05:00.000Z",
  });

  assert.equal((await executor.execute({ ...envelope, executionStatus: "cancelled" })).status, "rejected");
  assert.equal((await executor.execute(envelope)).outcomeCode, "setup_revision_family_mismatch");
  assert.equal(activations, 0);
});
