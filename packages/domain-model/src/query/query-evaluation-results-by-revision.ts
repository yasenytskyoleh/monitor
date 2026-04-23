import type { EvaluationStatus } from "../evaluation.js";
import type { QueryTimeRange } from "./query-setup-revision-history.js";

export type QueryEvaluationResultsByRevision = {
  setupRevisionId: string;
  setupFamilyId?: string;
  statuses?: EvaluationStatus[];
  evaluationWindowId?: string;
  timeRange?: QueryTimeRange;
};
