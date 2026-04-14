import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryResearchDecisionApprovalRepository,
  InMemorySetupDefinitionRepository,
  InMemorySetupLifecycleMutationRecordRepository,
  createApprovedSetupLifecycleMutationHandoff,
  createSetupDefinitionService,
  type ProductRecordMetadata,
  type ResearchDecisionApproval,
  type SetupDefinition
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-setup-mutation",
  originTransitionId: "transition-setup-mutation",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-setup-mutation",
  sourceObservedAtUtc: "2026-04-25T12:00:00.000Z"
};

const buildSetupDefinition = (
  id: string,
  status: SetupDefinition["status"] = "active"
): SetupDefinition => ({
  id,
  name: "Setup mutation test",
  description: "Setup for approved lifecycle mutation tests",
  status,
  measurableConditions: ["close above range high"],
  evaluationAssumptions: ["fixed 24h evaluation"],
  invalidationAssumptions: ["invalidate on immediate breakdown"],
  createdAt: "2026-04-25T10:00:00.000Z",
  updatedAt: "2026-04-25T10:00:00.000Z"
});

const buildApproval = (
  id: string,
  setupDefinitionId: string,
  researchFeedbackDecisionId: string,
  approvalOutcome: ResearchDecisionApproval["approvalOutcome"] = "approved",
  authorizedNextAction: ResearchDecisionApproval["authorizedNextAction"] = "pause_setup"
): ResearchDecisionApproval => ({
  id,
  researchFeedbackDecisionId,
  setupDefinitionId,
  reviewedBy: "research_reviewer_1",
  reviewedAt: "2026-04-25T11:00:00.000Z",
  approvalOutcome,
  reviewerNotes: "manual approval decision",
  approvalStatus: "recorded",
  authorizedNextAction,
  createdAt: "2026-04-25T11:00:00.000Z",
  updatedAt: "2026-04-25T11:00:00.000Z"
});

const createFixture = () => {
  const setupDefinitionRepository = new InMemorySetupDefinitionRepository();
  const researchDecisionApprovalRepository = new InMemoryResearchDecisionApprovalRepository();
  const setupLifecycleMutationRecordRepository = new InMemorySetupLifecycleMutationRecordRepository();

  const setupDefinitionService = createSetupDefinitionService({
    setupDefinitionRepository,
    researchDecisionApprovalRepository,
    setupLifecycleMutationRecordRepository
  });

  const approvedMutationHandoff = createApprovedSetupLifecycleMutationHandoff({
    setupDefinitionService,
    researchDecisionApprovalRepository,
    setupDefinitionRepository
  });

  return {
    setupDefinitionRepository,
    researchDecisionApprovalRepository,
    setupLifecycleMutationRecordRepository,
    approvedMutationHandoff
  };
};

test("valid approved mutation command shape", async () => {
  const {
    setupDefinitionRepository,
    researchDecisionApprovalRepository,
    setupLifecycleMutationRecordRepository,
    approvedMutationHandoff
  } = createFixture();

  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-mutation-001", "active"),
    metadata
  });
  await researchDecisionApprovalRepository.create({
    approval: buildApproval(
      "approval-mutation-001",
      "setup-mutation-001",
      "feedback-mutation-001",
      "approved",
      "pause_setup"
    ),
    metadata
  });

  const result = await approvedMutationHandoff.apply(
    {
      researchDecisionApprovalId: "approval-mutation-001",
      researchFeedbackDecisionId: "feedback-mutation-001",
      setupDefinitionId: "setup-mutation-001",
      approvedAction: "pause_setup",
      mutatedBy: "setup_operator_1",
      mutatedAt: "2026-04-25T12:05:00.000Z"
    },
    metadata
  );

  assert.equal(result.status, "applied");
  assert.equal(result.previousStatus, "active");
  assert.equal(result.newStatus, "paused");

  const setup = await setupDefinitionRepository.getById("setup-mutation-001");
  assert.equal(setup?.status, "paused");

  const records = await setupLifecycleMutationRecordRepository.listByApprovalId("approval-mutation-001");
  assert.equal(records.length, 1);
  assert.equal(records[0]?.newStatus, "paused");
  assert.equal(records[0]?.approvedAction, "pause_setup");
});

test("missing approval rejected", async () => {
  const { setupDefinitionRepository, approvedMutationHandoff } = createFixture();

  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-mutation-002", "active"),
    metadata
  });

  const result = await approvedMutationHandoff.apply(
    {
      researchDecisionApprovalId: "approval-missing",
      researchFeedbackDecisionId: "feedback-mutation-002",
      setupDefinitionId: "setup-mutation-002",
      approvedAction: "pause_setup",
      mutatedBy: "setup_operator_1",
      mutatedAt: "2026-04-25T12:05:00.000Z"
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
    approvedMutationHandoff
  } = createFixture();

  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-mutation-003", "active"),
    metadata
  });
  await researchDecisionApprovalRepository.create({
    approval: buildApproval(
      "approval-mutation-003",
      "setup-mutation-003",
      "feedback-mutation-003",
      "rejected",
      undefined
    ),
    metadata
  });

  const result = await approvedMutationHandoff.apply(
    {
      researchDecisionApprovalId: "approval-mutation-003",
      researchFeedbackDecisionId: "feedback-mutation-003",
      setupDefinitionId: "setup-mutation-003",
      approvedAction: "pause_setup",
      mutatedBy: "setup_operator_1",
      mutatedAt: "2026-04-25T12:05:00.000Z"
    },
    metadata
  );

  assert.equal(result.status, "rejected_lifecycle");
  assert.equal(result.reason?.includes("does not authorize setup lifecycle mutation"), true);
});

test("invalid status transition rejected", async () => {
  const {
    setupDefinitionRepository,
    researchDecisionApprovalRepository,
    approvedMutationHandoff
  } = createFixture();

  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-mutation-004", "draft"),
    metadata
  });
  await researchDecisionApprovalRepository.create({
    approval: buildApproval(
      "approval-mutation-004",
      "setup-mutation-004",
      "feedback-mutation-004",
      "approved",
      "pause_setup"
    ),
    metadata
  });

  const result = await approvedMutationHandoff.apply(
    {
      researchDecisionApprovalId: "approval-mutation-004",
      researchFeedbackDecisionId: "feedback-mutation-004",
      setupDefinitionId: "setup-mutation-004",
      approvedAction: "pause_setup",
      mutatedBy: "setup_operator_1",
      mutatedAt: "2026-04-25T12:05:00.000Z"
    },
    metadata
  );

  assert.equal(result.status, "rejected_validation");
  assert.equal(result.reason?.includes("invalid setup_definition status transition"), true);
});

test("mutation result shape stays explicit", async () => {
  const { approvedMutationHandoff } = createFixture();

  const result = await approvedMutationHandoff.apply(
    {
      researchDecisionApprovalId: "",
      researchFeedbackDecisionId: "feedback-mutation-005",
      setupDefinitionId: "setup-mutation-005",
      approvedAction: "keep_active",
      mutatedBy: "setup_operator_1",
      mutatedAt: "2026-04-25T12:05:00.000Z"
    },
    metadata
  );

  assert.equal(result.status, "rejected_validation");
  assert.equal(Array.isArray(result.warnings), true);
  assert.equal(typeof result.reason, "string");
});

test("audit record shape stays explicit", async () => {
  const {
    setupDefinitionRepository,
    researchDecisionApprovalRepository,
    setupLifecycleMutationRecordRepository,
    approvedMutationHandoff
  } = createFixture();

  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-mutation-006", "draft"),
    metadata
  });
  await researchDecisionApprovalRepository.create({
    approval: buildApproval(
      "approval-mutation-006",
      "setup-mutation-006",
      "feedback-mutation-006",
      "approved",
      "keep_active"
    ),
    metadata
  });

  const result = await approvedMutationHandoff.apply(
    {
      researchDecisionApprovalId: "approval-mutation-006",
      researchFeedbackDecisionId: "feedback-mutation-006",
      setupDefinitionId: "setup-mutation-006",
      approvedAction: "keep_active",
      mutatedBy: "setup_operator_2",
      mutatedAt: "2026-04-25T12:06:00.000Z",
      notes: "activate setup after approved decision"
    },
    metadata
  );

  assert.equal(result.status, "applied");
  const records = await setupLifecycleMutationRecordRepository.listBySetupDefinitionId(
    "setup-mutation-006"
  );
  assert.equal(records.length, 1);
  const record = records[0];
  assert.equal(record?.researchDecisionApprovalId, "approval-mutation-006");
  assert.equal(record?.researchFeedbackDecisionId, "feedback-mutation-006");
  assert.equal(record?.previousStatus, "draft");
  assert.equal(record?.newStatus, "active");
  assert.equal(record?.mutatedBy, "setup_operator_2");
});
