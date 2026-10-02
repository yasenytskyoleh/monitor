import { readFile } from "node:fs/promises";

import {
  REVISION_EVIDENCE_SUFFICIENCY_LEVELS,
  REVISION_IMPACT_CLASSIFICATIONS,
  SETUP_REVISION_COMPARISON_STATUSES,
  type SetupRevisionImpactSummary,
} from "@monitor/domain-model";

const METRICS = [
  "completedEvaluations",
  "positiveOutcomeRate",
  "averagePercentageMove",
  "averageFinalOutcome",
  "averageMaxFavorableExcursion",
  "averageMaxAdverseExcursion",
] as const;
const COUNTS = ["candidateCount", "evaluationCount", "aggregateCount"] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonemptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isMetricDelta = (value: unknown): boolean =>
  isRecord(value) &&
  [value.baseline, value.target, value.delta].every(
    (part) => part === null || isFiniteNumber(part),
  );

const isEvidenceCounts = (value: unknown): boolean =>
  isRecord(value) && COUNTS.every((name) => Number.isInteger(value[name]) && Number(value[name]) >= 0);

const isOneOf = (value: unknown, choices: readonly string[]): boolean =>
  typeof value === "string" && choices.includes(value);

const isStringList = (value: unknown): boolean =>
  Array.isArray(value) && value.every((item: unknown) => typeof item === "string");

const isImpactSummary = (value: unknown): value is SetupRevisionImpactSummary => {
  if (!isRecord(value) || !isRecord(value.keyMetricChanges)) {
    return false;
  }
  const keyMetricChanges = value.keyMetricChanges;
  return (
    isNonemptyString(value.setupFamilyId) &&
    isNonemptyString(value.baselineRevisionId) &&
    isNonemptyString(value.targetRevisionId) &&
    isFiniteNumber(value.baselineVersion) &&
    isFiniteNumber(value.targetVersion) &&
    isOneOf(value.comparisonStatus, SETUP_REVISION_COMPARISON_STATUSES) &&
    isOneOf(value.impactClassification, REVISION_IMPACT_CLASSIFICATIONS) &&
    isOneOf(value.evidenceSufficiency, REVISION_EVIDENCE_SUFFICIENCY_LEVELS) &&
    METRICS.every((name) => isMetricDelta(keyMetricChanges[name])) &&
    isEvidenceCounts(value.baselineEvidenceCounts) &&
    isEvidenceCounts(value.targetEvidenceCounts) &&
    isNonemptyString(value.summarizedAt) &&
    Number.isFinite(Date.parse(value.summarizedAt)) &&
    (value.summaryScope === undefined || isRecord(value.summaryScope)) &&
    (value.comparisonReference === undefined || isRecord(value.comparisonReference)) &&
    (value.summaryNotes === undefined || isStringList(value.summaryNotes)) &&
    (value.warnings === undefined || isStringList(value.warnings))
  );
};

export const readImpactSummaryFile = async (path: string): Promise<SetupRevisionImpactSummary> => {
  const result: unknown = JSON.parse(await readFile(path, "utf8"));
  if (!isRecord(result) || result.status !== "summarized" || !isImpactSummary(result.summary)) {
    throw new Error("Invalid impact summary file: expected a summarized result with a valid summary");
  }
  return result.summary;
};
