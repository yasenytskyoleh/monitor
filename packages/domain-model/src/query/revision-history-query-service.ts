import type { EvaluationResult } from "../evaluation.js";
import type { EvaluationResultRepository } from "../repositories/evaluation-result-repository.js";
import type { SetupAggregateResultRepository } from "../repositories/setup-aggregate-result-repository.js";
import type { SetupDefinitionRepository } from "../repositories/setup-definition-repository.js";
import type { SetupDefinitionRevisionRepository } from "../repositories/setup-definition-revision-repository.js";
import type { SignalCandidateRepository } from "../repositories/signal-candidate-repository.js";
import type { SetupAggregateResult } from "../research/setup-aggregate-result.js";
import type { SetupDefinitionRevision } from "../review/setup-definition-revision.js";
import type { SignalCandidate } from "../signal-candidate.js";
import type { QueryAggregateEvidenceByRevisionScope } from "./query-aggregate-evidence-by-revision-scope.js";
import type { QueryEvaluationResultsByRevision } from "./query-evaluation-results-by-revision.js";
import type {
  QuerySetupRevisionHistory,
  QueryTimeRange
} from "./query-setup-revision-history.js";
import type { QuerySignalCandidatesByRevision } from "./query-signal-candidates-by-revision.js";
import type { RevisionHistoryQueryResult } from "./revision-history-query-result.js";
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

export type RevisionHistoryQueryService = SetupDefinitionQueryService &
  SignalCandidateQueryService &
  EvaluationQueryService &
  AggregateEvidenceQueryService;

export type RevisionHistoryQueryServiceDependencies = {
  setupDefinitionRevisionRepository: Pick<SetupDefinitionRevisionRepository, "getById" | "listBySetupFamilyId">;
  setupDefinitionRepository: Pick<SetupDefinitionRepository, "getById">;
  signalCandidateRepository: Pick<SignalCandidateRepository, "listBySetupDefinitionId">;
  evaluationResultRepository: Pick<EvaluationResultRepository, "listBySignalCandidateId">;
  setupAggregateResultRepository: Pick<SetupAggregateResultRepository, "listBySetupDefinitionId">;
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
    setupAggregateResultRepository
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
    getByRevisionScope
  };
};
