# Normalized Events

## Purpose
Define the first stable normalized market-event contract that decouples product-domain consumers from provider-specific payloads.

Contract location:
- `packages/domain-model/src/monitoring/normalized-event.ts`

## Event contract shape
All normalized events include:
- `eventId`
- `sourceId`
- `symbolId` (nullable only for heartbeat events)
- `eventType`
- `eventTimestampUtc`
- `payload` (event-specific)
- `metadata`

Metadata fields:
- `schemaVersion` (currently `monitoring.v1`)
- `normalizationVersion`
- `ingestedAtUtc`
- `providerPayloadVersion`
- `traceId`

## First event types
- `PriceTickEvent`
  - payload: `price`, `bid`, `ask`, `tradeCount`
- `CandleClosedEvent`
  - payload: `timeframe`, `open`, `high`, `low`, `close`, `volume`, `openTimeUtc`, `closeTimeUtc`
- `VolumeUpdateEvent`
  - payload: `timeframe`, `observedVolume`, `quoteVolume`
- `MonitoringHeartbeatEvent`
  - payload: `status`, `lagMs`, `detail`

## Normalization rules (first version)
- event times are UTC strings
- numeric values are parsed to numeric primitives before entering contracts
- provider identity stays in `sourceId` + source registry, not in event type names
- event schema versioning is explicit and must be present on each event
- no provider raw payload blobs are stored inside normalized event payload by default

## Out of scope
- replay engine
- deduplication strategy
- late/out-of-order correction policy
- cross-source reconciliation
