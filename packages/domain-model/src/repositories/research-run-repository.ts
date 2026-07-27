import type { ResearchRun, ResearchRunStatus } from "../research-run.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

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
