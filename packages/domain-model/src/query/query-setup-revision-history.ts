import type { TimestampUtc } from "../common.js";
import type { EvaluationStatus } from "../evaluation.js";
import type { SetupDefinitionRevisionStatus } from "../review/setup-definition-revision.js";
import type { AggregateComputationStatus } from "../research/setup-aggregate-result.js";
import type { SignalCandidateStatus } from "../signal-candidate.js";

export const SETUP_REVISION_HISTORY_QUERY_MODES = [
  "family_history",
  "single_revision",
  "family_comparison"
] as const;

export type SetupRevisionHistoryQueryMode =
  (typeof SETUP_REVISION_HISTORY_QUERY_MODES)[number];

export type QueryTimeRange = {
  startAtUtc?: TimestampUtc;
  endAtUtc?: TimestampUtc;
};

export type QuerySetupRevisionHistory = {
  mode: SetupRevisionHistoryQueryMode;
  setupFamilyId?: string;
  setupRevisionId?: string;
  revisionStatuses?: SetupDefinitionRevisionStatus[];
  candidateStatuses?: SignalCandidateStatus[];
  evaluationStatuses?: EvaluationStatus[];
  aggregateStatuses?: AggregateComputationStatus[];
  timeRange?: QueryTimeRange;
  symbolId?: string;
  includeSuperseded?: boolean;
};
