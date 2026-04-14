import assert from "node:assert/strict";
import test from "node:test";

import {
  type EvaluationService,
  type ProductRecordMetadata,
  type ResearchAggregationService,
  type ResearchService,
  type SetupDefinitionService,
  type SetupToAggregateFlowInput,
  type SignalCandidateService,
  createSetupToAggregateFlow
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: null,
  originTransitionId: null,
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-application-flow-tests",
  sourceObservedAtUtc: "2026-04-18T12:00:00.000Z"
};

const buildInput = (): SetupToAggregateFlowInput => ({
  setupDefinition: {
    id: "setup-flow-001",
    name: "Flow setup",
    description: "Setup for first application flow",
    status: "active",
    measurableConditions: ["close above range high"],
    evaluationAssumptions: ["fixed 24h evaluation"],
    invalidationAssumptions: ["invalidate on immediate breakdown"],
    createdAt: "2026-04-18T10:00:00.000Z",
    updatedAt: "2026-04-18T10:00:00.000Z"
  },
  researchHypothesis: {
    id: "hypothesis-flow-001",
    title: "Flow hypothesis",
    description: "Hypothesis for first application flow",
    status: "active",
    relatedSetupDefinitionIds: ["setup-flow-001"],
    assumptions: ["positive average percentage move"],
    notes: [],
    createdAt: "2026-04-18T10:00:00.000Z",
    updatedAt: "2026-04-18T10:00:00.000Z"
  },
  signalCandidate: {
    id: "candidate-flow-001",
    setupDefinitionId: "setup-flow-001",
    monitoredSymbolId: "BTC-USDT",
    status: "detected",
    detectedAt: "2026-04-18T10:30:00.000Z",
    evidenceSummary: "Detected breakout candidate",
    createdAt: "2026-04-18T10:30:00.000Z",
    updatedAt: "2026-04-18T10:30:00.000Z"
  },
  evaluation: {
    pendingResult: {
      id: "result-flow-001",
      signalCandidateId: "candidate-flow-001",
      evaluationWindowId: "window-24h",
      status: "pending",
      referencePrice: null,
      finalPrice: null,
      highInWindow: null,
      lowInWindow: null,
      absoluteMove: null,
      percentageMove: null,
      maxFavorableExcursion: null,
      maxAdverseExcursion: null,
      evaluatedAt: null,
      createdAt: "2026-04-18T11:00:00.000Z",
      updatedAt: "2026-04-18T11:00:00.000Z"
    },
    finalization: {
      referencePrice: 100,
      finalPrice: 105,
      highInWindow: 108,
      lowInWindow: 98,
      maxFavorableExcursion: 2.5,
      maxAdverseExcursion: -1.2,
      evaluatedAt: "2026-04-18T12:00:00.000Z",
      notes: "finalized in flow test"
    }
  },
  aggregation: {
    pendingAggregate: {
      id: "aggregate-flow-001",
      setupDefinitionId: "setup-flow-001",
      researchHypothesisId: "hypothesis-flow-001",
      aggregationScope: {
        setupDefinitionId: "setup-flow-001",
        evaluationWindowId: "window-24h",
        symbolScope: {
          kind: "single_symbol",
          symbolIds: ["BTC-USDT"]
        },
        timeRange: {
          startAtUtc: "2026-04-01T00:00:00.000Z",
          endAtUtc: "2026-04-30T23:59:59.000Z"
        }
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
      createdAt: "2026-04-18T12:00:00.000Z",
      updatedAt: "2026-04-18T12:00:00.000Z"
    },
    recomputeEvaluationResultIds: ["result-flow-001"]
  },
  metadata
});

test("happy path service sequence", async () => {
  const calls: string[] = [];

  const setupDefinitionService: SetupDefinitionService = {
    createSetupDefinition: async (request) => {
      calls.push("setup_definition_create");
      return request.definition;
    },
    updateSetupDefinition: async (request) => request.definition,
    activateSetupDefinition: async () => null,
    archiveSetupDefinition: async () => null,
    applyApprovedMutation: async () => null
  };

  const researchService: ResearchService = {
    createResearchHypothesis: async (request) => {
      calls.push("research_hypothesis_create");
      return request.hypothesis;
    },
    updateResearchHypothesis: async (request) => request.hypothesis,
    updateResearchHypothesisStatus: async () => null,
    attachHypothesisToSetupDefinitions: async () => {
      calls.push("research_hypothesis_link");
      return buildInput().researchHypothesis;
    },
    updateHypothesisEvidence: async () => null,
    reviewSetupFromEvidence: async () => null,
    approveFeedbackDecision: async () => null
  };

  const signalCandidateService: SignalCandidateService = {
    createSignalCandidate: async (request) => {
      calls.push("signal_candidate_create");
      return request.candidate;
    },
    updateSignalCandidateStatus: async () => null
  };

  const evaluationService: EvaluationService = {
    createPendingEvaluationResult: async (request) => {
      calls.push("evaluation_result_create");
      return request.result;
    },
    startEvaluationResult: async () => {
      calls.push("evaluation_result_start");
      return buildInput().evaluation.pendingResult;
    },
    finalizeEvaluationResult: async () => {
      calls.push("evaluation_result_finalize");
      return {
        ...buildInput().evaluation.pendingResult,
        status: "completed"
      };
    },
    expireEvaluationResult: async () => null,
    invalidateEvaluationResult: async () => null
  };

  const researchAggregationService: ResearchAggregationService = {
    createPendingSetupAggregateResult: async (request) => {
      calls.push("setup_aggregate_result_create");
      return request.aggregate;
    },
    recomputeSetupAggregateResult: async () => {
      calls.push("setup_aggregate_result_recompute");
      return {
        ...buildInput().aggregation.pendingAggregate,
        status: "completed"
      };
    },
    updateSetupAggregateResultStatus: async () => null
  };

  const flow = createSetupToAggregateFlow({
    setupDefinitionService,
    researchService,
    signalCandidateService,
    evaluationService,
    researchAggregationService
  });

  const result = await flow.run(buildInput());
  assert.equal(result.status, "completed");
  assert.deepEqual(calls, [
    "setup_definition_create",
    "research_hypothesis_create",
    "research_hypothesis_link",
    "signal_candidate_create",
    "evaluation_result_create",
    "evaluation_result_start",
    "evaluation_result_finalize",
    "setup_aggregate_result_create",
    "setup_aggregate_result_recompute"
  ]);
});

test("failure at candidate stage stops downstream steps", async () => {
  let evaluationCalled = false;
  let aggregationCalled = false;

  const flow = createSetupToAggregateFlow({
    setupDefinitionService: {
      createSetupDefinition: async (request) => request.definition,
      updateSetupDefinition: async (request) => request.definition,
      activateSetupDefinition: async () => null,
      archiveSetupDefinition: async () => null,
      applyApprovedMutation: async () => null
    },
    researchService: {
      createResearchHypothesis: async (request) => request.hypothesis,
      updateResearchHypothesis: async (request) => request.hypothesis,
      updateResearchHypothesisStatus: async () => null,
      attachHypothesisToSetupDefinitions: async () => buildInput().researchHypothesis,
      updateHypothesisEvidence: async () => null,
      reviewSetupFromEvidence: async () => null,
      approveFeedbackDecision: async () => null
    },
    signalCandidateService: {
      createSignalCandidate: async () => {
        throw new Error("candidate create failed");
      },
      updateSignalCandidateStatus: async () => null
    },
    evaluationService: {
      createPendingEvaluationResult: async (request) => {
        evaluationCalled = true;
        return request.result;
      },
      startEvaluationResult: async () => buildInput().evaluation.pendingResult,
      finalizeEvaluationResult: async () => ({
        ...buildInput().evaluation.pendingResult,
        status: "completed"
      }),
      expireEvaluationResult: async () => null,
      invalidateEvaluationResult: async () => null
    },
    researchAggregationService: {
      createPendingSetupAggregateResult: async (request) => {
        aggregationCalled = true;
        return request.aggregate;
      },
      recomputeSetupAggregateResult: async () => ({
        ...buildInput().aggregation.pendingAggregate,
        status: "completed"
      }),
      updateSetupAggregateResultStatus: async () => null
    }
  });

  const result = await flow.run(buildInput());
  assert.equal(result.status, "failed");
  assert.equal(result.failedStep, "signal_candidate_create");
  assert.equal(evaluationCalled, false);
  assert.equal(aggregationCalled, false);
});

test("failure at evaluation stage stops before aggregation", async () => {
  let aggregateCreateCalled = false;
  let aggregateRecomputeCalled = false;

  const flow = createSetupToAggregateFlow({
    setupDefinitionService: {
      createSetupDefinition: async (request) => request.definition,
      updateSetupDefinition: async (request) => request.definition,
      activateSetupDefinition: async () => null,
      archiveSetupDefinition: async () => null,
      applyApprovedMutation: async () => null
    },
    researchService: {
      createResearchHypothesis: async (request) => request.hypothesis,
      updateResearchHypothesis: async (request) => request.hypothesis,
      updateResearchHypothesisStatus: async () => null,
      attachHypothesisToSetupDefinitions: async () => buildInput().researchHypothesis,
      updateHypothesisEvidence: async () => null,
      reviewSetupFromEvidence: async () => null,
      approveFeedbackDecision: async () => null
    },
    signalCandidateService: {
      createSignalCandidate: async (request) => request.candidate,
      updateSignalCandidateStatus: async () => null
    },
    evaluationService: {
      createPendingEvaluationResult: async (request) => request.result,
      startEvaluationResult: async () => buildInput().evaluation.pendingResult,
      finalizeEvaluationResult: async () => {
        throw new Error("evaluation finalize failed");
      },
      expireEvaluationResult: async () => null,
      invalidateEvaluationResult: async () => null
    },
    researchAggregationService: {
      createPendingSetupAggregateResult: async (request) => {
        aggregateCreateCalled = true;
        return request.aggregate;
      },
      recomputeSetupAggregateResult: async () => {
        aggregateRecomputeCalled = true;
        return null;
      },
      updateSetupAggregateResultStatus: async () => null
    }
  });

  const result = await flow.run(buildInput());
  assert.equal(result.status, "failed");
  assert.equal(result.failedStep, "evaluation_result_finalize");
  assert.equal(aggregateCreateCalled, false);
  assert.equal(aggregateRecomputeCalled, false);
});

test("aggregation refresh failure returns partial flow result", async () => {
  const flow = createSetupToAggregateFlow({
    setupDefinitionService: {
      createSetupDefinition: async (request) => request.definition,
      updateSetupDefinition: async (request) => request.definition,
      activateSetupDefinition: async () => null,
      archiveSetupDefinition: async () => null,
      applyApprovedMutation: async () => null
    },
    researchService: {
      createResearchHypothesis: async (request) => request.hypothesis,
      updateResearchHypothesis: async (request) => request.hypothesis,
      updateResearchHypothesisStatus: async () => null,
      attachHypothesisToSetupDefinitions: async () => buildInput().researchHypothesis,
      updateHypothesisEvidence: async () => null,
      reviewSetupFromEvidence: async () => null,
      approveFeedbackDecision: async () => null
    },
    signalCandidateService: {
      createSignalCandidate: async (request) => request.candidate,
      updateSignalCandidateStatus: async () => null
    },
    evaluationService: {
      createPendingEvaluationResult: async (request) => request.result,
      startEvaluationResult: async () => buildInput().evaluation.pendingResult,
      finalizeEvaluationResult: async () => ({
        ...buildInput().evaluation.pendingResult,
        status: "completed"
      }),
      expireEvaluationResult: async () => null,
      invalidateEvaluationResult: async () => null
    },
    researchAggregationService: {
      createPendingSetupAggregateResult: async (request) => request.aggregate,
      recomputeSetupAggregateResult: async () => {
        throw new Error("aggregate recompute failed");
      },
      updateSetupAggregateResultStatus: async () => null
    }
  });

  const result = await flow.run(buildInput());
  assert.equal(result.status, "partial");
  assert.equal(result.warnings.length, 1);
  assert.equal(result.completedSteps.includes("evaluation_result_finalize"), true);
});

test("null research-hypothesis link result fails flow", async () => {
  const flow = createSetupToAggregateFlow({
    setupDefinitionService: {
      createSetupDefinition: async (request) => request.definition,
      updateSetupDefinition: async (request) => request.definition,
      activateSetupDefinition: async () => null,
      archiveSetupDefinition: async () => null,
      applyApprovedMutation: async () => null
    },
    researchService: {
      createResearchHypothesis: async (request) => request.hypothesis,
      updateResearchHypothesis: async (request) => request.hypothesis,
      updateResearchHypothesisStatus: async () => null,
      attachHypothesisToSetupDefinitions: async () => null,
      updateHypothesisEvidence: async () => null,
      reviewSetupFromEvidence: async () => null,
      approveFeedbackDecision: async () => null
    },
    signalCandidateService: {
      createSignalCandidate: async (request) => request.candidate,
      updateSignalCandidateStatus: async () => null
    },
    evaluationService: {
      createPendingEvaluationResult: async (request) => request.result,
      startEvaluationResult: async () => buildInput().evaluation.pendingResult,
      finalizeEvaluationResult: async () => ({
        ...buildInput().evaluation.pendingResult,
        status: "completed"
      }),
      expireEvaluationResult: async () => null,
      invalidateEvaluationResult: async () => null
    },
    researchAggregationService: {
      createPendingSetupAggregateResult: async (request) => request.aggregate,
      recomputeSetupAggregateResult: async () => ({
        ...buildInput().aggregation.pendingAggregate,
        status: "completed"
      }),
      updateSetupAggregateResultStatus: async () => null
    }
  });

  const result = await flow.run(buildInput());
  assert.equal(result.status, "failed");
  assert.equal(result.failedStep, "research_hypothesis_link");
});

test("null evaluation start result fails flow at start step", async () => {
  const flow = createSetupToAggregateFlow({
    setupDefinitionService: {
      createSetupDefinition: async (request) => request.definition,
      updateSetupDefinition: async (request) => request.definition,
      activateSetupDefinition: async () => null,
      archiveSetupDefinition: async () => null,
      applyApprovedMutation: async () => null
    },
    researchService: {
      createResearchHypothesis: async (request) => request.hypothesis,
      updateResearchHypothesis: async (request) => request.hypothesis,
      updateResearchHypothesisStatus: async () => null,
      attachHypothesisToSetupDefinitions: async () => buildInput().researchHypothesis,
      updateHypothesisEvidence: async () => null,
      reviewSetupFromEvidence: async () => null,
      approveFeedbackDecision: async () => null
    },
    signalCandidateService: {
      createSignalCandidate: async (request) => request.candidate,
      updateSignalCandidateStatus: async () => null
    },
    evaluationService: {
      createPendingEvaluationResult: async (request) => request.result,
      startEvaluationResult: async () => null,
      finalizeEvaluationResult: async () => ({
        ...buildInput().evaluation.pendingResult,
        status: "completed"
      }),
      expireEvaluationResult: async () => null,
      invalidateEvaluationResult: async () => null
    },
    researchAggregationService: {
      createPendingSetupAggregateResult: async (request) => request.aggregate,
      recomputeSetupAggregateResult: async () => ({
        ...buildInput().aggregation.pendingAggregate,
        status: "completed"
      }),
      updateSetupAggregateResultStatus: async () => null
    }
  });

  const result = await flow.run(buildInput());
  assert.equal(result.status, "failed");
  assert.equal(result.failedStep, "evaluation_result_start");
});

test("null aggregation recompute result returns partial with warning", async () => {
  const flow = createSetupToAggregateFlow({
    setupDefinitionService: {
      createSetupDefinition: async (request) => request.definition,
      updateSetupDefinition: async (request) => request.definition,
      activateSetupDefinition: async () => null,
      archiveSetupDefinition: async () => null,
      applyApprovedMutation: async () => null
    },
    researchService: {
      createResearchHypothesis: async (request) => request.hypothesis,
      updateResearchHypothesis: async (request) => request.hypothesis,
      updateResearchHypothesisStatus: async () => null,
      attachHypothesisToSetupDefinitions: async () => buildInput().researchHypothesis,
      updateHypothesisEvidence: async () => null,
      reviewSetupFromEvidence: async () => null,
      approveFeedbackDecision: async () => null
    },
    signalCandidateService: {
      createSignalCandidate: async (request) => request.candidate,
      updateSignalCandidateStatus: async () => null
    },
    evaluationService: {
      createPendingEvaluationResult: async (request) => request.result,
      startEvaluationResult: async () => buildInput().evaluation.pendingResult,
      finalizeEvaluationResult: async () => ({
        ...buildInput().evaluation.pendingResult,
        status: "completed"
      }),
      expireEvaluationResult: async () => null,
      invalidateEvaluationResult: async () => null
    },
    researchAggregationService: {
      createPendingSetupAggregateResult: async (request) => request.aggregate,
      recomputeSetupAggregateResult: async () => null,
      updateSetupAggregateResultStatus: async () => null
    }
  });

  const result = await flow.run(buildInput());
  assert.equal(result.status, "partial");
  assert.equal(result.completedSteps.includes("setup_aggregate_result_recompute"), false);
  assert.equal(result.warnings.length, 1);
});
