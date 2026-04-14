import type { JsonObject, TimestampUtc } from "../common.js";

export type DetectionToCandidateCommand = {
  setupDefinitionId: string;
  monitoredSymbolId: string;
  detectedAt: TimestampUtc;
  detectionHitId?: string;
  evidenceSummary: string;
  originRunId?: string;
  sourceMetadata?: JsonObject;
  candidateId?: string;
};
