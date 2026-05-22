import type { SignalCandidateStatus } from "../signal-candidate.js";
import type { EvaluationStatus } from "../evaluation/evaluation-status.js";
import type { DurableRelationalRecordBase } from "./first-durable-relational-slice.js";

export const SIGNAL_EVALUATION_RELATIONAL_ENTITY_TYPES = [
  "signal_candidate",
  "evaluation_result"
] as const;
export type SignalEvaluationRelationalEntityType =
  (typeof SIGNAL_EVALUATION_RELATIONAL_ENTITY_TYPES)[number];

export type SignalCandidateDurableRecord = DurableRelationalRecordBase<"signal_candidate"> & {
  candidateStatus: SignalCandidateStatus;
  setupDefinitionId: string;
  setupRevisionId: string;
  monitoredSymbolId: string;
  detectionHitId: string | null;
  detectedAtUtc: string;
  evidenceSummary: string;
  candidateOriginRunId: string | null;
};

export type EvaluationResultDurableRecord = DurableRelationalRecordBase<"evaluation_result"> & {
  evaluationStatus: EvaluationStatus;
  signalCandidateId: string;
  evaluationWindowId: string;
  referencePrice: number | null;
  finalPrice: number | null;
  highInWindow: number | null;
  lowInWindow: number | null;
  absoluteMove: number | null;
  percentageMove: number | null;
  maxFavorableExcursion: number | null;
  maxAdverseExcursion: number | null;
  evaluatedAtUtc: string | null;
  notes: string | null;
};

export type SignalEvaluationRelationalRecord =
  | SignalCandidateDurableRecord
  | EvaluationResultDurableRecord;
