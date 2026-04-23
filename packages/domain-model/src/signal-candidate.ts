import type { TimestampUtc } from "./common.js";

export const SIGNAL_CANDIDATE_STATUSES = [
  "detected",
  "under_review",
  "evaluated",
  "discarded"
] as const;
export type SignalCandidateStatus = (typeof SIGNAL_CANDIDATE_STATUSES)[number];

export type SignalCandidate = {
  id: string;
  setupDefinitionId: string;
  setupRevisionId: string;
  monitoredSymbolId: string;
  detectionHitId?: string;
  status: SignalCandidateStatus;
  detectedAt: TimestampUtc;
  evidenceSummary: string;
  originRunId?: string;
  createdAt: TimestampUtc;
  updatedAt: TimestampUtc;
};
