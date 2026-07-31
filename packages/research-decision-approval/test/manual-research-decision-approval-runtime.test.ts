import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryFeedbackDecisionApprovalReviewPersistence,
  InMemoryResearchDecisionApprovalRepository,
  InMemoryResearchFeedbackDecisionRepository,
  InMemoryResearchHypothesisRepository,
  InMemorySetupDefinitionRepository,
  createResearchDecisionApprovalHandoff,
  createResearchService,
  type ProductRecordMetadata,
  type ResearchDecisionApprovalResult,
  type ResearchFeedbackDecision,
  type ResearchHypothesis,
  type SetupDefinition
} from "@monitor/domain-model";

import { createManualResearchDecisionApprovalRuntime } from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: null,
  originTransitionId: null,
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: null,
  sourceObservedAtUtc: "2026-08-01T00:00:00.000Z"
};

const setupDefinition: SetupDefinition = {
  id: "setup-manual-approval-runtime-001",
  name: "Manual approval runtime setup",
  description: "Fixture for explicit human approval of setup feedback.",
  status: "active",
  measurableConditions: ["close above range high"],
  evaluationAssumptions: ["evaluate fixed 24h"],
  invalidationAssumptions: ["none"],
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z"
};

const hypothesis: ResearchHypothesis = {
  id: "hypothesis-manual-approval-runtime-001",
  title: "Manual approval runtime hypothesis",
  description: "Feedback decisions need an explicit human outcome.",
  relatedSetupDefinitionIds: [setupDefinition.id],
  assumptions: ["manual approval remains separate from recommendation"],
  notes: [],
  evidenceStatus: "weakens",
  status: "active",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z"
};

const buildFeedbackDecision = (
  id: string,
  overrides: Partial<ResearchFeedbackDecision> = {}
): ResearchFeedbackDecision => ({
  id,
  setupDefinitionId: setupDefinition.id,
  researchHypothesisId: hypothesis.id,
  evidenceStatus: "weakens",
  recommendedAction: "pause_setup",
  rationaleSummary: "Evidence weakens the hypothesis and requires manual review.",
  decisionStatus: "proposed",
  requiresManualReview: true,
  createdAt: "2026-08-01T01:00:00.000Z",
  updatedAt: "2026-08-01T01:00:00.000Z",
  ...overrides
});

const createFixture = async () => {
  const setupDefinitionRepository = new InMemorySetupDefinitionRepository();
  const researchHypothesisRepository = new InMemoryResearchHypothesisRepository();
  const researchFeedbackDecisionRepository = new InMemoryResearchFeedbackDecisionRepository();
  const researchDecisionApprovalRepository = new InMemoryResearchDecisionApprovalRepository();
  await setupDefinitionRepository.create({ definition: setupDefinition, metadata });
  await researchHypothesisRepository.create({ hypothesis, metadata });

  const researchDecisionApprovalHandoff = createResearchDecisionApprovalHandoff({
    researchService: createResearchService({
      setupDefinitionRepository,
      researchHypothesisRepository,
      researchFeedbackDecisionRepository,
      researchDecisionApprovalRepository,
      feedbackDecisionApprovalReviewPersistence:
        new InMemoryFeedbackDecisionApprovalReviewPersistence(
          researchFeedbackDecisionRepository,
          researchDecisionApprovalRepository
        )
    }),
    setupDefinitionRepository,
    researchFeedbackDecisionRepository
  });

  return {
    researchFeedbackDecisionRepository,
    runtime: createManualResearchDecisionApprovalRuntime({
      researchFeedbackDecisionRepository,
      researchDecisionApprovalHandoff
    })
  };
};

test("records reviewer-supplied approval, rejection, and needs-changes outcomes", async () => {
  const cases = [
    { outcome: "approved", decisionStatus: "accepted", authorizedNextAction: "pause_setup" },
    { outcome: "rejected", decisionStatus: "rejected", authorizedNextAction: undefined },
    { outcome: "needs_changes", decisionStatus: "reviewed", authorizedNextAction: undefined }
  ] as const;

  for (const item of cases) {
    const fixture = await createFixture();
    const decisionId = `feedback-${item.outcome}`;
    await fixture.researchFeedbackDecisionRepository.create({
      decision: buildFeedbackDecision(decisionId),
      metadata
    });

    const result = await fixture.runtime.recordManualApproval({
      researchFeedbackDecisionId: decisionId,
      setupDefinitionId: setupDefinition.id,
      reviewedBy: "research_reviewer_1",
      reviewedAt: "2026-08-01T01:05:00.000Z",
      decisionOutcome: item.outcome,
      reviewerNotes: "Recorded by an explicit reviewer."
    });

    assert.equal(result.status, "recorded");
    assert.equal(result.approvalOutcome, item.outcome);
    assert.equal(result.decisionStatus, item.decisionStatus);
    assert.equal(result.authorizedNextAction, item.authorizedNextAction);
  }
});

test("rejects malformed, missing, mismatched, and non-proposed decisions before the handoff", async () => {
  const fixture = await createFixture();
  const malformed = await fixture.runtime.recordManualApproval({
    researchFeedbackDecisionId: "",
    setupDefinitionId: setupDefinition.id,
    reviewedBy: "",
    reviewedAt: "not-a-timestamp",
    decisionOutcome: "approved"
  });
  const missing = await fixture.runtime.recordManualApproval({
    researchFeedbackDecisionId: "feedback-missing",
    setupDefinitionId: setupDefinition.id,
    reviewedBy: "research_reviewer_1",
    reviewedAt: "2026-08-01T01:05:00.000Z",
    decisionOutcome: "approved"
  });
  await fixture.researchFeedbackDecisionRepository.create({
    decision: buildFeedbackDecision("feedback-accepted", { decisionStatus: "accepted" }),
    metadata
  });
  const nonProposed = await fixture.runtime.recordManualApproval({
    researchFeedbackDecisionId: "feedback-accepted",
    setupDefinitionId: setupDefinition.id,
    reviewedBy: "research_reviewer_1",
    reviewedAt: "2026-08-01T01:05:00.000Z",
    decisionOutcome: "approved"
  });
  const mismatched = await fixture.runtime.recordManualApproval({
    researchFeedbackDecisionId: "feedback-accepted",
    setupDefinitionId: "setup-unrelated",
    reviewedBy: "research_reviewer_1",
    reviewedAt: "2026-08-01T01:05:00.000Z",
    decisionOutcome: "approved"
  });

  assert.equal(malformed.status, "rejected_validation");
  assert.equal(missing.status, "rejected_validation");
  assert.match(missing.reason ?? "", /research_feedback_decision not found/);
  assert.equal(nonProposed.status, "rejected_lifecycle");
  assert.equal(mismatched.status, "rejected_validation");
});

test("forwards the explicit reviewer decision and trace metadata", async () => {
  const decision = buildFeedbackDecision("feedback-forwarded");
  let receivedCommand: Record<string, unknown> | undefined;
  let receivedMetadata: ProductRecordMetadata | undefined;
  const runtime = createManualResearchDecisionApprovalRuntime({
    researchFeedbackDecisionRepository: {
      async getById(): Promise<ResearchFeedbackDecision> {
        return decision;
      }
    },
    researchDecisionApprovalHandoff: {
      async review(command, handoffMetadata): Promise<ResearchDecisionApprovalResult> {
        receivedCommand = command;
        receivedMetadata = handoffMetadata;
        return { status: "rejected_validation", reason: "handoff rejected", warnings: [] };
      }
    }
  });

  const result = await runtime.recordManualApproval({
    researchFeedbackDecisionId: decision.id,
    setupDefinitionId: setupDefinition.id,
    reviewedBy: "research_reviewer_1",
    reviewedAt: "2026-08-01T01:05:00.000Z",
    decisionOutcome: "approved",
    reviewerNotes: "Approve the proposed action."
  });

  assert.equal(result.status, "rejected_validation");
  assert.deepEqual(receivedCommand, {
    researchFeedbackDecisionId: decision.id,
    setupDefinitionId: setupDefinition.id,
    reviewedBy: "research_reviewer_1",
    reviewedAt: "2026-08-01T01:05:00.000Z",
    decisionOutcome: "approved",
    reviewerNotes: "Approve the proposed action."
  });
  assert.equal(receivedMetadata?.traceId, decision.id);
  assert.equal(receivedMetadata?.createdBySource, "manual_curation");
});

test("maps unexpected approval failures to a retryable outcome", async () => {
  const decision = buildFeedbackDecision("feedback-failure");
  const runtime = createManualResearchDecisionApprovalRuntime({
    researchFeedbackDecisionRepository: {
      async getById(): Promise<ResearchFeedbackDecision> {
        return decision;
      }
    },
    researchDecisionApprovalHandoff: {
      async review(): Promise<never> {
        throw new Error("temporary approval handoff failure");
      }
    }
  });

  const result = await runtime.recordManualApproval({
    researchFeedbackDecisionId: decision.id,
    setupDefinitionId: setupDefinition.id,
    reviewedBy: "research_reviewer_1",
    reviewedAt: "2026-08-01T01:05:00.000Z",
    decisionOutcome: "approved"
  });

  assert.equal(result.status, "failed");
  assert.match(result.reason ?? "", /temporary approval handoff failure/);
  assert.equal(result.warnings.length, 1);
});
