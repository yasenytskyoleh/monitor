import type { JsonObject, TimestampUtc } from "../common.js";
import type { HypothesisEvidenceStatus } from "../research/research-hypothesis-link.js";

export type HypothesisFeedbackDecisionTrigger = {
  researchHypothesisId: string;
  setupDefinitionId: string;
  latestEvidenceStatus: HypothesisEvidenceStatus;
  setupAggregateResultId?: string;
  triggeredAt: TimestampUtc;
  evidenceSummary?: string;
  originRunId?: string;
  sourceMetadata?: JsonObject;
};
