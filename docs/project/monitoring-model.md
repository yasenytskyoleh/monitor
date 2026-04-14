# Monitoring Model

## Purpose
Define the first conceptual monitoring-side model without implementing ingestion engines.

## Core entities

### MonitoredSymbol
Represents a market symbol currently under monitoring.

Required fields:
- symbol id (`BTC-USDT` style identifier)
- base/quote assets
- scope (`spot` only for now)
- status (`active`, `paused`, `archived`)
- provider hint placeholder

### MonitoredEvent
Represents a normalized event that may later feed signal-candidate generation.

Current event kinds:
- `price_tick`
- `volume_spike`
- `volatility_spike`
- `manual_watch_event`

## Boundaries
- this model defines shape and vocabulary only
- it does not define exchange adapters
- it does not define live stream processing
- it does not define persistence strategy

## Contract source
- `packages/domain-model/src/monitored-symbol.ts`
