import type { DomainEntityBase, JsonObject, TimestampUtc } from "./common.js";

export const EVALUATION_WINDOW_UNITS = ["minutes", "hours", "days"] as const;
export type EvaluationWindowUnit = (typeof EVALUATION_WINDOW_UNITS)[number];

export const EVALUATION_OUTCOMES = ["win", "loss", "neutral", "invalidated", "no_data"] as const;
export type EvaluationOutcome = (typeof EVALUATION_OUTCOMES)[number];

export type EvaluationWindow = DomainEntityBase & {
  windowId: string;
  candidateId: string;
  horizonValue: number;
  horizonUnit: EvaluationWindowUnit;
  startAtUtc: TimestampUtc;
  endAtUtc: TimestampUtc;
};

export type EvaluationResult = DomainEntityBase & {
  resultId: string;
  candidateId: string;
  windowId: string;
  outcome: EvaluationOutcome;
  evaluatedAtUtc: TimestampUtc;
  returnPct: number | null;
  maxFavorableExcursionPct: number | null;
  maxAdverseExcursionPct: number | null;
  context?: JsonObject;
  notes?: string;
};
