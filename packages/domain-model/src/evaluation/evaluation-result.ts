import type { DomainEntityBase, TimestampUtc } from "../common.js";
import type { EvaluationMetrics } from "./evaluation-metrics.js";
import type { EvaluationOutcomeSummary, EvaluationStatus } from "./evaluation-status.js";

export type EvaluationResult = DomainEntityBase & {
  resultId: string;
  signalCandidateId: string;
  evaluationWindowId: string;
  evaluationInputId: string | null;
  status: EvaluationStatus;
  outcomeSummary: EvaluationOutcomeSummary | null;
  metrics: EvaluationMetrics | null;
  evaluatedAtUtc: TimestampUtc | null;
  limitations: string[];
  notes?: string;
};
