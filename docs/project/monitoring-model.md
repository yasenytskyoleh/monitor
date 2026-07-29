# Monitoring Model

## Purpose
Define the first monitoring ingestion architecture for Monitor, with stable contracts and explicit boundaries.

The first provider connector is implemented for public Binance Spot closed candles. Schedulers and
persistence engines remain outside this slice.

## Source model (first scope)
Current scope is intentionally narrow:
- spot market only
- single provider abstraction in first version
- provider-specific payloads are normalized before entering product domain contracts

Primary entity:
- `MarketDataSource` (`packages/domain-model/src/monitoring/market-data-source.ts`)

Source model covers:
- provider identity (`providerKind`, `providerName`, `providerInstance`)
- symbol mapping assumptions (`symbolMappingMode`, `symbolMappingAssumptions`)
- reliability assumptions (`reliabilityTier`, `reliabilityAssumptions`)
- market scope (`spot`)

## Monitoring entities
- `MonitoredSymbol` is the configured subject being watched.
- `MarketDataSource` is where raw observations are sourced.
- `NormalizedMarketEvent` is the product-domain contract consumed by future setup detection.

## Ingestion pipeline boundaries
1. source fetch/stream layer (Binance Spot BTCUSDT 1m/5m candles implemented)
2. provider raw payload layer (provider-specific, out of product domain)
3. normalization layer (maps raw payload to stable contracts)
4. normalized event layer (`NormalizedMarketEvent`)
5. handoff layer to future setup detection/evaluation flows

Rule:
- only normalized events cross into product-domain monitoring contracts
- provider-specific payload details stay outside domain entities

## Monitoring to product-domain relationship
- `MonitoredSymbol` defines which symbols are in scope.
- normalized events describe observations for those symbols.
- future setup detection consumes normalized events + setup definitions.
- setup hits may create `SignalCandidate`.
- evaluation remains a separate downstream layer.

## Explicitly postponed
- other exchange integrations and event types beyond closed candles
- polling/scheduling logic
- ingestion worker lifecycle
- persistence and replay model
- alerting and execution actions

## Contract sources
- `packages/domain-model/src/monitoring/monitored-symbol.ts`
- `packages/domain-model/src/monitoring/market-data-source.ts`
- `packages/domain-model/src/monitoring/normalized-event.ts`
- `packages/domain-model/src/monitoring/price-tick.ts`
- `packages/domain-model/src/monitoring/candle-closed.ts`
- `packages/domain-model/src/monitoring/volume-update.ts`
- `packages/domain-model/src/monitoring/monitoring-heartbeat.ts`
