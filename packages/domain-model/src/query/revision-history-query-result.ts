import type {
  RevisionAggregateHistoryView,
  RevisionCandidateHistoryView,
  RevisionEvaluationHistoryView,
  SetupRevisionHistoryView
} from "./setup-revision-history-view.js";

export const REVISION_HISTORY_QUERY_STATUSES = ["resolved", "rejected", "failed"] as const;

export type RevisionHistoryQueryStatus = (typeof REVISION_HISTORY_QUERY_STATUSES)[number];

export type RevisionHistoryQueryResult = {
  status: RevisionHistoryQueryStatus;
  setupFamilyId?: string;
  setupRevisionId?: string;
  familyHistory?: SetupRevisionHistoryView;
  candidateHistory?: RevisionCandidateHistoryView;
  evaluationHistory?: RevisionEvaluationHistoryView;
  aggregateHistory?: RevisionAggregateHistoryView;
  reason?: string;
  warnings: string[];
};
