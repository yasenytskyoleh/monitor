import type { TimestampUtc } from "./common.js";

export const SETUP_DEFINITION_STATUSES = ["draft", "active", "paused", "archived"] as const;
export type SetupDefinitionStatus = (typeof SETUP_DEFINITION_STATUSES)[number];

export type SetupDefinitionTraceMetadata = {
  originRunId?: string | null;
  originTransitionId?: string | null;
  traceId?: string | null;
};

export type SetupDefinition = {
  id: string;
  name: string;
  description: string;
  status: SetupDefinitionStatus;
  measurableConditions: string[];
  evaluationAssumptions: string[];
  invalidationAssumptions: string[];
  createdAt: TimestampUtc;
  updatedAt: TimestampUtc;
  traceMetadata?: SetupDefinitionTraceMetadata;
};
