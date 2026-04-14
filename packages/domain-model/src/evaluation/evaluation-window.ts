import type { DomainEntityBase, TimestampUtc } from "../common.js";

export const EVALUATION_WINDOW_MODES = ["time_based"] as const;
export type EvaluationWindowMode = (typeof EVALUATION_WINDOW_MODES)[number];

export const EVALUATION_WINDOW_UNITS = ["minutes", "hours", "days"] as const;
export type EvaluationWindowUnit = (typeof EVALUATION_WINDOW_UNITS)[number];

export const EVALUATION_START_REFERENCE_RULES = ["signal_detected_at"] as const;
export type EvaluationStartReferenceRule = (typeof EVALUATION_START_REFERENCE_RULES)[number];

export type EvaluationWindow = DomainEntityBase & {
  windowId: string;
  signalCandidateId: string;
  mode: EvaluationWindowMode;
  purpose: string;
  startReferenceRule: EvaluationStartReferenceRule;
  startAtUtc: TimestampUtc;
  endAtUtc: TimestampUtc | null;
  durationValue: number | null;
  durationUnit: EvaluationWindowUnit | null;
  notes?: string;
};
