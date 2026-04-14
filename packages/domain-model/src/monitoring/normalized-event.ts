import type { TimestampUtc } from "../common.js";
import type { CandleClosedEvent } from "./candle-closed.js";
import type { MonitoringHeartbeatEvent } from "./monitoring-heartbeat.js";
import type { PriceTickEvent } from "./price-tick.js";
import type { VolumeUpdateEvent } from "./volume-update.js";

export const MONITORING_SCHEMA_VERSIONS = ["monitoring.v1"] as const;
export type MonitoringSchemaVersion = (typeof MONITORING_SCHEMA_VERSIONS)[number];

export const NORMALIZED_EVENT_TYPES = [
  "price_tick",
  "candle_closed",
  "volume_update",
  "monitoring_heartbeat"
] as const;
export type NormalizedEventType = (typeof NORMALIZED_EVENT_TYPES)[number];

export const TIMEFRAME_LABELS = [
  "1m",
  "3m",
  "5m",
  "15m",
  "30m",
  "1h",
  "4h",
  "1d"
] as const;
export type TimeframeLabel = (typeof TIMEFRAME_LABELS)[number];

export type NormalizationMetadata = {
  schemaVersion: MonitoringSchemaVersion;
  normalizationVersion: string;
  ingestedAtUtc: TimestampUtc;
  providerPayloadVersion: string | null;
  traceId: string | null;
};

export type NormalizedEventBase<TType extends NormalizedEventType, TPayload> = {
  eventId: string;
  sourceId: string;
  symbolId: string | null;
  eventType: TType;
  eventTimestampUtc: TimestampUtc;
  payload: TPayload;
  metadata: NormalizationMetadata;
};

export type NormalizedMarketEvent =
  | PriceTickEvent
  | CandleClosedEvent
  | VolumeUpdateEvent
  | MonitoringHeartbeatEvent;
