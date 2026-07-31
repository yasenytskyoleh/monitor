import assert from "node:assert/strict";
import test from "node:test";

import type {
  ApplyResearchReviewDecisionCommand,
  ProductRecordMetadata,
  ResearchReviewDecisionResult,
} from "@monitor/domain-model";

import { createReviewDecisionRuntime } from "../src/index.js";

const command: ApplyResearchReviewDecisionCommand = {
  researchReviewPacketId: "packet-001",
  setupFamilyId: "family-001",
  reviewedBy: "reviewer",
  reviewedAt: "2026-08-01T01:00:00.000Z",
  decisionOutcome: "revise",
};

test("forwards explicit human decisions unchanged", async () => {
  let received: ApplyResearchReviewDecisionCommand | undefined;
  let receivedMetadata: ProductRecordMetadata | undefined;
  const runtime = createReviewDecisionRuntime({
    reviewDecisionService: {
      async applyDecision(request): Promise<ResearchReviewDecisionResult> {
        received = request.command;
        receivedMetadata = request.metadata;
        return {
          status: "recorded",
          researchReviewPacketId: command.researchReviewPacketId,
          setupFamilyId: command.setupFamilyId,
          decisionOutcome: "revise",
          authorizedNextAction: "prepare_refinement_follow_up",
          warnings: [],
        };
      },
    },
  });

  const result = await runtime.record(command);

  assert.equal(result.status, "recorded");
  assert.deepEqual(received, command);
  assert.deepEqual(receivedMetadata, {
    originRunId: null,
    originTransitionId: null,
    createdBySource: "manual_curation",
    lastUpdatedBySource: "manual_curation",
    traceId: command.researchReviewPacketId,
    sourceObservedAtUtc: command.reviewedAt,
    notes: `research review decision: packet=${command.researchReviewPacketId}`,
  });
});

test("rejects invalid input and maps failures", async () => {
  const runtime = createReviewDecisionRuntime({
    reviewDecisionService: {
      async applyDecision(): Promise<never> {
        throw new Error("temporary failure");
      },
    },
  });

  assert.equal(
    (await runtime.record({ ...command, reviewedBy: "" })).status,
    "rejected_validation",
  );

  const failed = await runtime.record(command);

  assert.equal(failed.status, "failed");
  assert.match(failed.reason ?? "", /temporary failure/);
});
