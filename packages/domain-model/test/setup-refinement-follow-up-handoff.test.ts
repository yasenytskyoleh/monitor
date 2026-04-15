import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryResearchDecisionApprovalRepository,
  InMemoryResearchHypothesisRepository,
  InMemorySetupDefinitionRepository,
  InMemorySetupRefinementRequestRepository,
  createApprovedRefinementFollowUpHandoff,
  createResearchService,
  type ProductRecordMetadata,
  type ResearchDecisionApproval,
  type SetupDefinition
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-refinement-follow-up",
  originTransitionId: "transition-refinement-follow-up",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-refinement-follow-up",
  sourceObservedAtUtc: "2026-04-26T12:00:00.000Z"
};

const buildSetupDefinition = (
  id: string,
  status: SetupDefinition["status"] = "active"
): SetupDefinition => ({
  id,
  name: "Refinement follow-up setup",
  description: "Setup for approved refinement follow-up tests",
  status,
  measurableConditions: ["close above range high"],
  evaluationAssumptions: ["fixed 24h evaluation"],
  invalidationAssumptions: ["invalidate on immediate breakdown"],
  createdAt: "2026-04-26T10:00:00.000Z",
  updatedAt: "2026-04-26T10:00:00.000Z"
});

const buildApproval = (
  id: string,
  setupDefinitionId: string,
  researchFeedbackDecisionId: string,
  approvalOutcome: ResearchDecisionApproval["approvalOutcome"] = "approved",
  authorizedNextAction: ResearchDecisionApproval["authorizedNextAction"] = "refine_definition"
): ResearchDecisionApproval => ({
  id,
  researchFeedbackDecisionId,
  setupDefinitionId,
  reviewedBy: "research_reviewer_1",
  reviewedAt: "2026-04-26T11:00:00.000Z",
  approvalOutcome,
  reviewerNotes: "manual approval decision",
  approvalStatus: "recorded",
  authorizedNextAction,
  createdAt: "2026-04-26T11:00:00.000Z",
  updatedAt: "2026-04-26T11:00:00.000Z"
});

const createFixture = () => {
  const setupDefinitionRepository = new InMemorySetupDefinitionRepository();
  const researchHypothesisRepository = new InMemoryResearchHypothesisRepository();
  const researchDecisionApprovalRepository = new InMemoryResearchDecisionApprovalRepository();
  const setupRefinementRequestRepository = new InMemorySetupRefinementRequestRepository();

  const researchService = createResearchService({
    setupDefinitionRepository,
    researchHypothesisRepository,
    researchDecisionApprovalRepository,
    setupRefinementRequestRepository
  });

  const refinementHandoff = createApprovedRefinementFollowUpHandoff({
    researchService,
    researchDecisionApprovalRepository,
    setupDefinitionRepository
  });

  return {
    setupDefinitionRepository,
    researchDecisionApprovalRepository,
    setupRefinementRequestRepository,
    refinementHandoff
  };
};

test("valid refinement request command shape", async () => {
  const {
    setupDefinitionRepository,
    researchDecisionApprovalRepository,
    setupRefinementRequestRepository,
    refinementHandoff
  } = createFixture();

  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-refinement-001", "active"),
    metadata
  });
  await researchDecisionApprovalRepository.create({
    approval: buildApproval(
      "approval-refinement-001",
      "setup-refinement-001",
      "feedback-refinement-001",
      "approved",
      "refine_definition"
    ),
    metadata
  });

  const result = await refinementHandoff.create(
    {
      researchDecisionApprovalId: "approval-refinement-001",
      researchFeedbackDecisionId: "feedback-refinement-001",
      setupDefinitionId: "setup-refinement-001",
      approvedAction: "refine_definition",
      requestedBy: "research_reviewer_1",
      requestedAt: "2026-04-26T12:05:00.000Z",
      refinementRationaleSummary: "Evidence weakened assumptions in current setup definition.",
      requestedChangesSummary: "Review measurable conditions and tighten invalidation assumptions.",
      evidenceReferences: ["aggregate-feedback-001", "hypothesis-note-12"]
    },
    metadata
  );

  assert.equal(result.status, "created");
  assert.equal(result.setupDefinitionId, "setup-refinement-001");
  assert.equal(result.researchDecisionApprovalId, "approval-refinement-001");
  assert.equal(result.approvedAction, "refine_definition");
  assert.equal(result.refinementStatus, "proposed");

  const requests = await setupRefinementRequestRepository.listByApprovalId("approval-refinement-001");
  assert.equal(requests.length, 1);
  assert.equal(requests[0]?.sourceResearchFeedbackDecisionId, "feedback-refinement-001");
  assert.equal(requests[0]?.status, "proposed");
});

test("missing approval rejected", async () => {
  const { setupDefinitionRepository, refinementHandoff } = createFixture();

  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-refinement-002", "active"),
    metadata
  });

  const result = await refinementHandoff.create(
    {
      researchDecisionApprovalId: "approval-missing",
      researchFeedbackDecisionId: "feedback-refinement-002",
      setupDefinitionId: "setup-refinement-002",
      approvedAction: "refine_definition",
      requestedBy: "research_reviewer_1",
      requestedAt: "2026-04-26T12:05:00.000Z",
      refinementRationaleSummary: "Need refinement follow-up.",
      requestedChangesSummary: "Adjust measurable conditions."
    },
    metadata
  );

  assert.equal(result.status, "rejected_validation");
  assert.equal(result.reason?.includes("research_decision_approval not found"), true);
});

test("non-approved outcome rejected", async () => {
  const {
    setupDefinitionRepository,
    researchDecisionApprovalRepository,
    refinementHandoff
  } = createFixture();

  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-refinement-003", "active"),
    metadata
  });
  await researchDecisionApprovalRepository.create({
    approval: buildApproval(
      "approval-refinement-003",
      "setup-refinement-003",
      "feedback-refinement-003",
      "rejected",
      undefined
    ),
    metadata
  });

  const result = await refinementHandoff.create(
    {
      researchDecisionApprovalId: "approval-refinement-003",
      researchFeedbackDecisionId: "feedback-refinement-003",
      setupDefinitionId: "setup-refinement-003",
      approvedAction: "refine_definition",
      requestedBy: "research_reviewer_1",
      requestedAt: "2026-04-26T12:05:00.000Z",
      refinementRationaleSummary: "Need refinement follow-up.",
      requestedChangesSummary: "Adjust measurable conditions."
    },
    metadata
  );

  assert.equal(result.status, "rejected_lifecycle");
  assert.equal(result.reason?.includes("does not authorize setup refinement follow-up"), true);
});

test("wrong approved action rejected", async () => {
  const {
    setupDefinitionRepository,
    researchDecisionApprovalRepository,
    refinementHandoff
  } = createFixture();

  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-refinement-004", "active"),
    metadata
  });
  await researchDecisionApprovalRepository.create({
    approval: buildApproval(
      "approval-refinement-004",
      "setup-refinement-004",
      "feedback-refinement-004",
      "approved",
      "pause_setup"
    ),
    metadata
  });

  const result = await refinementHandoff.create(
    {
      researchDecisionApprovalId: "approval-refinement-004",
      researchFeedbackDecisionId: "feedback-refinement-004",
      setupDefinitionId: "setup-refinement-004",
      approvedAction: "pause_setup",
      requestedBy: "research_reviewer_1",
      requestedAt: "2026-04-26T12:05:00.000Z",
      refinementRationaleSummary: "Need refinement follow-up.",
      requestedChangesSummary: "Adjust measurable conditions."
    },
    metadata
  );

  assert.equal(result.status, "rejected_validation");
  assert.equal(result.reason?.includes("approvedAction does not authorize refinement follow-up"), true);
});

test("missing setup definition rejected", async () => {
  const { researchDecisionApprovalRepository, refinementHandoff } = createFixture();

  await researchDecisionApprovalRepository.create({
    approval: buildApproval(
      "approval-refinement-005",
      "setup-refinement-005",
      "feedback-refinement-005",
      "approved",
      "refine_definition"
    ),
    metadata
  });

  const result = await refinementHandoff.create(
    {
      researchDecisionApprovalId: "approval-refinement-005",
      researchFeedbackDecisionId: "feedback-refinement-005",
      setupDefinitionId: "setup-refinement-005",
      approvedAction: "refine_definition",
      requestedBy: "research_reviewer_1",
      requestedAt: "2026-04-26T12:05:00.000Z",
      refinementRationaleSummary: "Need refinement follow-up.",
      requestedChangesSummary: "Adjust measurable conditions."
    },
    metadata
  );

  assert.equal(result.status, "rejected_validation");
  assert.equal(result.reason?.includes("setup_definition not found"), true);
});

test("refinement request result shape stays explicit", async () => {
  const { refinementHandoff } = createFixture();

  const result = await refinementHandoff.create(
    {
      researchDecisionApprovalId: "",
      researchFeedbackDecisionId: "feedback-refinement-006",
      setupDefinitionId: "setup-refinement-006",
      approvedAction: "refine_definition",
      requestedBy: "research_reviewer_1",
      requestedAt: "2026-04-26T12:05:00.000Z",
      refinementRationaleSummary: "Need refinement follow-up.",
      requestedChangesSummary: "Adjust measurable conditions."
    },
    metadata
  );

  assert.equal(result.status, "rejected_validation");
  assert.equal(Array.isArray(result.warnings), true);
  assert.equal(typeof result.reason, "string");
});
