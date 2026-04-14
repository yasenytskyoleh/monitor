import type { TimestampUtc } from "../common.js";
import type { EvaluationStatus } from "./evaluation-status.js";

export type EvaluationResult = {
  id: string;
  signalCandidateId: string;
  evaluationWindowId: string;
  status: EvaluationStatus;
  referencePrice: number | null;
  finalPrice: number | null;
  highInWindow: number | null;
  lowInWindow: number | null;
  absoluteMove: number | null;
  percentageMove: number | null;
  maxFavorableExcursion: number | null;
  maxAdverseExcursion: number | null;
  evaluatedAt: TimestampUtc | null;
  notes?: string;
  createdAt: TimestampUtc;
  updatedAt: TimestampUtc;
};
