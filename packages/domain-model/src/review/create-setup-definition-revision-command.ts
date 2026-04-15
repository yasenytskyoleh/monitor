import type { TimestampUtc } from "../common.js";

export type CreateSetupDefinitionRevisionCommand = {
  setupRefinementRequestId: string;
  setupDefinitionId: string;
  requestedBy: string;
  requestedAt: TimestampUtc;
  revisionSummary: string;
  proposedChangedFieldsSummary: string;
  proposedDescription?: string;
  proposedMeasurableConditions?: string[];
  proposedEvaluationAssumptions?: string[];
  proposedInvalidationAssumptions?: string[];
  expectedPreviousRevisionId?: string;
  notes?: string;
  originRunId?: string;
};
