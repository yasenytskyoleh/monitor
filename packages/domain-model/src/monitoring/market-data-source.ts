import type { DomainEntityBase, JsonObject } from "../common.js";
import type { MarketScope } from "./monitored-symbol.js";

export const MARKET_DATA_PROVIDER_KINDS = ["exchange_adapter"] as const;
export type MarketDataProviderKind = (typeof MARKET_DATA_PROVIDER_KINDS)[number];

export const MARKET_DATA_SOURCE_STATUSES = ["active", "degraded", "paused"] as const;
export type MarketDataSourceStatus = (typeof MARKET_DATA_SOURCE_STATUSES)[number];

export const SYMBOL_MAPPING_MODES = ["provider_native", "canonical_pair"] as const;
export type SymbolMappingMode = (typeof SYMBOL_MAPPING_MODES)[number];

export const SOURCE_RELIABILITY_TIERS = ["unknown", "best_effort", "high"] as const;
export type SourceReliabilityTier = (typeof SOURCE_RELIABILITY_TIERS)[number];

export type MarketDataSource = DomainEntityBase & {
  sourceId: string;
  providerKind: MarketDataProviderKind;
  providerName: string;
  providerInstance: string;
  marketScope: MarketScope;
  status: MarketDataSourceStatus;
  symbolMappingMode: SymbolMappingMode;
  symbolMappingAssumptions: string[];
  reliabilityTier: SourceReliabilityTier;
  reliabilityAssumptions: string[];
  providerSpecificMetadata?: JsonObject;
};
