import assert from "node:assert/strict";
import test from "node:test";

import type {
  DownstreamActionExecutor,
  DownstreamActionTarget,
  RoutedActionExecutionEnvelope,
} from "@monitor/domain-model";

import { createDownstreamActionExecutorDispatcher } from "../src/index.js";

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
  preparedAt: "2026-09-28T18:30:00.000Z",
  createdAt: "2026-09-28T18:30:00.000Z",
  updatedAt: "2026-09-28T18:30:00.000Z",
};

const recordingExecutor = (name: string, calls: string[]): DownstreamActionExecutor => ({
  async execute() {
    calls.push(name);
    return { status: "executed", outcomeCode: `${name}_executed` };
  },
});

test("dispatches only the three allowlisted action targets", async () => {
  const calls: string[] = [];
  const dispatcher = createDownstreamActionExecutorDispatcher({
    activationExecutor: recordingExecutor("activation", calls),
    lifecycleExecutor: recordingExecutor("lifecycle", calls),
    refinementExecutor: recordingExecutor("refinement", calls),
  });
  const cases: ReadonlyArray<{ target: DownstreamActionTarget; expectedCall: string }> = [
    { target: "activate_setup_revision", expectedCall: "activation" },
    { target: "apply_setup_lifecycle_mutation", expectedCall: "lifecycle" },
    { target: "create_setup_refinement_request", expectedCall: "refinement" },
  ];

  for (const { target, expectedCall } of cases) {
    const outcome = await dispatcher.execute({ ...envelope, actionTarget: target });

    assert.deepEqual(outcome, { status: "executed", outcomeCode: `${expectedCall}_executed` });
  }

  assert.deepEqual(calls, ["activation", "lifecycle", "refinement"]);
});

test("rejects the no-action target without invoking an executor", async () => {
  const calls: string[] = [];
  const dispatcher = createDownstreamActionExecutorDispatcher({
    activationExecutor: recordingExecutor("activation", calls),
    lifecycleExecutor: recordingExecutor("lifecycle", calls),
    refinementExecutor: recordingExecutor("refinement", calls),
  });

  const outcome = await dispatcher.execute({ ...envelope, actionTarget: "no_op_confirmed" });

  assert.deepEqual(outcome, { status: "rejected", outcomeCode: "unsupported_action_target" });
  assert.deepEqual(calls, []);
});
