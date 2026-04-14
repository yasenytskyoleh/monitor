import type { SetupToAggregateFlowInput } from "./application-flow-input.js";
import type { FlowStepName, SetupToAggregateFlowResult } from "./application-flow-result.js";
import type { EvaluationService } from "../services/evaluation-service.js";
import type { ResearchAggregationService } from "../services/research-aggregation-service.js";
import type { ResearchService } from "../services/research-service.js";
import type { SetupDefinitionService } from "../services/setup-definition-service.js";
import type { SignalCandidateService } from "../services/signal-candidate-service.js";

export type SetupToAggregateFlowDependencies = {
  setupDefinitionService: SetupDefinitionService;
  researchService: ResearchService;
  signalCandidateService: SignalCandidateService;
  evaluationService: EvaluationService;
  researchAggregationService: ResearchAggregationService;
};

const asErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "unknown flow error";

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
    signalCandidateService,
    evaluationService,
    researchAggregationService
  } = dependencies;

  return {
    async run(input: SetupToAggregateFlowInput): Promise<SetupToAggregateFlowResult> {
      const ids: SetupToAggregateFlowResult["ids"] = {};
      const completedSteps: FlowStepName[] = [];
      const warnings: string[] = [];
      let evaluationResultId: string | null = null;

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
        completedSteps.push("evaluation_result_finalize");
      } catch (error: unknown) {
        return failResult("evaluation_result_finalize", error, { ids, completedSteps, warnings });
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
        completedSteps.push("setup_aggregate_result_recompute");
      } catch (error: unknown) {
        warnings.push(
          `aggregation refresh requires manual retry: ${asErrorMessage(error)}`
        );
        return {
          status: "partial",
          ids,
          completedSteps,
          warnings
        };
      }

      return {
        status: "completed",
        ids,
        completedSteps,
        warnings
      };
    }
  };
};
