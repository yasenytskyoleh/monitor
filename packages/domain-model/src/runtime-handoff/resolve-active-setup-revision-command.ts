import type { JsonObject, TimestampUtc } from "../common.js";

export type ResolveActiveSetupRevisionCommand = {
  setupFamilyId?: string;
  setupDefinitionId?: string;
  resolvedAt: TimestampUtc;
  runtimeContext?: JsonObject;
  originRunId?: string;
};
