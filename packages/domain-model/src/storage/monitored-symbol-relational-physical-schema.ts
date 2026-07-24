export const MONITORED_SYMBOL_RELATIONAL_PRISMA_MODELS = {
  monitoredSymbolRecord: "MonitoredSymbolRecord"
} as const;
export type MonitoredSymbolRelationalPrismaModelName =
  (typeof MONITORED_SYMBOL_RELATIONAL_PRISMA_MODELS)[keyof typeof MONITORED_SYMBOL_RELATIONAL_PRISMA_MODELS];

export const MONITORED_SYMBOL_RELATIONAL_TABLES = {
  monitoredSymbol: "monitored_symbol"
} as const;
export type MonitoredSymbolRelationalTableName =
  (typeof MONITORED_SYMBOL_RELATIONAL_TABLES)[keyof typeof MONITORED_SYMBOL_RELATIONAL_TABLES];

export const MONITORED_SYMBOL_RELATIONAL_REQUIRED_COLUMNS = {
  monitored_symbol: [
    "monitored_symbol_id", "version", "lifecycle_status", "symbol_status", "base_asset",
    "quote_asset", "display_name", "market_scope", "provider_hint", "tags", "source_bindings",
    "origin_run_id", "origin_transition_id", "created_by_source", "last_updated_by_source",
    "trace_id", "source_observed_at_utc", "metadata_notes", "created_at_utc", "updated_at_utc",
    "archived_at_utc"
  ]
} as const;

export const MONITORED_SYMBOL_RELATIONAL_INDEXES = [
  "idx_monitored_symbol_status",
  "idx_monitored_symbol_market_scope_status"
] as const;
export type MonitoredSymbolRelationalIndexName =
  (typeof MONITORED_SYMBOL_RELATIONAL_INDEXES)[number];

export const MONITORED_SYMBOL_RELATIONAL_MIGRATION_SLUG =
  "product_domain_monitored_symbol_relational_v1" as const;
