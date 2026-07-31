import assert from "node:assert/strict";
import test from "node:test";
import type { ProductRecordMetadata, SetupDefinitionRevision, SetupRevisionActivationResult } from "@monitor/domain-model";
import { createSetupRevisionActivationRuntime } from "../src/index.js";

const revision: SetupDefinitionRevision = { id: "revision-001", setupDefinitionId: "setup-001", sourceSetupRefinementRequestId: "refinement-001", revisionReason: "summary", changedFieldsSummary: "conditions", versionInfo: { revisionId: "revision-001", setupFamilyId: "family-001", version: 2 }, revisionStatus: "proposed", createdBy: "owner", createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z" };
const request = { targetRevisionId: revision.id, activatedBy: "owner", activatedAt: "2026-08-01T01:00:00.000Z", rationale: "Approve new conditions." };

test("derives the target selectors from the persisted revision", async () => {
  let command: Record<string, unknown> | undefined;
  let metadata: ProductRecordMetadata | undefined;
  const runtime = createSetupRevisionActivationRuntime({ setupDefinitionRevisionRepository: { async getById() { return revision; } }, setupRevisionActivationHandoff: { async activate(value, valueMetadata): Promise<SetupRevisionActivationResult> { command = value; metadata = valueMetadata; return { status: "activated", targetRevisionId: revision.id, targetSetupDefinitionId: revision.setupDefinitionId, setupFamilyId: revision.versionInfo.setupFamilyId, activationOutcome: "activated", warnings: [] }; } } });
  const result = await runtime.activate(request);
  assert.equal(result.status, "activated");
  assert.equal(command?.setupDefinitionId, revision.setupDefinitionId);
  assert.equal(command?.setupFamilyId, revision.versionInfo.setupFamilyId);
  assert.equal(metadata?.traceId, revision.id);
});

test("rejects invalid or missing revisions and returns retryable handoff failures", async () => {
  const missing = createSetupRevisionActivationRuntime({ setupDefinitionRevisionRepository: { async getById() { return null; } }, setupRevisionActivationHandoff: { async activate(): Promise<never> { throw new Error(); } } });
  const invalid = await missing.activate({ ...request, activatedBy: "" });
  const absent = await missing.activate(request);
  const failing = createSetupRevisionActivationRuntime({ setupDefinitionRevisionRepository: { async getById() { return revision; } }, setupRevisionActivationHandoff: { async activate(): Promise<never> { throw new Error("temporary failure"); } } });
  const failure = await failing.activate(request);
  assert.equal(invalid.status, "rejected"); assert.equal(absent.status, "rejected"); assert.equal(failure.status, "failed");
});
