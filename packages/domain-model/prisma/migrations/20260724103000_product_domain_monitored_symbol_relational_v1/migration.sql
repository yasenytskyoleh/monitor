CREATE TYPE "product_domain"."monitored_symbol_status" AS ENUM ('active', 'paused', 'archived');
CREATE TYPE "product_domain"."market_scope" AS ENUM ('spot');
CREATE TYPE "product_domain"."monitor_provider_hint" AS ENUM ('unknown', 'exchange_adapter_pending');

CREATE TABLE "product_domain"."monitored_symbol" (
  "monitored_symbol_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "lifecycle_status" "product_domain"."persisted_lifecycle_status" NOT NULL,
  "symbol_status" "product_domain"."monitored_symbol_status" NOT NULL,
  "base_asset" TEXT NOT NULL,
  "quote_asset" TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "market_scope" "product_domain"."market_scope" NOT NULL,
  "provider_hint" "product_domain"."monitor_provider_hint" NOT NULL,
  "tags" TEXT[] NOT NULL,
  "source_bindings" JSONB NOT NULL,
  "origin_run_id" TEXT,
  "origin_transition_id" TEXT,
  "created_by_source" "product_domain"."product_record_source" NOT NULL,
  "last_updated_by_source" "product_domain"."product_record_source" NOT NULL,
  "trace_id" TEXT,
  "source_observed_at_utc" TIMESTAMPTZ(3),
  "metadata_notes" TEXT,
  "created_at_utc" TIMESTAMPTZ(3) NOT NULL,
  "updated_at_utc" TIMESTAMPTZ(3) NOT NULL,
  "archived_at_utc" TIMESTAMPTZ(3),
  CONSTRAINT "monitored_symbol_pkey" PRIMARY KEY ("monitored_symbol_id"),
  CONSTRAINT "monitored_symbol_version_positive" CHECK ("version" > 0),
  CONSTRAINT "monitored_symbol_id_non_empty" CHECK (length(trim("monitored_symbol_id")) > 0),
  CONSTRAINT "monitored_symbol_base_asset_non_empty" CHECK (length(trim("base_asset")) > 0),
  CONSTRAINT "monitored_symbol_quote_asset_non_empty" CHECK (length(trim("quote_asset")) > 0),
  CONSTRAINT "monitored_symbol_display_name_non_empty" CHECK (length(trim("display_name")) > 0),
  CONSTRAINT "monitored_symbol_source_bindings_array" CHECK (jsonb_typeof("source_bindings") = 'array'),
  CONSTRAINT "monitored_symbol_created_updated_order" CHECK ("updated_at_utc" >= "created_at_utc"),
  CONSTRAINT "monitored_symbol_archived_timestamp_consistent" CHECK (
    ("lifecycle_status" = 'active' AND "archived_at_utc" IS NULL) OR
    ("lifecycle_status" = 'archived' AND "archived_at_utc" IS NOT NULL)
  ),
  CONSTRAINT "monitored_symbol_status_lifecycle_consistent" CHECK (
    ("symbol_status" = 'archived' AND "lifecycle_status" = 'archived') OR
    ("symbol_status" <> 'archived' AND "lifecycle_status" = 'active')
  )
);

CREATE INDEX "idx_monitored_symbol_status" ON "product_domain"."monitored_symbol" ("symbol_status");
CREATE INDEX "idx_monitored_symbol_market_scope_status"
  ON "product_domain"."monitored_symbol" ("market_scope", "symbol_status");
