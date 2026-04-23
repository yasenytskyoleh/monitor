import type { TimestampUtc } from "../common.js";

export type StartEvaluationCommand = {
  signalCandidateId: string;
  setupDefinitionId: string;
  setupRevisionId: string;
  monitoredSymbolId: string;
  evaluationWindowId: string;
  triggeredAt: TimestampUtc;
  originRunId?: string;
  triggerReason?: string;
  evaluationResultId?: string;
};
