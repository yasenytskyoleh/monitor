import type { JsonObject, TimestampUtc } from "../common.js";

export type EvaluationWindowDescriptor = {
  purpose: string;
  durationValue: number;
  durationUnit: "minutes" | "hours" | "days";
};

export type SignalCandidateEvaluationTrigger = {
  signalCandidateId: string;
  setupDefinitionId: string;
  monitoredSymbolId: string;
  triggeredAt: TimestampUtc;
  evaluationWindowId?: string;
  evaluationWindowDescriptor?: EvaluationWindowDescriptor;
  originRunId?: string;
  triggerReason?: string;
  sourceMetadata?: JsonObject;
  evaluationResultId?: string;
};
