import type { SetupToAggregateFlowInput } from "./application-flow-input.js";
import type { FlowStepName, SetupToAggregateFlowResult } from "./application-flow-result.js";
import type { EvaluationService } from "../services/evaluation-service.js";
import type { MonitoringCatalogService } from "../services/monitoring-catalog-service.js";
import type { ResearchAggregationService } from "../services/research-aggregation-service.js";
import type { ResearchService } from "../services/research-service.js";
import type { ResearchRunService } from "../services/research-run-service.js";
import type { SetupDefinitionService } from "../services/setup-definition-service.js";
import type { SignalCandidateService } from "../services/signal-candidate-service.js";

export type SetupToAggregateFlowDependencies = {
  setupDefinitionService: SetupDefinitionService;
  researchService: ResearchService;
  monitoringCatalogService?: MonitoringCatalogService;
  signalCandidateService: SignalCandidateService;
  evaluationService: EvaluationService;
  researchRunService?: ResearchRunService;
  researchAggregationService: ResearchAggregationService;
};

const asErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "unknown flow error";

const validateMonitoredSymbolContext = (input: SetupToAggregateFlowInput): void => {
  if (
    input.monitoredSymbol &&
    input.monitoredSymbol.symbolId !== input.signalCandidate.monitoredSymbolId
  ) {
    throw new Error("monitoredSymbol symbolId must match signalCandidate monitoredSymbolId");
  }
};

const validateResearchRunContext = (input: SetupToAggregateFlowInput): void => {
  const researchRun = input.researchRun;
  if (!researchRun) {
    return;
  }

  const { run } = researchRun;
  const aggregate = input.aggregation.pendingAggregate;
  if (run.setupId !== input.setupDefinition.id) {
    throw new Error("research_run setupId must match setupDefinition id");
  }
  if (run.hypothesisId !== input.researchHypothesis.id) {
    throw new Error("research_run hypothesisId must match researchHypothesis id");
  }
  if (aggregate.aggregationScope.researchRunId !== run.runId) {
    throw new Error("aggregationScope.researchRunId must match research_run runId");
  }
  if (aggregate.setupDefinitionId !== run.setupId) {
    throw new Error("aggregate setupDefinitionId must match research_run setupId");
  }
  if (aggregate.researchHypothesisId !== run.hypothesisId) {
    throw new Error("aggregate researchHypothesisId must match research_run hypothesisId");
  }
  if (
    aggregate.aggregationScope.hypothesisId !== undefined &&
    aggregate.aggregationScope.hypothesisId !== run.hypothesisId
  ) {
    throw new Error("aggregationScope.hypothesisId must match research_run hypothesisId");
  }
  if (!input.aggregation.recomputeEvaluationResultIds.includes(input.evaluation.pendingResult.id)) {
    throw new Error("aggregation recompute results must include the flow evaluation result");
  }
};

const failResult = (
  step: FlowStepName,
  error: unknown,
  base: Pick<SetupToAggregateFlowResult, "ids" | "completedSteps" | "warnings">
): SetupToAggregateFlowResult => ({
  status: "failed",
  ids: base.ids,
  completedSteps: base.completedSteps,
  failedStep: step,
  warnings: base.warnings,
  error: asErrorMessage(error)
});

export const createSetupToAggregateFlow = (
  dependencies: SetupToAggregateFlowDependencies
): { run(input: SetupToAggregateFlowInput): Promise<SetupToAggregateFlowResult> } => {
  const {
    setupDefinitionService,
    researchService,
    monitoringCatalogService,
    signalCandidateService,
    evaluationService,
    researchRunService,
    researchAggregationService
  } = dependencies;

  return {
    async run(input: SetupToAggregateFlowInput): Promise<SetupToAggregateFlowResult> {
      const ids: SetupToAggregateFlowResult["ids"] = {};
      const outcomes: NonNullable<SetupToAggregateFlowResult["outcomes"]> = {};
      const completedSteps: FlowStepName[] = [];
      const warnings: string[] = [];
      let evaluationResultId: string | null = null;

      try {
        validateMonitoredSymbolContext(input);
      } catch (error: unknown) {
        return failResult("monitored_symbol_register", error, { ids, completedSteps, warnings });
      }

      try {
        validateResearchRunContext(input);
      } catch (error: unknown) {
        return failResult("research_run_create", error, { ids, completedSteps, warnings });
      }

      try {
        const setupDefinition = await setupDefinitionService.createSetupDefinition({
          definition: input.setupDefinition,
          metadata: input.metadata
        });
        ids.setupDefinitionId = setupDefinition.id;
        completedSteps.push("setup_definition_create");
      } catch (error: unknown) {
        return failResult("setup_definition_create", error, { ids, completedSteps, warnings });
      }

      try {
        const hypothesis = await researchService.createResearchHypothesis({
          hypothesis: input.researchHypothesis,
          metadata: input.metadata
        });
        ids.researchHypothesisId = hypothesis.id;
        completedSteps.push("research_hypothesis_create");
      } catch (error: unknown) {
        return failResult("research_hypothesis_create", error, { ids, completedSteps, warnings });
      }

      try {
        const linkedHypothesis = await researchService.attachHypothesisToSetupDefinitions({
          researchHypothesisId: input.researchHypothesis.id,
          setupDefinitionIds: [input.setupDefinition.id],
          metadata: input.metadata,
          expectedVersion: null
        });
        if (!linkedHypothesis) {
          throw new Error(
            `research_hypothesis link returned null for ${input.researchHypothesis.id}`
          );
        }
        completedSteps.push("research_hypothesis_link");
      } catch (error: unknown) {
        return failResult("research_hypothesis_link", error, { ids, completedSteps, warnings });
      }

      if (input.monitoredSymbol) {
        if (!monitoringCatalogService) {
          return failResult(
            "monitored_symbol_register",
            new Error("monitoring_catalog_service is required when monitoredSymbol input is provided"),
            { ids, completedSteps, warnings }
          );
        }

        try {
          const monitoredSymbol = await monitoringCatalogService.registerMonitoredSymbol({
            symbol: input.monitoredSymbol,
            metadata: input.metadata
          });
          ids.monitoredSymbolId = monitoredSymbol.symbolId;
          completedSteps.push("monitored_symbol_register");
        } catch (error: unknown) {
          return failResult("monitored_symbol_register", error, { ids, completedSteps, warnings });
        }
      }

      try {
        const candidate = await signalCandidateService.createSignalCandidate({
          candidate: input.signalCandidate,
          metadata: input.metadata
        });
        ids.signalCandidateId = candidate.id;
        completedSteps.push("signal_candidate_create");
      } catch (error: unknown) {
        return failResult("signal_candidate_create", error, { ids, completedSteps, warnings });
      }

      if (input.researchRun) {
        if (!researchRunService) {
          return failResult(
            "research_run_create",
            new Error("research_run_service is required when researchRun input is provided"),
            { ids, completedSteps, warnings }
          );
        }

        try {
          const plannedRun = await researchRunService.createPlannedResearchRun({
            run: input.researchRun.run,
            metadata: input.metadata
          });
          ids.researchRunId = plannedRun.runId;
          completedSteps.push("research_run_create");
        } catch (error: unknown) {
          return failResult("research_run_create", error, { ids, completedSteps, warnings });
        }

        try {
          const researchRunId = ids.researchRunId;
          if (!researchRunId) {
            throw new Error("research_run id missing after create");
          }
          const startedRun = await researchRunService.startResearchRun({
            runId: researchRunId,
            metadata: input.metadata,
            expectedVersion: null
          });
          if (!startedRun) {
            throw new Error(`research_run start returned null for ${researchRunId}`);
          }
          completedSteps.push("research_run_start");
        } catch (error: unknown) {
          return failResult("research_run_start", error, { ids, completedSteps, warnings });
        }
      }

      try {
        const pendingEvaluationResult = await evaluationService.createPendingEvaluationResult({
          result: input.evaluation.pendingResult,
          metadata: input.metadata
        });
        evaluationResultId = pendingEvaluationResult.id;
        ids.evaluationResultId = evaluationResultId;
        completedSteps.push("evaluation_result_create");
      } catch (error: unknown) {
        return failResult("evaluation_result_create", error, { ids, completedSteps, warnings });
      }
      if (!evaluationResultId) {
        return failResult(
          "evaluation_result_create",
          new Error("evaluation_result id missing after create"),
          { ids, completedSteps, warnings }
        );
      }

      try {
        const startedEvaluationResult = await evaluationService.startEvaluationResult({
          evaluationResultId: evaluationResultId,
          metadata: input.metadata,
          expectedVersion: null
        });
        if (!startedEvaluationResult) {
          throw new Error(`evaluation_result start returned null for ${evaluationResultId}`);
        }
        completedSteps.push("evaluation_result_start");
      } catch (error: unknown) {
        return failResult("evaluation_result_start", error, { ids, completedSteps, warnings });
      }

      if (input.evaluation.finalization !== undefined) {
        try {
          const finalizedEvaluationResult = await evaluationService.finalizeEvaluationResult({
            evaluationResultId: evaluationResultId,
            ...input.evaluation.finalization,
            metadata: input.metadata,
            expectedVersion: null
          });
          if (!finalizedEvaluationResult) {
            throw new Error(`evaluation_result finalize returned null for ${evaluationResultId}`);
          }
          outcomes.evaluationResultStatus = finalizedEvaluationResult.status;
          completedSteps.push("evaluation_result_finalize");
        } catch (error: unknown) {
          return failResult("evaluation_result_finalize", error, { ids, completedSteps, warnings });
        }
      } else if (input.evaluation.terminalization.kind === "expire") {
        try {
          const expiredEvaluationResult = await evaluationService.expireEvaluationResult({
            evaluationResultId,
            metadata: input.metadata,
            expectedVersion: null
          });
          if (!expiredEvaluationResult) {
            throw new Error(`evaluation_result expire returned null for ${evaluationResultId}`);
          }
          outcomes.evaluationResultStatus = expiredEvaluationResult.status;
          completedSteps.push("evaluation_result_expire");
        } catch (error: unknown) {
          return failResult("evaluation_result_expire", error, { ids, completedSteps, warnings });
        }
      } else {
        try {
          const invalidatedEvaluationResult = await evaluationService.invalidateEvaluationResult({
            evaluationResultId,
            notes: input.evaluation.terminalization.notes,
            metadata: input.metadata,
            expectedVersion: null
          });
          if (!invalidatedEvaluationResult) {
            throw new Error(`evaluation_result invalidate returned null for ${evaluationResultId}`);
          }
          outcomes.evaluationResultStatus = invalidatedEvaluationResult.status;
          completedSteps.push("evaluation_result_invalidate");
        } catch (error: unknown) {
          return failResult("evaluation_result_invalidate", error, { ids, completedSteps, warnings });
        }
      }

      if (input.researchRun && researchRunService) {
        const researchRunId = ids.researchRunId;
        if (!researchRunId) {
          return failResult(
            "research_run_record_evidence",
            new Error("research_run id missing after create"),
            { ids, completedSteps, warnings }
          );
        }

        try {
          const recordedRun = await researchRunService.recordResearchRunEvaluationResults({
            runId: researchRunId,
            evaluationResultIds: [evaluationResultId],
            metadata: input.metadata,
            expectedVersion: null
          });
          if (!recordedRun) {
            throw new Error(`research_run evidence recording returned null for ${researchRunId}`);
          }
          completedSteps.push("research_run_record_evidence");
        } catch (error: unknown) {
          return failResult("research_run_record_evidence", error, {
            ids,
            completedSteps,
            warnings
          });
        }

        try {
          const completedRun = await researchRunService.completeResearchRun({
            runId: researchRunId,
            ...input.researchRun.completion,
            metadata: input.metadata,
            expectedVersion: null
          });
          if (!completedRun) {
            throw new Error(`research_run complete returned null for ${researchRunId}`);
          }
          outcomes.researchRunStatus = completedRun.status;
          completedSteps.push("research_run_complete");
        } catch (error: unknown) {
          return failResult("research_run_complete", error, {
            ids,
            completedSteps,
            warnings
          });
        }
      }

      try {
        const pendingAggregate = await researchAggregationService.createPendingSetupAggregateResult({
          aggregate: input.aggregation.pendingAggregate,
          metadata: input.metadata
        });
        ids.setupAggregateResultId = pendingAggregate.id;
        completedSteps.push("setup_aggregate_result_create");

        const recomputedAggregate = await researchAggregationService.recomputeSetupAggregateResult({
          setupAggregateResultId: pendingAggregate.id,
          evaluationResultIds: input.aggregation.recomputeEvaluationResultIds,
          metadata: input.metadata,
          expectedVersion: null
        });
        if (!recomputedAggregate) {
          throw new Error(`setup_aggregate_result recompute returned null for ${pendingAggregate.id}`);
        }
        outcomes.setupAggregateResultStatus = recomputedAggregate.status;
        completedSteps.push("setup_aggregate_result_recompute");
      } catch (error: unknown) {
        warnings.push(
          `aggregation refresh requires manual retry: ${asErrorMessage(error)}`
        );
        return {
          status: "partial",
          ids,
          outcomes,
          completedSteps,
          warnings
        };
      }

      return {
        status: "completed",
        ids,
        outcomes,
        completedSteps,
        warnings
      };
    }
  };
};
