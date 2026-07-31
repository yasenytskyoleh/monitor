import assert from "node:assert/strict";
import test from "node:test";
import type { BuildResearchReviewPacketCommand, ResearchReviewPacketResult } from "@monitor/domain-model";
import { createReviewPacketRuntime } from "../src/index.js";

const request: BuildResearchReviewPacketCommand = { setupFamilyId: "family-001", setupRevisionId: "revision-001", researchHypothesisId: "hypothesis-001", builtAt: "2026-08-01T01:00:00.000Z" };

test("forwards explicit review-packet requests without adding a decision", async () => {
  let received: BuildResearchReviewPacketCommand | undefined;
  const runtime = createReviewPacketRuntime({ reviewPacketService: { async buildReviewPacket(command): Promise<ResearchReviewPacketResult> { received = command; return { status: "partial", setupFamilyId: command.setupFamilyId, setupRevisionId: command.setupRevisionId, warnings: ["missing optional evidence"] }; } } });
  const result = await runtime.build(request);
  assert.equal(result.status, "partial");
  assert.deepEqual(received, request);
});

test("rejects invalid input and maps builder failures to retryable results", async () => {
  const runtime = createReviewPacketRuntime({ reviewPacketService: { async buildReviewPacket(): Promise<never> { throw new Error("temporary failure"); } } });
  const invalid = await runtime.build({ ...request, setupFamilyId: "" });
  const failed = await runtime.build(request);
  assert.equal(invalid.status, "rejected");
  assert.equal(failed.status, "failed");
  assert.match(failed.reason ?? "", /temporary failure/);
});
