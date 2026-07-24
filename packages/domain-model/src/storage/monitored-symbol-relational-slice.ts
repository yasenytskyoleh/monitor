import type {
  MarketScope,
  MonitoredSymbolStatus,
  MonitorProviderHint,
  SourceSymbolBinding
} from "../monitoring/monitored-symbol.js";
import type { DurableRelationalRecordBase } from "./first-durable-relational-slice.js";

export const MONITORED_SYMBOL_RELATIONAL_ENTITY_TYPES = ["monitored_symbol"] as const;
export type MonitoredSymbolRelationalEntityType =
  (typeof MONITORED_SYMBOL_RELATIONAL_ENTITY_TYPES)[number];

export type MonitoredSymbolDurableRecord = DurableRelationalRecordBase<"monitored_symbol"> & {
  symbolId: string;
  baseAsset: string;
  quoteAsset: string;
  displayName: string;
  marketScope: MarketScope;
  symbolStatus: MonitoredSymbolStatus;
  providerHint: MonitorProviderHint;
  tags: string[];
  sourceBindings: SourceSymbolBinding[];
};
