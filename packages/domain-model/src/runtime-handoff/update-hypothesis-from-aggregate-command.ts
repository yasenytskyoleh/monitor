import type { JsonObject, TimestampUtc } from "../common.js";
import type { EvidenceScopeDescriptor } from "./aggregate-hypothesis-evidence-trigger.js";

export type UpdateHypothesisFromAggregateCommand = {
  setupAggregateResultId: string;
  setupDefinitionId: string;
  researchHypothesisId: string;
  triggeredAt: TimestampUtc;
  evidenceScopeDescriptor: EvidenceScopeDescriptor;
  originRunId?: string;
  sourceMetadata?: JsonObject;
};
