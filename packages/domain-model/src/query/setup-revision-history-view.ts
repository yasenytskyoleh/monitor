import type { EvaluationResult } from "../evaluation.js";
import type { SetupDefinitionStatus } from "../setup-definition.js";
import type { SignalCandidate } from "../signal-candidate.js";
import type { SetupAggregateResult } from "../research/setup-aggregate-result.js";
import type { SetupDefinitionRevisionStatus } from "../review/setup-definition-revision.js";

export type SetupRevisionHistoryGroup = {
  setupRevisionId: string;
  setupDefinitionId: string;
  setupFamilyId: string;
  version: number;
  revisionStatus: SetupDefinitionRevisionStatus;
  setupDefinitionStatus: SetupDefinitionStatus | "missing_setup_definition";
  candidates: SignalCandidate[];
  evaluations: EvaluationResult[];
  aggregates: SetupAggregateResult[];
  counts: {
    candidateCount: number;
    evaluationCount: number;
    aggregateCount: number;
  };
};

export type SetupRevisionHistoryView = {
  mode: "family_history" | "family_comparison";
  setupFamilyId: string;
  revisionGroups: SetupRevisionHistoryGroup[];
  totals: {
    revisionCount: number;
    candidateCount: number;
    evaluationCount: number;
    aggregateCount: number;
  };
};

export type RevisionCandidateHistoryView = {
  setupFamilyId: string;
  setupRevisionId: string;
  setupDefinitionId: string;
  version: number;
  candidates: SignalCandidate[];
  count: number;
};

export type RevisionEvaluationHistoryView = {
  setupFamilyId: string;
  setupRevisionId: string;
  setupDefinitionId: string;
  version: number;
  evaluations: EvaluationResult[];
  count: number;
};

export type RevisionAggregateHistoryView = {
  setupFamilyId: string;
  setupRevisionId: string;
  setupDefinitionId: string;
  version: number;
  aggregates: SetupAggregateResult[];
  count: number;
};
