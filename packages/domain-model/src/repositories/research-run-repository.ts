import type { ResearchRun, ResearchRunStatus } from "../research-run.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

export class ResearchRunValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResearchRunValidationError";
  }
}

export type ResearchRunCreateRequest = {
  run: ResearchRun;
  metadata: ProductRecordMetadata;
};

export type ResearchRunUpdateRequest = {
  run: ResearchRun;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type ResearchRunRepository = {
  getById(runId: string): Promise<ResearchRun | null>;
  listByHypothesisId(hypothesisId: string): Promise<ResearchRun[]>;
  listByStatus(statuses: ResearchRunStatus[]): Promise<ResearchRun[]>;
  create(request: ResearchRunCreateRequest): Promise<ResearchRun>;
  update(request: ResearchRunUpdateRequest): Promise<ResearchRun>;
};

export const assertValidResearchRunCompletionState = (run: ResearchRun): void => {
  const hasCompletedAtUtc = run.completedAtUtc !== undefined;
  if ((run.status === "completed") !== hasCompletedAtUtc) {
    throw new ResearchRunValidationError(
      "completedAtUtc must be present only when research_run status is completed"
    );
  }

  if (
    run.completedAtUtc &&
    Date.parse(run.completedAtUtc) < Date.parse(run.startedAtUtc)
  ) {
    throw new ResearchRunValidationError("completedAtUtc must not be before startedAtUtc");
  }
};

export const assertResearchRunContextIsUnchanged = (
  current: ResearchRun,
  next: ResearchRun
): void => {
  if (current.hypothesisId !== next.hypothesisId || current.setupId !== next.setupId) {
    throw new ResearchRunValidationError("research_run hypothesisId and setupId are immutable");
  }
};
