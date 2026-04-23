import type { AggregateComputationStatus } from "../research/setup-aggregate-result.js";
import type { QueryTimeRange } from "./query-setup-revision-history.js";

export type QueryAggregateEvidenceByRevisionScope = {
  setupRevisionId: string;
  setupFamilyId?: string;
  statuses?: AggregateComputationStatus[];
  evaluationWindowId?: string;
  timeRange?: QueryTimeRange;
};
