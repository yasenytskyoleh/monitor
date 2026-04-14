import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";
import type { SetupAggregateResultRepository } from "../repositories/setup-aggregate-result-repository.js";
import type { SetupDefinitionRepository } from "../repositories/setup-definition-repository.js";
import type { ResearchHypothesisRepository } from "../repositories/research-hypothesis-repository.js";
import {
  HYPOTHESIS_EVIDENCE_STATUSES
} from "../research/research-hypothesis-link.js";
import {
  ResearchHypothesisValidationError,
  type ResearchService
} from "../services/research-service.js";
import type { FeedbackDecisionResult } from "./feedback-decision-result.js";
import type { HypothesisFeedbackDecisionTrigger } from "./hypothesis-feedback-decision-trigger.js";
import type { ReviewSetupFromEvidenceCommand } from "./review-setup-from-evidence-command.js";

export type HypothesisEvidenceToSetupFeedbackDependencies = {
  researchService: Pick<ResearchService, "reviewSetupFromEvidence">;
  setupDefinitionRepository: Pick<SetupDefinitionRepository, "getById">;
  researchHypothesisRepository: Pick<ResearchHypothesisRepository, "getById">;
  setupAggregateResultRepository: Pick<SetupAggregateResultRepository, "getById">;
};

const assertRequired = (value: string | undefined, fieldName: string): void => {
  if (!value || !value.trim()) {
    throw new Error(`${fieldName} is required`);
  }
};

const asErrorMessage = (error: unknown): string =>
  error instanceof Error
    ? error.message
    : "unexpected hypothesis-evidence feedback decision trigger failure";

export const createHypothesisEvidenceToSetupFeedbackHandoff = (
  dependencies: HypothesisEvidenceToSetupFeedbackDependencies
): {
  review(
    trigger: HypothesisFeedbackDecisionTrigger,
    metadata: ProductRecordMetadata
  ): Promise<FeedbackDecisionResult>;
} => {
  const {
    researchService,
    setupDefinitionRepository,
    researchHypothesisRepository,
    setupAggregateResultRepository
  } = dependencies;

  return {
    async review(trigger, metadata): Promise<FeedbackDecisionResult> {
      let command: ReviewSetupFromEvidenceCommand | null = null;
      try {
        assertRequired(trigger.researchHypothesisId, "researchHypothesisId");
        assertRequired(trigger.setupDefinitionId, "setupDefinitionId");
        assertRequired(trigger.triggeredAt, "triggeredAt");

        if (!HYPOTHESIS_EVIDENCE_STATUSES.includes(trigger.latestEvidenceStatus)) {
          return {
            status: "rejected_validation",
            reason: `invalid latestEvidenceStatus: ${trigger.latestEvidenceStatus}`,
            warnings: []
          };
        }

        const hypothesis = await researchHypothesisRepository.getById(trigger.researchHypothesisId);
        if (!hypothesis) {
          return {
            status: "rejected_validation",
            reason: `research_hypothesis not found: ${trigger.researchHypothesisId}`,
            warnings: []
          };
        }

        const setupDefinition = await setupDefinitionRepository.getById(trigger.setupDefinitionId);
        if (!setupDefinition) {
          return {
            status: "rejected_validation",
            researchHypothesisId: trigger.researchHypothesisId,
            reason: `setup_definition not found: ${trigger.setupDefinitionId}`,
            warnings: []
          };
        }

        if (!hypothesis.relatedSetupDefinitionIds.includes(setupDefinition.id)) {
          return {
            status: "rejected_linkage",
            researchHypothesisId: hypothesis.id,
            setupDefinitionId: setupDefinition.id,
            reason: `research_hypothesis is not linked to setup_definition: ${setupDefinition.id}`,
            warnings: []
          };
        }

        if (trigger.setupAggregateResultId) {
          const aggregateResult = await setupAggregateResultRepository.getById(
            trigger.setupAggregateResultId
          );
          if (!aggregateResult) {
            return {
              status: "rejected_validation",
              researchHypothesisId: hypothesis.id,
              setupDefinitionId: setupDefinition.id,
              reason: `setup_aggregate_result not found: ${trigger.setupAggregateResultId}`,
              warnings: []
            };
          }

          if (aggregateResult.setupDefinitionId !== setupDefinition.id) {
            return {
              status: "rejected_validation",
              researchHypothesisId: hypothesis.id,
              setupDefinitionId: setupDefinition.id,
              setupAggregateResultId: aggregateResult.id,
              reason: "setup_aggregate_result / setup_definition mismatch in feedback trigger",
              warnings: []
            };
          }
        }

        command = {
          researchHypothesisId: trigger.researchHypothesisId,
          setupDefinitionId: trigger.setupDefinitionId,
          latestEvidenceStatus: trigger.latestEvidenceStatus,
          setupAggregateResultId: trigger.setupAggregateResultId,
          triggeredAt: trigger.triggeredAt,
          evidenceSummary: trigger.evidenceSummary,
          originRunId: trigger.originRunId,
          sourceMetadata: trigger.sourceMetadata
        };

        const review = await researchService.reviewSetupFromEvidence({
          researchHypothesisId: command.researchHypothesisId,
          setupDefinitionId: command.setupDefinitionId,
          latestEvidenceStatus: command.latestEvidenceStatus,
          setupAggregateResultId: command.setupAggregateResultId,
          triggeredAt: command.triggeredAt,
          evidenceSummary: command.evidenceSummary,
          originRunId: command.originRunId,
          sourceMetadata: command.sourceMetadata,
          metadata,
          expectedVersion: null
        });

        if (!review) {
          return {
            status: "rejected_linkage",
            researchHypothesisId: command.researchHypothesisId,
            setupDefinitionId: command.setupDefinitionId,
            setupAggregateResultId: command.setupAggregateResultId,
            reason: `research_hypothesis not found: ${command.researchHypothesisId}`,
            warnings: []
          };
        }

        const decision = review.decision;

        return {
          status: "recorded",
          researchFeedbackDecisionId: decision.id,
          researchHypothesisId: decision.researchHypothesisId,
          setupDefinitionId: decision.setupDefinitionId,
          setupAggregateResultId: decision.setupAggregateResultId,
          evidenceStatus: decision.evidenceStatus,
          recommendedAction: decision.recommendedAction,
          decisionStatus: decision.decisionStatus,
          rationaleSummary: decision.rationaleSummary,
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
            researchHypothesisId: command.researchHypothesisId,
            setupDefinitionId: command.setupDefinitionId,
            setupAggregateResultId: command.setupAggregateResultId,
            reason: error.message,
            warnings: []
          };
        }

        return {
          status: "failed",
          researchHypothesisId: command.researchHypothesisId,
          setupDefinitionId: command.setupDefinitionId,
          setupAggregateResultId: command.setupAggregateResultId,
          reason: asErrorMessage(error),
          warnings: [
            "feedback decision can be retried after resolving hypothesis-evidence handoff failure"
          ]
        };
      }
    }
  };
};
