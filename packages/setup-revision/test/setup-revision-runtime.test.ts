import assert from "node:assert/strict";
import test from "node:test";

import type {
  ProductRecordMetadata,
  SetupDefinitionRevisionResult,
  SetupRefinementRequest
} from "@monitor/domain-model";
import { createSetupRevisionRuntime } from "../src/index.js";

const refinement: SetupRefinementRequest = {
  id: "refinement-001", setupDefinitionId: "setup-001", sourceResearchDecisionApprovalId: "approval-001", sourceResearchFeedbackDecisionId: "feedback-001", refinementRationaleSummary: "revise", requestedChangesSummary: "change", status: "proposed", requestedBy: "owner", requestedAt: "2026-08-01T00:00:00.000Z", createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z"
};
const proposal = { setupRefinementRequestId: refinement.id, requestedBy: "owner", requestedAt: "2026-08-01T01:00:00.000Z", revisionSummary: "Tighten confirmation", proposedChangedFieldsSummary: "measurableConditions" };

test("uses the persisted refinement setup identity and traces the proposal", async () => {
  let command: Record<string, unknown> | undefined;
  let metadata: ProductRecordMetadata | undefined;
  const runtime = createSetupRevisionRuntime({
    setupRefinementRequestRepository: { async getById() { return refinement; } },
    setupDefinitionRevisionHandoff: { async create(value, valueMetadata): Promise<SetupDefinitionRevisionResult> { command = value; metadata = valueMetadata; return { status: "created", setupDefinitionRevisionId: "revision-001", setupRefinementRequestId: refinement.id, previousSetupDefinitionId: refinement.setupDefinitionId, newSetupDefinitionId: "setup-002", setupFamilyId: "family-001", version: 2, versionInfo: { revisionId: "revision-001", setupFamilyId: "family-001", version: 2 }, revisionStatus: "proposed", warnings: [] }; } }
  });
  const result = await runtime.proposeFromRefinement(proposal);
  assert.equal(result.status, "created");
  assert.equal(command?.setupDefinitionId, refinement.setupDefinitionId);
  assert.equal(metadata?.traceId, refinement.id);
});

test("rejects invalid or missing refinements and preserves retryable failures", async () => {
  const missing = createSetupRevisionRuntime({ setupRefinementRequestRepository: { async getById() { return null; } }, setupDefinitionRevisionHandoff: { async create(): Promise<never> { throw new Error(); } } });
  const invalid = await missing.proposeFromRefinement({ ...proposal, requestedBy: "" });
  const absent = await missing.proposeFromRefinement(proposal);
  const failing = createSetupRevisionRuntime({ setupRefinementRequestRepository: { async getById() { return refinement; } }, setupDefinitionRevisionHandoff: { async create(): Promise<never> { throw new Error("temporary failure"); } } });
  const failure = await failing.proposeFromRefinement(proposal);
  assert.equal(invalid.status, "rejected_validation");
  assert.equal(absent.status, "rejected_validation");
  assert.equal(failure.status, "failed");
});
