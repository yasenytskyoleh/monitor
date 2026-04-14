import type { DomainEntityBase, JsonValue } from "./common.js";

export const SETUP_DEFINITION_STATUSES = ["draft", "active", "archived"] as const;
export type SetupDefinitionStatus = (typeof SETUP_DEFINITION_STATUSES)[number];

export const SETUP_CONDITION_OPERATORS = [
  "gt",
  "gte",
  "lt",
  "lte",
  "eq",
  "neq",
  "between",
  "crosses_above",
  "crosses_below"
] as const;
export type SetupConditionOperator = (typeof SETUP_CONDITION_OPERATORS)[number];

export type SetupCondition = {
  field: string;
  operator: SetupConditionOperator;
  value: JsonValue;
  secondaryValue?: JsonValue;
  timeframe?: string;
  note?: string;
};

export type SetupDefinition = DomainEntityBase & {
  setupId: string;
  name: string;
  description: string;
  status: SetupDefinitionStatus;
  monitoredSymbolIds: string[];
  conditions: SetupCondition[];
  evaluationAssumptions: string[];
  invalidationAssumptions: string[];
  tags: string[];
};
