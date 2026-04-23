import type { EvaluationResult } from "../evaluation.js";
import type { EvaluationResultRepository } from "../repositories/evaluation-result-repository.js";
import type { ResearchDecisionApprovalRepository } from "../repositories/research-decision-approval-repository.js";
import type { ResearchFeedbackDecisionRepository } from "../repositories/research-feedback-decision-repository.js";
import type { ResearchHypothesisRepository } from "../repositories/research-hypothesis-repository.js";
import type { SetupAggregateResultRepository } from "../repositories/setup-aggregate-result-repository.js";
import type { SetupDefinitionRepository } from "../repositories/setup-definition-repository.js";
import type { SetupDefinitionRevisionRepository } from "../repositories/setup-definition-revision-repository.js";
import type { SignalCandidateRepository } from "../repositories/signal-candidate-repository.js";
import type { ResearchHypothesis } from "../research-hypothesis.js";
import type { ResearchFeedbackDecision } from "../research/research-feedback-decision.js";
import type { SetupAggregateResult } from "../research/setup-aggregate-result.js";
import type { ResearchDecisionApproval } from "../review/research-decision-approval.js";
import type { SetupDefinitionRevision } from "../review/setup-definition-revision.js";
import type { SignalCandidate } from "../signal-candidate.js";
import type {
  CompareSetupRevisionsCommand,
  RevisionComparisonScopeDescriptor
} from "./compare-setup-revisions-command.js";
import type { BuildResearchReviewPacketCommand } from "./build-research-review-packet-command.js";
import type { BuildSetupRevisionImpactSummaryCommand } from "./build-setup-revision-impact-summary-command.js";
import type { QueryAggregateEvidenceByRevisionScope } from "./query-aggregate-evidence-by-revision-scope.js";
import type { QueryEvaluationResultsByRevision } from "./query-evaluation-results-by-revision.js";
import type {
  QuerySetupRevisionHistory,
  QueryTimeRange
} from "./query-setup-revision-history.js";
import type { QuerySignalCandidatesByRevision } from "./query-signal-candidates-by-revision.js";
import type { RevisionImpactClassification } from "./revision-impact-classification.js";
import type { RevisionComparisonResult } from "./revision-comparison-result.js";
import type {
  RevisionComparisonMetricDeltas,
  RevisionComparisonMetrics
} from "./revision-comparison-metrics.js";
import type { RevisionImpactSummaryResult } from "./revision-impact-summary-result.js";
import type { RevisionHistoryQueryResult } from "./revision-history-query-result.js";
import type { ResearchReviewPacket } from "./research-review-packet.js";
import type { ResearchReviewPacketResult } from "./research-review-packet-result.js";
import type { SetupRevisionComparison } from "./setup-revision-comparison.js";
import type {
  RevisionEvidenceSufficiencyLevel,
  RevisionImpactKeyMetricChanges,
  SetupRevisionImpactSummary
} from "./setup-revision-impact-summary.js";
import type {
  RevisionAggregateHistoryView,
  RevisionCandidateHistoryView,
  RevisionEvaluationHistoryView,
  SetupRevisionHistoryGroup,
  SetupRevisionHistoryView
} from "./setup-revision-history-view.js";

export type SetupDefinitionQueryService = {
  queryHistory(query: QuerySetupRevisionHistory): Promise<RevisionHistoryQueryResult>;
  getFamilyHistory(query: QuerySetupRevisionHistory): Promise<RevisionHistoryQueryResult>;
};

export type SignalCandidateQueryService = {
  getByRevision(query: QuerySignalCandidatesByRevision): Promise<RevisionHistoryQueryResult>;
};

export type EvaluationQueryService = {
  getEvaluationsByRevision(query: QueryEvaluationResultsByRevision): Promise<RevisionHistoryQueryResult>;
};

export type AggregateEvidenceQueryService = {
  getByRevisionScope(query: QueryAggregateEvidenceByRevisionScope): Promise<RevisionHistoryQueryResult>;
};

export type SetupComparisonQueryService = {
  compareRevisions(command: CompareSetupRevisionsCommand): Promise<RevisionComparisonResult>;
};

export type SetupComparisonSummaryService = {
  buildImpactSummary(command: BuildSetupRevisionImpactSummaryCommand): Promise<RevisionImpactSummaryResult>;
};

export type ResearchReviewPacketService = {
  buildReviewPacket(command: BuildResearchReviewPacketCommand): Promise<ResearchReviewPacketResult>;
};

export type RevisionHistoryQueryService = SetupDefinitionQueryService &
  SignalCandidateQueryService &
  EvaluationQueryService &
  AggregateEvidenceQueryService &
  SetupComparisonQueryService &
  SetupComparisonSummaryService &
  ResearchReviewPacketService;

export type RevisionHistoryQueryServiceDependencies = {
  setupDefinitionRevisionRepository: Pick<
    SetupDefinitionRevisionRepository,
    "getById" | "getLatestBySetupFamilyId" | "listBySetupFamilyId"
  >;
  setupDefinitionRepository: Pick<SetupDefinitionRepository, "getById">;
  signalCandidateRepository: Pick<SignalCandidateRepository, "listBySetupDefinitionId">;
  evaluationResultRepository: Pick<EvaluationResultRepository, "listBySignalCandidateId">;
  setupAggregateResultRepository: Pick<SetupAggregateResultRepository, "listBySetupDefinitionId">;
  researchHypothesisRepository?: Pick<ResearchHypothesisRepository, "getById">;
  researchFeedbackDecisionRepository?: Pick<
    ResearchFeedbackDecisionRepository,
    "getById" | "listBySetupDefinitionId" | "listByResearchHypothesisId"
  >;
  researchDecisionApprovalRepository?: Pick<
    ResearchDecisionApprovalRepository,
    "getById" | "listByFeedbackDecisionId"
  >;
};

const isTimestampWithinRange = (timestamp: string | null | undefined, range: QueryTimeRange | undefined): boolean => {
  if (!range) {
    return true;
  }

  if (!timestamp) {
    return false;
  }

  const value = Date.parse(timestamp);
  if (Number.isNaN(value)) {
    return false;
  }

  if (range.startAtUtc) {
    const start = Date.parse(range.startAtUtc);
    if (!Number.isNaN(start) && value < start) {
      return false;
    }
  }

  if (range.endAtUtc) {
    const end = Date.parse(range.endAtUtc);
    if (!Number.isNaN(end) && value > end) {
      return false;
    }
  }

  return true;
};

const filterCandidates = (
  candidates: SignalCandidate[],
  options: {
    statuses?: QuerySetupRevisionHistory["candidateStatuses"];
    symbolId?: string;
    timeRange?: QueryTimeRange;
  }
): SignalCandidate[] => {
  const allowedStatuses = options.statuses ? new Set(options.statuses) : null;

  return candidates.filter((candidate) => {
    if (allowedStatuses && !allowedStatuses.has(candidate.status)) {
      return false;
    }

    if (options.symbolId && candidate.monitoredSymbolId !== options.symbolId) {
      return false;
    }

    if (!isTimestampWithinRange(candidate.detectedAt, options.timeRange)) {
      return false;
    }

    return true;
  });
};

const filterEvaluations = (
  evaluations: EvaluationResult[],
  options: {
    statuses?: QuerySetupRevisionHistory["evaluationStatuses"];
    evaluationWindowId?: string;
    timeRange?: QueryTimeRange;
  }
): EvaluationResult[] => {
  const allowedStatuses = options.statuses ? new Set(options.statuses) : null;

  return evaluations.filter((evaluation) => {
    if (allowedStatuses && !allowedStatuses.has(evaluation.status)) {
      return false;
    }

    if (options.evaluationWindowId && evaluation.evaluationWindowId !== options.evaluationWindowId) {
      return false;
    }

    const eventTimestamp = evaluation.evaluatedAt ?? evaluation.updatedAt;
    if (!isTimestampWithinRange(eventTimestamp, options.timeRange)) {
      return false;
    }

    return true;
  });
};

const filterAggregates = (
  aggregates: SetupAggregateResult[],
  options: {
    statuses?: QuerySetupRevisionHistory["aggregateStatuses"];
    evaluationWindowId?: string;
    timeRange?: QueryTimeRange;
  }
): SetupAggregateResult[] => {
  const allowedStatuses = options.statuses ? new Set(options.statuses) : null;

  return aggregates.filter((aggregate) => {
    if (allowedStatuses && !allowedStatuses.has(aggregate.status)) {
      return false;
    }

    if (
      options.evaluationWindowId &&
      aggregate.aggregationScope.evaluationWindowId !== options.evaluationWindowId
    ) {
      return false;
    }

    const eventTimestamp = aggregate.computedAt ?? aggregate.updatedAt;
    if (!isTimestampWithinRange(eventTimestamp, options.timeRange)) {
      return false;
    }

    return true;
  });
};

const hasSymbolScopeMatch = (
  aggregate: SetupAggregateResult,
  symbolIds: string[] | undefined
): boolean => {
  if (!symbolIds || symbolIds.length === 0) {
    return true;
  }

  const requested = new Set(symbolIds);
  const scope = aggregate.aggregationScope.symbolScope;
  if (scope.kind === "all_monitored") {
    return false;
  }

  return scope.symbolIds.some((symbolId) => requested.has(symbolId));
};

const normalizeComparisonScope = (
  scope: RevisionComparisonScopeDescriptor | undefined
): RevisionComparisonScopeDescriptor => {
  if (!scope) {
    return {};
  }

  const normalizedSymbolIds = scope.symbolIds
    ?.map((symbolId) => symbolId.trim())
    .filter(Boolean);

  return {
    evaluationWindowId: scope.evaluationWindowId?.trim() || undefined,
    symbolIds: normalizedSymbolIds && normalizedSymbolIds.length > 0 ? normalizedSymbolIds : undefined,
    timeRange: scope.timeRange
  };
};

const hasValidTimeRange = (range: QueryTimeRange | undefined): boolean => {
  if (!range?.startAtUtc || !range.endAtUtc) {
    return true;
  }

  return Date.parse(range.startAtUtc) <= Date.parse(range.endAtUtc);
};

const toOutcomeScore = (evaluation: EvaluationResult): number | null => {
  if (evaluation.percentageMove === null) {
    return null;
  }

  if (evaluation.percentageMove > 0) {
    return 1;
  }

  if (evaluation.percentageMove < 0) {
    return -1;
  }

  return 0;
};

const averageFrom = (
  values: Array<number | null | undefined>
): number | null => {
  const valid = values.filter((value): value is number => typeof value === "number");
  if (valid.length === 0) {
    return null;
  }

  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
};

const buildComparisonMetrics = (
  candidates: SignalCandidate[],
  evaluations: EvaluationResult[]
): RevisionComparisonMetrics => {
  const completedEvaluations = evaluations.filter((evaluation) => evaluation.status === "completed");
  const invalidatedEvaluations = evaluations.filter((evaluation) => evaluation.status === "invalidated");
  const evaluatedCandidates = candidates.filter((candidate) => candidate.status === "evaluated");
  const positiveOutcomeCount = completedEvaluations.filter(
    (evaluation) => (evaluation.percentageMove ?? 0) > 0
  ).length;

  const completedCount = completedEvaluations.length;

  return {
    totalEvaluatedCandidates: evaluatedCandidates.length,
    completedEvaluations: completedCount,
    invalidatedEvaluations: invalidatedEvaluations.length,
    averagePercentageMove: averageFrom(completedEvaluations.map((evaluation) => evaluation.percentageMove)),
    averageAbsoluteMove: averageFrom(completedEvaluations.map((evaluation) => evaluation.absoluteMove)),
    averageFinalOutcome: averageFrom(completedEvaluations.map((evaluation) => toOutcomeScore(evaluation))),
    averageMaxFavorableExcursion: averageFrom(
      completedEvaluations.map((evaluation) => evaluation.maxFavorableExcursion)
    ),
    averageMaxAdverseExcursion: averageFrom(
      completedEvaluations.map((evaluation) => evaluation.maxAdverseExcursion)
    ),
    positiveOutcomeCount,
    positiveOutcomeRate: completedCount > 0 ? positiveOutcomeCount / completedCount : null
  };
};

const deltaValue = (baseline: number | null, target: number | null): number | null =>
  baseline === null || target === null ? null : target - baseline;

const buildMetricDeltas = (
  baseline: RevisionComparisonMetrics,
  target: RevisionComparisonMetrics
): RevisionComparisonMetricDeltas => ({
  totalEvaluatedCandidates: {
    baseline: baseline.totalEvaluatedCandidates,
    target: target.totalEvaluatedCandidates,
    delta: target.totalEvaluatedCandidates - baseline.totalEvaluatedCandidates
  },
  completedEvaluations: {
    baseline: baseline.completedEvaluations,
    target: target.completedEvaluations,
    delta: target.completedEvaluations - baseline.completedEvaluations
  },
  invalidatedEvaluations: {
    baseline: baseline.invalidatedEvaluations,
    target: target.invalidatedEvaluations,
    delta: target.invalidatedEvaluations - baseline.invalidatedEvaluations
  },
  averagePercentageMove: {
    baseline: baseline.averagePercentageMove,
    target: target.averagePercentageMove,
    delta: deltaValue(baseline.averagePercentageMove, target.averagePercentageMove)
  },
  averageAbsoluteMove: {
    baseline: baseline.averageAbsoluteMove,
    target: target.averageAbsoluteMove,
    delta: deltaValue(baseline.averageAbsoluteMove, target.averageAbsoluteMove)
  },
  averageFinalOutcome: {
    baseline: baseline.averageFinalOutcome,
    target: target.averageFinalOutcome,
    delta: deltaValue(baseline.averageFinalOutcome, target.averageFinalOutcome)
  },
  averageMaxFavorableExcursion: {
    baseline: baseline.averageMaxFavorableExcursion,
    target: target.averageMaxFavorableExcursion,
    delta: deltaValue(baseline.averageMaxFavorableExcursion, target.averageMaxFavorableExcursion)
  },
  averageMaxAdverseExcursion: {
    baseline: baseline.averageMaxAdverseExcursion,
    target: target.averageMaxAdverseExcursion,
    delta: deltaValue(baseline.averageMaxAdverseExcursion, target.averageMaxAdverseExcursion)
  },
  positiveOutcomeCount: {
    baseline: baseline.positiveOutcomeCount,
    target: target.positiveOutcomeCount,
    delta: target.positiveOutcomeCount - baseline.positiveOutcomeCount
  },
  positiveOutcomeRate: {
    baseline: baseline.positiveOutcomeRate,
    target: target.positiveOutcomeRate,
    delta: deltaValue(baseline.positiveOutcomeRate, target.positiveOutcomeRate)
  }
});

const COMPARISON_DELTA_EPSILON = 1e-9;

const areScopesEquivalent = (
  left: RevisionComparisonScopeDescriptor | undefined,
  right: RevisionComparisonScopeDescriptor | undefined
): boolean => JSON.stringify(normalizeComparisonScope(left)) === JSON.stringify(normalizeComparisonScope(right));

const buildImpactKeyMetricChanges = (
  metricDeltas: RevisionComparisonMetricDeltas
): RevisionImpactKeyMetricChanges => ({
  completedEvaluations: metricDeltas.completedEvaluations,
  positiveOutcomeRate: metricDeltas.positiveOutcomeRate,
  averagePercentageMove: metricDeltas.averagePercentageMove,
  averageFinalOutcome: metricDeltas.averageFinalOutcome,
  averageMaxFavorableExcursion: metricDeltas.averageMaxFavorableExcursion,
  averageMaxAdverseExcursion: metricDeltas.averageMaxAdverseExcursion
});

const resolveEvidenceSufficiency = (
  comparison: SetupRevisionComparison
): RevisionEvidenceSufficiencyLevel => {
  if (comparison.status === "insufficient_evidence") {
    return "insufficient";
  }

  const minCompletedEvaluations = Math.min(
    comparison.baselineMetrics.completedEvaluations,
    comparison.targetMetrics.completedEvaluations
  );

  if (minCompletedEvaluations < 3) {
    return "insufficient";
  }

  if (minCompletedEvaluations < 10) {
    return "limited";
  }

  return "sufficient";
};

const classifyDelta = (delta: number | null): "positive" | "negative" | "neutral" => {
  if (delta === null || Math.abs(delta) <= COMPARISON_DELTA_EPSILON) {
    return "neutral";
  }

  return delta > 0 ? "positive" : "negative";
};

const summarizeImpactDirections = (
  keyMetricChanges: RevisionImpactKeyMetricChanges
): {
  positive: number;
  negative: number;
  neutral: number;
  comparable: number;
} => {
  const directionValues = Object.values(keyMetricChanges).map((change) => classifyDelta(change.delta));
  const positive = directionValues.filter((value) => value === "positive").length;
  const negative = directionValues.filter((value) => value === "negative").length;
  const neutral = directionValues.length - positive - negative;

  return {
    positive,
    negative,
    neutral,
    comparable: positive + negative
  };
};

const resolveImpactClassification = (
  keyMetricChanges: RevisionImpactKeyMetricChanges,
  evidenceSufficiency: RevisionEvidenceSufficiencyLevel
): RevisionImpactClassification => {
  if (evidenceSufficiency === "insufficient") {
    return "inconclusive";
  }

  const directionSummary = summarizeImpactDirections(keyMetricChanges);
  if (directionSummary.comparable < 3) {
    return "inconclusive";
  }

  if (directionSummary.positive > directionSummary.negative) {
    return "improved";
  }

  if (directionSummary.negative > directionSummary.positive) {
    return "degraded";
  }

  if (directionSummary.positive > 0 && directionSummary.negative > 0) {
    return "mixed";
  }

  return "inconclusive";
};

const trimToOptional = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const asTimestampValue = (value: string | undefined): number => {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
};

const pickLatestBy = <T>(
  items: T[],
  timestampSelector: (item: T) => string | undefined
): T | null =>
  items
    .slice()
    .sort((left, right) => asTimestampValue(timestampSelector(right)) - asTimestampValue(timestampSelector(left)))[0] ??
  null;

const asErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "unexpected revision-history query failure";

export const createRevisionHistoryQueryService = (
  dependencies: RevisionHistoryQueryServiceDependencies
): RevisionHistoryQueryService => {
  const {
    setupDefinitionRevisionRepository,
    setupDefinitionRepository,
    signalCandidateRepository,
    evaluationResultRepository,
    setupAggregateResultRepository,
    researchHypothesisRepository,
    researchFeedbackDecisionRepository,
    researchDecisionApprovalRepository
  } = dependencies;

  const buildRevisionCandidates = async (
    setupDefinitionId: string,
    setupRevisionId: string
  ): Promise<SignalCandidate[]> => {
    const all = await signalCandidateRepository.listBySetupDefinitionId(setupDefinitionId);
    return all.filter((candidate) => candidate.setupRevisionId === setupRevisionId);
  };

  const buildRevisionEvaluations = async (
    candidates: SignalCandidate[]
  ): Promise<EvaluationResult[]> => {
    const evaluationCollections = await Promise.all(
      candidates.map((candidate) => evaluationResultRepository.listBySignalCandidateId(candidate.id))
    );

    return evaluationCollections.flat();
  };

  const resolveRevision = async (
    setupRevisionId: string
  ): Promise<SetupDefinitionRevision | null> =>
    setupDefinitionRevisionRepository.getById(setupRevisionId);

  const getByRevision = async (
    query: QuerySignalCandidatesByRevision
  ): Promise<RevisionHistoryQueryResult> => {
    try {
      if (!query.setupRevisionId.trim()) {
        return {
          status: "rejected",
          reason: "setupRevisionId is required",
          warnings: []
        };
      }
      const revision = await resolveRevision(query.setupRevisionId);
      if (!revision) {
        return {
          status: "rejected",
          setupRevisionId: query.setupRevisionId,
          reason: `setup_definition_revision not found: ${query.setupRevisionId}`,
          warnings: []
        };
      }

      if (query.setupFamilyId && query.setupFamilyId !== revision.versionInfo.setupFamilyId) {
        return {
          status: "rejected",
          setupFamilyId: query.setupFamilyId,
          setupRevisionId: query.setupRevisionId,
          reason: "mixed family/revision selector ambiguity in candidate query",
          warnings: []
        };
      }

      const candidates = filterCandidates(
        await buildRevisionCandidates(revision.setupDefinitionId, revision.id),
        {
          statuses: query.statuses,
          symbolId: query.symbolId,
          timeRange: query.timeRange
        }
      );

      const candidateHistory: RevisionCandidateHistoryView = {
        setupFamilyId: revision.versionInfo.setupFamilyId,
        setupRevisionId: revision.id,
        setupDefinitionId: revision.setupDefinitionId,
        version: revision.versionInfo.version,
        candidates,
        count: candidates.length
      };

      return {
        status: "resolved",
        setupFamilyId: candidateHistory.setupFamilyId,
        setupRevisionId: candidateHistory.setupRevisionId,
        candidateHistory,
        warnings: []
      };
    } catch (error: unknown) {
      return {
        status: "failed",
        setupRevisionId: query.setupRevisionId,
        reason: asErrorMessage(error),
        warnings: ["candidate revision query can be retried after resolving query failure"]
      };
    }
  };

  const getEvaluationsByRevision = async (
    query: QueryEvaluationResultsByRevision
  ): Promise<RevisionHistoryQueryResult> => {
    try {
      if (!query.setupRevisionId.trim()) {
        return {
          status: "rejected",
          reason: "setupRevisionId is required",
          warnings: []
        };
      }
      const revision = await resolveRevision(query.setupRevisionId);
      if (!revision) {
        return {
          status: "rejected",
          setupRevisionId: query.setupRevisionId,
          reason: `setup_definition_revision not found: ${query.setupRevisionId}`,
          warnings: []
        };
      }

      if (query.setupFamilyId && query.setupFamilyId !== revision.versionInfo.setupFamilyId) {
        return {
          status: "rejected",
          setupFamilyId: query.setupFamilyId,
          setupRevisionId: query.setupRevisionId,
          reason: "mixed family/revision selector ambiguity in evaluation query",
          warnings: []
        };
      }

      const revisionCandidates = await buildRevisionCandidates(revision.setupDefinitionId, revision.id);
      const evaluations = filterEvaluations(await buildRevisionEvaluations(revisionCandidates), {
        statuses: query.statuses,
        evaluationWindowId: query.evaluationWindowId,
        timeRange: query.timeRange
      });

      const evaluationHistory: RevisionEvaluationHistoryView = {
        setupFamilyId: revision.versionInfo.setupFamilyId,
        setupRevisionId: revision.id,
        setupDefinitionId: revision.setupDefinitionId,
        version: revision.versionInfo.version,
        evaluations,
        count: evaluations.length
      };

      return {
        status: "resolved",
        setupFamilyId: evaluationHistory.setupFamilyId,
        setupRevisionId: evaluationHistory.setupRevisionId,
        evaluationHistory,
        warnings: []
      };
    } catch (error: unknown) {
      return {
        status: "failed",
        setupRevisionId: query.setupRevisionId,
        reason: asErrorMessage(error),
        warnings: ["evaluation revision query can be retried after resolving query failure"]
      };
    }
  };

  const getByRevisionScope = async (
    query: QueryAggregateEvidenceByRevisionScope
  ): Promise<RevisionHistoryQueryResult> => {
    try {
      if (!query.setupRevisionId.trim()) {
        return {
          status: "rejected",
          reason: "setupRevisionId is required",
          warnings: []
        };
      }
      const revision = await resolveRevision(query.setupRevisionId);
      if (!revision) {
        return {
          status: "rejected",
          setupRevisionId: query.setupRevisionId,
          reason: `setup_definition_revision not found: ${query.setupRevisionId}`,
          warnings: []
        };
      }

      if (query.setupFamilyId && query.setupFamilyId !== revision.versionInfo.setupFamilyId) {
        return {
          status: "rejected",
          setupFamilyId: query.setupFamilyId,
          setupRevisionId: query.setupRevisionId,
          reason: "mixed family/revision selector ambiguity in aggregate query",
          warnings: []
        };
      }

      const aggregates = filterAggregates(
        await setupAggregateResultRepository.listBySetupDefinitionId(revision.setupDefinitionId),
        {
          statuses: query.statuses,
          evaluationWindowId: query.evaluationWindowId,
          timeRange: query.timeRange
        }
      );

      const aggregateHistory: RevisionAggregateHistoryView = {
        setupFamilyId: revision.versionInfo.setupFamilyId,
        setupRevisionId: revision.id,
        setupDefinitionId: revision.setupDefinitionId,
        version: revision.versionInfo.version,
        aggregates,
        count: aggregates.length
      };

      return {
        status: "resolved",
        setupFamilyId: aggregateHistory.setupFamilyId,
        setupRevisionId: aggregateHistory.setupRevisionId,
        aggregateHistory,
        warnings: []
      };
    } catch (error: unknown) {
      return {
        status: "failed",
        setupRevisionId: query.setupRevisionId,
        reason: asErrorMessage(error),
        warnings: ["aggregate revision query can be retried after resolving query failure"]
      };
    }
  };

  const getFamilyHistory = async (
    query: QuerySetupRevisionHistory
  ): Promise<RevisionHistoryQueryResult> => {
    try {
      if (query.setupRevisionId) {
        return {
          status: "rejected",
          setupFamilyId: query.setupFamilyId,
          setupRevisionId: query.setupRevisionId,
          reason: "family-history query cannot include setupRevisionId selector",
          warnings: []
        };
      }

      if (!query.setupFamilyId?.trim()) {
        return {
          status: "rejected",
          reason: "setupFamilyId is required",
          warnings: []
        };
      }
      const setupFamilyId = query.setupFamilyId.trim();

      const revisions = await setupDefinitionRevisionRepository.listBySetupFamilyId(setupFamilyId);
      if (revisions.length === 0) {
        return {
          status: "rejected",
          setupFamilyId,
          reason: `setup_family not found: ${setupFamilyId}`,
          warnings: []
        };
      }

      const filteredRevisions = revisions
        .filter((revision) => {
          if (query.includeSuperseded === false && revision.revisionStatus === "superseded") {
            return false;
          }

          if (query.revisionStatuses && !query.revisionStatuses.includes(revision.revisionStatus)) {
            return false;
          }

          return true;
        })
        .sort((left, right) => left.versionInfo.version - right.versionInfo.version);

      const revisionGroups: SetupRevisionHistoryGroup[] = [];
      for (const revision of filteredRevisions) {
        const setupDefinition = await setupDefinitionRepository.getById(revision.setupDefinitionId);
        const candidates = filterCandidates(
          await buildRevisionCandidates(revision.setupDefinitionId, revision.id),
          {
            statuses: query.candidateStatuses,
            symbolId: query.symbolId,
            timeRange: query.timeRange
          }
        );

        const evaluations = filterEvaluations(await buildRevisionEvaluations(candidates), {
          statuses: query.evaluationStatuses,
          timeRange: query.timeRange
        });

        const aggregates = filterAggregates(
          await setupAggregateResultRepository.listBySetupDefinitionId(revision.setupDefinitionId),
          {
            statuses: query.aggregateStatuses,
            timeRange: query.timeRange
          }
        );

        revisionGroups.push({
          setupRevisionId: revision.id,
          setupDefinitionId: revision.setupDefinitionId,
          setupFamilyId: revision.versionInfo.setupFamilyId,
          version: revision.versionInfo.version,
          revisionStatus: revision.revisionStatus,
          setupDefinitionStatus: setupDefinition?.status ?? "missing_setup_definition",
          candidates,
          evaluations,
          aggregates,
          counts: {
            candidateCount: candidates.length,
            evaluationCount: evaluations.length,
            aggregateCount: aggregates.length
          }
        });
      }

      const familyHistory: SetupRevisionHistoryView = {
        mode: query.mode === "family_comparison" ? "family_comparison" : "family_history",
        setupFamilyId,
        revisionGroups,
        totals: {
          revisionCount: revisionGroups.length,
          candidateCount: revisionGroups.reduce((total, group) => total + group.counts.candidateCount, 0),
          evaluationCount: revisionGroups.reduce((total, group) => total + group.counts.evaluationCount, 0),
          aggregateCount: revisionGroups.reduce((total, group) => total + group.counts.aggregateCount, 0)
        }
      };

      const warnings: string[] = [];
      if (familyHistory.revisionGroups.some((group) => group.setupDefinitionStatus === "missing_setup_definition")) {
        warnings.push("one or more revisions reference missing setup_definition records");
      }

      return {
        status: "resolved",
        setupFamilyId,
        familyHistory,
        warnings
      };
    } catch (error: unknown) {
      return {
        status: "failed",
        setupFamilyId: query.setupFamilyId,
        reason: asErrorMessage(error),
        warnings: ["family-history query can be retried after resolving query failure"]
      };
    }
  };

  const compareRevisions = async (
    command: CompareSetupRevisionsCommand
  ): Promise<RevisionComparisonResult> => {
    try {
      if (!command.setupFamilyId.trim()) {
        return {
          status: "rejected",
          reason: "setupFamilyId is required",
          warnings: []
        };
      }

      if (!command.baselineRevisionId.trim()) {
        return {
          status: "rejected",
          setupFamilyId: command.setupFamilyId,
          reason: "baselineRevisionId is required",
          warnings: []
        };
      }

      if (!command.targetRevisionId.trim()) {
        return {
          status: "rejected",
          setupFamilyId: command.setupFamilyId,
          baselineRevisionId: command.baselineRevisionId,
          reason: "targetRevisionId is required",
          warnings: []
        };
      }

      if (!command.comparedAt.trim()) {
        return {
          status: "rejected",
          setupFamilyId: command.setupFamilyId,
          baselineRevisionId: command.baselineRevisionId,
          targetRevisionId: command.targetRevisionId,
          reason: "comparedAt is required",
          warnings: []
        };
      }

      if (command.baselineRevisionId === command.targetRevisionId) {
        return {
          status: "rejected",
          setupFamilyId: command.setupFamilyId,
          baselineRevisionId: command.baselineRevisionId,
          targetRevisionId: command.targetRevisionId,
          reason: "baselineRevisionId and targetRevisionId must be different",
          warnings: []
        };
      }

      const scope = normalizeComparisonScope(command.comparisonScope);
      if (!hasValidTimeRange(scope.timeRange)) {
        return {
          status: "rejected",
          setupFamilyId: command.setupFamilyId,
          baselineRevisionId: command.baselineRevisionId,
          targetRevisionId: command.targetRevisionId,
          reason: "comparisonScope timeRange is invalid: startAtUtc must be <= endAtUtc",
          warnings: []
        };
      }

      if (command.comparisonScope?.symbolIds && !scope.symbolIds) {
        return {
          status: "rejected",
          setupFamilyId: command.setupFamilyId,
          baselineRevisionId: command.baselineRevisionId,
          targetRevisionId: command.targetRevisionId,
          reason: "comparisonScope symbolIds must include at least one symbol",
          warnings: []
        };
      }

      const baselineRevision = await resolveRevision(command.baselineRevisionId);
      if (!baselineRevision) {
        return {
          status: "rejected",
          setupFamilyId: command.setupFamilyId,
          baselineRevisionId: command.baselineRevisionId,
          targetRevisionId: command.targetRevisionId,
          reason: `baseline setup_definition_revision not found: ${command.baselineRevisionId}`,
          warnings: []
        };
      }

      const targetRevision = await resolveRevision(command.targetRevisionId);
      if (!targetRevision) {
        return {
          status: "rejected",
          setupFamilyId: command.setupFamilyId,
          baselineRevisionId: command.baselineRevisionId,
          targetRevisionId: command.targetRevisionId,
          reason: `target setup_definition_revision not found: ${command.targetRevisionId}`,
          warnings: []
        };
      }

      if (
        baselineRevision.versionInfo.setupFamilyId !== command.setupFamilyId ||
        targetRevision.versionInfo.setupFamilyId !== command.setupFamilyId
      ) {
        return {
          status: "rejected",
          setupFamilyId: command.setupFamilyId,
          baselineRevisionId: command.baselineRevisionId,
          targetRevisionId: command.targetRevisionId,
          reason: "baseline/target revisions do not belong to requested setupFamilyId",
          warnings: []
        };
      }

      if (baselineRevision.versionInfo.setupFamilyId !== targetRevision.versionInfo.setupFamilyId) {
        return {
          status: "rejected",
          setupFamilyId: command.setupFamilyId,
          baselineRevisionId: command.baselineRevisionId,
          targetRevisionId: command.targetRevisionId,
          reason: "baseline and target revisions must belong to the same setup family",
          warnings: []
        };
      }

      const symbolFilter = scope.symbolIds ? new Set(scope.symbolIds) : null;

      const applyCandidateScope = (candidates: SignalCandidate[]): SignalCandidate[] =>
        candidates.filter((candidate) => {
          if (symbolFilter && !symbolFilter.has(candidate.monitoredSymbolId)) {
            return false;
          }

          if (!isTimestampWithinRange(candidate.detectedAt, scope.timeRange)) {
            return false;
          }

          return true;
        });

      const applyEvaluationScope = (evaluations: EvaluationResult[]): EvaluationResult[] =>
        evaluations.filter((evaluation) => {
          if (scope.evaluationWindowId && evaluation.evaluationWindowId !== scope.evaluationWindowId) {
            return false;
          }

          const eventTimestamp = evaluation.evaluatedAt ?? evaluation.updatedAt;
          return isTimestampWithinRange(eventTimestamp, scope.timeRange);
        });

      const applyAggregateScope = (aggregates: SetupAggregateResult[]): SetupAggregateResult[] =>
        aggregates.filter((aggregate) => {
          if (
            scope.evaluationWindowId &&
            aggregate.aggregationScope.evaluationWindowId !== scope.evaluationWindowId
          ) {
            return false;
          }

          if (!hasSymbolScopeMatch(aggregate, scope.symbolIds)) {
            return false;
          }

          const eventTimestamp = aggregate.computedAt ?? aggregate.updatedAt;
          return isTimestampWithinRange(eventTimestamp, scope.timeRange);
        });

      const baselineCandidates = applyCandidateScope(
        await buildRevisionCandidates(baselineRevision.setupDefinitionId, baselineRevision.id)
      );
      const targetCandidates = applyCandidateScope(
        await buildRevisionCandidates(targetRevision.setupDefinitionId, targetRevision.id)
      );

      const baselineEvaluations = applyEvaluationScope(
        await buildRevisionEvaluations(baselineCandidates)
      );
      const targetEvaluations = applyEvaluationScope(
        await buildRevisionEvaluations(targetCandidates)
      );

      const baselineAggregates = applyAggregateScope(
        await setupAggregateResultRepository.listBySetupDefinitionId(baselineRevision.setupDefinitionId)
      );
      const targetAggregates = applyAggregateScope(
        await setupAggregateResultRepository.listBySetupDefinitionId(targetRevision.setupDefinitionId)
      );

      const baselineMetrics = buildComparisonMetrics(baselineCandidates, baselineEvaluations);
      const targetMetrics = buildComparisonMetrics(targetCandidates, targetEvaluations);
      const metricDeltas = buildMetricDeltas(baselineMetrics, targetMetrics);

      const notes: string[] = [];
      if (baselineAggregates.length === 0 || targetAggregates.length === 0) {
        notes.push("aggregate evidence missing for one or both revisions in comparison scope");
      }

      const comparison: SetupRevisionComparison = {
        setupFamilyId: command.setupFamilyId,
        baselineRevisionId: baselineRevision.id,
        targetRevisionId: targetRevision.id,
        baselineSetupDefinitionId: baselineRevision.setupDefinitionId,
        targetSetupDefinitionId: targetRevision.setupDefinitionId,
        baselineVersion: baselineRevision.versionInfo.version,
        targetVersion: targetRevision.versionInfo.version,
        comparisonScope: scope,
        baselineMetrics,
        targetMetrics,
        metricDeltas,
        baselineEvidenceCounts: {
          candidateCount: baselineCandidates.length,
          evaluationCount: baselineEvaluations.length,
          aggregateCount: baselineAggregates.length
        },
        targetEvidenceCounts: {
          candidateCount: targetCandidates.length,
          evaluationCount: targetEvaluations.length,
          aggregateCount: targetAggregates.length
        },
        comparedAt: command.comparedAt,
        status:
          baselineMetrics.completedEvaluations === 0 || targetMetrics.completedEvaluations === 0
            ? "insufficient_evidence"
            : "compared",
        notes: notes.length > 0 ? notes : undefined
      };

      if (comparison.status === "insufficient_evidence") {
        return {
          status: "insufficient_evidence",
          setupFamilyId: command.setupFamilyId,
          baselineRevisionId: command.baselineRevisionId,
          targetRevisionId: command.targetRevisionId,
          comparison,
          reason: "one or both revisions lack completed evaluations for comparison scope",
          warnings: notes
        };
      }

      return {
        status: "compared",
        setupFamilyId: command.setupFamilyId,
        baselineRevisionId: command.baselineRevisionId,
        targetRevisionId: command.targetRevisionId,
        comparison,
        warnings: notes
      };
    } catch (error: unknown) {
      return {
        status: "failed",
        setupFamilyId: command.setupFamilyId,
        baselineRevisionId: command.baselineRevisionId,
        targetRevisionId: command.targetRevisionId,
        reason: asErrorMessage(error),
        warnings: ["revision comparison can be retried after resolving query failure"]
      };
    }
  };

  const buildImpactSummary = async (
    command: BuildSetupRevisionImpactSummaryCommand
  ): Promise<RevisionImpactSummaryResult> => {
    try {
      if (!command.setupFamilyId.trim()) {
        return {
          status: "rejected",
          reason: "setupFamilyId is required",
          warnings: []
        };
      }

      if (!command.baselineRevisionId.trim()) {
        return {
          status: "rejected",
          setupFamilyId: command.setupFamilyId,
          reason: "baselineRevisionId is required",
          warnings: []
        };
      }

      if (!command.targetRevisionId.trim()) {
        return {
          status: "rejected",
          setupFamilyId: command.setupFamilyId,
          baselineRevisionId: command.baselineRevisionId,
          reason: "targetRevisionId is required",
          warnings: []
        };
      }

      if (!command.summarizedAt.trim()) {
        return {
          status: "rejected",
          setupFamilyId: command.setupFamilyId,
          baselineRevisionId: command.baselineRevisionId,
          targetRevisionId: command.targetRevisionId,
          reason: "summarizedAt is required",
          warnings: []
        };
      }

      if (!command.comparison) {
        return {
          status: "rejected",
          setupFamilyId: command.setupFamilyId,
          baselineRevisionId: command.baselineRevisionId,
          targetRevisionId: command.targetRevisionId,
          reason:
            "comparison payload reference is required in first version; revisionComparisonId lookup is postponed",
          warnings: []
        };
      }

      const comparison = command.comparison;
      if (
        comparison.setupFamilyId !== command.setupFamilyId ||
        comparison.baselineRevisionId !== command.baselineRevisionId ||
        comparison.targetRevisionId !== command.targetRevisionId
      ) {
        return {
          status: "rejected",
          setupFamilyId: command.setupFamilyId,
          baselineRevisionId: command.baselineRevisionId,
          targetRevisionId: command.targetRevisionId,
          reason: "comparison payload does not match setupFamilyId/baselineRevisionId/targetRevisionId",
          warnings: []
        };
      }

      if (
        command.summaryScope &&
        !areScopesEquivalent(command.summaryScope, comparison.comparisonScope)
      ) {
        return {
          status: "rejected",
          setupFamilyId: command.setupFamilyId,
          baselineRevisionId: command.baselineRevisionId,
          targetRevisionId: command.targetRevisionId,
          reason: "summaryScope is ambiguous: it must match comparison.comparisonScope",
          warnings: []
        };
      }

      const keyMetricChanges = buildImpactKeyMetricChanges(comparison.metricDeltas);
      const evidenceSufficiency = resolveEvidenceSufficiency(comparison);
      const impactClassification = resolveImpactClassification(
        keyMetricChanges,
        evidenceSufficiency
      );
      const directionSummary = summarizeImpactDirections(keyMetricChanges);

      const warnings = [...(comparison.notes ?? [])];
      if (evidenceSufficiency === "insufficient") {
        warnings.push("evidence sufficiency is insufficient for confident before/after interpretation");
      } else if (evidenceSufficiency === "limited") {
        warnings.push("evidence sufficiency is limited; summary should be reviewed with caution");
      }

      if (directionSummary.comparable < 3) {
        warnings.push("insufficient comparable key metric deltas; impact classified as inconclusive");
      }

      const dedupedWarnings = Array.from(new Set(warnings));

      const summary: SetupRevisionImpactSummary = {
        setupFamilyId: comparison.setupFamilyId,
        baselineRevisionId: comparison.baselineRevisionId,
        targetRevisionId: comparison.targetRevisionId,
        baselineVersion: comparison.baselineVersion,
        targetVersion: comparison.targetVersion,
        summaryScope: comparison.comparisonScope,
        comparisonReference: command.revisionComparisonId
          ? {
              revisionComparisonId: command.revisionComparisonId
            }
          : undefined,
        comparisonStatus: comparison.status,
        impactClassification,
        evidenceSufficiency,
        keyMetricChanges,
        baselineEvidenceCounts: comparison.baselineEvidenceCounts,
        targetEvidenceCounts: comparison.targetEvidenceCounts,
        summaryNotes: [
          `positive_deltas=${directionSummary.positive}`,
          `negative_deltas=${directionSummary.negative}`,
          `neutral_or_unknown_deltas=${directionSummary.neutral}`
        ],
        warnings: dedupedWarnings.length > 0 ? dedupedWarnings : undefined,
        summarizedAt: command.summarizedAt
      };

      return {
        status: "summarized",
        setupFamilyId: command.setupFamilyId,
        baselineRevisionId: command.baselineRevisionId,
        targetRevisionId: command.targetRevisionId,
        summary,
        warnings: dedupedWarnings
      };
    } catch (error: unknown) {
      return {
        status: "failed",
        setupFamilyId: command.setupFamilyId,
        baselineRevisionId: command.baselineRevisionId,
        targetRevisionId: command.targetRevisionId,
        reason: asErrorMessage(error),
        warnings: ["impact summary generation can be retried after resolving query failure"]
      };
    }
  };

  const buildReviewPacket = async (
    command: BuildResearchReviewPacketCommand
  ): Promise<ResearchReviewPacketResult> => {
    try {
      const setupFamilyId = command.setupFamilyId.trim();
      if (!setupFamilyId) {
        return {
          status: "rejected",
          reason: "setupFamilyId is required",
          warnings: []
        };
      }

      if (!command.builtAt.trim()) {
        return {
          status: "rejected",
          setupFamilyId,
          reason: "builtAt is required",
          warnings: []
        };
      }

      const requestedArtifactRefs = {
        setupRevisionId: trimToOptional(command.setupRevisionId),
        researchHypothesisId: trimToOptional(command.researchHypothesisId),
        researchFeedbackDecisionId: trimToOptional(command.researchFeedbackDecisionId),
        researchDecisionApprovalId: trimToOptional(command.researchDecisionApprovalId),
        impactSummaryId: trimToOptional(command.impactSummaryId)
      };

      let revision: SetupDefinitionRevision | null = null;
      if (requestedArtifactRefs.setupRevisionId) {
        revision = await resolveRevision(requestedArtifactRefs.setupRevisionId);
        if (!revision) {
          return {
            status: "rejected",
            setupFamilyId,
            setupRevisionId: requestedArtifactRefs.setupRevisionId,
            reason: `setup_definition_revision not found: ${requestedArtifactRefs.setupRevisionId}`,
            warnings: []
          };
        }
      } else {
        revision = await setupDefinitionRevisionRepository.getLatestBySetupFamilyId(setupFamilyId);
      }

      if (revision && revision.versionInfo.setupFamilyId !== setupFamilyId) {
        return {
          status: "rejected",
          setupFamilyId,
          setupRevisionId: revision.id,
          reason: "setupRevisionId does not belong to setupFamilyId",
          warnings: []
        };
      }

      const warnings: string[] = [];

      if (!revision) {
        warnings.push("no setup revision context resolved for setupFamilyId");
      }

      const setupDefinition = revision
        ? await setupDefinitionRepository.getById(revision.setupDefinitionId)
        : null;

      if (revision && !setupDefinition) {
        warnings.push(`setup_definition not found for revision: ${revision.setupDefinitionId}`);
      }

      let impactSummary = command.impactSummarySnapshot;
      if (impactSummary) {
        if (impactSummary.setupFamilyId !== setupFamilyId) {
          return {
            status: "rejected",
            setupFamilyId,
            setupRevisionId: revision?.id,
            reason: "impactSummarySnapshot.setupFamilyId does not match setupFamilyId",
            warnings: []
          };
        }

        if (
          revision &&
          impactSummary.targetRevisionId !== revision.id &&
          impactSummary.baselineRevisionId !== revision.id
        ) {
          warnings.push("impact summary does not directly include the resolved setup revision context");
        }
      } else if (requestedArtifactRefs.impactSummaryId) {
        warnings.push(
          "impactSummaryId provided without impactSummarySnapshot; snapshot lookup by id is postponed"
        );
      } else {
        warnings.push("latest impact summary snapshot is missing");
      }

      if (requestedArtifactRefs.researchHypothesisId && !researchHypothesisRepository) {
        return {
          status: "rejected",
          setupFamilyId,
          setupRevisionId: revision?.id,
          researchHypothesisId: requestedArtifactRefs.researchHypothesisId,
          reason: "researchHypothesisRepository is required when researchHypothesisId is provided",
          warnings: []
        };
      }

      if (requestedArtifactRefs.researchFeedbackDecisionId && !researchFeedbackDecisionRepository) {
        return {
          status: "rejected",
          setupFamilyId,
          setupRevisionId: revision?.id,
          researchFeedbackDecisionId: requestedArtifactRefs.researchFeedbackDecisionId,
          reason:
            "researchFeedbackDecisionRepository is required when researchFeedbackDecisionId is provided",
          warnings: []
        };
      }

      if (requestedArtifactRefs.researchDecisionApprovalId && !researchDecisionApprovalRepository) {
        return {
          status: "rejected",
          setupFamilyId,
          setupRevisionId: revision?.id,
          researchDecisionApprovalId: requestedArtifactRefs.researchDecisionApprovalId,
          reason:
            "researchDecisionApprovalRepository is required when researchDecisionApprovalId is provided",
          warnings: []
        };
      }

      let recommendation: ResearchFeedbackDecision | null = null;
      if (requestedArtifactRefs.researchFeedbackDecisionId && researchFeedbackDecisionRepository) {
        recommendation = await researchFeedbackDecisionRepository.getById(
          requestedArtifactRefs.researchFeedbackDecisionId
        );
        if (!recommendation) {
          return {
            status: "rejected",
            setupFamilyId,
            setupRevisionId: revision?.id,
            researchFeedbackDecisionId: requestedArtifactRefs.researchFeedbackDecisionId,
            reason: `research_feedback_decision not found: ${requestedArtifactRefs.researchFeedbackDecisionId}`,
            warnings: []
          };
        }
      } else if (researchFeedbackDecisionRepository && revision) {
        const decisions = requestedArtifactRefs.researchHypothesisId
          ? await researchFeedbackDecisionRepository.listByResearchHypothesisId(
              requestedArtifactRefs.researchHypothesisId
            )
          : await researchFeedbackDecisionRepository.listBySetupDefinitionId(revision.setupDefinitionId);
        recommendation = pickLatestBy(decisions, (decision) => decision.updatedAt || decision.createdAt);
      }

      if (!recommendation) {
        warnings.push("latest research feedback decision snapshot is missing");
      } else if (revision && recommendation.setupDefinitionId !== revision.setupDefinitionId) {
        warnings.push("resolved research feedback decision is outside current setup revision context");
      }

      const resolvedHypothesisId =
        requestedArtifactRefs.researchHypothesisId ?? recommendation?.researchHypothesisId;

      let hypothesis: ResearchHypothesis | null = null;
      if (resolvedHypothesisId) {
        if (!researchHypothesisRepository) {
          warnings.push("research hypothesis repository is unavailable for hypothesis snapshot lookup");
        } else {
          hypothesis = await researchHypothesisRepository.getById(resolvedHypothesisId);
          if (!hypothesis) {
            warnings.push(`research_hypothesis not found: ${resolvedHypothesisId}`);
          } else if (
            revision &&
            !hypothesis.relatedSetupDefinitionIds.includes(revision.setupDefinitionId)
          ) {
            warnings.push("resolved hypothesis is not linked to the setup definition in revision context");
          }
        }
      } else {
        warnings.push("linked research hypothesis context is missing");
      }

      let approval: ResearchDecisionApproval | null = null;
      if (requestedArtifactRefs.researchDecisionApprovalId && researchDecisionApprovalRepository) {
        approval = await researchDecisionApprovalRepository.getById(
          requestedArtifactRefs.researchDecisionApprovalId
        );
        if (!approval) {
          return {
            status: "rejected",
            setupFamilyId,
            setupRevisionId: revision?.id,
            researchDecisionApprovalId: requestedArtifactRefs.researchDecisionApprovalId,
            reason: `research_decision_approval not found: ${requestedArtifactRefs.researchDecisionApprovalId}`,
            warnings: []
          };
        }
      } else if (researchDecisionApprovalRepository && recommendation) {
        const approvals = await researchDecisionApprovalRepository.listByFeedbackDecisionId(
          recommendation.id
        );
        approval = pickLatestBy(approvals, (item) => item.reviewedAt || item.createdAt);
      }

      if (!approval) {
        warnings.push("latest research decision approval snapshot is missing");
      } else if (recommendation && approval.researchFeedbackDecisionId !== recommendation.id) {
        return {
          status: "rejected",
          setupFamilyId,
          setupRevisionId: revision?.id,
          researchFeedbackDecisionId: recommendation.id,
          researchDecisionApprovalId: approval.id,
          reason: "research decision approval does not link to resolved research feedback decision",
          warnings: []
        };
      }

      const includedArtifactRefs = {
        setupRevisionId: revision?.id,
        setupDefinitionId: revision?.setupDefinitionId,
        researchHypothesisId: hypothesis?.id ?? resolvedHypothesisId,
        researchFeedbackDecisionId: recommendation?.id,
        researchDecisionApprovalId: approval?.id,
        impactSummaryId: requestedArtifactRefs.impactSummaryId
      };

      const packetId = `review-packet:${setupFamilyId}:${revision?.id ?? "no-revision"}:${command.builtAt}`;
      const hasEvidenceContext = Boolean(
        impactSummary ||
          hypothesis?.evidenceStatus ||
          recommendation ||
          approval
      );

      let packetStatus: ResearchReviewPacket["status"] = "complete";
      if (!revision || !hasEvidenceContext) {
        packetStatus = "insufficient_context";
      } else if (warnings.length > 0) {
        packetStatus = "partial";
      }

      const packet: ResearchReviewPacket = {
        id: packetId,
        setupFamilyId,
        setupRevisionId: revision?.id,
        hypothesisId: hypothesis?.id ?? resolvedHypothesisId,
        reviewScope: command.scopeDescriptor,
        revisionContext: revision
          ? {
              setupRevisionId: revision.id,
              setupDefinitionId: revision.setupDefinitionId,
              revisionStatus: revision.revisionStatus,
              setupDefinitionStatus: setupDefinition?.status ?? "missing_setup_definition",
              version: revision.versionInfo.version,
              previousRevisionId: revision.versionInfo.previousRevisionId
            }
          : undefined,
        impactSummarySnapshot: impactSummary,
        hypothesisSnapshot: hypothesis ?? undefined,
        recommendationSnapshot: recommendation ?? undefined,
        approvalSnapshot: approval ?? undefined,
        includedArtifactRefs,
        requestedArtifactRefs,
        currentEvidenceStatus: hypothesis?.evidenceStatus,
        warnings,
        status: packetStatus,
        createdAt: command.builtAt
      };

      return {
        status: packetStatus,
        packet,
        setupFamilyId,
        setupRevisionId: revision?.id,
        researchHypothesisId: hypothesis?.id ?? resolvedHypothesisId,
        researchFeedbackDecisionId: recommendation?.id,
        researchDecisionApprovalId: approval?.id,
        warnings
      };
    } catch (error: unknown) {
      return {
        status: "failed",
        setupFamilyId: command.setupFamilyId,
        setupRevisionId: command.setupRevisionId,
        researchHypothesisId: command.researchHypothesisId,
        researchFeedbackDecisionId: command.researchFeedbackDecisionId,
        researchDecisionApprovalId: command.researchDecisionApprovalId,
        reason: asErrorMessage(error),
        warnings: ["research review packet assembly can be retried after resolving query failure"]
      };
    }
  };

  const queryHistory = async (
    query: QuerySetupRevisionHistory
  ): Promise<RevisionHistoryQueryResult> => {
    if (query.mode === "single_revision") {
      if (!query.setupRevisionId?.trim()) {
        return {
          status: "rejected",
          reason: "setupRevisionId is required for single_revision query mode",
          warnings: []
        };
      }

      const candidateResult = await getByRevision({
        setupRevisionId: query.setupRevisionId,
        setupFamilyId: query.setupFamilyId,
        statuses: query.candidateStatuses,
        symbolId: query.symbolId,
        timeRange: query.timeRange
      });
      if (candidateResult.status !== "resolved" || !candidateResult.candidateHistory) {
        return candidateResult;
      }

      const evaluationResult = await getEvaluationsByRevision({
        setupRevisionId: query.setupRevisionId,
        setupFamilyId: query.setupFamilyId,
        statuses: query.evaluationStatuses,
        timeRange: query.timeRange
      });
      if (evaluationResult.status !== "resolved" || !evaluationResult.evaluationHistory) {
        return evaluationResult;
      }

      const aggregateResult = await getByRevisionScope({
        setupRevisionId: query.setupRevisionId,
        setupFamilyId: query.setupFamilyId,
        statuses: query.aggregateStatuses,
        timeRange: query.timeRange
      });
      if (aggregateResult.status !== "resolved" || !aggregateResult.aggregateHistory) {
        return aggregateResult;
      }

      return {
        status: "resolved",
        setupFamilyId: candidateResult.candidateHistory.setupFamilyId,
        setupRevisionId: candidateResult.candidateHistory.setupRevisionId,
        candidateHistory: candidateResult.candidateHistory,
        evaluationHistory: evaluationResult.evaluationHistory,
        aggregateHistory: aggregateResult.aggregateHistory,
        warnings: []
      };
    }

    return getFamilyHistory(query);
  };

  return {
    queryHistory,
    getFamilyHistory,
    getByRevision,
    getEvaluationsByRevision,
    getByRevisionScope,
    compareRevisions,
    buildImpactSummary,
    buildReviewPacket
  };
};
