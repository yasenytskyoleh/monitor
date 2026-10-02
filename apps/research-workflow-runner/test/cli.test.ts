import assert from "node:assert/strict";
import test from "node:test";

import { parseResearchWorkflowCommand, runResearchWorkflowCli } from "../src/index.js";

test("parses explicit route, prepare, and execute commands", () => {
  assert.deepEqual(
    parseResearchWorkflowCommand([
      "route",
      "--decision-id",
      "decision-001",
      "--routed-at",
      "2026-09-29T10:00:00.000Z",
    ]),
    {
      name: "route",
      researchReviewDecisionId: "decision-001",
      routedAt: "2026-09-29T10:00:00.000Z",
    },
  );

  assert.deepEqual(
    parseResearchWorkflowCommand([
      "prepare",
      "--routing-id",
      "route-001",
      "--prepared-by",
      "operator-001",
      "--prepared-at",
      "2026-09-29T10:01:00.000Z",
      "--setup-definition-id",
      "setup-001",
      "--research-decision-approval-id",
      "approval-001",
      "--requested-by",
      "reviewer-001",
      "--requested-at",
      "2026-09-29T10:01:00.000Z",
      "--refinement-rationale",
      "Tighten invalidation.",
      "--requested-changes",
      "Add reclaim confirmation.",
      "--evidence-reference",
      "aggregate-001",
      "--evidence-reference",
      "review-001",
    ]),
    {
      name: "prepare",
      reviewDecisionRoutingResultId: "route-001",
      targetEntityRefs: {
        setupDefinitionId: "setup-001",
        researchDecisionApprovalId: "approval-001",
      },
      refinementInput: {
        requestedBy: "reviewer-001",
        requestedAt: "2026-09-29T10:01:00.000Z",
        refinementRationaleSummary: "Tighten invalidation.",
        requestedChangesSummary: "Add reclaim confirmation.",
        evidenceReferences: ["aggregate-001", "review-001"],
      },
      preparedBy: "operator-001",
      preparedAt: "2026-09-29T10:01:00.000Z",
    },
  );

  assert.deepEqual(
    parseResearchWorkflowCommand([
      "execute",
      "--envelope-id",
      "envelope-001",
      "--attempt-id",
      "attempt-001",
      "--attempted-by",
      "operator-001",
      "--attempted-at",
      "2026-09-29T10:02:00.000Z",
      "--executed-by",
      "reviewer-001",
      "--executed-at",
      "2026-09-29T10:02:01.000Z",
    ]),
    {
      name: "execute",
      routedActionExecutionEnvelopeId: "envelope-001",
      attemptId: "attempt-001",
      attemptedBy: "operator-001",
      attemptedAt: "2026-09-29T10:02:00.000Z",
      executedBy: "reviewer-001",
      executedAt: "2026-09-29T10:02:01.000Z",
    },
  );
});

test("parses separate review packet and reviewer decision commands", () => {
  assert.deepEqual(
    parseResearchWorkflowCommand([
      "review-packet",
      "--setup-family-id", "family-001",
      "--setup-revision-id", "revision-001",
      "--research-decision-approval-id", "approval-001",
      "--impact-summary-file", "/tmp/impact-summary.json",
      "--built-at", "2026-09-30T10:00:00.000Z",
      "--output-file", "packet.json",
    ]),
    {
      name: "review-packet",
      setupFamilyId: "family-001",
      setupRevisionId: "revision-001",
      researchDecisionApprovalId: "approval-001",
      impactSummaryFile: "/tmp/impact-summary.json",
      builtAt: "2026-09-30T10:00:00.000Z",
      outputFile: "packet.json",
    },
  );
  assert.deepEqual(
    parseResearchWorkflowCommand([
      "review-decision",
      "--packet-file", "packet.json",
      "--packet-id", "packet-001",
      "--setup-family-id", "family-001",
      "--reviewed-by", "reviewer-001",
      "--reviewed-at", "2026-09-30T10:01:00.000Z",
      "--outcome", "revise",
      "--authorized-next-action", "prepare_refinement_follow_up",
    ]),
    {
      name: "review-decision",
      packetFile: "packet.json",
      researchReviewPacketId: "packet-001",
      setupFamilyId: "family-001",
      reviewedBy: "reviewer-001",
      reviewedAt: "2026-09-30T10:01:00.000Z",
      decisionOutcome: "revise",
      authorizedNextAction: "prepare_refinement_follow_up",
    },
  );
});

test("rejects missing values, unknown options, and partial refinement input", () => {
  assert.throws(
    () => parseResearchWorkflowCommand(["review-packet", "--setup-family-id", "family-001"]),
    /--built-at is required/,
  );
  assert.throws(
    () => parseResearchWorkflowCommand([
      "review-decision", "--packet-file", "packet.json", "--packet-id", "packet-001",
      "--setup-family-id", "family-001", "--reviewed-by", "reviewer-001",
      "--reviewed-at", "2026-09-30T10:01:00.000Z", "--outcome", "approve",
    ]),
    /Invalid --outcome/,
  );
  assert.throws(
    () => parseResearchWorkflowCommand(["route", "--decision-id", "decision-001"]),
    /--routed-at is required/,
  );
  assert.throws(
    () => parseResearchWorkflowCommand(["route", "--unknown", "value"]),
    /Unknown option/,
  );
  assert.throws(
    () =>
      parseResearchWorkflowCommand([
        "prepare",
        "--routing-id",
        "route-001",
        "--prepared-by",
        "operator-001",
        "--prepared-at",
        "2026-09-29T10:01:00.000Z",
        "--requested-by",
        "reviewer-001",
      ]),
    /--requested-at is required/,
  );
  assert.throws(
    () =>
      parseResearchWorkflowCommand([
        "prepare",
        "--routing-id",
        "route-001",
        "--prepared-by",
        "operator-001",
        "--prepared-at",
        "2026-09-29T10:01:00.000Z",
        "--evidence-reference",
        "evidence-001",
      ]),
    /--requested-by is required/,
  );
});

test("requires an explicit database URL before opening a workflow repository", async () => {
  await assert.rejects(
    () =>
      runResearchWorkflowCli(
        [
          "route",
          "--decision-id",
          "decision-001",
          "--routed-at",
          "2026-09-29T10:00:00.000Z",
        ],
        {},
      ),
    /DATABASE_URL is required/,
  );
});
