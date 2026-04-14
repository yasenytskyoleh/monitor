import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";
import type { ResearchHypothesisRepository } from "../repositories/research-hypothesis-repository.js";
import type { SetupAggregateResultRepository } from "../repositories/setup-aggregate-result-repository.js";
import {
  ResearchHypothesisValidationError,
  type ResearchService
} from "../services/research-service.js";
import type { AggregateHypothesisEvidenceTrigger } from "./aggregate-hypothesis-evidence-trigger.js";
import type { EvidenceScopeDescriptor } from "./aggregate-hypothesis-evidence-trigger.js";
import type { HypothesisEvidenceUpdateResult } from "./hypothesis-evidence-update-result.js";
import type { UpdateHypothesisFromAggregateCommand } from "./update-hypothesis-from-aggregate-command.js";

export type AggregateToHypothesisEvidenceDependencies = {
  researchService: Pick<ResearchService, "updateHypothesisEvidence">;
  setupAggregateResultRepository: Pick<SetupAggregateResultRepository, "getById">;
  researchHypothesisRepository: Pick<ResearchHypothesisRepository, "getById">;
};

const assertRequired = (value: string | undefined, fieldName: string): void => {
  if (!value || !value.trim()) {
    throw new Error(`${fieldName} is required`);
  }
};

const asErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "unexpected aggregate-to-hypothesis evidence trigger failure";

const resolveEvidenceScopeDescriptor = (
  trigger: AggregateHypothesisEvidenceTrigger,
  aggregateScope: {
    evaluationWindowId: string | null;
    symbolScope: EvidenceScopeDescriptor["symbolScope"];
    timeRange: EvidenceScopeDescriptor["timeRange"];
  }
): EvidenceScopeDescriptor => ({
  evaluationWindowId:
    trigger.evidenceScopeDescriptor?.evaluationWindowId ?? aggregateScope.evaluationWindowId,
  symbolScope: trigger.evidenceScopeDescriptor?.symbolScope ?? aggregateScope.symbolScope,
  timeRange: trigger.evidenceScopeDescriptor?.timeRange ?? aggregateScope.timeRange
});

export const createAggregateToHypothesisEvidenceHandoff = (
  dependencies: AggregateToHypothesisEvidenceDependencies
): {
  update(
    trigger: AggregateHypothesisEvidenceTrigger,
    metadata: ProductRecordMetadata
  ): Promise<HypothesisEvidenceUpdateResult>;
} => {
  const {
    researchService,
    setupAggregateResultRepository,
    researchHypothesisRepository
  } = dependencies;

  return {
    async update(trigger, metadata): Promise<HypothesisEvidenceUpdateResult> {
      let command: UpdateHypothesisFromAggregateCommand | null = null;
      try {
        assertRequired(trigger.setupAggregateResultId, "setupAggregateResultId");
        assertRequired(trigger.setupDefinitionId, "setupDefinitionId");
        assertRequired(trigger.triggeredAt, "triggeredAt");

        const aggregateResult = await setupAggregateResultRepository.getById(
          trigger.setupAggregateResultId
        );
        if (!aggregateResult) {
          return {
            status: "rejected_validation",
            reason: `setup_aggregate_result not found: ${trigger.setupAggregateResultId}`,
            warnings: []
          };
        }

        if (aggregateResult.setupDefinitionId !== trigger.setupDefinitionId) {
          return {
            status: "rejected_validation",
            setupAggregateResultId: aggregateResult.id,
            reason: "setup_aggregate_result / setup_definition mismatch in evidence trigger",
            warnings: []
          };
        }

        if (aggregateResult.status !== "completed") {
          return {
            status: "rejected_lifecycle",
            setupAggregateResultId: aggregateResult.id,
            reason: `setup_aggregate_result status does not allow hypothesis evidence update: ${aggregateResult.status}`,
            warnings: []
          };
        }

        if (
          trigger.researchHypothesisId &&
          aggregateResult.researchHypothesisId &&
          trigger.researchHypothesisId !== aggregateResult.researchHypothesisId
        ) {
          return {
            status: "rejected_validation",
            setupAggregateResultId: aggregateResult.id,
            reason: "aggregate / hypothesis mismatch in evidence trigger",
            warnings: []
          };
        }

        const researchHypothesisId =
          trigger.researchHypothesisId ?? aggregateResult.researchHypothesisId;
        if (!researchHypothesisId) {
          return {
            status: "rejected_linkage",
            setupAggregateResultId: aggregateResult.id,
            reason: "no linked research_hypothesis for aggregate evidence trigger",
            warnings: []
          };
        }

        const hypothesis = await researchHypothesisRepository.getById(researchHypothesisId);
        if (!hypothesis) {
          return {
            status: "rejected_linkage",
            setupAggregateResultId: aggregateResult.id,
            researchHypothesisId,
            reason: `research_hypothesis not found: ${researchHypothesisId}`,
            warnings: []
          };
        }

        if (!hypothesis.relatedSetupDefinitionIds.includes(trigger.setupDefinitionId)) {
          return {
            status: "rejected_linkage",
            setupAggregateResultId: aggregateResult.id,
            researchHypothesisId,
            reason: `research_hypothesis is not linked to setup_definition: ${trigger.setupDefinitionId}`,
            warnings: []
          };
        }

        command = {
          setupAggregateResultId: aggregateResult.id,
          setupDefinitionId: trigger.setupDefinitionId,
          researchHypothesisId,
          triggeredAt: trigger.triggeredAt,
          evidenceScopeDescriptor: resolveEvidenceScopeDescriptor(trigger, {
            evaluationWindowId: aggregateResult.aggregationScope.evaluationWindowId,
            symbolScope: aggregateResult.aggregationScope.symbolScope,
            timeRange: aggregateResult.aggregationScope.timeRange
          }),
          originRunId: trigger.originRunId,
          sourceMetadata: trigger.sourceMetadata
        };

        const evidenceUpdate = await researchService.updateHypothesisEvidence({
          researchHypothesisId: command.researchHypothesisId,
          setupAggregateResultId: command.setupAggregateResultId,
          setupDefinitionId: command.setupDefinitionId,
          aggregateStatus: aggregateResult.status,
          completedEvaluations: aggregateResult.completedEvaluations,
          positiveOutcomeCount: aggregateResult.positiveOutcomeCount,
          averageFinalOutcome: aggregateResult.averageFinalOutcome,
          averagePercentageMove: aggregateResult.averagePercentageMove,
          assessedAt: command.triggeredAt,
          evidenceScopeDescriptor: command.evidenceScopeDescriptor,
          originRunId: command.originRunId,
          sourceMetadata: command.sourceMetadata,
          metadata,
          expectedVersion: null
        });

        if (!evidenceUpdate) {
          return {
            status: "rejected_linkage",
            setupAggregateResultId: command.setupAggregateResultId,
            researchHypothesisId: command.researchHypothesisId,
            reason: `research_hypothesis not found: ${command.researchHypothesisId}`,
            warnings: []
          };
        }

        return {
          status: "updated",
          setupAggregateResultId: command.setupAggregateResultId,
          researchHypothesisId: evidenceUpdate.hypothesis.id,
          evidenceStatus: evidenceUpdate.evidenceStatus,
          evidenceSummary: evidenceUpdate.evidenceSummary,
          warnings: []
        };
      } catch (error: unknown) {
        if (!command) {
          return {
            status: "rejected_validation",
            reason: asErrorMessage(error),
            warnings: []
          };
        }

        if (error instanceof ResearchHypothesisValidationError) {
          return {
            status: "rejected_validation",
            setupAggregateResultId: command.setupAggregateResultId,
            researchHypothesisId: command.researchHypothesisId,
            reason: error.message,
            warnings: []
          };
        }

        return {
          status: "failed",
          setupAggregateResultId: command.setupAggregateResultId,
          researchHypothesisId: command.researchHypothesisId,
          reason: asErrorMessage(error),
          warnings: [
            "aggregate-to-hypothesis evidence update can be retried after resolving runtime handoff failure"
          ]
        };
      }
    }
  };
};
