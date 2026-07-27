import type { EvaluationResultRepository } from "../repositories/evaluation-result-repository.js";
import type { EvaluationStatus } from "../evaluation/evaluation-status.js";
import type { ResearchHypothesisRepository } from "../repositories/research-hypothesis-repository.js";
import type { ResearchRunRepository } from "../repositories/research-run-repository.js";
import type { SetupDefinitionRepository } from "../repositories/setup-definition-repository.js";
import type { SignalCandidateRepository } from "../repositories/signal-candidate-repository.js";
import type { ResearchRun } from "../research-run.js";
import { RESEARCH_RUN_STATUSES } from "../research-run.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

export type CreatePlannedResearchRunRequest = {
  run: ResearchRun;
  metadata: ProductRecordMetadata;
};

export type StartResearchRunRequest = {
  runId: string;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type CompleteResearchRunRequest = {
  runId: string;
  completedAtUtc: string;
  summary?: string;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type RecordResearchRunEvaluationResultsRequest = {
  runId: string;
  evaluationResultIds: string[];
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type FailResearchRunRequest = {
  runId: string;
  summary?: string;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type CancelResearchRunRequest = {
  runId: string;
  summary?: string;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type ResearchRunServiceDependencies = {
  researchRunRepository: ResearchRunRepository;
  researchHypothesisRepository: Pick<ResearchHypothesisRepository, "getById">;
  setupDefinitionRepository: Pick<SetupDefinitionRepository, "getById">;
  signalCandidateRepository: Pick<SignalCandidateRepository, "getById">;
  evaluationResultRepository: Pick<EvaluationResultRepository, "getById">;
};

export type ResearchRunService = {
  createPlannedResearchRun(request: CreatePlannedResearchRunRequest): Promise<ResearchRun>;
  startResearchRun(request: StartResearchRunRequest): Promise<ResearchRun | null>;
  recordResearchRunEvaluationResults(
    request: RecordResearchRunEvaluationResultsRequest
  ): Promise<ResearchRun | null>;
  completeResearchRun(request: CompleteResearchRunRequest): Promise<ResearchRun | null>;
  failResearchRun(request: FailResearchRunRequest): Promise<ResearchRun | null>;
  cancelResearchRun(request: CancelResearchRunRequest): Promise<ResearchRun | null>;
};

export class ResearchRunServiceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResearchRunServiceValidationError";
  }
}

const assertNonEmptyString = (value: string, fieldName: string): void => {
  if (!value.trim()) {
    throw new ResearchRunServiceValidationError(`${fieldName} is required`);
  }
};

const assertTimestamp = (value: string, fieldName: string): void => {
  assertNonEmptyString(value, fieldName);
  if (Number.isNaN(Date.parse(value))) {
    throw new ResearchRunServiceValidationError(`${fieldName} must be a valid UTC timestamp`);
  }
};

const assertUniqueIdentifiers = (values: string[], fieldName: string): void => {
  values.forEach((value) => assertNonEmptyString(value, `${fieldName} entry`));
  if (new Set(values).size !== values.length) {
    throw new ResearchRunServiceValidationError(`${fieldName} must not contain duplicates`);
  }
};

const isTerminalEvaluationStatus = (status: EvaluationStatus): boolean =>
  status === "completed" || status === "expired" || status === "invalidated";

const assertTerminalEvaluationResult = (
  evaluationResultId: string,
  status: EvaluationStatus
): void => {
  if (!isTerminalEvaluationStatus(status)) {
    throw new ResearchRunServiceValidationError(
      `evaluation_result ${evaluationResultId} must be terminal before inclusion in research_run`
    );
  }
};

const validatePlannedResearchRun = (run: ResearchRun): void => {
  assertNonEmptyString(run.runId, "runId");
  assertNonEmptyString(run.hypothesisId, "hypothesisId");
  assertNonEmptyString(run.setupId, "setupId");
  assertTimestamp(run.startedAtUtc, "startedAtUtc");
  assertUniqueIdentifiers(run.candidateIds, "candidateIds");
  assertUniqueIdentifiers(run.evaluationWindowIds, "evaluationWindowIds");
  assertUniqueIdentifiers(run.evaluationResultIds, "evaluationResultIds");

  if (!RESEARCH_RUN_STATUSES.includes(run.status) || run.status !== "planned") {
    throw new ResearchRunServiceValidationError("research_run must start in planned status");
  }

  if (run.completedAtUtc !== undefined) {
    throw new ResearchRunServiceValidationError(
      "planned research_run cannot include completedAtUtc"
    );
  }
};

const assertTransitionAllowed = (
  currentStatus: ResearchRun["status"],
  nextStatus: ResearchRun["status"]
): void => {
  if (
    currentStatus === "planned" &&
    (nextStatus === "running" || nextStatus === "failed" || nextStatus === "cancelled")
  ) {
    return;
  }

  if (
    currentStatus === "running" &&
    (nextStatus === "completed" || nextStatus === "failed" || nextStatus === "cancelled")
  ) {
    return;
  }

  throw new ResearchRunServiceValidationError(
    `invalid research_run status transition: ${currentStatus} -> ${nextStatus}`
  );
};

const buildUpdateTimestamp = (metadata: ProductRecordMetadata): string =>
  metadata.sourceObservedAtUtc ?? new Date().toISOString();

const validateResearchRunReferences = async (
  run: ResearchRun,
  dependencies: Omit<ResearchRunServiceDependencies, "researchRunRepository">
): Promise<void> => {
  const hypothesis = await dependencies.researchHypothesisRepository.getById(run.hypothesisId);
  if (!hypothesis) {
    throw new ResearchRunServiceValidationError(
      `research_hypothesis not found: ${run.hypothesisId}`
    );
  }

  if (!hypothesis.relatedSetupDefinitionIds.includes(run.setupId)) {
    throw new ResearchRunServiceValidationError(
      `research_hypothesis ${run.hypothesisId} is not linked to setup_definition ${run.setupId}`
    );
  }

  const setupDefinition = await dependencies.setupDefinitionRepository.getById(run.setupId);
  if (!setupDefinition) {
    throw new ResearchRunServiceValidationError(
      `setup_definition not found: ${run.setupId}`
    );
  }

  await validateResearchRunEvidence(run, dependencies);
};

const validateResearchRunEvidence = async (
  run: ResearchRun,
  dependencies: Pick<
    ResearchRunServiceDependencies,
    "evaluationResultRepository" | "signalCandidateRepository"
  >
): Promise<void> => {
  for (const candidateId of run.candidateIds) {
    const candidate = await dependencies.signalCandidateRepository.getById(candidateId);
    if (!candidate || candidate.setupDefinitionId !== run.setupId) {
      throw new ResearchRunServiceValidationError(
        `signal_candidate ${candidateId} does not belong to setup_definition ${run.setupId}`
      );
    }
  }

  for (const evaluationResultId of run.evaluationResultIds) {
    const result = await dependencies.evaluationResultRepository.getById(evaluationResultId);
    if (!result || !run.candidateIds.includes(result.signalCandidateId)) {
      throw new ResearchRunServiceValidationError(
        `evaluation_result ${evaluationResultId} is not linked to research_run candidates`
      );
    }

    if (!run.evaluationWindowIds.includes(result.evaluationWindowId)) {
      throw new ResearchRunServiceValidationError(
        `evaluation_result ${evaluationResultId} is outside research_run evaluation windows`
      );
    }

    assertTerminalEvaluationResult(evaluationResultId, result.status);
  }
};

const appendUnique = (current: string[], additions: string[]): string[] =>
  [...new Set([...current, ...additions])];

const buildRecordedEvaluationContext = async (
  run: ResearchRun,
  evaluationResultIds: string[],
  dependencies: Pick<
    ResearchRunServiceDependencies,
    "evaluationResultRepository" | "signalCandidateRepository"
  >
): Promise<Pick<ResearchRun, "candidateIds" | "evaluationResultIds" | "evaluationWindowIds">> => {
  assertUniqueIdentifiers(evaluationResultIds, "evaluationResultIds");

  const candidateIds: string[] = [];
  const evaluationWindowIds: string[] = [];
  for (const evaluationResultId of evaluationResultIds) {
    const result = await dependencies.evaluationResultRepository.getById(evaluationResultId);
    if (!result) {
      throw new ResearchRunServiceValidationError(
        `evaluation_result not found: ${evaluationResultId}`
      );
    }

    assertTerminalEvaluationResult(evaluationResultId, result.status);

    const candidate = await dependencies.signalCandidateRepository.getById(
      result.signalCandidateId
    );
    if (!candidate || candidate.setupDefinitionId !== run.setupId) {
      throw new ResearchRunServiceValidationError(
        `evaluation_result ${evaluationResultId} does not belong to setup_definition ${run.setupId}`
      );
    }

    candidateIds.push(candidate.id);
    evaluationWindowIds.push(result.evaluationWindowId);
  }

  return {
    candidateIds: appendUnique(run.candidateIds, candidateIds),
    evaluationWindowIds: appendUnique(run.evaluationWindowIds, evaluationWindowIds),
    evaluationResultIds: appendUnique(run.evaluationResultIds, evaluationResultIds)
  };
};

const updateResearchRunStatus = async (
  repository: ResearchRunRepository,
  runId: string,
  nextStatus: ResearchRun["status"],
  metadata: ProductRecordMetadata,
  expectedVersion: number | null,
  changes: Partial<ResearchRun> = {}
): Promise<ResearchRun | null> => {
  const current = await repository.getById(runId);
  if (!current) {
    return null;
  }

  assertTransitionAllowed(current.status, nextStatus);
  return repository.update({
    run: {
      ...current,
      ...changes,
      status: nextStatus,
      updatedAtUtc: buildUpdateTimestamp(metadata)
    },
    metadata,
    expectedVersion
  });
};

export const createResearchRunService = (
  dependencies: ResearchRunServiceDependencies
): ResearchRunService => {
  const { researchRunRepository, ...referenceDependencies } = dependencies;

  return {
    async createPlannedResearchRun(request) {
      validatePlannedResearchRun(request.run);
      await validateResearchRunReferences(request.run, referenceDependencies);
      return researchRunRepository.create(request);
    },
    async startResearchRun(request) {
      return updateResearchRunStatus(
        researchRunRepository,
        request.runId,
        "running",
        request.metadata,
        request.expectedVersion,
        { startedAtUtc: buildUpdateTimestamp(request.metadata) }
      );
    },
    async recordResearchRunEvaluationResults(request) {
      const current = await researchRunRepository.getById(request.runId);
      if (!current) {
        return null;
      }

      if (current.status !== "planned" && current.status !== "running") {
        throw new ResearchRunServiceValidationError(
          `cannot record evaluation results for ${current.status} research_run`
        );
      }

      const recordedContext = await buildRecordedEvaluationContext(
        current,
        request.evaluationResultIds,
        referenceDependencies
      );
      return researchRunRepository.update({
        run: {
          ...current,
          ...recordedContext,
          updatedAtUtc: buildUpdateTimestamp(request.metadata)
        },
        metadata: request.metadata,
        expectedVersion: request.expectedVersion
      });
    },
    async completeResearchRun(request) {
      assertTimestamp(request.completedAtUtc, "completedAtUtc");
      return updateResearchRunStatus(
        researchRunRepository,
        request.runId,
        "completed",
        request.metadata,
        request.expectedVersion,
        {
          completedAtUtc: request.completedAtUtc,
          ...(request.summary !== undefined ? { summary: request.summary } : {})
        }
      );
    },
    async failResearchRun(request) {
      return updateResearchRunStatus(
        researchRunRepository,
        request.runId,
        "failed",
        request.metadata,
        request.expectedVersion,
        { ...(request.summary !== undefined ? { summary: request.summary } : {}) }
      );
    },
    async cancelResearchRun(request) {
      return updateResearchRunStatus(
        researchRunRepository,
        request.runId,
        "cancelled",
        request.metadata,
        request.expectedVersion,
        { ...(request.summary !== undefined ? { summary: request.summary } : {}) }
      );
    }
  };
};
