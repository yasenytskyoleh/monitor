import type { TimestampUtc } from "../common.js";

export const PRODUCT_RECORD_SOURCES = [
  "monitoring_pipeline",
  "detection_pipeline",
  "evaluation_pipeline",
  "research_aggregation_pipeline",
  "manual_curation",
  "migration_backfill"
] as const;
export type ProductRecordSource = (typeof PRODUCT_RECORD_SOURCES)[number];

export type ProductRecordMetadata = {
  originRunId: string | null;
  originTransitionId: string | null;
  createdBySource: ProductRecordSource;
  lastUpdatedBySource: ProductRecordSource;
  traceId: string | null;
  sourceObservedAtUtc: TimestampUtc | null;
  notes?: string;
};
