# ADR-002: Market Monitoring Ingestion Architecture

## Status
Accepted — 2026-04-14

## Context
ADR-001 introduced the first product-domain contracts, but monitoring ingestion was still conceptual.

To move from conceptual product entities toward operational monitoring, the project needs:
- an explicit source model,
- a normalized event model,
- and clear boundaries between provider payloads and domain consumers.

## Decision
Adopt a normalized-event-first monitoring architecture.

First scope:
- spot-only monitoring
- single provider abstraction in the first slice
- architecture and contracts only (no runtime ingestion implementation)

Key contracts in `@monitor/domain-model`:
- `MarketDataSource`
- `MonitoredSymbol`
- `NormalizedMarketEvent` union:
  - `PriceTickEvent`
  - `CandleClosedEvent`
  - `VolumeUpdateEvent`
  - `MonitoringHeartbeatEvent`

Boundary decision:
- raw provider payloads remain outside product-domain contracts
- only normalized events cross into future setup-detection logic

## Consequences

### Positive
- stable internal event contract for future detection/evaluation components
- provider-switching risk reduced by normalization boundary
- explicit traceability from source to normalized event via metadata
- incremental implementation path without premature connector lock-in

### Tradeoffs
- normalization contract may evolve as first ingestion implementations appear
- single-provider scope postpones multi-source reconciliation design

## Explicitly postponed
- real exchange connector implementation
- websocket/polling runtime ingestion loop
- deduplication/replay policies
- persistent ingestion storage model
- setup-detection engine implementation

## Guardrails
- no DB migrations in this slice
- no signal-evaluation engine implementation in this slice
- no execution/trading behavior
