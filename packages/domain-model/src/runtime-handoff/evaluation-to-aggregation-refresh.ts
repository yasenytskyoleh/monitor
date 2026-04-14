import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";
import type { ResearchAggregationService } from "../services/research-aggregation-service.js";
import type { EvaluationResultRepository } from "../repositories/evaluation-result-repository.js";
import type { SignalCandidateRepository } from "../repositories/signal-candidate-repository.js";
import type { SetupAggregateResultRepository } from "../repositories/setup-aggregate-result-repository.js";
import type { EvaluationAggregationRefreshTrigger } from "./evaluation-aggregation-refresh-trigger.js";
import type { AggregationRefreshResult } from "./aggregation-refresh-result.js";
import type { RefreshAggregateFromEvaluationCommand } from "./refresh-aggregate-from-evaluation-command.js";
import type { AggregationScope } from "../research/aggregation-scope.js";
import { SetupAggregateResultValidationError } from "../services/research-aggregation-service.js";

export type EvaluationToAggregationRefreshDependencies = {
  researchAggregationService: ResearchAggregationService;
  evaluationResultRepository: Pick<EvaluationResultRepository, "getById" | "listByEvaluationWindowId">;
  signalCandidateRepository: Pick<SignalCandidateRepository, "getById">;
  setupAggregateResultRepository: Pick<SetupAggregateResultRepository, "getBySetupDefinitionAndScope">;
};

const DEFAULT_SCOPE_RANGE: AggregationScope["timeRange"] = {
  startAtUtc: "1970-01-01T00:00:00.000Z",
  endAtUtc: "9999-12-31T23:59:59.999Z"
};

const assertRequired = (value: string | undefined, fieldName: string): void => {
  if (!value || !value.trim()) {
    throw new Error(`${fieldName} is required`);
  }
};

const asErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "unexpected aggregation-refresh trigger failure";

const resolveAggregationScope = (
  trigger: EvaluationAggregationRefreshTrigger,
  defaultWindowId: string,
  defaultSymbolId: string
): AggregationScope => ({
  setupDefinitionId: trigger.setupDefinitionId,
  evaluationWindowId: trigger.aggregationScopeDescriptor?.evaluationWindowId ?? defaultWindowId,
  symbolScope: trigger.aggregationScopeDescriptor?.symbolScope ?? {
    kind: "single_symbol",
    symbolIds: [defaultSymbolId]
  },
  timeRange: trigger.aggregationScopeDescriptor?.timeRange ?? DEFAULT_SCOPE_RANGE,
  hypothesisId: trigger.researchHypothesisId
});

const buildAggregateId = (command: RefreshAggregateFromEvaluationCommand): string =>
  `aggregate-${command.setupDefinitionId}-${command.aggregationScope.evaluationWindowId ?? "mixed"}-${JSON.stringify(command.aggregationScope.symbolScope)}`;

export const createEvaluationToAggregationRefreshHandoff = (
  dependencies: EvaluationToAggregationRefreshDependencies
): {
  refresh(
    trigger: EvaluationAggregationRefreshTrigger,
    metadata: ProductRecordMetadata
  ): Promise<AggregationRefreshResult>;
} => {
  const {
    researchAggregationService,
    evaluationResultRepository,
    signalCandidateRepository,
    setupAggregateResultRepository
  } = dependencies;

  return {
    async refresh(trigger, metadata): Promise<AggregationRefreshResult> {
      let command: RefreshAggregateFromEvaluationCommand;
      try {
        assertRequired(trigger.evaluationResultId, "evaluationResultId");
        assertRequired(trigger.signalCandidateId, "signalCandidateId");
        assertRequired(trigger.setupDefinitionId, "setupDefinitionId");
        assertRequired(trigger.triggeredAt, "triggeredAt");

        const evaluationResult = await evaluationResultRepository.getById(trigger.evaluationResultId);
        if (!evaluationResult) {
          return {
            status: "rejected_validation",
            reason: `evaluation_result not found: ${trigger.evaluationResultId}`,
            warnings: []
          };
        }

        if (evaluationResult.status !== "completed") {
          return {
            status: "rejected_lifecycle",
            reason: `evaluation_result status does not allow aggregation refresh: ${evaluationResult.status}`,
            warnings: []
          };
        }

        if (evaluationResult.signalCandidateId !== trigger.signalCandidateId) {
          return {
            status: "rejected_validation",
            reason: "evaluation result / signal candidate mismatch in refresh trigger",
            warnings: []
          };
        }

        const signalCandidate = await signalCandidateRepository.getById(trigger.signalCandidateId);
        if (!signalCandidate) {
          return {
            status: "rejected_validation",
            reason: `signal_candidate not found: ${trigger.signalCandidateId}`,
            warnings: []
          };
        }

        if (signalCandidate.setupDefinitionId !== trigger.setupDefinitionId) {
          return {
            status: "rejected_validation",
            reason: "signal candidate / setup definition mismatch in refresh trigger",
            warnings: []
          };
        }

        command = {
          evaluationResultId: trigger.evaluationResultId,
          signalCandidateId: trigger.signalCandidateId,
          setupDefinitionId: trigger.setupDefinitionId,
          researchHypothesisId: trigger.researchHypothesisId,
          aggregationScope: resolveAggregationScope(
            trigger,
            evaluationResult.evaluationWindowId,
            signalCandidate.monitoredSymbolId
          ),
          triggeredAt: trigger.triggeredAt,
          originRunId: trigger.originRunId
        };
      } catch (error: unknown) {
        return {
          status: "rejected_validation",
          reason: asErrorMessage(error),
          warnings: []
        };
      }

      const windowEvaluationResults = await evaluationResultRepository.listByEvaluationWindowId(
        command.aggregationScope.evaluationWindowId ?? ""
      );
      const relevantEvaluationResultIds: string[] = [];
      for (const evaluationResult of windowEvaluationResults) {
        if (evaluationResult.status !== "completed") {
          continue;
        }
        const candidate = await signalCandidateRepository.getById(evaluationResult.signalCandidateId);
        if (!candidate || candidate.setupDefinitionId !== command.setupDefinitionId) {
          continue;
        }

        const symbolScope = command.aggregationScope.symbolScope;
        if (
          symbolScope.kind === "single_symbol" &&
          !symbolScope.symbolIds.includes(candidate.monitoredSymbolId)
        ) {
          continue;
        }

        if (
          symbolScope.kind === "symbol_set" &&
          symbolScope.symbolIds.length > 0 &&
          !symbolScope.symbolIds.includes(candidate.monitoredSymbolId)
        ) {
          continue;
        }

        relevantEvaluationResultIds.push(evaluationResult.id);
      }

      if (!relevantEvaluationResultIds.includes(command.evaluationResultId)) {
        relevantEvaluationResultIds.push(command.evaluationResultId);
      }

      try {
        const existingAggregate = await setupAggregateResultRepository.getBySetupDefinitionAndScope(
          command.setupDefinitionId,
          command.aggregationScope
        );

        if (!existingAggregate) {
          const pendingAggregate = await researchAggregationService.createPendingSetupAggregateResult({
            aggregate: {
              id: buildAggregateId(command),
              setupDefinitionId: command.setupDefinitionId,
              researchHypothesisId: command.researchHypothesisId,
              aggregationScope: command.aggregationScope,
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
              createdAt: command.triggeredAt,
              updatedAt: command.triggeredAt
            },
            metadata
          });

          await researchAggregationService.recomputeSetupAggregateResult({
            setupAggregateResultId: pendingAggregate.id,
            evaluationResultIds: relevantEvaluationResultIds,
            metadata,
            expectedVersion: null
          });

          return {
            status: "created_and_refreshed",
            setupAggregateResultId: pendingAggregate.id,
            aggregationScope: command.aggregationScope,
            warnings: []
          };
        }

        await researchAggregationService.recomputeSetupAggregateResult({
          setupAggregateResultId: existingAggregate.id,
          evaluationResultIds: relevantEvaluationResultIds,
          metadata,
          expectedVersion: null
        });

        return {
          status: "refreshed_existing",
          setupAggregateResultId: existingAggregate.id,
          aggregationScope: command.aggregationScope,
          warnings: []
        };
      } catch (error: unknown) {
        if (error instanceof SetupAggregateResultValidationError) {
          return {
            status: "rejected_validation",
            aggregationScope: command.aggregationScope,
            reason: error.message,
            warnings: []
          };
        }

        return {
          status: "failed",
          aggregationScope: command.aggregationScope,
          reason: asErrorMessage(error),
          warnings: [
            "aggregation refresh can be retried after resolving runtime handoff failure"
          ]
        };
      }
    }
  };
};
