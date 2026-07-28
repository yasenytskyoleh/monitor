import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Client } from "pg";

import {
  createImplementedProductRelationalPrismaRepositories,
  createExecutionAttemptRuntimeFromRepositories,
  createSetupToAggregateFlowFromRepositories,
  type EvaluationTerminalization,
  type ExecutionAttemptAudit,
  type EvaluationResult,
  type ImplementedProductRelationalPrismaRepositories,
  type MonitoredSymbol,
  type ProductRecordMetadata,
  RepositoryError,
  type ResearchDecisionApproval,
  type ResearchFeedbackDecision,
  type ResearchHypothesis,
  type ResearchReviewDecision,
  type ResearchRun,
  type ReviewDecisionRoutingResult,
  type RoutedActionExecutionEnvelope,
  type SetupAggregateResult,
  type SetupDefinition,
  type SetupDefinitionRevision,
  type SetupRevisionActivationRecord,
  type SetupRefinementRequest,
  type SetupLifecycleMutationRecord,
  type SetupToAggregateFlowInput,
  type SignalCandidate
} from "../src/index.js";
import { resolveIntegrationDatabaseUrl } from "./integration-test-helpers.js";

const INTEGRATION_DATABASE_URL = resolveIntegrationDatabaseUrl(
  process.env.PRODUCT_DOMAIN_INTEGRATION_DATABASE_URL
);
const PRODUCT_DOMAIN_SCHEMA = "product_domain";
const migrationsDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../prisma/migrations"
);
const migrationSqlPaths = [
  resolve(migrationsDirectory, "20260512235500_product_domain_relational_v1_init/migration.sql"),
  resolve(
    migrationsDirectory,
    "20260522101500_product_domain_signal_evaluation_relational_v1/migration.sql"
  ),
  resolve(
    migrationsDirectory,
    "20260522153000_product_domain_setup_aggregate_relational_v1/migration.sql"
  ),
  resolve(
    migrationsDirectory,
    "20260523091500_product_domain_research_feedback_decision_relational_v1/migration.sql"
  ),
  resolve(
    migrationsDirectory,
    "20260527103000_product_domain_research_decision_approval_relational_v1/migration.sql"
  ),
  resolve(
    migrationsDirectory,
    "20260630113000_product_domain_research_review_decision_relational_v1/migration.sql"
  ),
  resolve(
    migrationsDirectory,
    "20260702103000_product_domain_routed_action_execution_envelope_relational_v1/migration.sql"
  ),
  resolve(
    migrationsDirectory,
    "20260706113000_product_domain_setup_lifecycle_mutation_record_relational_v1/migration.sql"
  ),
  resolve(
    migrationsDirectory,
    "20260706143000_product_domain_setup_refinement_request_relational_v1/migration.sql"
  ),
  resolve(
    migrationsDirectory,
    "20260708101500_product_domain_setup_definition_revision_relational_v1/migration.sql"
  ),
  resolve(
    migrationsDirectory,
    "20260711103000_product_domain_setup_revision_activation_record_relational_v1/migration.sql"
  ),
  resolve(
    migrationsDirectory,
    "20260723103000_product_domain_review_decision_routing_result_relational_v1/migration.sql"
  ),
  resolve(
    migrationsDirectory,
    "20260724103000_product_domain_monitored_symbol_relational_v1/migration.sql"
  ),
  resolve(
    migrationsDirectory,
    "20260727103000_product_domain_research_run_relational_v1/migration.sql"
  ),
  resolve(
    migrationsDirectory,
    "20260727130000_product_domain_execution_attempt_audit_relational_v1/migration.sql"
  ),
  resolve(
    migrationsDirectory,
    "20260728100000_product_domain_execution_attempt_envelope_single_dispatch_v1/migration.sql"
  )
];

const metadata: ProductRecordMetadata = {
  originRunId: "run-002",
  originTransitionId: "transition-002",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-002",
  sourceObservedAtUtc: "2026-05-23T09:00:00.000Z"
};

const buildSetupDefinition = (id: string): SetupDefinition => ({
  id,
  name: "Breakout Retest",
  description: "Retest after breakout with continuation bias.",
  status: "active",
  measurableConditions: ["4h close above range high"],
  evaluationAssumptions: ["evaluate over fixed 24h window"],
  invalidationAssumptions: ["invalidate on failed retest"],
  createdAt: "2026-05-23T08:00:00.000Z",
  updatedAt: "2026-05-23T09:00:00.000Z"
});

const buildResearchHypothesis = (id: string, setupDefinitionId: string): ResearchHypothesis => ({
  id,
  title: "Breakout retests outperform random entries",
  description: "Structured breakout retests should show positive asymmetry.",
  relatedSetupDefinitionIds: [setupDefinitionId],
  assumptions: ["median MFE exceeds median MAE over 50 samples"],
  notes: [],
  status: "active",
  createdAt: "2026-05-23T08:00:00.000Z",
  updatedAt: "2026-05-23T09:00:00.000Z"
});

const buildResearchRun = (runId: string, hypothesisId: string, setupId: string): ResearchRun => ({
  runId,
  hypothesisId,
  setupId,
  candidateIds: ["candidate-001"],
  evaluationWindowIds: ["window-24h"],
  evaluationResultIds: ["result-001"],
  status: "running",
  startedAtUtc: "2026-05-24T09:30:00.000Z",
  createdAtUtc: "2026-05-24T09:30:00.000Z",
  updatedAtUtc: "2026-05-24T09:30:00.000Z"
});

const buildSignalCandidate = (id: string, setupDefinitionId: string): SignalCandidate => ({
  id,
  setupDefinitionId,
  setupRevisionId: `${setupDefinitionId}-rev-001`,
  monitoredSymbolId: "BTC-USDT",
  status: "evaluated",
  detectedAt: "2026-05-23T09:30:00.000Z",
  evidenceSummary: "Breakout retest candidate",
  createdAt: "2026-05-23T09:30:00.000Z",
  updatedAt: "2026-05-23T09:30:00.000Z"
});

const buildMonitoredSymbol = (): MonitoredSymbol => ({
  symbolId: "BTC-USDT",
  baseAsset: "BTC",
  quoteAsset: "USDT",
  displayName: "BTC/USDT",
  marketScope: "spot",
  status: "active",
  providerHint: "unknown",
  tags: ["primary"],
  sourceBindings: [],
  createdAtUtc: "2026-05-23T09:00:00.000Z",
  updatedAtUtc: "2026-05-23T09:00:00.000Z"
});

const buildEvaluationResult = (id: string, signalCandidateId: string): EvaluationResult => ({
  id,
  signalCandidateId,
  evaluationWindowId: "window-24h",
  status: "completed",
  referencePrice: 100,
  finalPrice: 103,
  highInWindow: 104,
  lowInWindow: 99,
  absoluteMove: 3,
  percentageMove: 3,
  maxFavorableExcursion: 4,
  maxAdverseExcursion: -1,
  evaluatedAt: "2026-05-24T09:30:00.000Z",
  createdAt: "2026-05-24T09:30:00.000Z",
  updatedAt: "2026-05-24T09:30:00.000Z"
});

const buildAggregate = (
  id: string,
  setupDefinitionId: string,
  researchHypothesisId: string
): SetupAggregateResult => ({
  id,
  setupDefinitionId,
  researchHypothesisId,
  aggregationScope: {
    setupDefinitionId,
    evaluationWindowId: "window-24h",
    symbolScope: {
      kind: "single_symbol",
      symbolIds: ["BTC-USDT"]
    },
    timeRange: {
      startAtUtc: "2026-05-01T00:00:00.000Z",
      endAtUtc: "2026-05-31T23:59:59.000Z"
    },
    researchRunId: "run-aggregate-002",
    hypothesisId: researchHypothesisId
  },
  status: "completed",
  totalCandidates: 1,
  completedEvaluations: 1,
  invalidatedEvaluations: 0,
  averagePercentageMove: 3,
  averageAbsoluteMove: 3,
  averageFinalOutcome: 1,
  averageMaxFavorableExcursion: 4,
  averageMaxAdverseExcursion: -1,
  positiveOutcomeCount: 1,
  computedAt: "2026-05-24T10:00:00.000Z",
  notes: "shared bundle integration test",
  createdAt: "2026-05-24T10:00:00.000Z",
  updatedAt: "2026-05-24T10:00:00.000Z"
});

const buildApplicationFlowInput = (
  terminalization?: EvaluationTerminalization
): SetupToAggregateFlowInput => {
  const setupDefinition = buildSetupDefinition("setup-flow-001");
  const researchHypothesis = {
    ...buildResearchHypothesis("hypothesis-flow-001", setupDefinition.id),
    relatedSetupDefinitionIds: []
  };
  const signalCandidate = {
    ...buildSignalCandidate("candidate-flow-001", setupDefinition.id),
    status: "detected" as const
  };
  const pendingResult = {
    ...buildEvaluationResult("result-flow-001", signalCandidate.id),
    status: "pending" as const,
    referencePrice: null,
    finalPrice: null,
    highInWindow: null,
    lowInWindow: null,
    absoluteMove: null,
    percentageMove: null,
    maxFavorableExcursion: null,
    maxAdverseExcursion: null,
    evaluatedAt: null
  };

  const evaluation: SetupToAggregateFlowInput["evaluation"] = terminalization
    ? {
        pendingResult,
        terminalization
      }
    : {
        pendingResult,
        finalization: {
          referencePrice: 100,
          finalPrice: 103,
          highInWindow: 104,
          lowInWindow: 99,
          maxFavorableExcursion: 4,
          maxAdverseExcursion: -1,
          evaluatedAt: "2026-05-24T10:00:00.000Z"
        }
      };

  return {
    setupDefinition,
    researchHypothesis,
    monitoredSymbol: buildMonitoredSymbol(),
    signalCandidate,
    evaluation,
    researchRun: {
      run: {
        runId: "research-run-flow-001",
        hypothesisId: researchHypothesis.id,
        setupId: setupDefinition.id,
        candidateIds: [signalCandidate.id],
        evaluationWindowIds: [pendingResult.evaluationWindowId],
        evaluationResultIds: [],
        status: "planned",
        startedAtUtc: "2026-05-23T08:30:00.000Z",
        createdAtUtc: "2026-05-23T08:30:00.000Z",
        updatedAtUtc: "2026-05-23T08:30:00.000Z"
      },
      completion: {
        completedAtUtc: "2026-05-24T10:05:00.000Z",
        summary: "Real-Postgres application flow completed."
      }
    },
    aggregation: {
      pendingAggregate: {
        id: "aggregate-flow-001",
        setupDefinitionId: setupDefinition.id,
        researchHypothesisId: researchHypothesis.id,
        aggregationScope: {
          setupDefinitionId: setupDefinition.id,
          evaluationWindowId: pendingResult.evaluationWindowId,
          symbolScope: {
            kind: "single_symbol",
            symbolIds: [signalCandidate.monitoredSymbolId]
          },
          timeRange: {
            startAtUtc: "2026-05-01T00:00:00.000Z",
            endAtUtc: "2026-05-31T23:59:59.000Z"
          },
          researchRunId: "research-run-flow-001",
          hypothesisId: researchHypothesis.id
        },
        status: "pending",
        totalCandidates: 0,
        completedEvaluations: 0,
        invalidatedEvaluations: 0,
        averagePercentageMove: null,
        averageAbsoluteMove: null,
        averageFinalOutcome: null,
        averageMaxFavorableExcursion: null,
        averageMaxAdverseExcursion: null,
        positiveOutcomeCount: 0,
        computedAt: null,
        createdAt: "2026-05-24T10:05:00.000Z",
        updatedAt: "2026-05-24T10:05:00.000Z"
      },
      recomputeEvaluationResultIds: [pendingResult.id]
    },
    metadata: {
      ...metadata,
      sourceObservedAtUtc: "2026-05-24T10:05:00.000Z"
    }
  };
};

const buildFeedbackDecision = (
  id: string,
  setupDefinitionId: string,
  researchHypothesisId: string,
  setupAggregateResultId: string,
  recommendedAction: ResearchFeedbackDecision["recommendedAction"] = "keep_active"
): ResearchFeedbackDecision => ({
  id,
  setupDefinitionId,
  researchHypothesisId,
  setupAggregateResultId,
  evidenceStatus: "supports",
  recommendedAction,
  rationaleSummary: "aggregate evidence supports the selected follow-up action",
  decisionStatus: "proposed",
  requiresManualReview: true,
  evidenceSummary: "shared bundle integration feedback decision",
  createdAt: "2026-05-24T10:15:00.000Z",
  updatedAt: "2026-05-24T10:15:00.000Z"
});

const buildApproval = (
  id: string,
  researchFeedbackDecisionId: string,
  setupDefinitionId: string,
  authorizedNextAction: ResearchDecisionApproval["authorizedNextAction"] = "keep_active"
): ResearchDecisionApproval => ({
  id,
  researchFeedbackDecisionId,
  setupDefinitionId,
  reviewedBy: "reviewer-001",
  reviewedAt: "2026-05-24T10:35:00.000Z",
  approvalOutcome: "approved",
  reviewerNotes: "Approved in shared integration test.",
  approvalStatus: "recorded",
  authorizedNextAction,
  createdAt: "2026-05-24T10:35:00.000Z",
  updatedAt: "2026-05-24T10:35:00.000Z"
});

const buildReviewDecision = (
  id: string,
  researchHypothesisId: string
): ResearchReviewDecision => ({
  id,
  researchReviewPacketId: "review-packet-001",
  setupFamilyId: "setup-family-001",
  setupRevisionId: "setup-family-001-v2",
  researchHypothesisId,
  reviewedBy: "reviewer-001",
  reviewedAt: "2026-05-24T10:45:00.000Z",
  decisionOutcome: "accepted",
  reviewerNotes: "Review confirms the current setup family revision should stay active.",
  authorizedNextAction: "prepare_lifecycle_mutation_follow_up",
  decisionStatus: "recorded",
  createdAt: "2026-05-24T10:45:00.000Z",
  updatedAt: "2026-05-24T10:45:00.000Z"
});

const buildRoutingResult = (
  routingId: string,
  researchReviewDecisionId: string
): ReviewDecisionRoutingResult => ({
  status: "routed",
  routingId,
  researchReviewDecisionId,
  setupFamilyId: "setup-family-001",
  setupRevisionId: "setup-family-001-v2",
  decisionOutcome: "accepted",
  authorizedNextAction: "prepare_lifecycle_mutation_follow_up",
  target: "apply_setup_lifecycle_mutation",
  downstreamCommandType: "ApplyApprovedSetupMutationCommand",
  routedAt: "2026-05-24T10:50:00.000Z",
  warnings: []
});

const buildEnvelope = (
  id: string,
  sourceReviewDecisionId: string
): RoutedActionExecutionEnvelope => ({
  id,
  sourceRoutingResultId: "routing-result-001",
  sourceReviewDecisionId,
  actionTarget: "apply_setup_lifecycle_mutation",
  actionCommandType: "ApplyApprovedSetupMutationCommand",
  targetEntityRefs: {
    setupFamilyId: "setup-family-001",
    setupDefinitionId: "setup-001",
    researchDecisionApprovalId: "approval-001"
  },
  routeMetadataSnapshot: {
    routeStatus: "routed",
    routedAt: "2026-05-24T10:50:00.000Z",
    decisionOutcome: "accepted",
    authorizedNextAction: "prepare_lifecycle_mutation_follow_up",
    downstreamCommandType: "ApplyApprovedSetupMutationCommand"
  },
  executionPayloadSnapshot: {
    commandType: "ApplyApprovedSetupMutationCommand",
    target: "apply_setup_lifecycle_mutation",
    commandInput: {
      setupDefinitionId: "setup-001",
      setupFamilyId: "setup-family-001",
      sourceReviewDecisionId,
      sourceRoutingResultId: "routing-result-001"
    }
  },
  executionStatus: "prepared",
  preparedBy: "review-operator-001",
  preparedAt: "2026-05-24T10:55:00.000Z",
  notes: "Prepared in shared integration test.",
  createdAt: "2026-05-24T10:55:00.000Z",
  updatedAt: "2026-05-24T10:55:00.000Z"
});

const buildMutation = (
  id: string,
  setupDefinitionId: string,
  researchDecisionApprovalId: string,
  researchFeedbackDecisionId: string
): SetupLifecycleMutationRecord => ({
  id,
  setupDefinitionId,
  researchDecisionApprovalId,
  researchFeedbackDecisionId,
  previousStatus: "active",
  newStatus: "paused",
  approvedAction: "pause_setup",
  mutatedBy: "reviewer-001",
  mutatedAt: "2026-05-24T11:00:00.000Z",
  notes: "Paused after approved downstream review.",
  createdAt: "2026-05-24T11:00:00.000Z",
  updatedAt: "2026-05-24T11:00:00.000Z"
});

const buildSetupRefinementRequest = (
  id: string,
  setupDefinitionId: string,
  sourceResearchDecisionApprovalId: string,
  sourceResearchFeedbackDecisionId: string
): SetupRefinementRequest => ({
  id,
  setupDefinitionId,
  sourceResearchDecisionApprovalId,
  sourceResearchFeedbackDecisionId,
  refinementRationaleSummary:
    "The setup remains valid but needs tighter refinement follow-up.",
  requestedChangesSummary:
    "Tighten invalidation logic and add reclaim-volume confirmation.",
  evidenceReferences: [sourceResearchFeedbackDecisionId, "aggregate-002"],
  status: "proposed",
  requestedBy: "research-service",
  requestedAt: "2026-05-24T11:10:00.000Z",
  assignedReviewerId: "reviewer-002",
  assignedOwnerId: "owner-002",
  createdAt: "2026-05-24T11:10:00.000Z",
  updatedAt: "2026-05-24T11:10:00.000Z"
});

const buildSetupDefinitionRevision = (
  id: string,
  setupDefinitionId: string,
  previousSetupDefinitionId: string,
  sourceSetupRefinementRequestId: string,
  sourceResearchDecisionApprovalId?: string,
  sourceResearchFeedbackDecisionId?: string
): SetupDefinitionRevision => ({
  id,
  setupDefinitionId,
  previousSetupDefinitionId,
  versionInfo: {
    setupFamilyId: "setup-family-002",
    revisionId: id,
    version: 2
  },
  revisionReason: "Tighten invalidation after approved refinement follow-up.",
  revisionStatus: "draft",
  changedFieldsSummary: "Updated measurable conditions and invalidation assumptions.",
  createdBy: "research-reviewer-002",
  createdAt: "2026-05-24T11:15:00.000Z",
  notes: "Prepared in shared integration test.",
  sourceSetupRefinementRequestId,
  ...(sourceResearchDecisionApprovalId
    ? { sourceResearchDecisionApprovalId }
    : {}),
  ...(sourceResearchFeedbackDecisionId
    ? { sourceResearchFeedbackDecisionId }
    : {}),
  updatedAt: "2026-05-24T11:15:00.000Z"
});

const buildSetupRevisionActivationRecord = (
  id: string,
  targetRevisionId: string,
  targetSetupDefinitionId: string
): SetupRevisionActivationRecord => ({
  id,
  setupFamilyId: "setup-family-002",
  targetRevisionId,
  targetSetupDefinitionId,
  activatedBy: "research-reviewer-002",
  activatedAt: "2026-05-24T11:20:00.000Z",
  activationOutcome: "activated",
  rationale: "Promote the accepted revision into the shared integration path.",
  createdAt: "2026-05-24T11:20:00.000Z",
  updatedAt: "2026-05-24T11:20:00.000Z"
});

const withPgClient = async <T>(connectionString: string, work: (client: Client) => Promise<T>): Promise<T> => {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    return await work(client);
  } finally {
    await client.end();
  }
};

const dropProductDomainSchema = async (connectionString: string): Promise<void> => {
  await withPgClient(connectionString, async (client) => {
    await client.query(`DROP SCHEMA IF EXISTS "${PRODUCT_DOMAIN_SCHEMA}" CASCADE`);
  });
};

const resetProductDomainSchema = async (connectionString: string): Promise<void> => {
  const migrationSqlList = await Promise.all(
    migrationSqlPaths.map((migrationSqlPath) => readFile(migrationSqlPath, "utf8"))
  );

  await withPgClient(connectionString, async (client) => {
    await client.query(`DROP SCHEMA IF EXISTS "${PRODUCT_DOMAIN_SCHEMA}" CASCADE`);
    for (const migrationSql of migrationSqlList) {
      await client.query(migrationSql);
    }
  });
};

const withIntegrationRepositories = async <T>(
  connectionString: string,
  work: (repositories: ImplementedProductRelationalPrismaRepositories) => Promise<T>
): Promise<T> => {
  await resetProductDomainSchema(connectionString);

  const repositories = createImplementedProductRelationalPrismaRepositories({
    connectionString
  });

  try {
    return await work(repositories);
  } finally {
    await repositories.disconnect();
    await dropProductDomainSchema(connectionString);
  }
};

const integrationTest = INTEGRATION_DATABASE_URL ? test : test.skip;

const assertTerminalApplicationFlowPersistence = async (
  terminalization: EvaluationTerminalization,
  expectedEvaluationStatus: "expired" | "invalidated"
): Promise<void> => {
  await withIntegrationRepositories(INTEGRATION_DATABASE_URL, async (repositories) => {
    const flow = createSetupToAggregateFlowFromRepositories(repositories);
    const result = await flow.run(buildApplicationFlowInput(terminalization));
    const storedEvaluation =
      await repositories.evaluationResultRepository.getBySignalCandidateAndWindow(
        "candidate-flow-001",
        "window-24h"
      );
    const storedRun = await repositories.researchRunRepository.getById(
      "research-run-flow-001"
    );
    const storedAggregate = await repositories.setupAggregateResultRepository.getById(
      "aggregate-flow-001"
    );
    const researchRunRow = await repositories.prismaClient.researchRunRecord.findUnique({
      where: { researchRunId: "research-run-flow-001" }
    });

    assert.equal(result.status, "completed");
    assert.equal(result.outcomes?.evaluationResultStatus, expectedEvaluationStatus);
    assert.equal(result.outcomes?.researchRunStatus, "completed");
    assert.equal(result.outcomes?.setupAggregateResultStatus, "invalid");
    assert.equal(storedEvaluation?.status, expectedEvaluationStatus);
    assert.equal(storedRun?.status, "completed");
    assert.deepEqual(storedRun?.evaluationResultIds, ["result-flow-001"]);
    assert.equal(storedAggregate?.status, "invalid");
    assert.equal(researchRunRow?.researchRunStatus, "completed");
    assert.deepEqual(researchRunRow?.evaluationResultIds, ["result-flow-001"]);
  });
};

integrationTest(
  "shared implemented-product bundle persists the monitored catalog and product flow against real Postgres",
  async () => {
    await withIntegrationRepositories(INTEGRATION_DATABASE_URL, async (repositories) => {
      await repositories.setupDefinitionRepository.create({
        definition: buildSetupDefinition("setup-001"),
        metadata
      });
      await repositories.researchHypothesisRepository.create({
        hypothesis: buildResearchHypothesis("hypothesis-001", "setup-001"),
        metadata
      });
      await repositories.monitoredSymbolRepository.create({
        symbol: buildMonitoredSymbol(),
        metadata
      });
      await repositories.signalCandidateRepository.create({
        candidate: buildSignalCandidate("candidate-001", "setup-001"),
        metadata
      });
      await repositories.evaluationResultRepository.create({
        result: buildEvaluationResult("result-001", "candidate-001"),
        metadata
      });
      await repositories.researchRunRepository.create({
        run: buildResearchRun("research-run-001", "hypothesis-001", "setup-001"),
        metadata
      });
      await repositories.setupAggregateResultRepository.create({
        aggregate: buildAggregate("aggregate-001", "setup-001", "hypothesis-001"),
        metadata
      });
      await repositories.researchFeedbackDecisionRepository.create({
        decision: buildFeedbackDecision(
          "feedback-001",
          "setup-001",
          "hypothesis-001",
          "aggregate-001"
        ),
        metadata
      });
      const approvalPersistenceResult =
        await repositories.feedbackDecisionApprovalReviewPersistence.recordFeedbackDecisionApproval({
          researchFeedbackDecisionId: "feedback-001",
          nextDecisionStatus: "accepted",
          reviewerMetadata: {
            reviewedBy: "reviewer-001",
            reviewedAt: "2026-05-24T10:30:00.000Z",
            approvalOutcome: "approved"
          },
          approval: buildApproval("approval-001", "feedback-001", "setup-001"),
          metadata: {
            ...metadata,
            sourceObservedAtUtc: "2026-05-24T10:35:00.000Z"
          }
        });

      assert.equal(approvalPersistenceResult.status, "recorded");
      if (approvalPersistenceResult.status !== "recorded") {
        assert.fail("approval persistence should have recorded the approval");
      }

      await repositories.researchReviewDecisionRepository.create({
        decision: buildReviewDecision("review-decision-001", "hypothesis-001"),
        metadata: {
          ...metadata,
          sourceObservedAtUtc: "2026-05-24T10:45:00.000Z"
        }
      });
      await repositories.reviewDecisionRoutingResultRepository.create({
        result: buildRoutingResult("routing-result-001", "review-decision-001"),
        metadata: {
          ...metadata,
          sourceObservedAtUtc: "2026-05-24T10:50:00.000Z"
        }
      });
      await repositories.routedActionExecutionEnvelopeRepository.create({
        envelope: buildEnvelope("execution-envelope-001", "review-decision-001"),
        metadata: {
          ...metadata,
          sourceObservedAtUtc: "2026-05-24T10:55:00.000Z"
        }
      });
      await repositories.setupLifecycleMutationRecordRepository.create({
        mutation: buildMutation("mutation-001", "setup-001", "approval-001", "feedback-001"),
        metadata: {
          ...metadata,
          sourceObservedAtUtc: "2026-05-24T11:00:00.000Z"
        }
      });
      await repositories.setupDefinitionRepository.create({
        definition: buildSetupDefinition("setup-002"),
        metadata
      });
      await repositories.researchHypothesisRepository.create({
        hypothesis: buildResearchHypothesis("hypothesis-002", "setup-002"),
        metadata
      });
      await repositories.setupAggregateResultRepository.create({
        aggregate: buildAggregate("aggregate-002", "setup-002", "hypothesis-002"),
        metadata
      });
      await repositories.researchFeedbackDecisionRepository.create({
        decision: buildFeedbackDecision(
          "feedback-002",
          "setup-002",
          "hypothesis-002",
          "aggregate-002",
          "refine_definition"
        ),
        metadata
      });
      const refinementApprovalPersistenceResult =
        await repositories.feedbackDecisionApprovalReviewPersistence.recordFeedbackDecisionApproval({
          researchFeedbackDecisionId: "feedback-002",
          nextDecisionStatus: "accepted",
          reviewerMetadata: {
            reviewedBy: "reviewer-002",
            reviewedAt: "2026-05-24T11:05:00.000Z",
            approvalOutcome: "approved"
          },
          approval: buildApproval(
            "approval-002",
            "feedback-002",
            "setup-002",
            "refine_definition"
          ),
          metadata: {
            ...metadata,
            sourceObservedAtUtc: "2026-05-24T11:05:00.000Z"
          }
        });

      assert.equal(refinementApprovalPersistenceResult.status, "recorded");
      if (refinementApprovalPersistenceResult.status !== "recorded") {
        assert.fail("refinement approval persistence should have recorded the approval");
      }

      await repositories.setupRefinementRequestRepository.create({
        request: buildSetupRefinementRequest(
          "refinement-001",
          "setup-002",
          "approval-002",
          "feedback-002"
        ),
        metadata: {
          ...metadata,
          sourceObservedAtUtc: "2026-05-24T11:10:00.000Z"
        }
      });
      await repositories.setupDefinitionRepository.create({
        definition: {
          ...buildSetupDefinition("setup-003"),
          status: "draft"
        },
        metadata
      });
      await repositories.setupDefinitionRevisionRepository.create({
        revision: buildSetupDefinitionRevision(
          "revision-001",
          "setup-003",
          "setup-002",
          "refinement-001",
          "approval-002",
          "feedback-002"
        ),
        metadata: {
          ...metadata,
          sourceObservedAtUtc: "2026-05-24T11:15:00.000Z"
        }
      });
      await repositories.setupRevisionActivationRecordRepository.create({
        activation: buildSetupRevisionActivationRecord(
          "activation-001",
          "revision-001",
          "setup-003"
        ),
        metadata: {
          ...metadata,
          sourceObservedAtUtc: "2026-05-24T11:20:00.000Z"
        }
      });

      const storedMonitoredSymbol = await repositories.monitoredSymbolRepository.getById(
        "BTC-USDT"
      );
      const storedCandidate = await repositories.signalCandidateRepository.getById("candidate-001");
      const storedEvaluation =
        await repositories.evaluationResultRepository.getBySignalCandidateAndWindow(
          "candidate-001",
          "window-24h"
        );
      const storedAggregate =
        await repositories.setupAggregateResultRepository.getBySetupDefinitionAndScope(
          "setup-001",
          buildAggregate("aggregate-001", "setup-001", "hypothesis-001").aggregationScope
        );
      const storedResearchRun = await repositories.researchRunRepository.getById(
        "research-run-001"
      );
      const storedFeedbackDecision =
        await repositories.researchFeedbackDecisionRepository.getById("feedback-001");
      const storedApproval =
        await repositories.researchDecisionApprovalRepository.getById("approval-001");
      const storedReviewDecision =
        await repositories.researchReviewDecisionRepository.getById("review-decision-001");
      const storedRoutingResult =
        await repositories.reviewDecisionRoutingResultRepository.getById("routing-result-001");
      const storedEnvelope =
        await repositories.routedActionExecutionEnvelopeRepository.getById(
          "execution-envelope-001"
        );
      const storedMutation =
        await repositories.setupLifecycleMutationRecordRepository.getById("mutation-001");
      const storedRefinementRequest =
        await repositories.setupRefinementRequestRepository.getById("refinement-001");
      const storedRevision =
        await repositories.setupDefinitionRevisionRepository.getById("revision-001");
      const storedActivation =
        await repositories.setupRevisionActivationRecordRepository.getById("activation-001");
      const envelopesForReviewDecision =
        await repositories.routedActionExecutionEnvelopeRepository.listByReviewDecisionId(
          "review-decision-001"
        );
      const mutationsForApproval =
        await repositories.setupLifecycleMutationRecordRepository.listByApprovalId("approval-001");
      const refinementRequestsForApproval =
        await repositories.setupRefinementRequestRepository.listByApprovalId("approval-002");
      const activationsForFamily =
        await repositories.setupRevisionActivationRecordRepository.listBySetupFamilyId(
          "setup-family-002"
        );
      const activationsForTarget =
        await repositories.setupRevisionActivationRecordRepository.listByTargetRevisionId(
          "revision-001"
        );
      const aggregateRows = await repositories.prismaClient.setupAggregateResultRecord.findMany({
        orderBy: { setupAggregateResultId: "asc" }
      });
      const feedbackDecisionRows =
        await repositories.prismaClient.researchFeedbackDecisionRecord.findMany({
          orderBy: { researchFeedbackDecisionId: "asc" }
        });
      const approvalRows = await repositories.prismaClient.researchDecisionApprovalRecord.findMany({
        orderBy: { researchDecisionApprovalId: "asc" }
      });
      const reviewDecisionRows =
        await repositories.prismaClient.researchReviewDecisionRecord.findMany({
          where: { researchReviewPacketId: "review-packet-001" },
          orderBy: { researchReviewDecisionId: "asc" }
        });
      const routingResultRows =
        await repositories.prismaClient.reviewDecisionRoutingResultRecord.findMany({
          where: { researchReviewDecisionId: "review-decision-001" },
          orderBy: { reviewDecisionRoutingResultId: "asc" }
        });
      const routedActionRows =
        await repositories.prismaClient.routedActionExecutionEnvelopeRecord.findMany({
          where: { sourceReviewDecisionId: "review-decision-001" },
          orderBy: { routedActionExecutionEnvelopeId: "asc" }
        });
      const setupLifecycleMutationRows =
        await repositories.prismaClient.setupLifecycleMutationRecordRecord.findMany({
          where: { researchDecisionApprovalId: "approval-001" },
          orderBy: { setupLifecycleMutationRecordId: "asc" }
        });
      const setupRefinementRequestRows =
        await repositories.prismaClient.setupRefinementRequestRecord.findMany({
          where: { sourceResearchDecisionApprovalId: "approval-002" },
          orderBy: { setupRefinementRequestId: "asc" }
        });
      const setupDefinitionRevisionRows =
        await repositories.prismaClient.setupDefinitionRevisionRecord.findMany({
          where: { setupFamilyId: "setup-family-002" },
          orderBy: { setupVersionNumber: "asc" }
        });
      const setupRevisionActivationRows =
        await repositories.prismaClient.setupRevisionActivationRecordRecord.findMany({
          where: { setupFamilyId: "setup-family-002" },
          orderBy: { activatedAtUtc: "asc" }
        });
      const monitoredSymbolRows = await repositories.prismaClient.monitoredSymbolRecord.findMany({
        where: { symbolStatus: "active" },
        orderBy: { monitoredSymbolId: "asc" }
      });
      const researchRunRows = await repositories.prismaClient.researchRunRecord.findMany({
        where: { hypothesisId: "hypothesis-001" },
        orderBy: { researchRunId: "asc" }
      });

      assert.equal(storedMonitoredSymbol?.displayName, "BTC/USDT");
      assert.equal(storedCandidate?.setupDefinitionId, "setup-001");
      assert.equal(storedEvaluation?.id, "result-001");
      assert.equal(storedResearchRun?.setupId, "setup-001");
      assert.equal(storedAggregate?.status, "completed");
      assert.equal(approvalPersistenceResult.decision.decisionStatus, "accepted");
      assert.equal(storedFeedbackDecision?.reviewerMetadata?.reviewedBy, "reviewer-001");
      assert.equal(approvalPersistenceResult.approval.approvalOutcome, "approved");
      assert.equal(storedApproval?.authorizedNextAction, "keep_active");
      assert.equal(storedReviewDecision?.researchHypothesisId, "hypothesis-001");
      assert.equal(
        storedReviewDecision?.authorizedNextAction,
        "prepare_lifecycle_mutation_follow_up"
      );
      assert.equal(storedRoutingResult?.researchReviewDecisionId, "review-decision-001");
      assert.equal(
        storedRoutingResult?.downstreamCommandType,
        "ApplyApprovedSetupMutationCommand"
      );
      assert.equal(storedEnvelope?.sourceReviewDecisionId, "review-decision-001");
      assert.equal(
        storedEnvelope?.actionCommandType,
        "ApplyApprovedSetupMutationCommand"
      );
      assert.equal(storedMutation?.researchDecisionApprovalId, "approval-001");
      assert.equal(storedMutation?.researchFeedbackDecisionId, "feedback-001");
      assert.equal(storedMutation?.newStatus, "paused");
      assert.equal(refinementApprovalPersistenceResult.approval.authorizedNextAction, "refine_definition");
      assert.equal(storedRefinementRequest?.setupDefinitionId, "setup-002");
      assert.equal(
        storedRefinementRequest?.sourceResearchDecisionApprovalId,
        "approval-002"
      );
      assert.equal(storedRefinementRequest?.assignedOwnerId, "owner-002");
      assert.equal(storedRevision?.setupDefinitionId, "setup-003");
      assert.equal(storedRevision?.previousSetupDefinitionId, "setup-002");
      assert.equal(storedRevision?.sourceSetupRefinementRequestId, "refinement-001");
      assert.equal(storedActivation?.targetRevisionId, "revision-001");
      assert.equal(storedActivation?.targetSetupDefinitionId, "setup-003");
      assert.equal(storedActivation?.activationOutcome, "activated");
      assert.equal(envelopesForReviewDecision.length, 1);
      assert.equal(
        envelopesForReviewDecision[0]?.routeMetadataSnapshot.authorizedNextAction,
        "prepare_lifecycle_mutation_follow_up"
      );
      assert.equal(mutationsForApproval.length, 1);
      assert.equal(mutationsForApproval[0]?.previousStatus, "active");
      assert.equal(refinementRequestsForApproval.length, 1);
      assert.equal(
        refinementRequestsForApproval[0]?.sourceResearchFeedbackDecisionId,
        "feedback-002"
      );
      assert.equal(activationsForFamily.length, 1);
      assert.equal(activationsForFamily[0]?.id, "activation-001");
      assert.equal(activationsForTarget.length, 1);
      assert.equal(monitoredSymbolRows.length, 1);
      assert.equal(monitoredSymbolRows[0]?.baseAsset, "BTC");
      assert.equal(researchRunRows.length, 1);
      assert.equal(researchRunRows[0]?.researchRunStatus, "running");
      assert.equal(activationsForTarget[0]?.setupFamilyId, "setup-family-002");
      assert.equal(aggregateRows.length, 2);
      assert.equal(aggregateRows[0]?.completedEvaluations, 1);
      assert.equal(aggregateRows[1]?.setupDefinitionId, "setup-002");
      assert.equal(feedbackDecisionRows.length, 2);
      assert.equal(feedbackDecisionRows[0]?.decisionStatus, "accepted");
      assert.equal(feedbackDecisionRows[1]?.recommendedAction, "refine_definition");
      assert.equal(approvalRows.length, 2);
      assert.equal(approvalRows[0]?.researchFeedbackDecisionId, "feedback-001");
      assert.equal(approvalRows[0]?.authorizedNextAction, "keep_active");
      assert.equal(approvalRows[1]?.researchFeedbackDecisionId, "feedback-002");
      assert.equal(approvalRows[1]?.authorizedNextAction, "refine_definition");
      assert.equal(reviewDecisionRows.length, 1);
      assert.equal(reviewDecisionRows[0]?.researchHypothesisId, "hypothesis-001");
      assert.equal(
        reviewDecisionRows[0]?.authorizedNextAction,
        "prepare_lifecycle_mutation_follow_up"
      );
      assert.equal(routingResultRows.length, 1);
      assert.equal(
        routingResultRows[0]?.downstreamCommandType,
        "ApplyApprovedSetupMutationCommand"
      );
      assert.equal(routedActionRows.length, 1);
      assert.equal(routedActionRows[0]?.sourceReviewDecisionId, "review-decision-001");
      assert.equal(
        routedActionRows[0]?.actionCommandType,
        "ApplyApprovedSetupMutationCommand"
      );
      assert.equal(setupLifecycleMutationRows.length, 1);
      assert.equal(setupLifecycleMutationRows[0]?.setupDefinitionId, "setup-001");
      assert.equal(setupLifecycleMutationRows[0]?.newStatus, "paused");
      assert.equal(setupRefinementRequestRows.length, 1);
      assert.equal(setupRefinementRequestRows[0]?.setupDefinitionId, "setup-002");
      assert.deepEqual(setupRefinementRequestRows[0]?.evidenceReferences, [
        "feedback-002",
        "aggregate-002"
      ]);
      assert.equal(setupDefinitionRevisionRows.length, 1);
      assert.equal(setupDefinitionRevisionRows[0]?.setupDefinitionId, "setup-003");
      assert.equal(
        setupDefinitionRevisionRows[0]?.sourceSetupRefinementRequestId,
        "refinement-001"
      );
      assert.equal(setupRevisionActivationRows.length, 1);
      assert.equal(setupRevisionActivationRows[0]?.targetRevisionId, "revision-001");
      assert.equal(
        setupRevisionActivationRows[0]?.targetSetupDefinitionId,
        "setup-003"
      );
    });
  }
);

integrationTest(
  "repository-composed application flow persists a completed research run before aggregation against real Postgres",
  async () => {
    await withIntegrationRepositories(INTEGRATION_DATABASE_URL, async (repositories) => {
      const flow = createSetupToAggregateFlowFromRepositories(repositories);
      const result = await flow.run(buildApplicationFlowInput());
      const storedRun = await repositories.researchRunRepository.getById(
        "research-run-flow-001"
      );
      const storedAggregate = await repositories.setupAggregateResultRepository.getById(
        "aggregate-flow-001"
      );
      const researchRunRow = await repositories.prismaClient.researchRunRecord.findUnique({
        where: { researchRunId: "research-run-flow-001" }
      });

      assert.equal(result.status, "completed");
      assert.equal(storedRun?.status, "completed");
      assert.deepEqual(storedRun?.evaluationResultIds, ["result-flow-001"]);
      assert.equal(storedAggregate?.status, "completed");
      assert.equal(researchRunRow?.researchRunStatus, "completed");
      assert.deepEqual(researchRunRow?.evaluationResultIds, ["result-flow-001"]);
    });
  }
);

integrationTest(
  "repository-composed application flow persists invalidated research-run evidence against real Postgres",
  async () => {
    await assertTerminalApplicationFlowPersistence(
      {
        kind: "invalidate",
        notes: "Invalidated through real-Postgres application flow coverage."
      },
      "invalidated"
    );
  }
);

integrationTest(
  "repository-composed application flow persists expired research-run evidence against real Postgres",
  async () => {
    await assertTerminalApplicationFlowPersistence({ kind: "expire" }, "expired");
  }
);

integrationTest(
  "shared implemented-product bundle maps invalid setup-definition-revision refinement linkage from real Postgres",
  async () => {
    await withIntegrationRepositories(INTEGRATION_DATABASE_URL, async (repositories) => {
      await repositories.setupDefinitionRepository.create({
        definition: buildSetupDefinition("setup-002"),
        metadata
      });
      await repositories.setupDefinitionRepository.create({
        definition: {
          ...buildSetupDefinition("setup-003"),
          status: "draft"
        },
        metadata
      });

      await assert.rejects(
        async () =>
          repositories.setupDefinitionRevisionRepository.create({
            revision: buildSetupDefinitionRevision(
              "revision-missing-request",
              "setup-003",
              "setup-002",
              "refinement-missing"
            ),
            metadata
          }),
        (error: unknown) =>
          error instanceof RepositoryError &&
          error.code === "invalid_reference" &&
          error.entityType === "setup_definition_revision" &&
          error.referenceEntityType === "setup_refinement_request" &&
          error.referenceEntityId === "refinement-missing"
      );
    });
  }
);

integrationTest(
  "shared implemented-product bundle maps invalid setup-revision activation target-revision linkage from real Postgres",
  async () => {
    await withIntegrationRepositories(INTEGRATION_DATABASE_URL, async (repositories) => {
      await repositories.setupDefinitionRepository.create({
        definition: {
          ...buildSetupDefinition("setup-003"),
          status: "draft"
        },
        metadata
      });

      await assert.rejects(
        async () =>
          repositories.setupRevisionActivationRecordRepository.create({
            activation: buildSetupRevisionActivationRecord(
              "activation-missing-revision",
              "revision-missing",
              "setup-003"
            ),
            metadata
          }),
        (error: unknown) =>
          error instanceof RepositoryError &&
          error.code === "invalid_reference" &&
          error.entityType === "setup_revision_activation_record" &&
          error.referenceEntityType === "setup_definition_revision" &&
          error.referenceEntityId === "revision-missing"
      );
    });
  }
);

integrationTest(
  "shared implemented-product bundle maps invalid review-decision hypothesis linkage from real Postgres",
  async () => {
    await withIntegrationRepositories(INTEGRATION_DATABASE_URL, async (repositories) => {
      await repositories.setupDefinitionRepository.create({
        definition: buildSetupDefinition("setup-001"),
        metadata
      });
      await repositories.setupDefinitionRepository.create({
        definition: buildSetupDefinition("setup-002"),
        metadata
      });
      await repositories.researchHypothesisRepository.create({
        hypothesis: buildResearchHypothesis("hypothesis-001", "setup-001"),
        metadata
      });
      await repositories.setupAggregateResultRepository.create({
        aggregate: buildAggregate("aggregate-001", "setup-001", "hypothesis-001"),
        metadata
      });
      await repositories.researchFeedbackDecisionRepository.create({
        decision: buildFeedbackDecision(
          "feedback-001",
          "setup-001",
          "hypothesis-001",
          "aggregate-001"
        ),
        metadata
      });
      await repositories.researchDecisionApprovalRepository.create({
        approval: buildApproval("approval-002", "feedback-001", "setup-001"),
        metadata
      });

      await assert.rejects(
        async () =>
          repositories.researchReviewDecisionRepository.create({
            decision: buildReviewDecision("review-decision-002", "hypothesis-missing"),
            metadata
          }),
        (error: unknown) =>
          error instanceof RepositoryError &&
          error.code === "invalid_reference" &&
          error.entityType === "research_review_decision" &&
          error.referenceEntityType === "research_hypothesis" &&
          error.referenceEntityId === "hypothesis-missing"
      );
    });
  }
);

integrationTest(
  "shared implemented-product bundle maps invalid routing-result review-decision linkage from real Postgres",
  async () => {
    await withIntegrationRepositories(INTEGRATION_DATABASE_URL, async (repositories) => {
      await assert.rejects(
        async () =>
          repositories.reviewDecisionRoutingResultRepository.create({
            result: buildRoutingResult("routing-result-missing-review", "review-decision-missing"),
            metadata
          }),
        (error: unknown) =>
          error instanceof RepositoryError &&
          error.code === "invalid_reference" &&
          error.entityType === "review_decision_routing_result" &&
          error.referenceEntityType === "research_review_decision" &&
          error.referenceEntityId === "review-decision-missing"
      );
    });
  }
);

integrationTest(
  "shared implemented-product bundle maps invalid routed-action review-decision linkage from real Postgres",
  async () => {
    await withIntegrationRepositories(INTEGRATION_DATABASE_URL, async (repositories) => {
      await assert.rejects(
        async () =>
          repositories.routedActionExecutionEnvelopeRepository.create({
            envelope: buildEnvelope("execution-envelope-002", "review-decision-missing"),
            metadata
          }),
        (error: unknown) =>
          error instanceof RepositoryError &&
          error.code === "invalid_reference" &&
          error.entityType === "routed_action_execution_envelope" &&
          error.referenceEntityType === "research_review_decision" &&
          error.referenceEntityId === "review-decision-missing"
      );
    });
  }
);

integrationTest(
  "shared implemented-product bundle maps invalid setup-lifecycle approval linkage from real Postgres",
  async () => {
    await withIntegrationRepositories(INTEGRATION_DATABASE_URL, async (repositories) => {
      await repositories.setupDefinitionRepository.create({
        definition: buildSetupDefinition("setup-001"),
        metadata
      });
      await repositories.setupDefinitionRepository.create({
        definition: buildSetupDefinition("setup-002"),
        metadata
      });
      await repositories.researchHypothesisRepository.create({
        hypothesis: buildResearchHypothesis("hypothesis-001", "setup-001"),
        metadata
      });
      await repositories.setupAggregateResultRepository.create({
        aggregate: buildAggregate("aggregate-001", "setup-001", "hypothesis-001"),
        metadata
      });
      await repositories.researchFeedbackDecisionRepository.create({
        decision: buildFeedbackDecision(
          "feedback-001",
          "setup-001",
          "hypothesis-001",
          "aggregate-001"
        ),
        metadata
      });
      const approvalPersistenceResult =
        await repositories.feedbackDecisionApprovalReviewPersistence.recordFeedbackDecisionApproval({
          researchFeedbackDecisionId: "feedback-001",
          nextDecisionStatus: "accepted",
          reviewerMetadata: {
            reviewedBy: "reviewer-001",
            reviewedAt: "2026-05-24T10:30:00.000Z",
            approvalOutcome: "approved"
          },
          approval: buildApproval("approval-001", "feedback-001", "setup-001"),
          metadata: {
            ...metadata,
            sourceObservedAtUtc: "2026-05-24T10:35:00.000Z"
          }
        });

      assert.equal(approvalPersistenceResult.status, "recorded");
      if (approvalPersistenceResult.status !== "recorded") {
        assert.fail("approval persistence should have recorded the approval");
      }

      await assert.rejects(
        async () =>
          repositories.setupLifecycleMutationRecordRepository.create({
            mutation: buildMutation("mutation-002", "setup-002", "approval-001", "feedback-001"),
            metadata
          }),
        (error: unknown) =>
          error instanceof RepositoryError &&
          error.code === "invalid_reference" &&
          error.entityType === "setup_lifecycle_mutation_record" &&
          error.referenceEntityType === "research_decision_approval" &&
          error.referenceEntityId === "approval-001"
      );
    });
  }
);

integrationTest(
  "shared implemented-product bundle maps invalid setup-refinement approval linkage from real Postgres",
  async () => {
    await withIntegrationRepositories(INTEGRATION_DATABASE_URL, async (repositories) => {
      await repositories.setupDefinitionRepository.create({
        definition: buildSetupDefinition("setup-001"),
        metadata
      });
      await repositories.setupDefinitionRepository.create({
        definition: buildSetupDefinition("setup-002"),
        metadata
      });
      await repositories.researchHypothesisRepository.create({
        hypothesis: buildResearchHypothesis("hypothesis-001", "setup-001"),
        metadata
      });
      await repositories.setupAggregateResultRepository.create({
        aggregate: buildAggregate("aggregate-001", "setup-001", "hypothesis-001"),
        metadata
      });
      await repositories.researchFeedbackDecisionRepository.create({
        decision: buildFeedbackDecision(
          "feedback-001",
          "setup-001",
          "hypothesis-001",
          "aggregate-001",
          "refine_definition"
        ),
        metadata
      });
      const approvalPersistenceResult =
        await repositories.feedbackDecisionApprovalReviewPersistence.recordFeedbackDecisionApproval({
          researchFeedbackDecisionId: "feedback-001",
          nextDecisionStatus: "accepted",
          reviewerMetadata: {
            reviewedBy: "reviewer-001",
            reviewedAt: "2026-05-24T10:30:00.000Z",
            approvalOutcome: "approved"
          },
          approval: buildApproval(
            "approval-001",
            "feedback-001",
            "setup-001",
            "refine_definition"
          ),
          metadata: {
            ...metadata,
            sourceObservedAtUtc: "2026-05-24T10:35:00.000Z"
          }
        });

      assert.equal(approvalPersistenceResult.status, "recorded");
      if (approvalPersistenceResult.status !== "recorded") {
        assert.fail("approval persistence should have recorded the refinement approval");
      }

      await assert.rejects(
        async () =>
          repositories.setupRefinementRequestRepository.create({
            request: buildSetupRefinementRequest(
              "refinement-002",
              "setup-002",
              "approval-001",
              "feedback-001"
            ),
            metadata
          }),
        (error: unknown) =>
          error instanceof RepositoryError &&
          error.code === "invalid_reference" &&
          error.entityType === "setup_refinement_request" &&
          error.referenceEntityType === "research_decision_approval" &&
          error.referenceEntityId === "approval-001"
      );
    });
  }
);

integrationTest(
  "shared implemented-product bundle persists terminal execution-attempt audit evidence against real Postgres",
  async () => {
    await withIntegrationRepositories(INTEGRATION_DATABASE_URL, async (repositories) => {
      const received: ExecutionAttemptAudit = {
        attemptId: "execution-attempt-001",
        actionTarget: "activate_setup_revision",
        downstreamCommandType: "ActivateSetupDefinitionRevisionCommand",
        status: "received",
        attemptedBy: "execution-runtime",
        attemptedAt: "2026-07-27T12:00:00.000Z",
        warningCodes: [],
        createdAtUtc: "2026-07-27T12:00:00.000Z",
        updatedAtUtc: "2026-07-27T12:00:00.000Z"
      };
      await repositories.executionAttemptAuditRepository.create({ audit: received, metadata });

      const failed: ExecutionAttemptAudit = {
        ...received,
        reviewDecisionRoutingResultId: "routing-result-not-required",
        status: "failed",
        completedAt: "2026-07-27T12:00:03.000Z",
        outcomeCode: "provider_unavailable",
        warningCodes: ["retry_not_scheduled"],
        updatedAtUtc: "2026-07-27T12:00:03.000Z"
      };
      const updated = await repositories.executionAttemptAuditRepository.update({
        audit: failed,
        metadata: { ...metadata, sourceObservedAtUtc: failed.updatedAtUtc },
        expectedVersion: 1
      });

      assert.deepEqual(updated, failed);
      assert.deepEqual(
        await repositories.executionAttemptAuditRepository.listByStatus(["failed"]),
        [failed]
      );
      assert.deepEqual(
        await repositories.executionAttemptAuditRepository.listByReviewDecisionRoutingResultId(
          "routing-result-not-required"
        ),
        [failed]
      );
    });
  }
);

integrationTest(
  "repository-composed execution runtime records terminal audit evidence against real Postgres",
  async () => {
    await withIntegrationRepositories(INTEGRATION_DATABASE_URL, async (repositories) => {
      const runtime = createExecutionAttemptRuntimeFromRepositories(repositories, {
        execute: async () => ({
          status: "executed",
          outcomeCode: "setup_revision_activated"
        })
      });
      const result = await runtime.execute({
        audit: {
          attemptId: "execution-attempt-runtime-001",
          routedActionExecutionEnvelopeId: "execution-envelope-runtime-001",
          reviewDecisionRoutingResultId: "routing-result-runtime-001",
          researchReviewDecisionId: "review-decision-runtime-001",
          actionTarget: "activate_setup_revision",
          downstreamCommandType: "ActivateSetupDefinitionRevisionCommand",
          status: "received",
          attemptedBy: "execution-runtime",
          attemptedAt: "2026-07-28T10:00:00.000Z",
          warningCodes: [],
          createdAtUtc: "2026-07-28T10:00:00.000Z",
          updatedAtUtc: "2026-07-28T10:00:00.000Z"
        },
        envelope: {
          id: "execution-envelope-runtime-001",
          sourceRoutingResultId: "routing-result-runtime-001",
          sourceReviewDecisionId: "review-decision-runtime-001",
          actionTarget: "activate_setup_revision",
          actionCommandType: "ActivateSetupDefinitionRevisionCommand",
          targetEntityRefs: {
            setupFamilyId: "setup-family-runtime-001",
            setupRevisionId: "setup-revision-runtime-001"
          },
          routeMetadataSnapshot: {
            routeStatus: "routed",
            decisionOutcome: "accepted",
            authorizedNextAction: "prepare_activation_follow_up"
          },
          executionPayloadSnapshot: {
            commandType: "ActivateSetupDefinitionRevisionCommand",
            target: "activate_setup_revision",
            commandInput: {
              setupRevisionId: "setup-revision-runtime-001",
              setupFamilyId: "setup-family-runtime-001",
              sourceReviewDecisionId: "review-decision-runtime-001",
              sourceRoutingResultId: "routing-result-runtime-001"
            }
          },
          executionStatus: "prepared",
          preparedBy: "execution-preparer",
          preparedAt: "2026-07-28T10:00:00.000Z",
          createdAt: "2026-07-28T10:00:00.000Z",
          updatedAt: "2026-07-28T10:00:00.000Z"
        },
        metadata: {
          ...metadata,
          sourceObservedAtUtc: "2026-07-28T10:00:05.000Z"
        }
      });

      assert.equal(result.status, "executed");
      assert.equal(result.audit.outcomeCode, "setup_revision_activated");
      assert.equal(
        (await repositories.executionAttemptAuditRepository.getById(
          "execution-attempt-runtime-001"
        ))?.status,
        "executed"
      );
    });
  }
);

integrationTest(
  "shared implemented-product bundle permits one execution attempt per prepared envelope against real Postgres",
  async () => {
    await withIntegrationRepositories(INTEGRATION_DATABASE_URL, async (repositories) => {
      const audit: ExecutionAttemptAudit = {
        attemptId: "execution-attempt-envelope-001",
        routedActionExecutionEnvelopeId: "execution-envelope-single-dispatch-001",
        actionTarget: "activate_setup_revision",
        downstreamCommandType: "ActivateSetupDefinitionRevisionCommand",
        status: "received",
        attemptedBy: "execution-runtime",
        attemptedAt: "2026-07-28T10:00:00.000Z",
        warningCodes: [],
        createdAtUtc: "2026-07-28T10:00:00.000Z",
        updatedAtUtc: "2026-07-28T10:00:00.000Z"
      };
      await repositories.executionAttemptAuditRepository.create({ audit, metadata });

      await assert.rejects(
        async () =>
          repositories.executionAttemptAuditRepository.create({
            audit: { ...audit, attemptId: "execution-attempt-envelope-002" },
            metadata
          }),
        (error: unknown) =>
          error instanceof RepositoryError &&
          error.code === "already_exists" &&
          error.entityType === "execution_attempt_audit" &&
          error.entityId === "execution-attempt-envelope-002"
      );
    });
  }
);
