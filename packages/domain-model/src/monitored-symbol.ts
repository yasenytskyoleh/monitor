import type { DomainEntityBase, JsonObject, TimestampUtc } from "./common.js";

export const MONITORED_SYMBOL_STATUSES = ["active", "paused", "archived"] as const;
export type MonitoredSymbolStatus = (typeof MONITORED_SYMBOL_STATUSES)[number];

export const MARKET_SCOPES = ["spot"] as const;
export type MarketScope = (typeof MARKET_SCOPES)[number];

export const MONITOR_PROVIDER_HINTS = ["unknown", "exchange_adapter_pending"] as const;
export type MonitorProviderHint = (typeof MONITOR_PROVIDER_HINTS)[number];

export const MONITORED_EVENT_KINDS = [
  "price_tick",
  "volume_spike",
  "volatility_spike",
  "manual_watch_event"
] as const;
export type MonitoredEventKind = (typeof MONITORED_EVENT_KINDS)[number];

export type MonitoredSymbol = DomainEntityBase & {
  symbolId: string;
  baseAsset: string;
  quoteAsset: string;
  displayName: string;
  marketScope: MarketScope;
  status: MonitoredSymbolStatus;
  providerHint: MonitorProviderHint;
  tags: string[];
};

export type MonitoredEvent = {
  eventId: string;
  symbolId: string;
  kind: MonitoredEventKind;
  observedAtUtc: TimestampUtc;
  payload: JsonObject;
};
